import { openai } from "@ai-sdk/openai"
import { embedMany } from "ai"

const CHUNK_SIZE = 1000 // 문자 수 기준
const CHUNK_OVERLAP = 200

const embeddingModel = openai.embedding("text-embedding-3-small")

export function getEmbeddingModel() {
  return embeddingModel
}

// 텍스트를 청크 단위로 분할 (문장 경계 고려)
export function splitIntoChunks(text: string): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    let end = start + CHUNK_SIZE

    if (end < text.length) {
      // 문장 경계에서 분할 시도
      const slice = text.slice(start, end)
      const lastBreak = Math.max(
        slice.lastIndexOf(". "),
        slice.lastIndexOf(".\n"),
        slice.lastIndexOf("\n\n"),
      )
      if (lastBreak > CHUNK_SIZE * 0.5) {
        end = start + lastBreak + 1
      }
    } else {
      end = text.length
    }

    const chunk = text.slice(start, end).trim()
    if (chunk.length > 0) {
      chunks.push(chunk)
    }

    // 마지막 청크까지 처리했으면 종료
    if (end >= text.length) break

    start = end - CHUNK_OVERLAP
  }

  return chunks
}

// 텍스트 청크 배열에 대한 임베딩 벡터 생성 (최대 3회 재시도)
export async function generateEmbeddings(
  chunks: string[],
): Promise<{ embeddings: number[][]; totalTokens: number }> {
  const { embeddings, usage } = await embedMany({
    model: getEmbeddingModel(),
    values: chunks,
    maxRetries: 3,
  })
  return { embeddings, totalTokens: usage?.tokens ?? 0 }
}
