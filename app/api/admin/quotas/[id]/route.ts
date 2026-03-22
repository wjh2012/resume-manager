import { z } from "zod"
import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { requireAdmin } from "@/lib/auth/require-admin"
import { updateQuota, deleteQuota } from "@/lib/admin/quota-service"
import { updateQuotaSchema } from "@/lib/validations/admin"

function isPrismaNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025"
}

const uuidSchema = z.string().uuid()

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const result = await requireAdmin()
  if (!result.ok) {
    return NextResponse.json(
      { error: result.status === 401 ? "인증이 필요합니다." : "권한이 없습니다." },
      { status: result.status },
    )
  }
  const { id } = await params
  const idParsed = uuidSchema.safeParse(id)
  if (!idParsed.success) {
    return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 })
  }
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "유효하지 않은 요청입니다." }, { status: 400 })
  }
  const parsed = updateQuotaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }
  try {
    const quota = await updateQuota(id, parsed.data)
    return NextResponse.json({ data: quota })
  } catch (error) {
    if (isPrismaNotFound(error)) {
      return NextResponse.json({ error: "Quota를 찾을 수 없습니다." }, { status: 404 })
    }
    console.error("[PUT /api/admin/quotas]", error)
    return NextResponse.json({ error: "Quota 수정에 실패했습니다." }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const result = await requireAdmin()
  if (!result.ok) {
    return NextResponse.json(
      { error: result.status === 401 ? "인증이 필요합니다." : "권한이 없습니다." },
      { status: result.status },
    )
  }
  const { id } = await params
  const idParsedDelete = uuidSchema.safeParse(id)
  if (!idParsedDelete.success) {
    return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 })
  }
  try {
    await deleteQuota(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (isPrismaNotFound(error)) {
      return NextResponse.json({ error: "Quota를 찾을 수 없습니다." }, { status: 404 })
    }
    console.error("[DELETE /api/admin/quotas]", error)
    return NextResponse.json({ error: "Quota 삭제에 실패했습니다." }, { status: 500 })
  }
}
