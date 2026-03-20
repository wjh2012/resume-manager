"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SortableSection } from "@/components/resumes/sortable-section"

export interface ProjectItem {
  _tempId: string
  name: string
  role: string
  startDate: string
  endDate: string
  description: string
  url: string
}

interface ProjectEditorProps {
  items: ProjectItem[]
  onChange: (items: ProjectItem[]) => void
}

export function ProjectEditor({ items, onChange }: ProjectEditorProps) {
  function handleAdd() {
    onChange([
      ...items,
      {
        _tempId: crypto.randomUUID(),
        name: "",
        role: "",
        startDate: "",
        endDate: "",
        description: "",
        url: "",
      },
    ])
  }

  return (
    <SortableSection
      items={items}
      onReorder={onChange}
      onAdd={handleAdd}
      onRemove={(index) => onChange(items.filter((_, i) => i !== index))}
      addLabel="프로젝트 추가"
      renderItem={(item, _index, onFieldChange) => (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">
              프로젝트명 <span className="text-destructive">*</span>
            </label>
            <Input
              value={item.name}
              onChange={(e) => onFieldChange("name", e.target.value)}
              placeholder="이력서 관리 서비스"
            />
          </div>
          <div>
            <label className="text-sm font-medium">역할</label>
            <Input
              value={item.role}
              onChange={(e) => onFieldChange("role", e.target.value)}
              placeholder="프론트엔드 리드"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">시작일</label>
              <Input
                type="month"
                value={item.startDate}
                onChange={(e) => onFieldChange("startDate", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">종료일</label>
              <Input
                type="month"
                value={item.endDate}
                onChange={(e) => onFieldChange("endDate", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">설명</label>
            <Textarea
              value={item.description}
              onChange={(e) => onFieldChange("description", e.target.value)}
              placeholder="프로젝트 내용과 성과를 입력하세요"
            />
          </div>
          <div>
            <label className="text-sm font-medium">URL</label>
            <Input
              value={item.url}
              onChange={(e) => onFieldChange("url", e.target.value)}
              placeholder="https://github.com/example/project"
            />
          </div>
        </div>
      )}
    />
  )
}
