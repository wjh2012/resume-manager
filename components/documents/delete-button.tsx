"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

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

interface DeleteButtonProps {
  documentId: string
  documentTitle: string
}

export function DeleteButton({ documentId, documentTitle }: DeleteButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = useCallback(async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "삭제에 실패했습니다.")
      }

      toast.success("문서가 삭제되었습니다.")
      router.push("/documents")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "삭제에 실패했습니다."
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }, [documentId, router])

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={isDeleting}>
          <Trash2 className="mr-2 h-4 w-4" />
          {isDeleting ? "삭제 중..." : "삭제"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>문서를 삭제하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{documentTitle}&rdquo; 문서와 관련된 모든 데이터가
            삭제됩니다. 이 작업은 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
