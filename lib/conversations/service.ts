import { prisma } from "@/lib/prisma"

export class ConversationNotFoundError extends Error {
  constructor() {
    super("대화를 찾을 수 없습니다.")
  }
}

export class ConversationForbiddenError extends Error {
  constructor() {
    super("이 대화에 대한 권한이 없습니다.")
  }
}

/**
 * 대화의 모든 메시지를 삭제하여 채팅을 초기화한다.
 * 대화 자체는 유지되며, 연결된 인사이트/커리어노트는 보존한다.
 */
export async function resetConversationMessages(
  conversationId: string,
  userId: string,
): Promise<void> {
  const result = await prisma.message.deleteMany({
    where: { conversationId, conversation: { userId } },
  })

  if (result.count === 0) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId: true },
    })
    if (!conversation) throw new ConversationNotFoundError()
    if (conversation.userId !== userId) throw new ConversationForbiddenError()
    // count === 0 이지만 대화가 존재하고 소유자가 맞으면 이미 비어있는 상태 — 정상
  }
}
