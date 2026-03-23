import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { getSystemUsageSummary } from "@/lib/admin/usage-service"
import { adminUsageQuerySchema } from "@/lib/validations/admin"
import { getDateRange } from "@/lib/utils/date-range"

export async function GET(request: NextRequest) {
  const result = await requireAdmin()
  if (!result.ok) {
    return NextResponse.json(
      { error: result.status === 401 ? "인증이 필요합니다." : "권한이 없습니다." },
      { status: result.status },
    )
  }
  const params = Object.fromEntries(request.nextUrl.searchParams)
  const parsed = adminUsageQuerySchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }
  try {
    const { start, end } = getDateRange(parsed.data.period)
    const summary = await getSystemUsageSummary(start, end, parsed.data.tz)
    return NextResponse.json({ data: summary })
  } catch (error) {
    console.error("[GET /api/admin/token-usage]", error)
    return NextResponse.json({ error: "시스템 사용량 조회에 실패했습니다." }, { status: 500 })
  }
}
