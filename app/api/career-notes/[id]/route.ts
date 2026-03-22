import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { updateCareerNoteSchema } from "@/lib/validations/career-note"
import { UUID_RE } from "@/lib/utils"
import {
  updateCareerNote,
  deleteCareerNote,
} from "@/lib/career-notes/service"
import {
  CareerNoteNotFoundError,
  CareerNoteForbiddenError,
} from "@/lib/career-notes/errors"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: "잘못된 커리어노트 ID 형식입니다." },
      { status: 400 },
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

  const parsed = updateCareerNoteSchema.safeParse(body)
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
    await updateCareerNote(user.id, id, parsed.data)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof CareerNoteNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof CareerNoteForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[PUT /api/career-notes/[id]]", error)
    return NextResponse.json(
      { error: "커리어노트 수정에 실패했습니다." },
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
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 },
    )
  }

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: "잘못된 커리어노트 ID 형식입니다." },
      { status: 400 },
    )
  }

  try {
    await deleteCareerNote(user.id, id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof CareerNoteNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof CareerNoteForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[DELETE /api/career-notes/[id]]", error)
    return NextResponse.json(
      { error: "커리어노트 삭제에 실패했습니다." },
      { status: 500 },
    )
  }
}
