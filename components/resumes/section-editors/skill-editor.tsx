"use client"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SortableSection } from "@/components/resumes/sortable-section"

export interface SkillItem {
  _tempId: string
  name: string
  level: string
  category: string
}

interface SkillEditorProps {
  items: SkillItem[]
  onChange: (items: SkillItem[]) => void
}

export function SkillEditor({ items, onChange }: SkillEditorProps) {
  function handleAdd() {
    onChange([
      ...items,
      {
        _tempId: crypto.randomUUID(),
        name: "",
        level: "",
        category: "",
      },
    ])
  }

  return (
    <SortableSection
      items={items}
      onReorder={onChange}
      onAdd={handleAdd}
      onRemove={(index) => onChange(items.filter((_, i) => i !== index))}
      addLabel="기술 추가"
      renderItem={(item, _index, onFieldChange) => (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">
              기술명 <span className="text-destructive">*</span>
            </label>
            <Input
              value={item.name}
              onChange={(e) => onFieldChange("name", e.target.value)}
              placeholder="TypeScript"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">숙련도</label>
              <Select
                value={item.level}
                onValueChange={(value) => onFieldChange("level", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">초급</SelectItem>
                  <SelectItem value="intermediate">중급</SelectItem>
                  <SelectItem value="advanced">고급</SelectItem>
                  <SelectItem value="expert">전문가</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">카테고리</label>
              <Select
                value={item.category}
                onValueChange={(value) => onFieldChange("category", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="language">언어</SelectItem>
                  <SelectItem value="framework">프레임워크</SelectItem>
                  <SelectItem value="tool">도구</SelectItem>
                  <SelectItem value="other">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    />
  )
}
