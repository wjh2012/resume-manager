import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { resolveMergeProposalSchema } from "@/lib/validations/career-note"
import { UUID_RE } from "@/lib/utils"
import { resolveMergeProposal } from "@/lib/career-notes/service"
import {
  MergeProposalNotFoundError,
  MergeProposalForbiddenError,
} from "@/lib/career-notes/errors"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 },
    )
  }

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: "잘못된 병합 제안 ID 형식입니다." },
      { status: 400 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    )
  }

  const parsed = resolveMergeProposalSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "유효하지 않은 입력입니다.",
      },
      { status: 400 },
    )
  }

  try {
    await resolveMergeProposal(user.id, id, parsed.data)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof MergeProposalNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof MergeProposalForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[POST /api/career-notes/merge-proposals/[id]/resolve]", error)
    return NextResponse.json(
      { error: "병합 제안 처리에 실패했습니다." },
      { status: 500 },
    )
  }
}
