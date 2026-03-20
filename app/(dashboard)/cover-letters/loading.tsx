import { Skeleton } from "@/components/ui/skeleton"
import { CoverLetterListSkeleton } from "@/components/cover-letters/cover-letter-list-skeleton"

export default function CoverLettersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-5 w-56" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <CoverLetterListSkeleton />
    </div>
  )
}
