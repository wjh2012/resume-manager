import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { validateApiKey, ApiKeyValidationError } from "@/lib/ai/models"
import { apiKeyValidateSchema } from "@/lib/validations/ai-settings"

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
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    )
  }

  const parsed = apiKeyValidateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "유효하지 않은 입력입니다." },
      { status: 400 },
    )
  }

  try {
    await validateApiKey(parsed.data.provider, parsed.data.apiKey.trim())
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
