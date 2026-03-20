import { redirect } from "next/navigation"
import { getAuthUser } from "@/lib/supabase/user"
import { ResumeCreateForm } from "@/components/resumes/resume-create-form"

export default async function NewResumePage() {
  const user = await getAuthUser()

  if (!user) redirect("/login")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-balance">새 이력서</h1>
        <p className="text-muted-foreground mt-1">
          이력서 제목과 템플릿을 선택하세요
        </p>
      </div>

      <ResumeCreateForm />
    </div>
  )
}
