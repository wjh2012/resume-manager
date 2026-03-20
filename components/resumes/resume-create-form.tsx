"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const templates = [
  {
    value: "classic",
    label: "클래식",
    description: "전통적이고 깔끔한 이력서 양식",
  },
  {
    value: "modern",
    label: "모던",
    description: "세련되고 현대적인 디자인",
  },
  {
    value: "minimal",
    label: "미니멀",
    description: "간결하고 심플한 레이아웃",
  },
] as const

export function ResumeCreateForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedTemplate, setSelectedTemplate] = useState<string>("classic")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrors({})

    const formData = new FormData(e.currentTarget)
    const title = (formData.get("title") as string)?.trim()

    const newErrors: Record<string, string> = {}
    if (!title) newErrors.title = "제목을 입력해주세요."

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          template: selectedTemplate,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "생성에 실패했습니다.")
      }

      toast.success("이력서가 생성되었습니다.")
      router.push(`/resumes/${data.id}`)
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
          placeholder="예: 프론트엔드 개발자 이력서"
          autoComplete="off"
          disabled={isSubmitting}
        />
        {errors.title && (
          <p className="text-destructive text-sm">{errors.title}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">템플릿</label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {templates.map((t) => (
            <button
              key={t.value}
              type="button"
              disabled={isSubmitting}
              onClick={() => setSelectedTemplate(t.value)}
              className={cn(
                "rounded-lg border-2 p-4 text-left transition-colors hover:bg-accent",
                selectedTemplate === t.value
                  ? "border-primary bg-accent"
                  : "border-border",
              )}
            >
              <p className="font-medium">{t.label}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" disabled={isSubmitting} asChild>
          <Link href="/resumes">취소</Link>
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />}
          생성
        </Button>
      </div>
    </form>
  )
}
