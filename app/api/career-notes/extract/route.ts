import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { extractCareerNotesSchema } from "@/lib/validations/career-note"
import { extractCareerNotes } from "@/lib/career-notes/service"
import { ConversationNotFoundError } from "@/lib/career-notes/errors"
import { AiSettingsNotFoundError } from "@/lib/ai/provider"
import { QuotaExceededError } from "@/lib/token-usage/quota"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    )
  }

  const parsed = extractCareerNotesSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "유효하지 않은 입력입니다.",
      },
      { status: 400 },
    )
  }

  try {
    const result = await extractCareerNotes(user.id, parsed.data.conversationId)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ConversationNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof QuotaExceededError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error instanceof AiSettingsNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("[POST /api/career-notes/extract]", error)
    return NextResponse.json(
      { error: "커리어노트 추출에 실패했습니다." },
      { status: 500 },
    )
  }
}
