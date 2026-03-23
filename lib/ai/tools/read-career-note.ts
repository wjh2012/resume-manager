import { tool } from "ai"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

export function createReadCareerNoteTool(userId: string) {
  return tool({
    description:
      "커리어노트의 전체 내용을 읽습니다. 요약만으로 부족할 때 호출하세요.",
    inputSchema: z.object({
      careerNoteId: z.string().describe("읽을 커리어노트의 ID"),
    }),
    execute: async ({ careerNoteId }) => {
      const note = await prisma.careerNote.findFirst({
        where: { id: careerNoteId, userId, status: "CONFIRMED" },
        select: { title: true, content: true, metadata: true },
      })
      if (!note) return "커리어노트를 찾을 수 없습니다."
      const meta = note.metadata as Record<string, string> | null
      const metaLine = meta
        ? Object.entries(meta)
            .filter(([, v]) => v)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" | ")
        : ""
      return `[${note.title}]\n${note.content}${metaLine ? `\n${metaLine}` : ""}`
    },
  })
}
