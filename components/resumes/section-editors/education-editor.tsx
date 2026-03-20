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
            <label htmlFor={`${item._tempId}-school`} className="text-sm font-medium">
              학교명 <span className="text-destructive">*</span>
            </label>
            <Input
              id={`${item._tempId}-school`}
              value={item.school}
              onChange={(e) => onFieldChange("school", e.target.value)}
              placeholder="서울대학교"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${item._tempId}-degree`} className="text-sm font-medium">학위</label>
              <Input
                id={`${item._tempId}-degree`}
                value={item.degree}
                onChange={(e) => onFieldChange("degree", e.target.value)}
                placeholder="학사"
              />
            </div>
            <div>
              <label htmlFor={`${item._tempId}-field`} className="text-sm font-medium">전공</label>
              <Input
                id={`${item._tempId}-field`}
                value={item.field}
                onChange={(e) => onFieldChange("field", e.target.value)}
                placeholder="컴퓨터공학"
              />
            </div>
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
              placeholder="학업 내용이나 성과를 입력하세요"
            />
          </div>
        </div>
      )}
    />
  )
}
