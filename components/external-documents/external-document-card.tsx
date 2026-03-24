"use client"

import Link from "next/link"
import { FileText, Type, Trash2 } from "lucide-react"

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
import { cn, formatDate, formatFileSize } from "@/lib/utils"

interface ExternalDocumentCardProps {
  document: {
    id: string
    title: string
    category: string
    sourceType: string
    fileType: string | null
    fileSize: number | null
    summary: string | null
    createdAt: string
  }
  onDelete: (id: string) => void
  isDeleting?: boolean
}

const sourceTypeIcons: Record<string, typeof FileText> = {
  file: FileText,
  text: Type,
}

const sourceTypeColors: Record<string, string> = {
  file: "text-type-pdf",
  text: "text-type-txt",
}

export function ExternalDocumentCard({
  document,
  onDelete,
  isDeleting,
}: ExternalDocumentCardProps) {
  const Icon = sourceTypeIcons[document.sourceType] ?? FileText
  const colorClass = sourceTypeColors[document.sourceType] ?? "text-muted-foreground"

  return (
    <Card className="group relative transition-shadow hover:shadow-md">
      <Link href={`/external-documents/${document.id}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Icon aria-hidden="true" className={cn("h-5 w-5 shrink-0", colorClass)} />
              <CardTitle className="line-clamp-1 text-base">
                {document.title}
              </CardTitle>
            </div>
            {document.category && (
              <Badge variant="secondary">{document.category}</Badge>
            )}
          </div>
          <CardDescription className="flex items-center gap-2">
            <span>{document.sourceType === "file" ? "파일" : "텍스트"}</span>
            {document.fileSize != null && (
              <>
                <span>·</span>
                <span>{formatFileSize(document.fileSize)}</span>
              </>
            )}
            <span>·</span>
            <span suppressHydrationWarning>{formatDate(document.createdAt)}</span>
            <span>·</span>
            <span>{document.summary ? "요약 완료" : "요약 없음"}</span>
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
              aria-label="외부 문서 삭제"
              className="text-muted-foreground hover:text-destructive h-8 w-8 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
              disabled={isDeleting}
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>외부 문서를 삭제하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription>
                &ldquo;{document.title}&rdquo; 문서와 관련된 모든 데이터가
                삭제됩니다. 이 작업은 되돌릴 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(document.id)}>
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  )
}
