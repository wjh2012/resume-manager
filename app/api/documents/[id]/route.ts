import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  getDocument,
  deleteDocument,
  DocumentNotFoundError,
  DocumentForbiddenError,
} from "@/lib/documents/service"

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

  const document = await getDocument(id, user.id)

  if (!document) {
    return NextResponse.json(
      { error: "문서를 찾을 수 없습니다." },
      { status: 404 },
    )
  }

  return NextResponse.json(document)
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

  try {
    await deleteDocument(id, user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof DocumentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof DocumentForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    const message =
      error instanceof Error ? error.message : "문서 삭제에 실패했습니다."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
