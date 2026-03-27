import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { UUID_RE } from "@/lib/utils"
import {
  getDocument,
  deleteDocument,
  DocumentNotFoundError,
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

  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: "잘못된 문서 ID 형식입니다." },
      { status: 400 },
    )
  }

  try {
    const document = await getDocument(id, user.id)

    if (!document) {
      return NextResponse.json(
        { error: "문서를 찾을 수 없습니다." },
        { status: 404 },
      )
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error("[GET /api/documents/[id]]", error)
    return NextResponse.json(
      { error: "문서를 불러오는데 실패했습니다." },
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
      { error: "잘못된 문서 ID 형식입니다." },
      { status: 400 },
    )
  }

  try {
    await deleteDocument(id, user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof DocumentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("[DELETE /api/documents/[id]]", error)
    return NextResponse.json(
      { error: "문서 삭제에 실패했습니다." },
      { status: 500 },
    )
  }
}
