import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus } from "lucide-react"
import { getAuthUser } from "@/lib/supabase/user"
import { listResumes } from "@/lib/resumes/service"
import { ResumeList } from "@/components/resumes/resume-list"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

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

      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="space-y-3 rounded-xl border p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        }
      >
        <ResumeListSection userId={user.id} />
      </Suspense>
    </div>
  )
}
