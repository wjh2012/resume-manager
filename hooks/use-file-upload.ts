"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"

interface UseFileUploadOptions {
  onSuccess?: () => void
}

export function useFileUpload({ onSuccess }: UseFileUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(
    async (file: File, title: string) => {
      setIsUploading(true)
      setError(null)

      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("title", title)

        const res = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || "업로드에 실패했습니다.")
        }

        toast.success("문서가 업로드되었습니다.")
        onSuccess?.()
        return data
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "업로드에 실패했습니다."
        setError(message)
        toast.error(message)
        return null
      } finally {
        setIsUploading(false)
      }
    },
    [onSuccess],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  return {
    isUploading,
    isDragging,
    error,
    upload,
    handleDragOver,
    handleDragLeave,
    setIsDragging,
  }
}
