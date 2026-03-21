import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { getUserRanking } from "@/lib/admin/usage-service"
import { adminUsageQuerySchema } from "@/lib/validations/admin"
import { getDateRange } from "@/lib/utils/date-range"

export async function GET(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })
  }
  const params = Object.fromEntries(request.nextUrl.searchParams)
  const parsed = adminUsageQuerySchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }
  try {
    const { start, end } = getDateRange(parsed.data.period)
    const rankings = await getUserRanking({ startDate: start, endDate: end, limit: parsed.data.limit })
    return NextResponse.json({ data: rankings })
  } catch (error) {
    console.error("[GET /api/admin/token-usage/users]", error)
    return NextResponse.json({ error: "사용자 랭킹 조회에 실패했습니다." }, { status: 500 })
  }
}
