import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { getLanguageModel, AiSettingsNotFoundError } from "@/lib/ai/provider"
import { buildContext } from "@/lib/ai/context"
import { buildCoverLetterSystemPrompt } from "@/lib/ai/prompts/cover-letter"

export const maxDuration = 60

const requestSchema = z.object({
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(["user", "assistant"]),
    content: z.string().optional().default(""),
    parts: z.array(z.any()).optional(),
  })).min(1, "메시지가 필요합니다."),
  conversationId: z.string().uuid(),
  coverLetterId: z.string().uuid(),
  selectedDocumentIds: z.array(z.string().uuid()).optional(),
})

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

  const parsed = requestSchema.safeParse(body)
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

    // RAG 컨텍스트, 모델, user 메시지 저장을 병렬 실행
    // 세 번째 요소(메시지 저장)는 결과가 필요 없으므로 destructure 생략
    const [context, model] = await Promise.all([
      buildContext(user.id, {
        query: lastMessageContent,
        selectedDocumentIds,
        includeInsights: true,
      }),
      getLanguageModel(user.id),
      lastMessage.role === "user" && lastMessageContent
        ? prisma.message.create({
            data: {
              conversationId,
              role: "USER",
              content: lastMessageContent,
            },
          })
        : Promise.resolve(),
    ])

    // 시스템 프롬프트 생성
    const system = buildCoverLetterSystemPrompt({
      companyName: coverLetter.companyName,
      position: coverLetter.position,
      jobPostingText: coverLetter.jobPostingText ?? undefined,
      context,
    })

    const modelMessages = await convertToModelMessages(
      messages as UIMessage[],
    )

    const result = streamText({
      model,
      system,
      messages: modelMessages,
      onFinish: async ({ text }) => {
        await prisma.message.create({
          data: {
            conversationId,
            role: "ASSISTANT",
            content: text,
          },
        })
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
