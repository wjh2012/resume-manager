import { prisma } from "@/lib/prisma"
import type { BuildContextOptions } from "@/types/ai"

interface BuildContextResult {
  context: string
  careerNoteCount: number
}

export async function buildContext(
  userId: string,
  opts: BuildContextOptions,
): Promise<BuildContextResult> {
  const parts: string[] = []
  let careerNoteCount = 0

  // 1. 선택 문서 요약
  if (opts.selectedDocumentIds && opts.selectedDocumentIds.length > 0) {
    const docs = await prisma.document.findMany({
      where: { id: { in: opts.selectedDocumentIds }, userId },
      select: { id: true, title: true, summary: true },
    })

    for (const doc of docs) {
      if (doc.summary) {
        parts.push(`[문서: ${doc.title} (ID: ${doc.id})]\n${doc.summary}`)
      } else {
        parts.push(
          `[문서: ${doc.title} (ID: ${doc.id})]\n요약 없음 — readDocument 도구로 전문을 확인하세요`,
        )
      }
    }
  }

  // 2. 커리어노트 요약 (자소서 전용, 전체 확정 노트)
  if (opts.includeCareerNotes) {
    const notes = await prisma.careerNote.findMany({
      where: { userId, status: "CONFIRMED" },
      select: { id: true, title: true, summary: true },
      orderBy: { updatedAt: "desc" },
    })

    careerNoteCount = notes.length

    for (const note of notes) {
      if (note.summary) {
        parts.push(
          `[커리어노트: ${note.title} (ID: ${note.id})]\n${note.summary}`,
        )
      } else {
        parts.push(
          `[커리어노트: ${note.title} (ID: ${note.id})]\n요약 없음 — readCareerNote 도구로 전문을 확인하세요`,
        )
      }
    }
  }

  return {
    context: parts.join("\n\n---\n\n"),
    careerNoteCount,
  }
}
