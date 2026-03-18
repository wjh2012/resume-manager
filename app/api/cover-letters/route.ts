import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createCoverLetterSchema } from "@/lib/validations/cover-letter"
import { createCoverLetter, CoverLetterForbiddenError } from "@/lib/cover-letters/service"

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

  const parsed = createCoverLetterSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "유효하지 않은 입력입니다." },
      { status: 400 },
    )
  }

  try {
    const result = await createCoverLetter(user.id, parsed.data)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof CoverLetterForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[POST /api/cover-letters]", error)
    return NextResponse.json(
      { error: "자기소개서 생성에 실패했습니다." },
      { status: 500 },
    )
  }
}
