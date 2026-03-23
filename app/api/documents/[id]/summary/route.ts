import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { generateDocumentSummary } from "@/lib/documents/summary"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  const { id } = await params
  const document = await prisma.document.findUnique({
    where: { id },
    select: { userId: true, extractedText: true },
  })

  if (!document || document.userId !== user.id) {
    return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 })
  }

  if (!document.extractedText) {
    return NextResponse.json({ error: "추출된 텍스트가 없습니다." }, { status: 400 })
  }

  const { summary } = await generateDocumentSummary(user.id, document.extractedText)
  if (summary) {
    await prisma.document.update({ where: { id }, data: { summary } })
  }

  return NextResponse.json({ summary })
}
