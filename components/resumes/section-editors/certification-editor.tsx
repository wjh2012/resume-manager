"use client"

import { Input } from "@/components/ui/input"
import { SortableSection } from "@/components/resumes/sortable-section"

export interface CertificationItem {
  _tempId: string
  name: string
  issuer: string
  issueDate: string
  expiryDate: string
}

interface CertificationEditorProps {
  items: CertificationItem[]
  onChange: (items: CertificationItem[]) => void
}

export function CertificationEditor({
  items,
  onChange,
}: CertificationEditorProps) {
  function handleAdd() {
    onChange([
      ...items,
      {
        _tempId: crypto.randomUUID(),
        name: "",
        issuer: "",
        issueDate: "",
        expiryDate: "",
      },
    ])
  }

  return (
    <SortableSection
      items={items}
      onReorder={onChange}
      onAdd={handleAdd}
      onRemove={(index) => onChange(items.filter((_, i) => i !== index))}
      addLabel="자격증 추가"
      renderItem={(item, _index, onFieldChange) => (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">
              자격증명 <span className="text-destructive">*</span>
            </label>
            <Input
              value={item.name}
              onChange={(e) => onFieldChange("name", e.target.value)}
              placeholder="정보처리기사"
            />
          </div>
          <div>
            <label className="text-sm font-medium">발급기관</label>
            <Input
              value={item.issuer}
              onChange={(e) => onFieldChange("issuer", e.target.value)}
              placeholder="한국산업인력공단"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">취득일</label>
              <Input
                type="month"
                value={item.issueDate}
                onChange={(e) => onFieldChange("issueDate", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">만료일</label>
              <Input
                type="month"
                value={item.expiryDate}
                onChange={(e) => onFieldChange("expiryDate", e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    />
  )
}
