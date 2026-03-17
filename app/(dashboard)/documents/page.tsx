import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { listDocuments } from "@/lib/documents/service"
import { DocumentList } from "@/components/documents/document-list"
import { UploadDialog } from "@/components/documents/upload-dialog"

export default async function DocumentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const documents = await listDocuments(user.id)

  // Date를 직렬화 가능한 형태로 변환
  const serialized = documents.map((doc) => ({
    ...doc,
    createdAt: doc.createdAt.toISOString(),
  }))

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

      <DocumentList documents={serialized} />
    </div>
  )
}
