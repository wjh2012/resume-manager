"use client"

import Link from "next/link"
import { FileText, FileType, File, Trash2 } from "lucide-react"

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
import { DOCUMENT_TYPE_LABELS } from "@/lib/validations/document"
import { formatFileSize } from "@/lib/utils"
import type { DocumentType } from "@/lib/validations/document"

interface DocumentCardProps {
  document: {
    id: string
    title: string
    type: string
    fileSize: number
    createdAt: string
    _count: { chunks: number }
  }
  onDelete: (id: string) => void
  isDeleting?: boolean
}

const typeIcons: Record<DocumentType, typeof FileText> = {
  pdf: FileText,
  docx: FileType,
  txt: File,
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function DocumentCard({
  document,
  onDelete,
  isDeleting,
}: DocumentCardProps) {
  const docType = document.type as DocumentType
  const Icon = typeIcons[docType] ?? FileText
  const label = DOCUMENT_TYPE_LABELS[docType] ?? document.type

  return (
    <Card className="group relative">
      <Link href={`/documents/${document.id}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Icon className="text-muted-foreground h-5 w-5 shrink-0" />
              <CardTitle className="line-clamp-1 text-base">
                {document.title}
              </CardTitle>
            </div>
            <Badge variant="secondary">{label}</Badge>
          </div>
          <CardDescription className="flex items-center gap-2">
            <span>{formatFileSize(document.fileSize)}</span>
            <span>·</span>
            <span>{formatDate(document.createdAt)}</span>
            <span>·</span>
            <span>{document._count.chunks}개 청크</span>
          </CardDescription>
        </CardHeader>
      </Link>

      <div className="absolute right-2 bottom-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>문서를 삭제하시겠습니까?</AlertDialogTitle>
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
