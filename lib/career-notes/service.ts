import { generateText, Output } from "ai"

import { prisma } from "@/lib/prisma"
import { getLanguageModel } from "@/lib/ai/provider"
import {
  careerNoteExtractionSchema,
  buildCareerNoteExtractionPrompt,
} from "@/lib/ai/prompts/career-note-extraction"
import { recordUsage } from "@/lib/token-usage/service"
import { checkQuotaExceeded, QuotaExceededError } from "@/lib/token-usage/quota"
import {
  CareerNoteNotFoundError,
  CareerNoteForbiddenError,
  ConversationNotFoundError,
  MergeProposalNotFoundError,
  MergeProposalForbiddenError,
} from "./errors"

// ---------------------------------------------------------------------------
// 1. listCareerNotes — cursor-based pagination
// ---------------------------------------------------------------------------
export async function listCareerNotes(
  userId: string,
  options: { status?: "confirmed" | "pending"; cursor?: string; limit?: number } = {},
) {
  const { status = "confirmed", cursor, limit = 20 } = options
  const prismaStatus = status.toUpperCase() as "CONFIRMED" | "PENDING"

  const notes = await prisma.careerNote.findMany({
    where: { userId, status: prismaStatus },
    include: {
      sources: {
        include: {
          conversation: {
            select: {
              id: true,
              type: true,
              coverLetterId: true,
              interviewSessionId: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
  })

  let nextCursor: string | undefined
  if (notes.length > limit) {
    const last = notes.pop()!
    nextCursor = last.id
  }

  return { notes, nextCursor }
}

// ---------------------------------------------------------------------------
// 2. countCareerNotes
// ---------------------------------------------------------------------------
export async function countCareerNotes(userId: string) {
  const [confirmed, pending] = await Promise.all([
    prisma.careerNote.count({ where: { userId, status: "CONFIRMED" } }),
    prisma.careerNote.count({ where: { userId, status: "PENDING" } }),
  ])
  return { confirmed, pending, total: confirmed + pending }
}

// ---------------------------------------------------------------------------
// 3. getConfirmedNotes — for AI extraction context
// ---------------------------------------------------------------------------
export async function getConfirmedNotes(userId: string, limit = 50) {
  return prisma.careerNote.findMany({
    where: { userId, status: "CONFIRMED" },
    select: { id: true, title: true, content: true, metadata: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
  })
}

// ---------------------------------------------------------------------------
// 4. countPendingProposals
// ---------------------------------------------------------------------------
export async function countPendingProposals(userId: string) {
  return prisma.careerNoteMergeProposal.count({
    where: {
      status: "PENDING",
      sourceNote: { userId },
    },
  })
}

// ---------------------------------------------------------------------------
// 5. listPendingProposals
// ---------------------------------------------------------------------------
export async function listPendingProposals(userId: string) {
  return prisma.careerNoteMergeProposal.findMany({
    where: {
      status: "PENDING",
      sourceNote: { userId },
    },
    include: {
      sourceNote: {
        select: { id: true, title: true, content: true, metadata: true },
      },
      targetNote: {
        select: { id: true, title: true, content: true, metadata: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

// ---------------------------------------------------------------------------
// 6. extractCareerNotes — core extraction function
// ---------------------------------------------------------------------------
export async function extractCareerNotes(userId: string, conversationId: string) {
  // 1. Find conversation with messages
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  })
  if (!conversation) {
    throw new ConversationNotFoundError()
  }

  const messages = await prisma.message.findMany({
    where: { conversationId, role: "USER" },
    orderBy: { createdAt: "asc" },
  })

  if (messages.length === 0) {
    return { notes: [], proposals: [] }
  }

  // 2. Check quota
  const quotaResult = await checkQuotaExceeded(userId)
  if (quotaResult.exceeded) {
    throw new QuotaExceededError(quotaResult.source)
  }

  // 3. Get confirmed notes for comparison
  const existingNotes = await getConfirmedNotes(userId, 50)

  // 4. Call generateObject with extraction schema
  const { model, isServerKey, provider: aiProvider, modelId } = await getLanguageModel(userId)
  const { output, usage } = await generateText({
    model,
    output: Output.object({ schema: careerNoteExtractionSchema }),
    system: buildCareerNoteExtractionPrompt(
      existingNotes.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        metadata: n.metadata,
      })),
    ),
    prompt: messages.map((m) => `${m.role}: ${m.content}`).join("\n"),
  })

  // 5. Record token usage
  if (usage) {
    await recordUsage({
      userId,
      provider: aiProvider,
      model: modelId,
      feature: "CAREER_NOTE",
      promptTokens: usage.inputTokens ?? 0,
      completionTokens: usage.outputTokens ?? 0,
      totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
      isServerKey,
      metadata: { conversationId },
    }).catch((e) => console.error("토큰 사용량 기록 실패:", e))
  }

  // 6. Transaction: dedup + create notes + proposals
  const result = await prisma.$transaction(async (tx) => {
    // 6a. Delete PENDING notes from this conversation + their PENDING proposals
    const pendingNotesFromConversation = await tx.careerNote.findMany({
      where: {
        userId,
        status: "PENDING",
        sources: { some: { conversationId } },
      },
      select: { id: true },
    })

    if (pendingNotesFromConversation.length > 0) {
      const pendingNoteIds = pendingNotesFromConversation.map((n) => n.id)

      await tx.careerNoteMergeProposal.deleteMany({
        where: {
          sourceNoteId: { in: pendingNoteIds },
          status: "PENDING",
        },
      })

      await tx.careerNote.deleteMany({
        where: { id: { in: pendingNoteIds } },
      })
    }

    // 6b. Create notes and proposals
    const createdNotes: Awaited<ReturnType<typeof tx.careerNote.create>>[] = []
    const createdProposals: Awaited<ReturnType<typeof tx.careerNoteMergeProposal.create>>[] = []

    for (const extractedNote of output!.notes) {
      const hasRelated = extractedNote.relatedExistingNoteId && extractedNote.suggestedMerge

      const noteStatus = hasRelated ? "PENDING" : "CONFIRMED"

      const note = await tx.careerNote.create({
        data: {
          userId,
          title: extractedNote.title,
          content: extractedNote.content,
          metadata: extractedNote.metadata,
          status: noteStatus,
        },
      })

      // 6c. Create CareerNoteSource
      await tx.careerNoteSource.create({
        data: {
          careerNoteId: note.id,
          conversationId,
        },
      })

      createdNotes.push(note)

      // Create MergeProposal if related existing note
      if (hasRelated) {
        const proposal = await tx.careerNoteMergeProposal.create({
          data: {
            sourceNoteId: note.id,
            targetNoteId: extractedNote.relatedExistingNoteId!,
            suggestedTitle: extractedNote.suggestedMerge!.title,
            suggestedContent: extractedNote.suggestedMerge!.content,
            suggestedMetadata: extractedNote.suggestedMerge!.metadata,
          },
        })
        createdProposals.push(proposal)
      }
    }

    return { notes: createdNotes, proposals: createdProposals }
  })

  return result
}

// ---------------------------------------------------------------------------
// 7. updateCareerNote — permission check via updateMany pattern
// ---------------------------------------------------------------------------
interface UpdateCareerNoteData {
  title?: string
  content?: string
  metadata?: Record<string, string | undefined>
}

export async function updateCareerNote(
  userId: string,
  id: string,
  data: UpdateCareerNoteData,
) {
  const result = await prisma.careerNote.updateMany({
    where: { id, userId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.content !== undefined ? { content: data.content } : {}),
      ...(data.metadata !== undefined ? { metadata: data.metadata } : {}),
    },
  })

  if (result.count === 0) {
    const exists = await prisma.careerNote.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!exists) throw new CareerNoteNotFoundError()
    throw new CareerNoteForbiddenError()
  }

  if (data.content) {
    try {
      const { model, isServerKey, provider, modelId } = await getLanguageModel(userId)
      const { text, usage } = await generateText({
        model,
        system: "주어진 커리어노트의 핵심 내용을 1~2줄로 요약하세요.",
        prompt: data.content,
      })
      await prisma.careerNote.update({
        where: { id },
        data: { summary: text },
      })

      if (usage) {
        await recordUsage({
          userId,
          provider,
          model: modelId,
          feature: "CAREER_NOTE",
          promptTokens: usage.inputTokens ?? 0,
          completionTokens: usage.outputTokens ?? 0,
          totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
          isServerKey,
          metadata: {},
        }).catch((e) => console.error("커리어노트 요약 토큰 기록 실패:", e))
      }
    } catch (error) {
      console.error("커리어노트 요약 재생성 실패:", error)
      // 실패해도 업데이트 자체는 성공으로 처리
    }
  }
}

// ---------------------------------------------------------------------------
// 8. deleteCareerNote — permission check via deleteMany pattern
// ---------------------------------------------------------------------------
export async function deleteCareerNote(userId: string, id: string) {
  const result = await prisma.careerNote.deleteMany({
    where: { id, userId },
  })

  if (result.count === 0) {
    const exists = await prisma.careerNote.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!exists) throw new CareerNoteNotFoundError()
    throw new CareerNoteForbiddenError()
  }
}

// ---------------------------------------------------------------------------
// 9. resolveMergeProposal — accept/reject
// ---------------------------------------------------------------------------
interface ResolveMergeProposalData {
  action: "accept" | "reject"
  editedTitle?: string
  editedContent?: string
  editedMetadata?: Record<string, string | undefined>
}

export async function resolveMergeProposal(
  userId: string,
  proposalId: string,
  data: ResolveMergeProposalData,
) {
  const proposal = await prisma.careerNoteMergeProposal.findUnique({
    where: { id: proposalId },
    include: {
      sourceNote: {
        select: { id: true, userId: true, sources: true },
      },
      targetNote: {
        select: { id: true },
      },
    },
  })

  if (!proposal || proposal.status !== "PENDING") {
    throw new MergeProposalNotFoundError()
  }

  if (!proposal.sourceNote || proposal.sourceNote.userId !== userId) {
    throw new MergeProposalForbiddenError()
  }

  if (data.action === "accept") {
    await prisma.$transaction(async (tx) => {
      // 1. Transfer sourceNote's sources to targetNote (upsert to avoid duplicates)
      for (const source of proposal.sourceNote!.sources) {
        await tx.careerNoteSource.upsert({
          where: {
            careerNoteId_conversationId: {
              careerNoteId: proposal.targetNote.id,
              conversationId: source.conversationId,
            },
          },
          create: {
            careerNoteId: proposal.targetNote.id,
            conversationId: source.conversationId,
          },
          update: {},
        })
      }

      // 2. Update proposal status to ACCEPTED (before sourceNote deletion!)
      await tx.careerNoteMergeProposal.update({
        where: { id: proposalId },
        data: { status: "ACCEPTED" },
      })

      // 3. Update targetNote with suggested/edited content
      await tx.careerNote.update({
        where: { id: proposal.targetNote.id },
        data: {
          title: data.editedTitle ?? proposal.suggestedTitle,
          content: data.editedContent ?? proposal.suggestedContent,
          metadata: data.editedMetadata ?? proposal.suggestedMetadata ?? undefined,
        },
      })

      // 4. Delete sourceNote (cascade deletes its sources, but proposal already updated)
      await tx.careerNote.delete({
        where: { id: proposal.sourceNote!.id },
      })
    })
  } else {
    // Reject flow
    await prisma.$transaction([
      prisma.careerNoteMergeProposal.update({
        where: { id: proposalId },
        data: { status: "REJECTED" },
      }),
      prisma.careerNote.update({
        where: { id: proposal.sourceNote!.id },
        data: { status: "CONFIRMED" },
      }),
    ])
  }
}
