import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserUsageSummary } from "@/lib/token-usage/service"
import { getUserQuotasWithUsage } from "@/lib/token-usage/quota"
import { usageSummaryQuerySchema } from "@/lib/validations/token-usage"

function getDateRange(period: string) {
  const end = new Date()
  const start = new Date()
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30
  start.setDate(start.getDate() - days)
  return { start, end }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  const params = Object.fromEntries(request.nextUrl.searchParams)
  const parsed = usageSummaryQuerySchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "유효하지 않은 입력입니다." },
      { status: 400 },
    )
  }

  try {
    const { start, end } = parsed.data.startDate && parsed.data.endDate
      ? { start: parsed.data.startDate, end: parsed.data.endDate }
      : getDateRange(parsed.data.period)

    const [summary, quotas] = await Promise.all([
      getUserUsageSummary(user.id, start, end, parsed.data.tz),
      getUserQuotasWithUsage(user.id),
    ])

    return NextResponse.json({ ...summary, quotas })
  } catch (error) {
    console.error("[GET /api/token-usage/summary]", error)
    return NextResponse.json({ error: "사용량 요약 조회에 실패했습니다." }, { status: 500 })
  }
}
