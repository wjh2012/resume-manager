import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getAuthUser } from "@/lib/supabase/user"
import {
  listCareerNotes,
  countCareerNotes,
  countPendingProposals,
} from "@/lib/career-notes/service"
import { CareerNoteList } from "@/components/career-notes/career-note-list"

export default async function CareerNotesPage() {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">커리어노트</h1>
      <Suspense
        fallback={
          <p className="text-muted-foreground py-12 text-center">
            불러오는 중...
          </p>
        }
      >
        <CareerNoteListSection userId={user.id} />
      </Suspense>
    </div>
  )
}

async function CareerNoteListSection({ userId }: { userId: string }) {
  const [{ notes }, counts, pendingProposalCount] = await Promise.all([
    listCareerNotes(userId, { status: "confirmed" }),
    countCareerNotes(userId),
    countPendingProposals(userId),
  ])

  const serialized = notes.map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    metadata: n.metadata,
    status: n.status,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
    sources: n.sources.map((s) => ({
      conversationId: s.conversationId,
      conversation: s.conversation
        ? {
            id: s.conversation.id,
            type: s.conversation.type,
            coverLetterId: s.conversation.coverLetterId,
            interviewSessionId: s.conversation.interviewSessionId,
          }
        : null,
    })),
  }))

  return (
    <CareerNoteList
      notes={serialized}
      counts={counts}
      pendingProposalCount={pendingProposalCount}
    />
  )
}
