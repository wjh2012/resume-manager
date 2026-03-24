import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  createExternalDocumentFromText,
  createExternalDocumentFromFile,
  listExternalDocuments,
  ExternalDocumentValidationError,
} from "@/lib/external-documents/service"
import {
  createExternalDocumentSchema,
  externalDocumentUploadSchema,
} from "@/lib/validations/external-document"

export const maxDuration = 60

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  const contentType = request.headers.get("content-type") ?? ""

  // 파일 업로드 (multipart/form-data)
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData()
    const fileEntry = formData.get("file")
    const file =
      fileEntry !== null && typeof fileEntry === "object" && "name" in fileEntry
        ? (fileEntry as File)
        : null
    const title = formData.get("title") as string | null
    const category = formData.get("category") as string | null

    if (!file) {
      return NextResponse.json(
        { error: "파일이 필요합니다." },
        { status: 400 },
      )
    }

    const parsed = externalDocumentUploadSchema.safeParse({
      title: title ?? "",
      category: category ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "유효하지 않은 요청입니다." },
        { status: 400 },
      )
    }

    try {
      const result = await createExternalDocumentFromFile(
        user.id,
        file,
        parsed.data.title,
        parsed.data.category,
      )
      return NextResponse.json(result, { status: 201 })
    } catch (error) {
      if (error instanceof ExternalDocumentValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      console.error("[POST /api/external-documents] file upload", error)
      return NextResponse.json(
        { error: "외부 문서 업로드에 실패했습니다." },
        { status: 500 },
      )
    }
  }

  // 텍스트 입력 (application/json)
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "유효하지 않은 요청입니다." }, { status: 400 })
  }

  const parsed = createExternalDocumentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "유효하지 않은 요청입니다." },
      { status: 400 },
    )
  }

  try {
    const result = await createExternalDocumentFromText(user.id, parsed.data)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof ExternalDocumentValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("[POST /api/external-documents] text", error)
    return NextResponse.json(
      { error: "외부 문서 생성에 실패했습니다." },
      { status: 500 },
    )
  }
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  try {
    const documents = await listExternalDocuments(user.id)
    return NextResponse.json(documents)
  } catch (error) {
    console.error("[GET /api/external-documents]", error)
    return NextResponse.json(
      { error: "외부 문서 목록을 불러오는데 실패했습니다." },
      { status: 500 },
    )
  }
}
