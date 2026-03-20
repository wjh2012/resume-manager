"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { SortableSection } from "@/components/resumes/sortable-section"

export interface ExperienceItem {
  _tempId: string
  company: string
  position: string
  startDate: string
  endDate: string
  isCurrent: boolean
  description: string
}

interface ExperienceEditorProps {
  items: ExperienceItem[]
  onChange: (items: ExperienceItem[]) => void
}

export function ExperienceEditor({ items, onChange }: ExperienceEditorProps) {
  function handleAdd() {
    onChange([
      ...items,
      {
        _tempId: crypto.randomUUID(),
        company: "",
        position: "",
        startDate: "",
        endDate: "",
        isCurrent: false,
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
      addLabel="경력 추가"
      renderItem={(item, _index, onFieldChange) => (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">
                회사명 <span className="text-destructive">*</span>
              </label>
              <Input
                value={item.company}
                onChange={(e) => onFieldChange("company", e.target.value)}
                placeholder="주식회사 테크"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                직위 <span className="text-destructive">*</span>
              </label>
              <Input
                value={item.position}
                onChange={(e) => onFieldChange("position", e.target.value)}
                placeholder="시니어 개발자"
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
                disabled={item.isCurrent}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={item.isCurrent}
              onCheckedChange={(checked) =>
                onFieldChange("isCurrent", Boolean(checked))
              }
            />
            <label className="text-sm font-medium">재직 중</label>
          </div>
          <div>
            <label className="text-sm font-medium">설명</label>
            <Textarea
              value={item.description}
              onChange={(e) => onFieldChange("description", e.target.value)}
              placeholder="담당 업무와 성과를 입력하세요"
            />
          </div>
        </div>
      )}
    />
  )
}
