"use client"

import { useCallback, useRef, useState } from "react"
import { Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useFileUpload } from "@/hooks/use-file-upload"
import {
  resolveDocumentType,
  MAX_FILE_SIZE,
} from "@/lib/validations/document"
import { cn } from "@/lib/utils"

interface DocumentUploadProps {
  onSuccess?: () => void
}

export function DocumentUpload({ onSuccess }: DocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const { isUploading, isDragging, upload, handleDragOver, handleDragLeave, setIsDragging } =
    useFileUpload({ onSuccess })

  const validateAndSetFile = useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      return
    }
    if (!resolveDocumentType(file)) {
      return
    }
    setSelectedFile(file)
    // 제목이 비어있으면 파일명에서 추출
    if (!title) {
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, "")
      setTitle(nameWithoutExt)
    }
  }, [title])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) validateAndSetFile(file)
    },
    [setIsDragging, validateAndSetFile],
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
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
        )}
      >
        <Upload className="text-muted-foreground mb-2 h-8 w-8" />
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
        />
      </div>

      {selectedFile && (
        <>
          <Input
            placeholder="문서 제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button
            onClick={handleSubmit}
            disabled={isUploading || !title.trim()}
            className="w-full"
          >
            {isUploading ? "업로드 중..." : "업로드"}
          </Button>
        </>
      )}

    </div>
  )
}
