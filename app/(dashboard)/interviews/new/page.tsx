import { redirect } from "next/navigation"
import { getAuthUser } from "@/lib/supabase/user"
import { listDocuments } from "@/lib/documents/service"
import { listExternalDocuments } from "@/lib/external-documents/service"
import { InterviewForm } from "@/components/interviews/interview-form"

export default async function NewInterviewPage() {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const [documents, externalDocuments] = await Promise.all([
    listDocuments(user.id),
    listExternalDocuments(user.id),
  ])

  const serializedDocs = documents.map((doc) => ({
    id: doc.id,
    title: doc.title,
    type: doc.type,
    summary: doc.summary,
  }))

  const serializedExtDocs = externalDocuments.map((doc) => ({
    id: doc.id,
    title: doc.title,
    category: doc.category,
    sourceType: doc.sourceType,
    summary: doc.summary,
  }))

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">새 모의면접</h1>
        <p className="text-muted-foreground mt-1">
          면접 정보와 참고할 문서를 선택하세요
        </p>
      </div>
      <InterviewForm documents={serializedDocs} externalDocuments={serializedExtDocs} />
    </div>
  )
}
