import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { extractInsightsSchema } from "@/lib/validations/insight"
import {
  extractInsights,
  InsightNotFoundError,
} from "@/lib/insights/service"
import { AiSettingsNotFoundError } from "@/lib/ai/provider"

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

  const parsed = extractInsightsSchema.safeParse(body)
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
    const insights = await extractInsights(user.id, parsed.data.conversationId)
    return NextResponse.json({ insights })
  } catch (error) {
    if (error instanceof InsightNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof AiSettingsNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("[POST /api/insights/extract]", error)
    return NextResponse.json(
      { error: "인사이트 추출에 실패했습니다." },
      { status: 500 },
    )
  }
}
