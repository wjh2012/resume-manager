import { notFound, redirect } from "next/navigation"
import type { UIMessage } from "ai"
import { getAuthUser } from "@/lib/supabase/user"
import { getCoverLetter } from "@/lib/cover-letters/service"
import { listDocuments } from "@/lib/documents/service"
import { CoverLetterWorkspace } from "@/components/cover-letters/cover-letter-workspace"

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

export default async function CoverLetterWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const { id } = await params
  const [coverLetter, documents] = await Promise.all([
    getCoverLetter(id, user.id),
    listDocuments(user.id),
  ])

  if (!coverLetter) notFound()

  const conversation = coverLetter.conversations[0]
  if (!conversation) notFound()
  const serializedDocs = documents.map((doc) => ({
    id: doc.id,
    title: doc.title,
    type: doc.type,
  }))

  const selectedDocumentIds = coverLetter.coverLetterDocuments.map(
    (cld) => cld.document.id,
  )

  const initialMessages = toUIMessages(conversation.messages)

  // -m-6으로 부모 p-6 padding을 상쇄, spacing.12 = p-6 상하 합산(3rem)
  return (
    <div className="-m-6 h-[calc(100%+theme(spacing.12))]">
      <CoverLetterWorkspace
        coverLetterId={coverLetter.id}
        conversationId={conversation.id}
        initialContent={coverLetter.content ?? ""}
        initialMessages={initialMessages}
        documents={serializedDocs}
        selectedDocumentIds={selectedDocumentIds}
      />
    </div>
  )
}
