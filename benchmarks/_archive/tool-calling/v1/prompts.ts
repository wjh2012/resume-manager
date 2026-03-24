/**
 * 도구 호출 판단력 벤치마크 — 프롬프트 변형 + 도구 정의
 */

import { tool } from "ai"
import { z } from "zod"
import {
  MOCK_DOCUMENTS,
  MOCK_CAREER_NOTES,
} from "./scenarios"

// ---------------------------------------------------------------------------
// 공통: 참고자료 context 빌더
// ---------------------------------------------------------------------------

export function buildContext() {
  const docsSummary = MOCK_DOCUMENTS.map(
    (d) => `[문서: ${d.title}] (ID: ${d.id})\n${d.summary}`
  ).join("\n\n---\n\n")

  const notesSummary = MOCK_CAREER_NOTES.map(
    (n) => `[커리어노트: ${n.title}] (ID: ${n.id})\n${n.summary}`
  ).join("\n\n---\n\n")

  return docsSummary + "\n\n---\n\n" + notesSummary
}

// ---------------------------------------------------------------------------
// 프롬프트 변형
// ---------------------------------------------------------------------------

export interface PromptVariant {
  id: string
  label: string
  buildSystemPrompt: (context: string) => string
}

const JOB_POSTING_TEXT = MOCK_DOCUMENTS.find(
  (d) => d.id === "doc-3"
)!.extractedText

// S1: 최소 — 도구 호출 지시 없음
const S1: PromptVariant = {
  id: "S1",
  label: "최소",
  buildSystemPrompt: (context) => `당신은 전문 자기소개서 작성 도우미입니다.
사용자가 네이버 클라우드의 시니어 백엔드 개발자 포지션에 지원하려 합니다.

아래 참고자료를 바탕으로 자기소개서 작성을 도와주세요:
- 사용자의 경험과 역량을 구체적으로 드러내는 문장을 작성하세요.
- 지원하는 회사와 포지션에 맞게 맞춤화하세요.
- 한국어로 작성하세요.
- 아래 참고자료는 요약입니다. 필요하면 도구로 전문을 읽으세요.

[채용공고]
${JOB_POSTING_TEXT}

[참고자료]
${context}`,
}

// S2: 현재 — buildCoverLetterSystemPrompt 정적 스냅샷
const S2: PromptVariant = {
  id: "S2",
  label: "현재",
  buildSystemPrompt: (context) => `당신은 전문 자기소개서 작성 도우미입니다.
사용자가 네이버 클라우드의 시니어 백엔드 개발자 포지션에 지원하려 합니다.

아래 참고자료를 바탕으로 자기소개서 작성을 도와주세요:
- 사용자의 경험과 역량을 구체적으로 드러내는 문장을 작성하세요.
- 지원하는 회사와 포지션에 맞게 맞춤화하세요.
- 자연스럽고 진정성 있는 톤을 유지하세요.
- 한국어로 작성하세요.
- 아래 참고자료는 요약입니다. 구체적인 경험, 수치, 세부 내용이 필요하면 readDocument 또는 readCareerNote 도구로 전문을 읽으세요. 특히 초안 작성이나 구체적 사례 언급 시에는 전문을 확인하세요.
- 대화 중 기록할 만한 경험이나 기존 커리어노트의 수정이 필요하면, 먼저 사용자에게 제안하고 승인을 받은 후 saveCareerNote 도구를 사용하세요.

[채용공고]
${JOB_POSTING_TEXT}

[참고자료]
${context}`,
}

// S3: few-shot — S2 + 도구 호출 판단 예시 4개
const S3: PromptVariant = {
  id: "S3",
  label: "few-shot",
  buildSystemPrompt: (context) => `당신은 전문 자기소개서 작성 도우미입니다.
사용자가 네이버 클라우드의 시니어 백엔드 개발자 포지션에 지원하려 합니다.

아래 참고자료를 바탕으로 자기소개서 작성을 도와주세요:
- 사용자의 경험과 역량을 구체적으로 드러내는 문장을 작성하세요.
- 지원하는 회사와 포지션에 맞게 맞춤화하세요.
- 자연스럽고 진정성 있는 톤을 유지하세요.
- 한국어로 작성하세요.
- 아래 참고자료는 요약입니다. 구체적인 경험, 수치, 세부 내용이 필요하면 readDocument 또는 readCareerNote 도구로 전문을 읽으세요. 특히 초안 작성이나 구체적 사례 언급 시에는 전문을 확인하세요.
- 대화 중 기록할 만한 경험이나 기존 커리어노트의 수정이 필요하면, 먼저 사용자에게 제안하고 승인을 받은 후 saveCareerNote 도구를 사용하세요.

[도구 호출 판단 예시]
- "작년에 AWS 마이그레이션 리드했어" → saveCareerNote 제안 (새 경험)
- "성능 개선은 40%가 아니라 60%였어" → readCareerNote 후 saveCareerNote 갱신 제안
- "핵심역량 써줘" → readDocument로 전문 읽기
- "고마워요" → 도구 호출 없음

[채용공고]
${JOB_POSTING_TEXT}

[참고자료]
${context}`,
}

// S4: 단계별 판단 — if/else 의사결정 트리
const S4: PromptVariant = {
  id: "S4",
  label: "단계별 판단",
  buildSystemPrompt: (context) => `당신은 전문 자기소개서 작성 도우미입니다.
사용자가 네이버 클라우드의 시니어 백엔드 개발자 포지션에 지원하려 합니다.

아래 참고자료를 바탕으로 자기소개서 작성을 도와주세요:
- 사용자의 경험과 역량을 구체적으로 드러내는 문장을 작성하세요.
- 지원하는 회사와 포지션에 맞게 맞춤화하세요.
- 자연스럽고 진정성 있는 톤을 유지하세요.
- 한국어로 작성하세요.
- 아래 참고자료는 요약입니다. 구체적인 경험, 수치, 세부 내용이 필요하면 readDocument 또는 readCareerNote 도구로 전문을 읽으세요. 특히 초안 작성이나 구체적 사례 언급 시에는 전문을 확인하세요.
- 대화 중 기록할 만한 경험이나 기존 커리어노트의 수정이 필요하면, 먼저 사용자에게 제안하고 승인을 받은 후 saveCareerNote 도구를 사용하세요.

도구 호출 판단 기준:
1. 사용자가 문서에 없는 새 경험/성과/수치를 언급했는가? → saveCareerNote로 저장 제안
2. 기존 커리어노트와 다른 정보인가? → readCareerNote로 확인 후 saveCareerNote로 갱신 제안
3. 구체적 문장 작성이 필요한가? → readDocument로 전문 읽기
4. 위에 해당하지 않으면 → 도구 호출 없이 응답

[채용공고]
${JOB_POSTING_TEXT}

[참고자료]
${context}`,
}

export const PROMPT_VARIANTS: PromptVariant[] = [S1, S2, S3, S4]

// ---------------------------------------------------------------------------
// 도구 정의 (프로덕션 description/inputSchema 복제, execute는 mock)
// ---------------------------------------------------------------------------

export function createTools() {
  const readDocument = tool({
    description:
      "문서의 전체 텍스트를 읽습니다. 요약만으로 부족할 때 호출하세요.",
    inputSchema: z.object({
      documentId: z.string().describe("읽을 문서의 ID"),
    }),
    execute: async ({ documentId }) => {
      const doc = MOCK_DOCUMENTS.find((d) => d.id === documentId)
      if (!doc) return "문서를 찾을 수 없습니다."
      return `[${doc.title}]\n${doc.extractedText}`
    },
  })

  const readCareerNote = tool({
    description:
      "커리어노트의 전체 내용을 읽습니다. 요약만으로 부족할 때 호출하세요.",
    inputSchema: z.object({
      careerNoteId: z.string().describe("읽을 커리어노트의 ID"),
    }),
    execute: async ({ careerNoteId }) => {
      const note = MOCK_CAREER_NOTES.find(
        (n) => n.id === careerNoteId
      )
      if (!note) return "커리어노트를 찾을 수 없습니다."
      return `[${note.title}]\n${note.content}`
    },
  })

  const saveCareerNote = tool({
    description:
      "커리어노트를 생성하거나 갱신합니다. 반드시 사용자에게 먼저 제안하고 승인을 받은 후 호출하세요.",
    inputSchema: z.object({
      careerNoteId: z
        .string()
        .optional()
        .describe("갱신할 커리어노트 ID. 없으면 새로 생성"),
      title: z.string().describe("커리어노트 제목"),
      content: z.string().describe("커리어노트 내용"),
      summary: z.string().describe("1~2줄 핵심 요약"),
      metadata: z
        .object({
          role: z.string().optional(),
          result: z.string().optional(),
          feeling: z.string().optional(),
        })
        .optional()
        .describe("메타데이터"),
    }),
    execute: async ({ title }) =>
      `커리어노트 "${title}"이(가) 저장되었습니다.`,
  })

  return { readDocument, readCareerNote, saveCareerNote }
}
