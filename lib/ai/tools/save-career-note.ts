import { tool } from "ai"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

export function createSaveCareerNoteTool(
  userId: string,
  conversationId: string
) {
  return tool({
    description:
      "커리어노트를 생성하거나 갱신합니다. 반드시 사용자에게 먼저 제안하고 승인을 받은 후 호출하세요.",
    inputSchema: z.object({
      careerNoteId: z
        .string()
        .optional()
        .describe("갱신할 커리어노트 ID. 없으면 새로 생성"),
      title: z.string().describe("커리어노트 제목"),
      content: z.string().describe("커리어노트 내용"),
      summary: z.string().describe("1~2줄 핵심 요약"),
      metadata: z
        .object({
          role: z.string().optional(),
          result: z.string().optional(),
          feeling: z.string().optional(),
        })
        .optional()
        .describe("메타데이터"),
    }),
    execute: async ({ careerNoteId, title, content, summary, metadata }) => {
      if (careerNoteId) {
        const existing = await prisma.careerNote.findFirst({
          where: { id: careerNoteId, userId, status: "CONFIRMED" },
        })
        if (!existing) return "커리어노트를 찾을 수 없습니다."
        await prisma.$transaction([
          prisma.careerNote.update({
            where: { id: careerNoteId },
            data: {
              title,
              content,
              summary,
              metadata: metadata ?? undefined,
            },
          }),
          prisma.careerNoteSource.upsert({
            where: {
              careerNoteId_conversationId: { careerNoteId, conversationId },
            },
            create: { careerNoteId, conversationId },
            update: {},
          }),
        ])
        return `커리어노트 "${title}"이(가) 갱신되었습니다.`
      } else {
        await prisma.$transaction(async (tx) => {
          const note = await tx.careerNote.create({
            data: {
              userId,
              title,
              content,
              summary,
              metadata: metadata ?? undefined,
              status: "CONFIRMED",
            },
          })
          await tx.careerNoteSource.create({
            data: { careerNoteId: note.id, conversationId },
          })
        })
        return `커리어노트 "${title}"이(가) 저장되었습니다.`
      }
    },
  })
}
