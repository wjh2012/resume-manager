import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAiSettingsForApi, updateAiSettings } from "@/lib/settings/service"
import { aiSettingsUpdateSchema } from "@/lib/validations/ai-settings"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  try {
    const settings = await getAiSettingsForApi(user.id)
    return NextResponse.json(settings)
  } catch (error) {
    console.error("[GET /api/settings/ai]", error)
    return NextResponse.json(
      { error: "설정을 불러오는데 실패했습니다." },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
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

  try {
    const parsed = aiSettingsUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "유효하지 않은 입력입니다." },
        { status: 400 },
      )
    }

    const settings = await updateAiSettings(user.id, parsed.data)
    return NextResponse.json(settings)
  } catch (error) {
    console.error("[PUT /api/settings/ai]", error)
    return NextResponse.json(
      { error: "설정 저장에 실패했습니다." },
      { status: 500 },
    )
  }
}
