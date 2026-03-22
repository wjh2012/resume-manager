import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { listPendingProposals } from "@/lib/career-notes/service"

export async function GET() {
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

  try {
    const proposals = await listPendingProposals(user.id)
    return NextResponse.json({ proposals })
  } catch (error) {
    console.error("[GET /api/career-notes/merge-proposals]", error)
    return NextResponse.json(
      { error: "병합 제안 목록 조회에 실패했습니다." },
      { status: 500 },
    )
  }
}
