import { Suspense } from "react"
import { notFound, redirect } from "next/navigation"
import { BackToListLink } from "@/components/shared/back-to-list-link"

import { getAuthUser } from "@/lib/supabase/user"
import { getDocument } from "@/lib/documents/service"
import { DOCUMENT_TYPE_LABELS } from "@/lib/validations/document"
import { formatFileSize } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { DeleteButton } from "@/components/documents/delete-button"
import { SummarySection } from "@/components/documents/summary-section"
import type { DocumentType } from "@/lib/validations/document"

async function DocumentContent({
  id,
  userId,
}: {
  id: string
  userId: string
}) {
  const document = await getDocument(id, userId)

  if (!document) notFound()

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex shrink-0 items-center gap-4">
        <BackToListLink href="/documents" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-bold">{document.title}</h1>
            <Badge variant="secondary">
              {DOCUMENT_TYPE_LABELS[document.type as DocumentType] ?? document.type}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {formatFileSize(document.fileSize)} ·{" "}
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

      <SummarySection
        documentId={document.id}
        initialSummary={document.summary}
      />

      <div className="flex min-h-0 flex-1 flex-col rounded-lg border">
        <div className="shrink-0 border-b px-4 py-3">
          <h2 className="font-medium">추출된 텍스트</h2>
        </div>
        <ScrollArea className="min-h-0 flex-1">
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

function DocumentDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-16" />
      </div>
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-2 p-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    </div>
  )
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [user, { id }] = await Promise.all([getAuthUser(), params])

  if (!user) redirect("/login")

  return (
    <Suspense fallback={<DocumentDetailSkeleton />}>
      <DocumentContent id={id} userId={user.id} />
    </Suspense>
  )
}
