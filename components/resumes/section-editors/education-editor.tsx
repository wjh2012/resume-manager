"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SortableSection } from "@/components/resumes/sortable-section"

export interface EducationItem {
  _tempId: string
  school: string
  degree: string
  field: string
  startDate: string
  endDate: string
  description: string
}

interface EducationEditorProps {
  items: EducationItem[]
  onChange: (items: EducationItem[]) => void
}

export function EducationEditor({ items, onChange }: EducationEditorProps) {
  function handleAdd() {
    onChange([
      ...items,
      {
        _tempId: crypto.randomUUID(),
        school: "",
        degree: "",
        field: "",
        startDate: "",
        endDate: "",
        description: "",
      },
    ])
  }

  return (
    <SortableSection
      items={items}
      onReorder={onChange}
      onAdd={handleAdd}
      onRemove={(index) => onChange(items.filter((_, i) => i !== index))}
      addLabel="학력 추가"
      renderItem={(item, _index, onFieldChange) => (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">
              학교명 <span className="text-destructive">*</span>
            </label>
            <Input
              value={item.school}
              onChange={(e) => onFieldChange("school", e.target.value)}
              placeholder="서울대학교"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">학위</label>
              <Input
                value={item.degree}
                onChange={(e) => onFieldChange("degree", e.target.value)}
                placeholder="학사"
              />
            </div>
            <div>
              <label className="text-sm font-medium">전공</label>
              <Input
                value={item.field}
                onChange={(e) => onFieldChange("field", e.target.value)}
                placeholder="컴퓨터공학"
              />
            </div>
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
              placeholder="학업 내용이나 성과를 입력하세요"
            />
          </div>
        </div>
      )}
    />
  )
}
