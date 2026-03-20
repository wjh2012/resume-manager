import { Skeleton } from "@/components/ui/skeleton"
import { InterviewListSkeleton } from "@/components/interviews/interview-list-skeleton"

export default function InterviewsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <InterviewListSkeleton />
    </div>
  )
}
