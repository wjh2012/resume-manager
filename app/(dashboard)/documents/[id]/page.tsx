import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { getDocument } from "@/lib/documents/service"
import { DOCUMENT_TYPE_LABELS } from "@/lib/validations/document"
import { formatFileSize } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DeleteButton } from "@/components/documents/delete-button"
import type { DocumentType } from "@/lib/validations/document"

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { id } = await params
  const document = await getDocument(id, user.id)

  if (!document) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild aria-label="문서 목록으로 돌아가기">
          <Link href="/documents">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{document.title}</h1>
            <Badge variant="secondary">
              {DOCUMENT_TYPE_LABELS[document.type as DocumentType] ?? document.type}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {formatFileSize(document.fileSize)} · {document._count.chunks}개
            청크 ·{" "}
            {new Date(document.createdAt).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <DeleteButton
          documentId={document.id}
          documentTitle={document.title}
        />
      </div>

      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h2 className="font-medium">추출된 텍스트</h2>
        </div>
        <ScrollArea className="h-[calc(100vh-16rem)]">
          <div className="p-4">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed">
              {document.extractedText ?? "텍스트가 추출되지 않았습니다."}
            </pre>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
