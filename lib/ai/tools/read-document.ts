import { tool } from "ai"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

export function createReadDocumentTool(
  userId: string,
  allowedDocumentIds: string[]
) {
  return tool({
    description: "문서의 전체 텍스트를 읽습니다. 요약만으로 부족할 때 호출하세요.",
    inputSchema: z.object({
      documentId: z.string().describe("읽을 문서의 ID"),
    }),
    execute: async ({ documentId }) => {
      if (!allowedDocumentIds.includes(documentId)) {
        return "해당 문서에 접근할 수 없습니다."
      }
      const doc = await prisma.document.findFirst({
        where: { id: documentId, userId },
        select: { title: true, extractedText: true },
      })
      if (!doc) return "문서를 찾을 수 없습니다."
      return `[${doc.title}]\n${doc.extractedText ?? ""}`
    },
  })
}
