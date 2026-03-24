import { tool } from "ai"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

export function createReadExternalDocumentTool(
  userId: string,
  allowedExternalDocumentIds: string[],
) {
  return tool({
    description: "외부 문서(채용공고, JD 등)의 전체 텍스트를 읽습니다. 요약만으로 부족할 때 호출하세요.",
    inputSchema: z.object({
      externalDocumentId: z.string().describe("읽을 외부 문서의 ID"),
    }),
    execute: async ({ externalDocumentId }) => {
      if (!allowedExternalDocumentIds.includes(externalDocumentId)) {
        return "해당 외부 문서에 접근할 수 없습니다."
      }
      const doc = await prisma.externalDocument.findFirst({
        where: { id: externalDocumentId, userId },
        select: { title: true, content: true },
      })
      if (!doc) return "외부 문서를 찾을 수 없습니다."
      return `[${doc.title}]\n${doc.content}`
    },
  })
}
