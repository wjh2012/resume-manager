import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getAuthUser } from "@/lib/supabase/user"
import { listDocuments } from "@/lib/documents/service"
import { DocumentList } from "@/components/documents/document-list"
import { UploadDialog } from "@/components/documents/upload-dialog"
import { DocumentListSkeleton } from "@/components/documents/document-list-skeleton"

async function DocumentListSection({ userId }: { userId: string }) {
  const documents = await listDocuments(userId)

  // Date를 직렬화 가능한 형태로 변환
  const serialized = documents.map((doc) => ({
    ...doc,
    createdAt: doc.createdAt.toISOString(),
  }))

  return <DocumentList documents={serialized} />
}

export default async function DocumentsPage() {
  const user = await getAuthUser()

  if (!user) redirect("/login")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">참고자료</h1>
          <p className="text-muted-foreground mt-1">
            이력서, 경력기술서 등 참고 문서를 관리합니다
          </p>
        </div>
        <UploadDialog />
      </div>

      <Suspense fallback={<DocumentListSkeleton />}>
        <DocumentListSection userId={user.id} />
      </Suspense>
    </div>
  )
}
