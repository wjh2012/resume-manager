"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { toast } from "sonner"

interface UseFileUploadOptions {
  onSuccess?: () => void
}

export function useFileUpload({ onSuccess }: UseFileUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const xhrRef = useRef<XMLHttpRequest | null>(null)

  // 컴포넌트 언마운트 시 진행 중인 XHR 중단
  useEffect(() => {
    return () => {
      xhrRef.current?.abort()
    }
  }, [])

  const upload = useCallback(
    (file: File, title: string): Promise<Record<string, unknown> | null> => {
      // 이전 요청이 있으면 중단
      xhrRef.current?.abort()

      setIsUploading(true)
      setProgress(0)

      return new Promise((resolve) => {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("title", title)

        const xhr = new XMLHttpRequest()
        xhrRef.current = xhr

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const next = Math.round((e.loaded / e.total) * 100)
            setProgress((prev) => (prev === next ? prev : next))
          }
        })

        xhr.addEventListener("load", () => {
          xhrRef.current = null
          setIsUploading(false)
          setProgress(0)

          try {
            const data = JSON.parse(xhr.responseText)

            if (xhr.status >= 400) {
              const message = data.error || "업로드에 실패했습니다."
              toast.error(message)
              resolve(null)
              return
            }

            toast.success("문서가 업로드되었습니다.")
            onSuccess?.()
            resolve(data)
          } catch {
            toast.error("업로드에 실패했습니다.")
            resolve(null)
          }
        })

        xhr.addEventListener("error", () => {
          xhrRef.current = null
          setIsUploading(false)
          setProgress(0)
          toast.error("업로드에 실패했습니다.")
          resolve(null)
        })

        xhr.addEventListener("abort", () => {
          xhrRef.current = null
          setIsUploading(false)
          setProgress(0)
          resolve(null)
        })

        xhr.open("POST", "/api/documents")
        xhr.send(formData)
      })
    },
    [onSuccess],
  )

  return {
    isUploading,
    progress,
    isDragging,
    upload,
    setIsDragging,
  }
}
