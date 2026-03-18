import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { updateSelectedDocumentsSchema } from "@/lib/validations/cover-letter"
import {
  updateSelectedDocuments,
  CoverLetterNotFoundError,
  CoverLetterForbiddenError,
} from "@/lib/cover-letters/service"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(
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

  const parsed = updateSelectedDocumentsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "유효하지 않은 입력입니다." },
      { status: 400 },
    )
  }

  try {
    await updateSelectedDocuments(id, user.id, parsed.data.documentIds)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof CoverLetterNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof CoverLetterForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[PATCH /api/cover-letters/[id]/documents]", error)
    return NextResponse.json(
      { error: "참고 문서 변경에 실패했습니다." },
      { status: 500 },
    )
  }
}
