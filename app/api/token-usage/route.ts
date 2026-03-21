import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserUsage } from "@/lib/token-usage/service"
import { tokenUsageQuerySchema } from "@/lib/validations/token-usage"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  const params = Object.fromEntries(request.nextUrl.searchParams)
  const parsed = tokenUsageQuerySchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "유효하지 않은 입력입니다." },
      { status: 400 },
    )
  }

  try {
    const logs = await getUserUsage({ userId: user.id, ...parsed.data })
    const nextCursor = logs.length === parsed.data.limit ? logs[logs.length - 1]?.id : undefined
    return NextResponse.json({ data: logs, nextCursor })
  } catch (error) {
    console.error("[GET /api/token-usage]", error)
    return NextResponse.json({ error: "사용량 조회에 실패했습니다." }, { status: 500 })
  }
}
