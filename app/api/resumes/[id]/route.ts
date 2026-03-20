import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { updateResumeSchema } from "@/lib/validations/resume"
import { UUID_RE } from "@/lib/utils"
import {
  getResume,
  updateResume,
  deleteResume,
  ResumeNotFoundError,
  ResumeForbiddenError,
} from "@/lib/resumes/service"

export async function GET(
  _request: Request,
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

  try {
    const resume = await getResume(id, user.id)

    if (!resume) {
      return NextResponse.json(
        { error: "이력서를 찾을 수 없습니다." },
        { status: 404 },
      )
    }

    return NextResponse.json(resume)
  } catch (error) {
    console.error("[GET /api/resumes/[id]]", error)
    return NextResponse.json(
      { error: "이력서를 불러오는데 실패했습니다." },
      { status: 500 },
    )
  }
}

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

  const parsed = updateResumeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "유효하지 않은 입력입니다." },
      { status: 400 },
    )
  }

  try {
    const result = await updateResume(id, user.id, parsed.data)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ResumeNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof ResumeForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[PUT /api/resumes/[id]]", error)
    return NextResponse.json(
      { error: "이력서 수정에 실패했습니다." },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: Request,
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

  try {
    await deleteResume(id, user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ResumeNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof ResumeForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[DELETE /api/resumes/[id]]", error)
    return NextResponse.json(
      { error: "이력서 삭제에 실패했습니다." },
      { status: 500 },
    )
  }
}
