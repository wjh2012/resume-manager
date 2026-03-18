import { Skeleton } from "@/components/ui/skeleton"

function CardSkeleton() {
  return (
    <div className="rounded-xl border p-6 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
}

export function CoverLetterListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}
