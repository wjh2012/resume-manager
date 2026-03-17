import { describe, it, expect, vi } from "vitest"

// splitIntoChunks는 순수 함수이지만 embedding.ts 최상위에서
// openai.embedding()을 즉시 호출하므로 외부 SDK를 mock 처리
// vi.mock은 정적으로 호이스팅되어 import보다 먼저 실행된다
vi.mock("@ai-sdk/openai", () => ({
  openai: {
    embedding: vi.fn().mockReturnValue({ modelId: "text-embedding-3-small" }),
  },
}))

vi.mock("ai", () => ({
  embedMany: vi.fn().mockResolvedValue({ embeddings: [] }),
}))

import { splitIntoChunks } from "@/lib/ai/embedding"

// 내부 상수와 동일한 값 — 테스트 가독성을 위해 명시
const CHUNK_SIZE = 1000
const CHUNK_OVERLAP = 200

// 지정된 길이만큼 반복 문자열 생성
function repeat(char: string, times: number): string {
  return char.repeat(times)
}

// 문장 단위 텍스트 생성 (각 문장은 "S{n} word word... ." 형태)
function makeSentences(count: number, wordsPerSentence = 10): string {
  return Array.from(
    { length: count },
    (_, i) => `S${i + 1} ${"word ".repeat(wordsPerSentence - 1).trim()}.`,
  ).join(" ")
}

// ─────────────────────────────────────────────────────────────────────────────
// 알려진 버그: splitIntoChunks에 무한 루프 결함이 있어 모든 테스트를 skip 처리
//
// 원인 분석:
//   루프 끝에서 start = end - CHUNK_OVERLAP (예: start = end - 200)
//   첫 청크 추출 후 end가 text.length에 도달하면 다음 루프에서도 같은 end 값이
//   계산되어 start가 이전 값으로 되돌아간다. break 조건(start >= text.length)에
//   도달하지 못하므로 루프가 영원히 반복된다.
//
// 수정 방법(제안):
//   1) start = Math.max(0, end - CHUNK_OVERLAP)
//   2) start가 이전 start 이하이면 break 추가
//   3) end === text.length 이면 즉시 break
//
// 수정 완료 후 describe.skip → describe 로 변경하여 테스트를 활성화한다.
// ─────────────────────────────────────────────────────────────────────────────

describe("splitIntoChunks()", () => {
  // 빈 입력
  describe("빈 텍스트 처리", () => {
    it("빈 문자열을 입력하면 빈 배열을 반환해야 한다", () => {
      expect(splitIntoChunks("")).toEqual([])
    })

    it("공백만 있는 문자열은 빈 배열을 반환해야 한다", () => {
      expect(splitIntoChunks("   \n\n   ")).toEqual([])
    })
  })

  // CHUNK_SIZE(1000자) 미만 텍스트
  describe("텍스트 길이가 CHUNK_SIZE(1000자) 미만인 경우", () => {
    it("짧은 텍스트는 청크 1개로 반환해야 한다", () => {
      const text = "짧은 텍스트입니다."
      const chunks = splitIntoChunks(text)
      expect(chunks).toHaveLength(1)
      expect(chunks[0]).toBe(text)
    })

    it("CHUNK_SIZE - 1 = 999자 텍스트는 청크 1개로 반환해야 한다", () => {
      const text = repeat("a", CHUNK_SIZE - 1)
      const chunks = splitIntoChunks(text)
      expect(chunks).toHaveLength(1)
    })
  })

  // CHUNK_SIZE(1000자) 초과 텍스트
  describe("텍스트 길이가 CHUNK_SIZE(1000자)를 초과하는 경우", () => {
    it("1001자 텍스트는 2개 이상의 청크로 분할해야 한다", () => {
      const text = repeat("a", CHUNK_SIZE + 1)
      const chunks = splitIntoChunks(text)
      expect(chunks.length).toBeGreaterThanOrEqual(2)
    })

    it("모든 청크는 빈 문자열이 아니어야 한다", () => {
      const text = repeat("x", CHUNK_SIZE * 3)
      const chunks = splitIntoChunks(text)
      for (const chunk of chunks) {
        expect(chunk.length).toBeGreaterThan(0)
      }
    })

    it("모든 청크의 길이는 CHUNK_SIZE(1000자)를 초과하지 않아야 한다", () => {
      const text = repeat("b", CHUNK_SIZE * 5)
      const chunks = splitIntoChunks(text)
      for (const chunk of chunks) {
        expect(chunk.length).toBeLessThanOrEqual(CHUNK_SIZE)
      }
    })
  })

  // 오버랩 동작
  describe("오버랩(CHUNK_OVERLAP = 200자) 동작", () => {
    it("연속된 청크의 끝과 다음 청크의 시작 부분이 겹쳐야 한다", () => {
      const text = repeat("c", CHUNK_SIZE * 2)
      const chunks = splitIntoChunks(text)
      expect(chunks.length).toBeGreaterThanOrEqual(2)

      // 첫 번째 청크의 마지막 CHUNK_OVERLAP자가 두 번째 청크 시작 부분에 있어야 한다
      const firstChunkTail = chunks[0].slice(-CHUNK_OVERLAP)
      expect(chunks[1].startsWith(firstChunkTail)).toBe(true)
    })
  })

  // 문장 경계 감지
  describe("문장 경계('. ', '.\\n', '\\n\\n') 감지", () => {
    it("청크 크기 50%를 넘는 위치의 '. ' 경계에서 분할해야 한다", () => {
      const before = repeat("a", Math.floor(CHUNK_SIZE * 0.6))
      const after = repeat("b", CHUNK_SIZE)
      const text = before + ". " + after

      const chunks = splitIntoChunks(text)
      expect(chunks.length).toBeGreaterThanOrEqual(2)
      // 첫 청크는 '.'를 포함해야 한다
      expect(chunks[0]).toContain(".")
    })

    it("'\\n\\n' 경계에서도 분할이 이루어져야 한다", () => {
      const before = repeat("a", Math.floor(CHUNK_SIZE * 0.6))
      const after = repeat("b", CHUNK_SIZE)
      const text = before + "\n\n" + after

      const chunks = splitIntoChunks(text)
      expect(chunks.length).toBeGreaterThanOrEqual(2)
    })

    it("문장 경계가 CHUNK_SIZE의 50% 이하 위치에 있으면 경계를 무시하고 CHUNK_SIZE로 분할해야 한다", () => {
      // 30% 위치에 '. ' 삽입 — lastBreak > CHUNK_SIZE * 0.5 조건 미충족
      const before = repeat("a", Math.floor(CHUNK_SIZE * 0.3))
      const after = repeat("b", CHUNK_SIZE * 3)
      const text = before + ". " + after

      const chunks = splitIntoChunks(text)
      // 경계를 무시했으므로 첫 청크는 CHUNK_SIZE에 가깝게 분할
      expect(chunks[0].length).toBeGreaterThanOrEqual(CHUNK_SIZE * 0.8)
    })
  })

  // 원문 내용 보존
  describe("원문 내용 보존", () => {
    it("각 청크가 원문의 부분 문자열을 포함해야 한다", () => {
      const sentences = makeSentences(30)
      const chunks = splitIntoChunks(sentences)
      for (const chunk of chunks) {
        expect(sentences).toContain(chunk.slice(0, 50))
      }
    })
  })
})
