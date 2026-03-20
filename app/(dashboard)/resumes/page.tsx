import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus } from "lucide-react"
import { getAuthUser } from "@/lib/supabase/user"
import { listResumes } from "@/lib/resumes/service"
import { ResumeList } from "@/components/resumes/resume-list"
import { Button } from "@/components/ui/button"

async function ResumeListSection({ userId }: { userId: string }) {
  const resumes = await listResumes(userId)

  const serialized = resumes.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }))

  return <ResumeList resumes={serialized} />
}

export default async function ResumesPage() {
  const user = await getAuthUser()

  if (!user) redirect("/login")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-balance">이력서</h1>
          <p className="text-muted-foreground mt-1">
            이력서를 작성하고 PDF로 내보냅니다
          </p>
        </div>
        <Button asChild>
          <Link href="/resumes/new">
            <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
            새 이력서
          </Link>
        </Button>
      </div>

      <Suspense fallback={<p className="text-muted-foreground py-12 text-center">불러오는 중...</p>}>
        <ResumeListSection userId={user.id} />
      </Suspense>
    </div>
  )
}
