import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { listQuotas, createQuota } from "@/lib/admin/quota-service"
import { createQuotaSchema } from "@/lib/validations/admin"

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })
  }
  try {
    const quotas = await listQuotas()
    return NextResponse.json({ data: quotas })
  } catch (error) {
    console.error("[GET /api/admin/quotas]", error)
    return NextResponse.json({ error: "Quota 목록 조회에 실패했습니다." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })
  }
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "유효하지 않은 요청입니다." }, { status: 400 })
  }
  const parsed = createQuotaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }
  try {
    const quota = await createQuota(parsed.data)
    return NextResponse.json(quota, { status: 201 })
  } catch (error) {
    console.error("[POST /api/admin/quotas]", error)
    return NextResponse.json({ error: "Quota 생성에 실패했습니다." }, { status: 500 })
  }
}
