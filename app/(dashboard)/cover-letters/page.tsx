import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus } from "lucide-react"
import { getAuthUser } from "@/lib/supabase/user"
import { listCoverLetters } from "@/lib/cover-letters/service"
import { CoverLetterList } from "@/components/cover-letters/cover-letter-list"
import { CoverLetterListSkeleton } from "@/components/cover-letters/cover-letter-list-skeleton"
import { Button } from "@/components/ui/button"

async function CoverLetterListSection({ userId }: { userId: string }) {
  const coverLetters = await listCoverLetters(userId)

  const serialized = coverLetters.map((cl) => ({
    ...cl,
    createdAt: cl.createdAt.toISOString(),
    updatedAt: cl.updatedAt.toISOString(),
  }))

  return <CoverLetterList coverLetters={serialized} />
}

export default async function CoverLettersPage() {
  const user = await getAuthUser()

  if (!user) redirect("/login")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-balance">자기소개서</h1>
          <p className="text-muted-foreground mt-1">
            AI와 함께 자기소개서를 작성합니다
          </p>
        </div>
        <Button asChild>
          <Link href="/cover-letters/new">
            <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
            새 자기소개서
          </Link>
        </Button>
      </div>

      <Suspense fallback={<CoverLetterListSkeleton />}>
        <CoverLetterListSection userId={user.id} />
      </Suspense>
    </div>
  )
}
