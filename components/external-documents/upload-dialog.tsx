"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Plus, Upload } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  resolveDocumentType,
  MAX_FILE_SIZE,
} from "@/lib/validations/document"
import { cn, formatFileSize } from "@/lib/utils"

const SUGGESTED_CATEGORIES = [
  "채용공고",
  "기업분석",
  "직무기술서",
  "뉴스기사",
  "기타",
]

export function UploadDialog() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleSuccess = useCallback(() => {
    setOpen(false)
    router.refresh()
  }, [router])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
          등록
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>외부 문서 등록</DialogTitle>
          <DialogDescription>
            채용공고, 기업 정보 등 외부 문서를 텍스트 입력 또는 파일 업로드로 등록합니다.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="text">
          <TabsList className="w-full">
            <TabsTrigger value="text" className="flex-1">텍스트 입력</TabsTrigger>
            <TabsTrigger value="file" className="flex-1">파일 업로드</TabsTrigger>
          </TabsList>
          <TabsContent value="text">
            <TextInputForm onSuccess={handleSuccess} />
          </TabsContent>
          <TabsContent value="file">
            <FileUploadForm onSuccess={handleSuccess} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function CategoryInput({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <label htmlFor="ext-doc-category" className="text-sm font-medium">
        카테고리 (선택)
      </label>
      <Input
        id="ext-doc-category"
        placeholder="예: 채용공고"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoComplete="off"
        list="ext-doc-category-suggestions"
      />
      <datalist id="ext-doc-category-suggestions">
        {SUGGESTED_CATEGORIES.map((cat) => (
          <option key={cat} value={cat} />
        ))}
      </datalist>
    </div>
  )
}

function TextInputForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/external-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category: category.trim() || undefined,
          content: content.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "등록에 실패했습니다.")
      }

      toast.success("외부 문서가 등록되었습니다.")
      onSuccess()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "등록에 실패했습니다."
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <label htmlFor="ext-doc-text-title" className="text-sm font-medium">
          제목 <span className="text-destructive">*</span>
        </label>
        <Input
          id="ext-doc-text-title"
          placeholder="예: 카카오 백엔드 개발자 채용공고"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSubmitting}
          autoComplete="off"
        />
      </div>

      <CategoryInput value={category} onChange={setCategory} disabled={isSubmitting} />

      <div className="space-y-2">
        <label htmlFor="ext-doc-content" className="text-sm font-medium">
          내용 <span className="text-destructive">*</span>
        </label>
        <Textarea
          id="ext-doc-content"
          placeholder="채용공고 내용, 기업 정보 등을 붙여넣으세요."
          rows={8}
          className="resize-none"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !title.trim() || !content.trim()}
        className="w-full"
      >
        {isSubmitting ? "등록 중\u2026" : "등록"}
      </Button>
    </div>
  )
}

function FileUploadForm({ onSuccess }: { onSuccess: () => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      if (isSubmitting) return
      const file = e.dataTransfer.files[0]
      if (file) validateAndSetFile(file)
    },
    [setIsDragging, validateAndSetFile, isSubmitting],
  )

  const handleDropzoneClick = useCallback(() => {
    if (!isSubmitting) inputRef.current?.click()
  }, [isSubmitting])

  const handleDropzoneKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && !isSubmitting) {
        e.preventDefault()
        inputRef.current?.click()
      }
    },
    [isSubmitting],
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

    setIsSubmitting(true)
    setUploadProgress(0)

    const formData = new FormData()
    formData.append("file", selectedFile)
    formData.append("title", title.trim())
    if (category.trim()) {
      formData.append("category", category.trim())
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100))
          }
        })

        xhr.addEventListener("load", () => {
          try {
            const data = JSON.parse(xhr.responseText)
            if (xhr.status >= 400) {
              reject(new Error(data.error || "업로드에 실패했습니다."))
              return
            }
            resolve()
          } catch {
            reject(new Error("업로드에 실패했습니다."))
          }
        })

        xhr.addEventListener("error", () => {
          reject(new Error("업로드에 실패했습니다."))
        })

        xhr.open("POST", "/api/external-documents")
        xhr.send(formData)
      })

      toast.success("외부 문서가 업로드되었습니다.")
      onSuccess()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "업로드에 실패했습니다."
      toast.error(message)
    } finally {
      setIsSubmitting(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="space-y-4 pt-2">
      <div
        role="button"
        tabIndex={0}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleDropzoneClick}
        onKeyDown={handleDropzoneKeyDown}
        aria-disabled={isSubmitting}
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
          isSubmitting
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

      {selectedFile && (
        <>
          <div className="space-y-2">
            <label htmlFor="ext-doc-file-title" className="text-sm font-medium">
              제목 <span className="text-destructive">*</span>
            </label>
            <Input
              id="ext-doc-file-title"
              placeholder="문서 제목\u2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              autoComplete="off"
            />
          </div>

          <CategoryInput value={category} onChange={setCategory} disabled={isSubmitting} />

          {isSubmitting && (
            <div
              role="progressbar"
              aria-valuenow={uploadProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-live="polite"
              className="bg-muted h-2 w-full overflow-hidden rounded-full"
            >
              <div
                className="bg-primary h-full transition-[width] duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim()}
            className="w-full"
          >
            {isSubmitting ? `업로드 중\u2026 ${uploadProgress}%` : "업로드"}
          </Button>
        </>
      )}
    </div>
  )
}
