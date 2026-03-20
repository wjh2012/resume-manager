import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus } from "lucide-react"
import { getAuthUser } from "@/lib/supabase/user"
import { listInterviews } from "@/lib/interviews/service"
import { InterviewList } from "@/components/interviews/interview-list"
import { InterviewListSkeleton } from "@/components/interviews/interview-list-skeleton"
import { Button } from "@/components/ui/button"

async function InterviewListSection({ userId }: { userId: string }) {
  const sessions = await listInterviews(userId)

  const serialized = sessions.map((s) => ({
    ...s,
    documentCount: s._count.interviewDocuments,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }))

  return <InterviewList interviews={serialized} />
}

export default async function InterviewsPage() {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-balance">모의면접</h1>
          <p className="text-muted-foreground mt-1">
            AI 면접관과 실전처럼 면접을 연습합니다
          </p>
        </div>
        <Button asChild>
          <Link href="/interviews/new">
            <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
            새 모의면접
          </Link>
        </Button>
      </div>

      <Suspense fallback={<InterviewListSkeleton />}>
        <InterviewListSection userId={user.id} />
      </Suspense>
    </div>
  )
}
