"use client"

import { Input } from "@/components/ui/input"
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
            <label htmlFor={`${item._tempId}-name`} className="text-sm font-medium">
              자격증명 <span className="text-destructive">*</span>
            </label>
            <Input
              id={`${item._tempId}-name`}
              value={item.name}
              onChange={(e) => onFieldChange("name", e.target.value)}
              placeholder="정보처리기사"
            />
          </div>
          <div>
            <label htmlFor={`${item._tempId}-issuer`} className="text-sm font-medium">발급기관</label>
            <Input
              id={`${item._tempId}-issuer`}
              value={item.issuer}
              onChange={(e) => onFieldChange("issuer", e.target.value)}
              placeholder="한국산업인력공단"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${item._tempId}-issueDate`} className="text-sm font-medium">취득일</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id={`${item._tempId}-issueDate`}
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !item.issueDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {item.issueDate
                      ? formatMonthDisplay(item.issueDate)
                      : "선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <MonthPicker
                    selectedMonth={monthStringToDate(item.issueDate)}
                    onMonthSelect={(date) =>
                      onFieldChange("issueDate", dateToMonthString(date))
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label htmlFor={`${item._tempId}-expiryDate`} className="text-sm font-medium">만료일</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id={`${item._tempId}-expiryDate`}
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !item.expiryDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {item.expiryDate
                      ? formatMonthDisplay(item.expiryDate)
                      : "선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <MonthPicker
                    selectedMonth={monthStringToDate(item.expiryDate)}
                    onMonthSelect={(date) =>
                      onFieldChange("expiryDate", dateToMonthString(date))
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      )}
    />
  )
}
