export function getDateRange(period: string): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30
  start.setDate(start.getDate() - days)
  return { start, end }
}
