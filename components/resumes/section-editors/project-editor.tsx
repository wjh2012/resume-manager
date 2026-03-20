"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { MonthPicker } from "@/components/ui/monthpicker"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { SortableSection } from "@/components/resumes/sortable-section"
import {
  monthStringToDate,
  dateToMonthString,
  formatMonthDisplay,
} from "@/components/resumes/date-utils"

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
            <label htmlFor={`${item._tempId}-name`} className="text-sm font-medium">
              프로젝트명 <span className="text-destructive">*</span>
            </label>
            <Input
              id={`${item._tempId}-name`}
              value={item.name}
              onChange={(e) => onFieldChange("name", e.target.value)}
              placeholder="이력서 관리 서비스"
            />
          </div>
          <div>
            <label htmlFor={`${item._tempId}-role`} className="text-sm font-medium">역할</label>
            <Input
              id={`${item._tempId}-role`}
              value={item.role}
              onChange={(e) => onFieldChange("role", e.target.value)}
              placeholder="프론트엔드 리드"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${item._tempId}-startDate`} className="text-sm font-medium">시작일</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id={`${item._tempId}-startDate`}
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !item.startDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {item.startDate
                      ? formatMonthDisplay(item.startDate)
                      : "선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <MonthPicker
                    selectedMonth={monthStringToDate(item.startDate)}
                    onMonthSelect={(date) =>
                      onFieldChange("startDate", dateToMonthString(date))
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label htmlFor={`${item._tempId}-endDate`} className="text-sm font-medium">종료일</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id={`${item._tempId}-endDate`}
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !item.endDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {item.endDate ? formatMonthDisplay(item.endDate) : "선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <MonthPicker
                    selectedMonth={monthStringToDate(item.endDate)}
                    onMonthSelect={(date) =>
                      onFieldChange("endDate", dateToMonthString(date))
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div>
            <label htmlFor={`${item._tempId}-description`} className="text-sm font-medium">설명</label>
            <Textarea
              id={`${item._tempId}-description`}
              value={item.description}
              onChange={(e) => onFieldChange("description", e.target.value)}
              placeholder="프로젝트 내용과 성과를 입력하세요"
            />
          </div>
          <div>
            <label htmlFor={`${item._tempId}-url`} className="text-sm font-medium">URL</label>
            <Input
              id={`${item._tempId}-url`}
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
