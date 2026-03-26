import { ConversationType } from "@prisma/client"

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

export class ConversationTypeNotAllowedError extends Error {
  constructor() {
    super("이 대화 유형은 초기화할 수 없습니다.")
  }
}

/**
 * 대화의 모든 메시지를 삭제하여 채팅을 초기화한다.
 * 대화 자체는 유지되며, 연결된 인사이트/커리어노트는 보존한다.
 * COVER_LETTER 타입의 대화만 초기화할 수 있다.
 */
export async function resetConversationMessages(
  conversationId: string,
  userId: string,
): Promise<void> {
  // 1. 존재 여부 + 소유권 + 타입을 먼저 검증
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { userId: true, type: true },
  })

  if (!conversation) throw new ConversationNotFoundError()
  if (conversation.userId !== userId) throw new ConversationForbiddenError()
  if (conversation.type !== ConversationType.COVER_LETTER) {
    throw new ConversationTypeNotAllowedError()
  }

  // 2. 검증 통과 후 메시지 삭제
  await prisma.message.deleteMany({
    where: { conversationId },
  })
}
