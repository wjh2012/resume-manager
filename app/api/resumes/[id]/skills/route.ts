import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { skillsSchema } from "@/lib/validations/resume"
import { UUID_RE } from "@/lib/utils"
import {
  replaceSkills,
  ResumeNotFoundError,
  ResumeForbiddenError,
} from "@/lib/resumes/service"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  const { id } = await params

  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: "잘못된 이력서 ID 형식입니다." },
      { status: 400 },
    )
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

  const parsed = skillsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "유효하지 않은 입력입니다." },
      { status: 400 },
    )
  }

  try {
    const result = await replaceSkills(id, user.id, parsed.data.items)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ResumeNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof ResumeForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[PUT /api/resumes/[id]/skills]", error)
    return NextResponse.json(
      { error: "기술 저장에 실패했습니다." },
      { status: 500 },
    )
  }
}
