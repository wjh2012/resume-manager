import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { createClient } from "@/lib/supabase/server"
import { listUserQuotas, createUserQuota } from "@/lib/user-quota/service"
import { createUserQuotaSchema } from "@/lib/validations/user-quota"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  try {
    const quotas = await listUserQuotas(user.id)
    return NextResponse.json({ data: quotas })
  } catch (error) {
    console.error("[GET /api/user-quotas]", error)
    return NextResponse.json({ error: "자기 제한 목록 조회에 실패했습니다." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "유효하지 않은 요청입니다." }, { status: 400 })
  }

  const parsed = createUserQuotaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  try {
    const quota = await createUserQuota({ userId: user.id, ...parsed.data })
    return NextResponse.json({ data: quota }, { status: 201 })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "이미 동일한 유형의 자기 제한이 존재합니다." },
        { status: 409 },
      )
    }
    console.error("[POST /api/user-quotas]", error)
    return NextResponse.json({ error: "자기 제한 생성에 실패했습니다." }, { status: 500 })
  }
}
