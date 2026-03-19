import { notFound, redirect } from "next/navigation"
import type { UIMessage } from "ai"
import { getAuthUser } from "@/lib/supabase/user"
import { getInterview } from "@/lib/interviews/service"
import { InterviewChat } from "@/components/interviews/interview-chat"

function toUIMessages(
  messages: { id: string; role: string; content: string }[],
): UIMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role.toLowerCase() as "user" | "assistant",
    content: m.content,
    parts: [{ type: "text" as const, text: m.content }],
  }))
}

export default async function InterviewWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [user, { id }] = await Promise.all([getAuthUser(), params])
  if (!user) redirect("/login")
  const session = await getInterview(id, user.id)

  if (!session) notFound()

  const conversation = session.conversations[0]
  if (!conversation) notFound()

  const initialMessages = toUIMessages(conversation.messages)

  return (
    // -m-6으로 부모 p-6 padding 상쇄, 전체화면 채팅
    <div className="relative -m-6 h-[calc(100%+theme(spacing.12))]">
      <InterviewChat
        sessionId={session.id}
        conversationId={conversation.id}
        title={session.title}
        companyName={session.companyName}
        position={session.position}
        initialMessages={initialMessages}
        isCompleted={session.status === "COMPLETED"}
      />
    </div>
  )
}
