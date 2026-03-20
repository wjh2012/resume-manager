"use client"

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

interface ResumePreviewPanelProps {
  data: ResumeData
  template: string
  onTemplateChange: (template: string) => void
}

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

export function ResumePreviewPanel({ data, template, onTemplateChange }: ResumePreviewPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2">
        <label className="text-sm font-medium">템플릿</label>
        <Select value={template} onValueChange={onTemplateChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="classic">클래식</SelectItem>
            <SelectItem value="modern">모던</SelectItem>
            <SelectItem value="minimal">미니멀</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="relative flex-1 overflow-hidden rounded-lg border bg-gray-50">
        <div className="absolute inset-0 origin-top-left scale-[0.5] [width:200%]">
          <TemplateRenderer data={data} template={template} />
        </div>
      </div>
    </div>
  )
}
