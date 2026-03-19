// components/interviews/interview-card.tsx
"use client"

import { FileText, Trash2 } from "lucide-react"
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
import Link from "next/link"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

interface InterviewCardProps {
  id: string
  title: string
  companyName?: string | null
  position?: string | null
  status: string
  documentCount: number
  updatedAt: string
  isDeleting: boolean
  onDelete: (id: string) => void
}

export function InterviewCard({
  id,
  title,
  companyName,
  position,
  status,
  documentCount,
  updatedAt,
  isDeleting,
  onDelete,
}: InterviewCardProps) {
  const isCompleted = status === "COMPLETED"

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-sm",
        isDeleting && "pointer-events-none opacity-50",
      )}
    >
      <Link href={`/interviews/${id}`} className="absolute inset-0" aria-label={title} />

      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 font-semibold leading-tight">{title}</h3>
        <Badge variant={isCompleted ? "secondary" : "default"} className="shrink-0">
          {isCompleted ? "종료됨" : "진행중"}
        </Badge>
      </div>

      {(companyName || position) && (
        <p className="mb-3 text-sm text-muted-foreground">
          {[companyName, position].filter(Boolean).join(" · ")}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {documentCount}개 문서
        </span>
        <span>{format(new Date(updatedAt), "yyyy.MM.dd", { locale: ko })}</span>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="삭제"
            disabled={isDeleting}
            onClick={(e) => e.preventDefault()}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>면접 세션을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 면접 기록이 모두 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(id)}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
