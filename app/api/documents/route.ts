import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { uploadDocument, listDocuments } from "@/lib/documents/service"

export const maxDuration = 60

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const title = formData.get("title") as string | null

  if (!file) {
    return NextResponse.json(
      { error: "파일이 필요합니다." },
      { status: 400 },
    )
  }

  if (!title?.trim()) {
    return NextResponse.json(
      { error: "제목이 필요합니다." },
      { status: 400 },
    )
  }

  try {
    const result = await uploadDocument(user.id, file, title.trim())
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "문서 업로드에 실패했습니다."
    return NextResponse.json({ error: message }, { status: 500 })
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

  const documents = await listDocuments(user.id)
  return NextResponse.json(documents)
}
