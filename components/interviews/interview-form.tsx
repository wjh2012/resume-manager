// components/interviews/interview-form.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

interface DocumentItem {
  id: string
  title: string
  type: string
}

interface InterviewFormProps {
  documents: DocumentItem[]
}

export function InterviewForm({ documents }: InterviewFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [title, setTitle] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [position, setPosition] = useState("")
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const toggleDoc = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    )
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = "제목을 입력해주세요."
    if (selectedDocIds.length === 0)
      newErrors.documentIds = "최소 1개의 문서를 선택해주세요."
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          companyName: companyName.trim() || undefined,
          position: position.trim() || undefined,
          documentIds: selectedDocIds,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "생성에 실패했습니다.")
      }

      router.push(`/interviews/${data.id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "생성에 실패했습니다."
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium leading-none">
          제목 <span className="text-destructive">*</span>
        </label>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 카카오 백엔드 모의면접"
          maxLength={100}
          disabled={isSubmitting}
        />
        {errors.title && (
          <p className="text-sm text-destructive" aria-live="polite">{errors.title}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="companyName" className="text-sm font-medium leading-none">기업명 (선택)</label>
          <Input
            id="companyName"
            name="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="카카오"
            maxLength={100}
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="position" className="text-sm font-medium leading-none">직무 (선택)</label>
          <Input
            id="position"
            name="position"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="백엔드 개발자"
            maxLength={100}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium leading-none">
            참고 문서 <span className="text-destructive">*</span>
          </label>
          <p className="mt-1 text-sm text-muted-foreground">
            면접관은 선택한 문서만 참고합니다.
          </p>
        </div>

        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            업로드된 문서가 없습니다. 먼저 참고자료를 업로드해주세요.
          </p>
        ) : (
          <div className="space-y-2 rounded-lg border p-4">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3">
                <Checkbox
                  id={doc.id}
                  checked={selectedDocIds.includes(doc.id)}
                  onCheckedChange={() => toggleDoc(doc.id)}
                  disabled={isSubmitting}
                />
                <label
                  htmlFor={doc.id}
                  className="flex flex-1 cursor-pointer items-center gap-2 text-sm"
                >
                  <span className="flex-1">{doc.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {doc.type}
                  </Badge>
                </label>
              </div>
            ))}
          </div>
        )}

        {errors.documentIds && (
          <p className="text-sm text-destructive" aria-live="polite">{errors.documentIds}</p>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" disabled={isSubmitting} asChild>
          <Link href="/interviews">취소</Link>
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "생성 중..." : "면접 시작하기"}
        </Button>
      </div>
    </form>
  )
}
