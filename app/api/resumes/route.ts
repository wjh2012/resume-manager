import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createResumeSchema } from "@/lib/validations/resume"
import { createResume } from "@/lib/resumes/service"

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

  const parsed = createResumeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "유효하지 않은 입력입니다." },
      { status: 400 },
    )
  }

  try {
    const result = await createResume(user.id, parsed.data)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("[POST /api/resumes]", error)
    return NextResponse.json(
      { error: "이력서 생성에 실패했습니다." },
      { status: 500 },
    )
  }
}
