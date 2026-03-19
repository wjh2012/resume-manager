import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { updateInterviewSchema } from "@/lib/validations/interview"
import {
  getInterview,
  completeInterview,
  deleteInterview,
  InterviewNotFoundError,
  InterviewForbiddenError,
} from "@/lib/interviews/service"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  const { id } = await params

  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: "잘못된 면접 세션 ID 형식입니다." },
      { status: 400 },
    )
  }

  try {
    const session = await getInterview(id, user.id)

    if (!session) {
      return NextResponse.json(
        { error: "면접 세션을 찾을 수 없습니다." },
        { status: 404 },
      )
    }

    return NextResponse.json(session)
  } catch (error) {
    console.error("[GET /api/interviews/[id]]", error)
    return NextResponse.json(
      { error: "면접 세션을 불러오는데 실패했습니다." },
      { status: 500 },
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  const { id } = await params

  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: "잘못된 면접 세션 ID 형식입니다." },
      { status: 400 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "유효하지 않은 요청입니다." },
      { status: 400 },
    )
  }

  const parsed = updateInterviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "유효하지 않은 입력입니다." },
      { status: 400 },
    )
  }

  try {
    const result = await completeInterview(id, user.id)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof InterviewNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof InterviewForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[PUT /api/interviews/[id]]", error)
    return NextResponse.json(
      { error: "면접 세션 업데이트에 실패했습니다." },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  const { id } = await params

  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: "잘못된 면접 세션 ID 형식입니다." },
      { status: 400 },
    )
  }

  try {
    await deleteInterview(id, user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof InterviewNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof InterviewForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[DELETE /api/interviews/[id]]", error)
    return NextResponse.json(
      { error: "면접 세션 삭제에 실패했습니다." },
      { status: 500 },
    )
  }
}
