"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { buttonVariants } from "./button"
import { cn } from "@/lib/utils"

type Month = {
  number: number
  name: string
}

// 브라우저 로케일에 맞는 월 이름 생성 (ko: "1월", en: "Jan", ja: "1月", ...)
function buildMonths(): Month[][] {
  const formatter = new Intl.DateTimeFormat(undefined, { month: "short" })
  const months: Month[] = Array.from({ length: 12 }, (_, i) => ({
    number: i,
    name: formatter.format(new Date(2024, i, 1)),
  }))
  return [months.slice(0, 4), months.slice(4, 8), months.slice(8, 12)]
}

const MONTHS: Month[][] = buildMonths()

type ButtonVariant =
  | "default"
  | "outline"
  | "ghost"
  | "link"
  | "destructive"
  | "secondary"
  | null
  | undefined

type MonthCalProps = {
  selectedMonth?: Date
  onMonthSelect?: (date: Date) => void
  onYearForward?: () => void
  onYearBackward?: () => void
  callbacks?: {
    yearLabel?: (year: number) => string
    monthLabel?: (month: Month) => string
  }
  variant?: {
    calendar?: {
      main?: ButtonVariant
      selected?: ButtonVariant
    }
    chevrons?: ButtonVariant
  }
  minDate?: Date
  maxDate?: Date
  disabledDates?: Date[]
}

function MonthPicker({
  onMonthSelect,
  selectedMonth,
  minDate,
  maxDate,
  disabledDates,
  callbacks,
  onYearBackward,
  onYearForward,
  variant,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & MonthCalProps) {
  return (
    <div className={cn("w-[280px] min-w-[200px] p-3", className)} {...props}>
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0">
        <div className="w-full space-y-4">
          <MonthCal
            onMonthSelect={onMonthSelect}
            callbacks={callbacks}
            selectedMonth={selectedMonth}
            onYearBackward={onYearBackward}
            onYearForward={onYearForward}
            variant={variant}
            minDate={minDate}
            maxDate={maxDate}
            disabledDates={disabledDates}
          />
        </div>
      </div>
    </div>
  )
}

function MonthCal({
  selectedMonth,
  onMonthSelect,
  callbacks,
  variant,
  minDate,
  maxDate,
  disabledDates,
  onYearBackward,
  onYearForward,
}: MonthCalProps) {
  const [year, setYear] = React.useState<number>(
    selectedMonth?.getFullYear() ?? new Date().getFullYear(),
  )
  const [month, setMonth] = React.useState<number>(
    selectedMonth?.getMonth() ?? new Date().getMonth(),
  )
  const [menuYear, setMenuYear] = React.useState<number>(year)

  if (minDate && maxDate && minDate > maxDate) minDate = maxDate

  const disabledDatesMapped = disabledDates?.map((d) => ({
    year: d.getFullYear(),
    month: d.getMonth(),
  }))

  return (
    <>
      <div className="relative flex items-center justify-center pt-1">
        <div className="text-sm font-medium">
          {callbacks?.yearLabel ? callbacks.yearLabel(menuYear) : menuYear}
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => {
              setMenuYear(menuYear - 1)
              if (onYearBackward) onYearBackward()
            }}
            className={cn(
              buttonVariants({ variant: variant?.chevrons ?? "outline" }),
              "absolute left-1 inline-flex h-7 w-7 items-center justify-center p-0",
            )}
          >
            <ChevronLeft className="h-4 w-4 opacity-50" />
          </button>
          <button
            onClick={() => {
              setMenuYear(menuYear + 1)
              if (onYearForward) onYearForward()
            }}
            className={cn(
              buttonVariants({ variant: variant?.chevrons ?? "outline" }),
              "absolute right-1 inline-flex h-7 w-7 items-center justify-center p-0",
            )}
          >
            <ChevronRight className="h-4 w-4 opacity-50" />
          </button>
        </div>
      </div>
      <table className="w-full border-collapse space-y-1">
        <tbody>
          {MONTHS.map((monthRow, a) => (
            <tr key={`row-${a}`} className="mt-2 flex w-full">
              {monthRow.map((m) => (
                <td
                  key={m.number}
                  className="relative h-10 w-1/4 p-0 text-center text-sm focus-within:relative focus-within:z-20"
                >
                  <button
                    onClick={() => {
                      setMonth(m.number)
                      setYear(menuYear)
                      if (onMonthSelect)
                        onMonthSelect(new Date(menuYear, m.number))
                    }}
                    disabled={
                      (maxDate
                        ? menuYear > maxDate.getFullYear() ||
                          (menuYear === maxDate.getFullYear() &&
                            m.number > maxDate.getMonth())
                        : false) ||
                      (minDate
                        ? menuYear < minDate.getFullYear() ||
                          (menuYear === minDate.getFullYear() &&
                            m.number < minDate.getMonth())
                        : false) ||
                      (disabledDatesMapped
                        ? disabledDatesMapped.some(
                            (d) =>
                              d.year === menuYear && d.month === m.number,
                          )
                        : false)
                    }
                    className={cn(
                      buttonVariants({
                        variant:
                          month === m.number && menuYear === year
                            ? (variant?.calendar?.selected ?? "default")
                            : (variant?.calendar?.main ?? "ghost"),
                      }),
                      "h-full w-full p-0 font-normal aria-selected:opacity-100",
                    )}
                  >
                    {callbacks?.monthLabel ? callbacks.monthLabel(m) : m.name}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

MonthPicker.displayName = "MonthPicker"

export { MonthPicker }
