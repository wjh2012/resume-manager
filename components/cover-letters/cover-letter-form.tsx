"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import type { ExternalDocumentItem } from "@/lib/external-documents/types"

interface DocumentItem {
  id: string
  title: string
  type: string
  summary: string | null
}

interface CoverLetterFormProps {
  documents: DocumentItem[]
  externalDocuments: ExternalDocumentItem[]
}

export function CoverLetterForm({ documents, externalDocuments }: CoverLetterFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const [selectedExtDocIds, setSelectedExtDocIds] = useState<string[]>([])

  const toggleDoc = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    )
  }

  const toggleExtDoc = (id: string) => {
    setSelectedExtDocIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrors({})

    const formData = new FormData(e.currentTarget)
    const title = (formData.get("title") as string)?.trim()
    const companyName = (formData.get("companyName") as string)?.trim()
    const position = (formData.get("position") as string)?.trim()

    const newErrors: Record<string, string> = {}
    if (!title) newErrors.title = "제목을 입력해주세요."
    if (!companyName) newErrors.companyName = "기업명을 입력해주세요."
    if (!position) newErrors.position = "직무를 입력해주세요."

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch("/api/cover-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          companyName,
          position,
          selectedDocumentIds: selectedDocIds.length > 0 ? selectedDocIds : undefined,
          selectedExternalDocumentIds: selectedExtDocIds.length > 0 ? selectedExtDocIds : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "생성에 실패했습니다.")
      }

      toast.success("자기소개서가 생성되었습니다.")
      router.push(`/cover-letters/${data.id}`)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "생성에 실패했습니다."
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          제목 <span className="text-destructive">*</span>
        </label>
        <Input
          id="title"
          name="title"
          placeholder="예: 카카오 백엔드 개발자 자기소개서"
          autoComplete="off"
          disabled={isSubmitting}
        />
        {errors.title && (
          <p className="text-destructive text-sm">{errors.title}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="companyName" className="text-sm font-medium">
            기업명 <span className="text-destructive">*</span>
          </label>
          <Input
            id="companyName"
            name="companyName"
            placeholder="예: 카카오"
            autoComplete="organization"
            disabled={isSubmitting}
          />
          {errors.companyName && (
            <p className="text-destructive text-sm">{errors.companyName}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="position" className="text-sm font-medium">
            직무 <span className="text-destructive">*</span>
          </label>
          <Input
            id="position"
            name="position"
            placeholder="예: 백엔드 개발자"
            autoComplete="organization-title"
            disabled={isSubmitting}
          />
          {errors.position && (
            <p className="text-destructive text-sm">{errors.position}</p>
          )}
        </div>
      </div>

      {documents.length > 0 && (
        <div className="space-y-3">
          <label className="text-sm font-medium">참고 문서 (선택)</label>
          <p className="text-muted-foreground text-sm">
            AI가 자기소개서 작성 시 참고할 문서를 선택하세요.
          </p>
          <div className="space-y-2">
            {documents.map((doc) => (
              <label
                key={doc.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <Checkbox
                  checked={selectedDocIds.includes(doc.id)}
                  onCheckedChange={() => toggleDoc(doc.id)}
                  disabled={isSubmitting}
                />
                <span className="text-sm">
                  {doc.title}
                  {!doc.summary && (
                    <span className="text-muted-foreground ml-1 text-xs">
                      (요약 없음)
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {externalDocuments.length > 0 && (
        <div className="space-y-3">
          <label className="text-sm font-medium">외부 문서 (선택)</label>
          <p className="text-muted-foreground text-sm">
            채용공고, 기업 정보 등 외부 문서를 선택하면 AI가 참고합니다.
          </p>
          <div className="space-y-2">
            {externalDocuments.map((doc) => (
              <label
                key={doc.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <Checkbox
                  checked={selectedExtDocIds.includes(doc.id)}
                  onCheckedChange={() => toggleExtDoc(doc.id)}
                  disabled={isSubmitting}
                />
                <span className="flex flex-1 items-center gap-2 text-sm">
                  <span className="flex-1">
                    {doc.title}
                    {!doc.summary && (
                      <span className="text-muted-foreground ml-1 text-xs">
                        (요약 없음)
                      </span>
                    )}
                  </span>
                  {doc.category && (
                    <Badge variant="outline" className="text-xs">
                      {doc.category}
                    </Badge>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" disabled={isSubmitting} asChild>
          <Link href="/cover-letters">취소</Link>
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />}
          생성
        </Button>
      </div>
    </form>
  )
}
