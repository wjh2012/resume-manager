"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"

interface UseFileUploadOptions {
  onSuccess?: () => void
}

export function useFileUpload({ onSuccess }: UseFileUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(
    (file: File, title: string): Promise<Record<string, unknown> | null> => {
      setIsUploading(true)
      setProgress(0)
      setError(null)

      return new Promise((resolve) => {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("title", title)

        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100))
          }
        })

        xhr.addEventListener("load", () => {
          setIsUploading(false)
          setProgress(0)

          try {
            const data = JSON.parse(xhr.responseText)

            if (xhr.status >= 400) {
              const message = data.error || "업로드에 실패했습니다."
              setError(message)
              toast.error(message)
              resolve(null)
              return
            }

            toast.success("문서가 업로드되었습니다.")
            onSuccess?.()
            resolve(data)
          } catch {
            setError("업로드에 실패했습니다.")
            toast.error("업로드에 실패했습니다.")
            resolve(null)
          }
        })

        xhr.addEventListener("error", () => {
          setIsUploading(false)
          setProgress(0)
          setError("업로드에 실패했습니다.")
          toast.error("업로드에 실패했습니다.")
          resolve(null)
        })

        xhr.open("POST", "/api/documents")
        xhr.send(formData)
      })
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
    progress,
    isDragging,
    error,
    upload,
    handleDragOver,
    handleDragLeave,
    setIsDragging,
  }
}
