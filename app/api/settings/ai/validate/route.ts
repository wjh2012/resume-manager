import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { validateApiKey, ApiKeyValidationError } from "@/lib/ai/models"
import { AI_PROVIDERS, type AIProvider } from "@/types/ai"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { provider, apiKey } = body

    if (!provider || !AI_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: "유효하지 않은 제공자입니다." },
        { status: 400 },
      )
    }

    if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
      return NextResponse.json(
        { error: "API 키를 입력해주세요." },
        { status: 400 },
      )
    }

    await validateApiKey(provider as AIProvider, apiKey.trim())
    return NextResponse.json({ valid: true })
  } catch (error) {
    if (error instanceof ApiKeyValidationError) {
      return NextResponse.json(
        { error: error.message, valid: false },
        { status: 400 },
      )
    }
    console.error("[POST /api/settings/ai/validate]", error)
    return NextResponse.json(
      { error: "API 키 검증에 실패했습니다.", valid: false },
      { status: 500 },
    )
  }
}
