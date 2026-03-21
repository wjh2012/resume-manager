import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { listModelPricing, createModelPricing } from "@/lib/admin/pricing-service"
import { createModelPricingSchema } from "@/lib/validations/admin"

export async function GET() {
  const result = await requireAdmin()
  if (!result.ok) {
    return NextResponse.json(
      { error: result.status === 401 ? "인증이 필요합니다." : "권한이 없습니다." },
      { status: result.status },
    )
  }
  try {
    const pricing = await listModelPricing()
    return NextResponse.json({ data: pricing })
  } catch (error) {
    console.error("[GET /api/admin/model-pricing]", error)
    return NextResponse.json({ error: "단가 목록 조회에 실패했습니다." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const result = await requireAdmin()
  if (!result.ok) {
    return NextResponse.json(
      { error: result.status === 401 ? "인증이 필요합니다." : "권한이 없습니다." },
      { status: result.status },
    )
  }
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "유효하지 않은 요청입니다." }, { status: 400 })
  }
  const parsed = createModelPricingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }
  try {
    const pricing = await createModelPricing(parsed.data)
    return NextResponse.json(pricing, { status: 201 })
  } catch (error) {
    console.error("[POST /api/admin/model-pricing]", error)
    return NextResponse.json({ error: "단가 등록에 실패했습니다." }, { status: 500 })
  }
}
