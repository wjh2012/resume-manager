"use client"

import { useCallback, useRef, useState } from "react"
import { Upload } from "lucide-react"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useFileUpload } from "@/hooks/use-file-upload"
import {
  resolveDocumentType,
  MAX_FILE_SIZE,
} from "@/lib/validations/document"
import { cn, formatFileSize } from "@/lib/utils"

interface DocumentUploadProps {
  onSuccess?: () => void
}

export function DocumentUpload({ onSuccess }: DocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  const { isUploading, progress, isDragging, upload, setIsDragging } =
    useFileUpload({ onSuccess })

  const validateAndSetFile = useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`파일 크기가 ${formatFileSize(MAX_FILE_SIZE)}를 초과합니다.`)
      return
    }
    if (!resolveDocumentType(file)) {
      toast.error("지원하지 않는 파일 형식입니다. (PDF, DOCX, TXT만 가능)")
      return
    }
    setSelectedFile(file)
    // 제목이 비어있으면 파일명에서 추출
    if (!title) {
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, "")
      setTitle(nameWithoutExt)
    }
  }, [title])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      dragCounterRef.current += 1
      if (dragCounterRef.current === 1) {
        setIsDragging(true)
      }
    },
    [setIsDragging],
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      dragCounterRef.current -= 1
      if (dragCounterRef.current === 0) {
        setIsDragging(false)
      }
    },
    [setIsDragging],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      dragCounterRef.current = 0
      setIsDragging(false)
      if (isUploading) return
      const file = e.dataTransfer.files[0]
      if (file) validateAndSetFile(file)
    },
    [setIsDragging, validateAndSetFile, isUploading],
  )

  const handleDropzoneClick = useCallback(() => {
    if (!isUploading) inputRef.current?.click()
  }, [isUploading])

  const handleDropzoneKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && !isUploading) {
        e.preventDefault()
        inputRef.current?.click()
      }
    },
    [isUploading],
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) validateAndSetFile(file)
    },
    [validateAndSetFile],
  )

  const handleSubmit = async () => {
    if (!selectedFile || !title.trim()) return
    const result = await upload(selectedFile, title.trim())
    if (result) {
      setSelectedFile(null)
      setTitle("")
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleDropzoneClick}
        onKeyDown={handleDropzoneKeyDown}
        aria-disabled={isUploading}
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
          isUploading
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
        )}
      >
        <Upload aria-hidden="true" className="text-muted-foreground mb-2 h-8 w-8" />
        {selectedFile ? (
          <p className="text-sm font-medium">{selectedFile.name}</p>
        ) : (
          <>
            <p className="text-sm font-medium">
              파일을 드래그하거나 클릭하여 선택
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              PDF, DOCX, TXT (최대 10MB)
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleFileChange}
          className="hidden"
          autoComplete="off"
        />
      </div>

      {selectedFile ? (
        <>
          <label htmlFor="document-title" className="sr-only">
            문서 제목
          </label>
          <Input
            id="document-title"
            placeholder="문서 제목\u2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoComplete="off"
          />
          {isUploading ? (
            <div
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-live="polite"
              className="bg-muted h-2 w-full overflow-hidden rounded-full"
            >
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : null}
          <Button
            onClick={handleSubmit}
            disabled={isUploading || !title.trim()}
            className="w-full"
          >
            {isUploading ? `업로드 중\u2026 ${progress}%` : "업로드"}
          </Button>
        </>
      ) : null}

    </div>
  )
}
