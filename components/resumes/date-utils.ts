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

/**
 * ISO date 또는 "YYYY-MM" 형식을 "YYYY.MM"으로 변환.
 * @react-pdf/renderer 환경에서는 toLocaleDateString을 사용할 수 없어 regex 기반으로 구현.
 */
export function formatDate(date?: string | null): string {
  if (!date) return ""
  const match = date.match(/^(\d{4})-(\d{2})/)
  if (match) return `${match[1]}.${match[2]}`
  return date
}

/** Format for display using browser locale (ko: "2024년 3월", en: "Mar 2024") */
export function formatMonthDisplay(str: string): string {
  if (!str) return ""
  const d = monthStringToDate(str)
  if (!d) return ""
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short" }).format(d)
}
