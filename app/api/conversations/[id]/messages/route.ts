import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  resetConversationMessages,
  ConversationNotFoundError,
  ConversationForbiddenError,
  ConversationTypeNotAllowedError,
} from "@/lib/conversations/service"

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

  const { id: conversationId } = await params

  try {
    await resetConversationMessages(conversationId, user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ConversationNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof ConversationForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error instanceof ConversationTypeNotAllowedError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("[DELETE /api/conversations/[id]/messages]", error)
    return NextResponse.json(
      { error: "채팅 초기화에 실패했습니다." },
      { status: 500 },
    )
  }
}
