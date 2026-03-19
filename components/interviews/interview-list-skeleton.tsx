// components/interviews/interview-list-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton"

export function InterviewListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-5">
          <div className="mb-3 flex items-start justify-between gap-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-14" />
          </div>
          <Skeleton className="mb-3 h-4 w-1/2" />
          <div className="flex gap-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}
