import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { updateCoverLetterSchema } from "@/lib/validations/cover-letter"
import {
  getCoverLetter,
  updateCoverLetter,
  deleteCoverLetter,
  CoverLetterNotFoundError,
  CoverLetterForbiddenError,
} from "@/lib/cover-letters/service"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
      { error: "잘못된 자기소개서 ID 형식입니다." },
      { status: 400 },
    )
  }

  try {
    const coverLetter = await getCoverLetter(id, user.id)

    if (!coverLetter) {
      return NextResponse.json(
        { error: "자기소개서를 찾을 수 없습니다." },
        { status: 404 },
      )
    }

    return NextResponse.json(coverLetter)
  } catch (error) {
    console.error("[GET /api/cover-letters/[id]]", error)
    return NextResponse.json(
      { error: "자기소개서를 불러오는데 실패했습니다." },
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
      { error: "잘못된 자기소개서 ID 형식입니다." },
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

  const parsed = updateCoverLetterSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "유효하지 않은 입력입니다." },
      { status: 400 },
    )
  }

  try {
    const result = await updateCoverLetter(id, user.id, parsed.data)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof CoverLetterNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof CoverLetterForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[PUT /api/cover-letters/[id]]", error)
    return NextResponse.json(
      { error: "자기소개서 수정에 실패했습니다." },
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
      { error: "잘못된 자기소개서 ID 형식입니다." },
      { status: 400 },
    )
  }

  try {
    await deleteCoverLetter(id, user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof CoverLetterNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof CoverLetterForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[DELETE /api/cover-letters/[id]]", error)
    return NextResponse.json(
      { error: "자기소개서 삭제에 실패했습니다." },
      { status: 500 },
    )
  }
}
