import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { NextResponse } from "next/server"
import { MessageRole } from "@prisma/client"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { getLanguageModel, AiSettingsNotFoundError } from "@/lib/ai/provider"
import { buildContext } from "@/lib/ai/context"
import { buildCoverLetterSystemPrompt } from "@/lib/ai/prompts/cover-letter"
import { createReadDocumentTool, createReadCareerNoteTool, createSaveCareerNoteTool, calculateMaxSteps } from "@/lib/ai/tools"
import { coverLetterChatSchema } from "@/lib/validations/cover-letter"
import { recordUsage } from "@/lib/token-usage/service"
import { checkQuotaExceeded } from "@/lib/token-usage/quota"

export const maxDuration = 60

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "유효하지 않은 요청입니다." },
      { status: 400 },
    )
  }

  const parsed = coverLetterChatSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "유효하지 않은 입력입니다." },
      { status: 400 },
    )
  }

  const { messages, conversationId, coverLetterId, selectedDocumentIds } =
    parsed.data

  try {
    // CoverLetter 로드 (기업 정보)
    const coverLetter = await prisma.coverLetter.findUnique({
      where: { id: coverLetterId },
      select: {
        userId: true,
        companyName: true,
        position: true,
        jobPostingText: true,
      },
    })

    if (!coverLetter || coverLetter.userId !== user.id) {
      return NextResponse.json(
        { error: "자기소개서를 찾을 수 없습니다." },
        { status: 404 },
      )
    }

    // conversationId 소유권 검증
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId: true, coverLetterId: true },
    })

    if (!conversation || conversation.userId !== user.id || conversation.coverLetterId !== coverLetterId) {
      return NextResponse.json(
        { error: "대화를 찾을 수 없습니다." },
        { status: 404 },
      )
    }

    // 마지막 user 메시지 추출
    const lastMessage = messages[messages.length - 1]
    const lastMessageContent = lastMessage.parts
      ?.filter((p: { type: string }) => p.type === "text")
      .map((p: { text: string }) => p.text)
      .join("") || lastMessage.content || ""

    const quotaResult = await checkQuotaExceeded(user.id)
    if (quotaResult.exceeded) {
      return NextResponse.json(
        { error: "사용 한도를 초과했습니다." },
        { status: 403 },
      )
    }

    // 문서 요약 컨텍스트 + 모델 병렬 로드
    const [context, { model, isServerKey, provider: aiProvider, modelId }] = await Promise.all([
      buildContext(user.id, {
        selectedDocumentIds,
        includeCareerNotes: true,
      }),
      getLanguageModel(user.id),
    ])

    // 시스템 프롬프트 생성
    const system = buildCoverLetterSystemPrompt({
      companyName: coverLetter.companyName,
      position: coverLetter.position,
      jobPostingText: coverLetter.jobPostingText ?? undefined,
      context,
    })

    const careerNoteCount = await prisma.careerNote.count({
      where: { userId: user.id, status: "CONFIRMED" },
    })

    const modelMessages = await convertToModelMessages(
      messages as UIMessage[],
    )

    const result = streamText({
      model,
      system,
      messages: modelMessages,
      tools: {
        readDocument: createReadDocumentTool(user.id, selectedDocumentIds ?? []),
        readCareerNote: createReadCareerNoteTool(user.id),
        saveCareerNote: createSaveCareerNoteTool(user.id, conversationId),
      },
      stopWhen: calculateMaxSteps(selectedDocumentIds?.length ?? 0, careerNoteCount),
      onFinish: async ({ text, usage }) => {
        // USER + ASSISTANT 메시지를 트랜잭션으로 원자적 저장
        const ops = [
          ...(lastMessage.role === "user" && lastMessageContent
            ? [
                prisma.message.create({
                  data: { conversationId, role: MessageRole.USER, content: lastMessageContent },
                }),
              ]
            : []),
          ...(text
            ? [
                prisma.message.create({
                  data: { conversationId, role: MessageRole.ASSISTANT, content: text },
                }),
              ]
            : []),
        ]
        if (ops.length > 0) {
          await prisma.$transaction(ops)
        }

        // 토큰 사용량 기록
        if (usage) {
          await recordUsage({
            userId: user.id,
            provider: aiProvider,
            model: modelId,
            feature: "COVER_LETTER",
            promptTokens: usage.inputTokens ?? 0,
            completionTokens: usage.outputTokens ?? 0,
            totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
            isServerKey,
            metadata: { conversationId },
          }).catch((e) => console.error("토큰 사용량 기록 실패:", e))
        }
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    if (error instanceof AiSettingsNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("[POST /api/chat/cover-letter]", error)
    return NextResponse.json(
      { error: "채팅 응답 생성에 실패했습니다." },
      { status: 500 },
    )
  }
}
