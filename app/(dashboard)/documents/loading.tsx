import { Skeleton } from "@/components/ui/skeleton"
import { DocumentListSkeleton } from "@/components/documents/document-list-skeleton"

export default function DocumentsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-5 w-56" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
      <DocumentListSkeleton />
    </div>
  )
}
