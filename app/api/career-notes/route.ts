import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { listCareerNotesSchema } from "@/lib/validations/career-note"
import { listCareerNotes } from "@/lib/career-notes/service"

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url)
  const raw = {
    status: searchParams.get("status") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  }

  const parsed = listCareerNotesSchema.safeParse(raw)
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
    const result = await listCareerNotes(user.id, parsed.data)
    return NextResponse.json(result)
  } catch (error) {
    console.error("[GET /api/career-notes]", error)
    return NextResponse.json(
      { error: "커리어노트 목록 조회에 실패했습니다." },
      { status: 500 },
    )
  }
}
