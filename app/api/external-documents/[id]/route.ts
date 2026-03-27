import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { UUID_RE } from "@/lib/utils"
import {
  getExternalDocument,
  updateExternalDocument,
  deleteExternalDocument,
  ExternalDocumentNotFoundError,
  ExternalDocumentValidationError,
} from "@/lib/external-documents/service"
import { updateExternalDocumentSchema } from "@/lib/validations/external-document"

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
      { error: "잘못된 외부 문서 ID 형식입니다." },
      { status: 400 },
    )
  }

  try {
    const document = await getExternalDocument(id, user.id)

    if (!document) {
      return NextResponse.json(
        { error: "외부 문서를 찾을 수 없습니다." },
        { status: 404 },
      )
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error("[GET /api/external-documents/[id]]", error)
    return NextResponse.json(
      { error: "외부 문서를 불러오는데 실패했습니다." },
      { status: 500 },
    )
  }
}

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
      { error: "잘못된 외부 문서 ID 형식입니다." },
      { status: 400 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "유효하지 않은 요청입니다." }, { status: 400 })
  }

  const parsed = updateExternalDocumentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "유효하지 않은 요청입니다." },
      { status: 400 },
    )
  }

  try {
    const result = await updateExternalDocument(id, user.id, parsed.data)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ExternalDocumentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof ExternalDocumentValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("[PATCH /api/external-documents/[id]]", error)
    return NextResponse.json(
      { error: "외부 문서 수정에 실패했습니다." },
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
      { error: "잘못된 외부 문서 ID 형식입니다." },
      { status: 400 },
    )
  }

  try {
    await deleteExternalDocument(id, user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ExternalDocumentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("[DELETE /api/external-documents/[id]]", error)
    return NextResponse.json(
      { error: "외부 문서 삭제에 실패했습니다." },
      { status: 500 },
    )
  }
}
