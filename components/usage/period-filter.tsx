"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

interface PeriodFilterProps {
  value: string
  startDate?: Date
  endDate?: Date
  onChange: (period: string, startDate?: Date, endDate?: Date) => void
}

export function PeriodFilter({ value, startDate, endDate, onChange }: PeriodFilterProps) {
  const [open, setOpen] = useState(false)
  const [range, setRange] = useState<DateRange | undefined>(
    startDate && endDate ? { from: startDate, to: endDate } : undefined
  )

  function handleTabChange(tab: string) {
    if (tab !== "custom") {
      setRange(undefined)
      onChange(tab)
    } else {
      onChange("custom", range?.from, range?.to)
    }
  }

  function handleRangeSelect(selected: DateRange | undefined) {
    setRange(selected)
    if (selected?.from && selected?.to) {
      onChange("custom", selected.from, selected.to)
      setOpen(false)
    }
  }

  const rangeLabel =
    range?.from && range?.to
      ? `${format(range.from, "yyyy.MM.dd", { locale: ko })} – ${format(range.to, "yyyy.MM.dd", { locale: ko })}`
      : "날짜 선택"

  return (
    <div className="flex items-center gap-2">
      <Tabs value={value} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="7d">7일</TabsTrigger>
          <TabsTrigger value="30d">30일</TabsTrigger>
          <TabsTrigger value="90d">90일</TabsTrigger>
          <TabsTrigger value="custom">커스텀</TabsTrigger>
        </TabsList>
      </Tabs>

      {value === "custom" && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1.5 text-sm font-normal",
                !(range?.from && range?.to) && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="size-3.5" />
              {rangeLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={range}
              onSelect={handleRangeSelect}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
              locale={ko}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
