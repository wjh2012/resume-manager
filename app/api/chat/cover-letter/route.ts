import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { getLanguageModel, AiSettingsNotFoundError } from "@/lib/ai/provider"
import { buildFullContext } from "@/lib/ai/context"
import { buildCoverLetterSystemPrompt } from "@/lib/ai/prompts/cover-letter"
import { coverLetterChatSchema } from "@/lib/validations/cover-letter"
import { recordUsage } from "@/lib/token-usage/service"
import { checkQuotaExceeded } from "@/lib/token-usage/quota"
import { compressIfNeeded, buildOnFinish } from "@/lib/ai/pipeline"

export const maxDuration = 120

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
        coverLetterExternalDocs: {
          select: { externalDocumentId: true },
        },
      },
    })

    if (!coverLetter || coverLetter.userId !== user.id) {
      return NextResponse.json(
        { error: "자기소개서를 찾을 수 없습니다." },
        { status: 404 },
      )
    }

    const allowedExternalDocIds = coverLetter.coverLetterExternalDocs.map(
      (d) => d.externalDocumentId,
    )

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
      .map((p: { text?: string }) => p.text ?? "")
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
      buildFullContext(user.id, {
        selectedDocumentIds,
        selectedExternalDocumentIds: allowedExternalDocIds,
        includeCareerNotes: true,
      }),
      getLanguageModel(user.id),
    ])

    // 시스템 프롬프트 생성
    const system = buildCoverLetterSystemPrompt({
      companyName: coverLetter.companyName,
      position: coverLetter.position,
      context,
    })

    const modelMessages = await convertToModelMessages(
      messages as UIMessage[],
    )

    const onFinish = buildOnFinish({
      conversationId, lastMessageRole: lastMessage.role, lastMessageContent,
      userId: user.id, aiProvider, modelId, isServerKey,
      feature: "COVER_LETTER",
    })

    // 압축 확인
    const { messages: finalMessages, usage: compressUsage } = await compressIfNeeded({
      model, modelId, provider: aiProvider, system, messages: modelMessages,
    })
    if (compressUsage) {
      recordUsage({
        userId: user.id, provider: aiProvider, model: modelId,
        feature: "COVER_LETTER",
        promptTokens: compressUsage.inputTokens,
        completionTokens: compressUsage.outputTokens,
        totalTokens: compressUsage.inputTokens + compressUsage.outputTokens,
        isServerKey, metadata: { conversationId },
      }).catch((e) => console.error("compress 토큰 기록 실패:", e))
    }

    // 응답 생성
    const result = streamText({ model, system, messages: finalMessages, onFinish })
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

