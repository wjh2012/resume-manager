import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { updateUserQuota, deleteUserQuota } from "@/lib/user-quota/service"
import { updateUserQuotaSchema } from "@/lib/validations/user-quota"
import { UUID_RE } from "@/lib/utils"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "유효하지 않은 요청입니다." }, { status: 400 })
  }

  const parsed = updateUserQuotaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  try {
    const updated = await updateUserQuota(id, user.id, parsed.data)
    if (!updated) {
      return NextResponse.json({ error: "자기 제한을 찾을 수 없습니다." }, { status: 404 })
    }
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[PUT /api/user-quotas]", error)
    return NextResponse.json({ error: "자기 제한 수정에 실패했습니다." }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 })
  }

  try {
    const deleted = await deleteUserQuota(id, user.id)
    if (!deleted) {
      return NextResponse.json({ error: "자기 제한을 찾을 수 없습니다." }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/user-quotas]", error)
    return NextResponse.json({ error: "자기 제한 삭제에 실패했습니다." }, { status: 500 })
  }
}
