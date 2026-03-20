"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ResumeData } from "@/components/resumes/types"
import { ClassicTemplate } from "@/components/resumes/templates/classic-template"
import { ModernTemplate } from "@/components/resumes/templates/modern-template"
import { MinimalTemplate } from "@/components/resumes/templates/minimal-template"

function TemplateRenderer({ data, template }: { data: ResumeData; template: string }) {
  switch (template) {
    case "modern":
      return <ModernTemplate data={data} />
    case "minimal":
      return <MinimalTemplate data={data} />
    case "classic":
    default:
      return <ClassicTemplate data={data} />
  }
}

interface PreviewClientProps {
  resume: ResumeData
}

export function PreviewClient({ resume }: PreviewClientProps) {
  const [template, setTemplate] = useState(resume.template)
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/resumes/${resume.id}/pdf?template=${template}`)
      if (!res.ok) {
        throw new Error("PDF 다운로드에 실패했습니다.")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${resume.title}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast.error("PDF 다운로드에 실패했습니다.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/resumes/${resume.id}`}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            편집으로 돌아가기
          </Link>
        </Button>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="preview-template" className="text-sm font-medium">템플릿</label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger id="preview-template" className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">클래식</SelectItem>
                <SelectItem value="modern">모던</SelectItem>
                <SelectItem value="minimal">미니멀</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button size="sm" onClick={handleDownload} disabled={downloading}>
            <Download className="mr-1.5 h-4 w-4" />
            {downloading ? "다운로드 중..." : "PDF 다운로드"}
          </Button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-auto bg-gray-100 p-8">
        <div className="mx-auto w-full max-w-[800px]">
          <TemplateRenderer data={resume} template={template} />
        </div>
      </div>
    </div>
  )
}
