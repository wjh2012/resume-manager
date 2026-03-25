import { prisma } from "@/lib/prisma"
import type { BuildContextOptions } from "@/types/ai"

export async function buildFullContext(
  userId: string,
  opts: BuildContextOptions,
): Promise<string> {
  const parts: string[] = []

  if (opts.selectedDocumentIds && opts.selectedDocumentIds.length > 0) {
    const docs = await prisma.document.findMany({
      where: { id: { in: opts.selectedDocumentIds }, userId },
      select: { id: true, title: true, extractedText: true },
    })
    for (const doc of docs) {
      parts.push(
        `[문서: ${doc.title} (ID: ${doc.id})]\n${doc.extractedText ?? "(텍스트 없음)"}`,
      )
    }
  }

  if (opts.selectedExternalDocumentIds && opts.selectedExternalDocumentIds.length > 0) {
    const extDocs = await prisma.externalDocument.findMany({
      where: { id: { in: opts.selectedExternalDocumentIds }, userId },
      select: { id: true, title: true, category: true, content: true },
    })
    for (const doc of extDocs) {
      const label = doc.category ? `${doc.category}: ${doc.title}` : doc.title
      parts.push(`[외부 문서: ${label} (ID: ${doc.id})]\n${doc.content}`)
    }
  }

  if (opts.includeCareerNotes) {
    const notes = await prisma.careerNote.findMany({
      where: { userId, status: "CONFIRMED" },
      select: { id: true, title: true, content: true, metadata: true },
      orderBy: { updatedAt: "desc" },
    })
    for (const note of notes) {
      const meta = note.metadata
        ? `\n메타데이터: ${JSON.stringify(note.metadata)}`
        : ""
      parts.push(
        `[커리어노트: ${note.title} (ID: ${note.id})]\n${note.content}${meta}`,
      )
    }
  }

  return parts.join("\n\n---\n\n")
}
