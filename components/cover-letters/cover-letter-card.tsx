"use client"

import Link from "next/link"
import { Building2, Trash2 } from "lucide-react"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface CoverLetterCardProps {
  coverLetter: {
    id: string
    title: string
    companyName: string
    position: string
    status: string
    createdAt: string
    updatedAt: string
  }
  onDelete: (id: string) => void
  isDeleting?: boolean
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const statusConfig: Record<string, { label: string; variant: "secondary" | "default" }> = {
  DRAFT: { label: "작성 중", variant: "secondary" },
  COMPLETED: { label: "완료", variant: "default" },
}

export function CoverLetterCard({
  coverLetter,
  onDelete,
  isDeleting,
}: CoverLetterCardProps) {
  const status = statusConfig[coverLetter.status] ?? statusConfig.DRAFT

  return (
    <Card className="group relative transition-shadow hover:shadow-md">
      <Link href={`/cover-letters/${coverLetter.id}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Building2 aria-hidden="true" className="text-muted-foreground h-5 w-5 shrink-0" />
              <CardTitle className="line-clamp-1 text-base">
                {coverLetter.title}
              </CardTitle>
            </div>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <CardDescription className="flex flex-col gap-1">
            <span className="line-clamp-1">
              {coverLetter.companyName} · {coverLetter.position}
            </span>
            <span suppressHydrationWarning>{formatDate(coverLetter.updatedAt)}</span>
          </CardDescription>
        </CardHeader>
      </Link>

      <div
        className="absolute right-2 bottom-2"
        onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="자기소개서 삭제"
              className="text-muted-foreground hover:text-destructive h-8 w-8 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
              disabled={isDeleting}
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>자기소개서를 삭제하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription>
                &ldquo;{coverLetter.title}&rdquo; 자기소개서와 관련된 모든 데이터가
                삭제됩니다. 이 작업은 되돌릴 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(coverLetter.id)}>
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  )
}
