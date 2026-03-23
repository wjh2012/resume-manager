import { redirect } from "next/navigation"
import { getAuthUser } from "@/lib/supabase/user"
import { listDocuments } from "@/lib/documents/service"
import { CoverLetterForm } from "@/components/cover-letters/cover-letter-form"

export default async function NewCoverLetterPage() {
  const user = await getAuthUser()

  if (!user) redirect("/login")

  const documents = await listDocuments(user.id)

  const serialized = documents.map((doc) => ({
    id: doc.id,
    title: doc.title,
    type: doc.type,
    summary: doc.summary,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-balance">새 자기소개서</h1>
        <p className="text-muted-foreground mt-1">
          기업 정보를 입력하고 AI와 함께 자기소개서를 작성하세요
        </p>
      </div>

      <CoverLetterForm documents={serialized} />
    </div>
  )
}
