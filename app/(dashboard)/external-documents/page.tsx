import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getAuthUser } from "@/lib/supabase/user"
import { listExternalDocuments } from "@/lib/external-documents/service"
import { ExternalDocumentList } from "@/components/external-documents/external-document-list"
import { UploadDialog } from "@/components/external-documents/upload-dialog"
import { DocumentListSkeleton } from "@/components/documents/document-list-skeleton"

async function ExternalDocumentListSection({ userId }: { userId: string }) {
  const documents = await listExternalDocuments(userId)

  const serialized = documents.map((doc) => ({
    ...doc,
    createdAt: doc.createdAt.toISOString(),
  }))

  return <ExternalDocumentList documents={serialized} />
}

export default async function ExternalDocumentsPage() {
  const user = await getAuthUser()

  if (!user) redirect("/login")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-balance">외부 문서</h1>
          <p className="text-muted-foreground mt-1">
            채용공고, 기업 정보 등 외부 문서를 관리합니다
          </p>
        </div>
        <UploadDialog />
      </div>

      <Suspense fallback={<DocumentListSkeleton />}>
        <ExternalDocumentListSection userId={user.id} />
      </Suspense>
    </div>
  )
}
