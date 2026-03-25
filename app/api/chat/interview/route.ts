import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { getLanguageModel, AiSettingsNotFoundError } from "@/lib/ai/provider"
import { buildFullContext } from "@/lib/ai/context"
import { buildInterviewSystemPrompt } from "@/lib/ai/prompts/interview"
import { interviewChatSchema } from "@/lib/validations/interview"
import { recordUsage } from "@/lib/token-usage/service"
import { checkQuotaExceeded } from "@/lib/token-usage/quota"
import { compressIfNeeded, buildOnFinish } from "@/lib/ai/pipeline"
import { extractLastMessageContent } from "@/lib/ai/messages"

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

  const parsed = interviewChatSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "유효하지 않은 입력입니다." },
      { status: 400 },
    )
  }

  const { messages, conversationId, interviewSessionId } = parsed.data

  try {
    // InterviewSession 로드 (기업 정보)
    const session = await prisma.interviewSession.findUnique({
      where: { id: interviewSessionId },
      select: { userId: true, companyName: true, position: true, status: true },
    })

    if (!session || session.userId !== user.id) {
      return NextResponse.json(
        { error: "면접 세션을 찾을 수 없습니다." },
        { status: 404 },
      )
    }

    if (session.status === "COMPLETED") {
      return NextResponse.json(
        { error: "종료된 면접 세션입니다." },
        { status: 400 },
      )
    }

    // conversationId 소유권 + 세션 연결 검증
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId: true, interviewSessionId: true },
    })

    if (
      !conversation ||
      conversation.userId !== user.id ||
      conversation.interviewSessionId !== interviewSessionId
    ) {
      return NextResponse.json(
        { error: "대화를 찾을 수 없습니다." },
        { status: 404 },
      )
    }

    // 허용된 문서 ID 목록 조회 (문서 격리 핵심)
    const allowedDocs = await prisma.interviewDocument.findMany({
      where: { interviewSessionId },
      select: { documentId: true },
    })
    const allowedDocIds = allowedDocs.map((d) => d.documentId)

    // 허용된 외부 문서 ID 목록 조회
    const allowedExtDocs = await prisma.interviewExternalDoc.findMany({
      where: { interviewSessionId },
      select: { externalDocumentId: true },
    })
    const allowedExternalDocIds = allowedExtDocs.map((d) => d.externalDocumentId)

    // 마지막 user 메시지 텍스트 추출
    const lastMessage = messages[messages.length - 1]
    const lastMessageContent = extractLastMessageContent(messages)

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
        selectedDocumentIds: allowedDocIds,
        selectedExternalDocumentIds: allowedExternalDocIds,
        // includeCareerNotes 미전달 (기본값 undefined → false)
      }),
      getLanguageModel(user.id),
    ])

    const system = buildInterviewSystemPrompt({
      companyName: session.companyName ?? undefined,
      position: session.position ?? undefined,
      context,
    })

    const modelMessages = await convertToModelMessages(messages as UIMessage[])

    const onFinish = buildOnFinish({
      conversationId, lastMessageRole: lastMessage.role, lastMessageContent,
      userId: user.id, aiProvider, modelId, isServerKey,
      feature: "INTERVIEW",
    })

    // 압축 확인
    const { messages: finalMessages, usage: compressUsage } = await compressIfNeeded({
      model, modelId, provider: aiProvider, system, messages: modelMessages,
    })
    if (compressUsage) {
      recordUsage({
        userId: user.id, provider: aiProvider, model: modelId,
        feature: "INTERVIEW",
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
    console.error("[POST /api/chat/interview]", error)
    return NextResponse.json(
      { error: "채팅 응답 생성에 실패했습니다." },
      { status: 500 },
    )
  }
}
