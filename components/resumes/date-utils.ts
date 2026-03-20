/** Convert "YYYY-MM" string to Date */
export function monthStringToDate(str: string): Date | undefined {
  if (!str) return undefined
  const [y, m] = str.split("-").map(Number)
  return new Date(y, m - 1)
}

/** Convert Date to "YYYY-MM" string */
export function dateToMonthString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

/** Convert Date | null to ISO string | null (for server → client serialization) */
export function dateToString(d: Date | null): string | null {
  return d ? d.toISOString() : null
}

/** Format for display using browser locale (ko: "2024년 3월", en: "Mar 2024") */
export function formatMonthDisplay(str: string): string {
  if (!str) return ""
  const d = monthStringToDate(str)
  if (!d) return ""
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short" }).format(d)
}
