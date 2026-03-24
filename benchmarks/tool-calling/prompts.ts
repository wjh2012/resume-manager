/**
 * 도구 호출 판단력 벤치마크 — 프롬프트 변형 + 도구 정의 + Pre-check 통합
 *
 * v1/prompts.ts (S1~S4) + v2/prompts.ts (S5~S6) + v2/precheck.ts 를 통합한 파일.
 */

import type { BenchmarkToolDef } from "../lib/providers/types"
import { ALL_DOCUMENTS, ALL_CAREER_NOTES } from "../fixtures/mock-data"

// ---------------------------------------------------------------------------
// 공통: 참고자료 context 빌더
// ---------------------------------------------------------------------------

export function buildContext(personaId?: string): string {
  const docs = personaId
    ? ALL_DOCUMENTS.filter((d) => d.personaId === personaId)
    : ALL_DOCUMENTS;
  const notes = personaId
    ? ALL_CAREER_NOTES.filter((n) => n.personaId === personaId)
    : ALL_CAREER_NOTES;

  const docsSummary = docs.map(
    (d) => `[문서: ${d.title}] (ID: ${d.id})\n${d.summary}`
  ).join("\n\n---\n\n")

  const notesSummary = notes.map(
    (n) => `[커리어노트: ${n.title}] (ID: ${n.id})\n${n.summary}`
  ).join("\n\n---\n\n")

  return docsSummary + "\n\n---\n\n" + notesSummary
}

// ---------------------------------------------------------------------------
// 프롬프트 변형 타입
// ---------------------------------------------------------------------------

export interface PromptVariant {
  id: string
  label: string
  buildSystemPrompt: (context: string, personaId?: string) => string
}

// ---------------------------------------------------------------------------
// 채용공고 텍스트
// ---------------------------------------------------------------------------

import { ALL_EXTERNAL_DOCUMENTS } from "../fixtures/mock-data"

export function getJobPostingText(personaId?: string): string {
  const doc = personaId
    ? ALL_EXTERNAL_DOCUMENTS.find((d) => d.personaId === personaId)
    : ALL_EXTERNAL_DOCUMENTS.find((d) => d.id === "sd-1-ext-1");
  return doc?.extractedText ?? "";
}

// ---------------------------------------------------------------------------
// S1: 최소 — 도구 호출 지시 없음
// ---------------------------------------------------------------------------

const S1: PromptVariant = {
  id: "S1",
  label: "최소",
  buildSystemPrompt: (context, personaId) => `당신은 전문 자기소개서 작성 도우미입니다.
사용자가 네이버 클라우드의 시니어 백엔드 개발자 포지션에 지원하려 합니다.

아래 참고자료를 바탕으로 자기소개서 작성을 도와주세요:
- 사용자의 경험과 역량을 구체적으로 드러내는 문장을 작성하세요.
- 지원하는 회사와 포지션에 맞게 맞춤화하세요.
- 한국어로 작성하세요.
- 아래 참고자료는 요약입니다. 필요하면 도구로 전문을 읽으세요.

[채용공고]
${getJobPostingText(personaId)}

[참고자료]
${context}`,
}

// ---------------------------------------------------------------------------
// S2: 현재 — buildCoverLetterSystemPrompt 정적 스냅샷
// ---------------------------------------------------------------------------

const S2: PromptVariant = {
  id: "S2",
  label: "현재",
  buildSystemPrompt: (context, personaId) => `당신은 전문 자기소개서 작성 도우미입니다.
사용자가 네이버 클라우드의 시니어 백엔드 개발자 포지션에 지원하려 합니다.

아래 참고자료를 바탕으로 자기소개서 작성을 도와주세요:
- 사용자의 경험과 역량을 구체적으로 드러내는 문장을 작성하세요.
- 지원하는 회사와 포지션에 맞게 맞춤화하세요.
- 자연스럽고 진정성 있는 톤을 유지하세요.
- 한국어로 작성하세요.
- 아래 참고자료는 요약입니다. 구체적인 경험, 수치, 세부 내용이 필요하면 readDocument 또는 readCareerNote 도구로 전문을 읽으세요. 특히 초안 작성이나 구체적 사례 언급 시에는 전문을 확인하세요.
- 대화 중 기록할 만한 경험이나 기존 커리어노트의 수정이 필요하면, 먼저 사용자에게 제안하고 승인을 받은 후 saveCareerNote 도구를 사용하세요.

[채용공고]
${getJobPostingText(personaId)}

[참고자료]
${context}`,
}

// ---------------------------------------------------------------------------
// S3: few-shot — S2 + 도구 호출 판단 예시 4개
// ---------------------------------------------------------------------------

const S3: PromptVariant = {
  id: "S3",
  label: "few-shot",
  buildSystemPrompt: (context, personaId) => `당신은 전문 자기소개서 작성 도우미입니다.
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
${getJobPostingText(personaId)}

[참고자료]
${context}`,
}

// ---------------------------------------------------------------------------
// S4: 단계별 판단 — if/else 의사결정 트리
// ---------------------------------------------------------------------------

const S4: PromptVariant = {
  id: "S4",
  label: "단계별 판단",
  buildSystemPrompt: (context, personaId) => `당신은 전문 자기소개서 작성 도우미입니다.
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
${getJobPostingText(personaId)}

[참고자료]
${context}`,
}

// ---------------------------------------------------------------------------
// S5: 실험군 — Superpowers-style 강제 패턴
// ---------------------------------------------------------------------------

const S5: PromptVariant = {
  id: "S5",
  label: "강제 패턴",
  buildSystemPrompt: (context, personaId) => `당신은 전문 자기소개서 작성 도우미입니다.
사용자가 네이버 클라우드의 시니어 백엔드 개발자 포지션에 지원하려 합니다.

아래 참고자료를 바탕으로 자기소개서 작성을 도와주세요:
- 사용자의 경험과 역량을 구체적으로 드러내는 문장을 작성하세요.
- 지원하는 회사와 포지션에 맞게 맞춤화하세요.
- 자연스럽고 진정성 있는 톤을 유지하세요.
- 한국어로 작성하세요.
- 아래 참고자료는 요약입니다. 구체적인 경험, 수치, 세부 내용이 필요하면 readDocument 또는 readCareerNote 도구로 전문을 읽으세요.

[필수 전제 조건]
- 초안/문단 작성은 반드시 readDocument로 원문을 확인한 후 시작하세요.
- 새 경험/수치가 언급되면 반드시 커리어노트 저장을 제안하세요.
- 기존 기록의 수치 변경 시, readCareerNote로 현재 내용을 확인한 후 saveCareerNote를 제안하세요.

[도구 호출 의사결정 — 위에서부터 순서대로 평가하세요]
1. 사용자가 참고자료에 이미 기록된 수치/사실의 변경을 언급했는가?
   → readCareerNote로 기존 기록을 확인하세요. 그 후 수정된 내용으로 saveCareerNote를 제안하세요.
2. 사용자가 참고자료에 없는 새 경험/성과/수치를 언급했는가?
   → saveCareerNote 저장을 제안하세요.
3. 초안/문단 작성이 필요한가?
   → readDocument로 관련 참고자료 원문을 읽은 후 작성하세요.
4. 위 어느 것에도 해당하지 않는가?
   → 도구 호출 없이 응답하세요.

[도구 호출 Red Flags — 이런 생각이 들면 멈추고 재확인하세요]
| 생각 | 실제 |
|------|------|
| "요약만으로 초안을 쓸 수 있다" | 요약은 개요일 뿐. 초안에는 원문의 구체적 수치와 맥락이 필요합니다. readDocument로 확인하세요. |
| "새 정보를 자기소개서에 반영하면 충분하다" | 자기소개서 반영과 커리어노트 저장은 별개입니다. 새 경험은 커리어노트 저장도 제안하세요. |
| "사용자에게 추가 질문을 먼저 하자" | 경험이 이미 구체적이면(수치, 기간, 결과 포함) 저장 제안이 우선입니다. |
| "기존 노트 ID를 알고 있으니 바로 수정하면 된다" | readCareerNote로 현재 내용을 확인해야 기존 정보 유실을 방지할 수 있습니다. |

[응답 전 체크리스트]
□ 초안을 작성했다면 — readDocument를 호출했는가?
□ 새 경험이 언급되었다면 — 커리어노트 저장을 제안했는가?
□ 수치가 변경되었다면 — readCareerNote를 먼저 호출했는가?
□ 위 어느 것에도 해당하지 않는다면 — 도구 호출 없이 응답해도 되는가?
하나라도 미충족이면 도구를 호출한 후 응답을 시작하세요.

[채용공고]
${getJobPostingText(personaId)}

[참고자료]
${context}`,
}

// ---------------------------------------------------------------------------
// S6: 실험군 — S5 + Pre-check 동적 힌트 (runner에서 힌트 주입)
// ---------------------------------------------------------------------------

const S6: PromptVariant = {
  id: "S6",
  label: "강제 패턴 + Pre-check",
  buildSystemPrompt: (context, personaId) => S5.buildSystemPrompt(context, personaId),
}

export const PROMPT_VARIANTS: PromptVariant[] = [S1, S2, S3, S4, S5, S6]

/** Pre-check 대상 변형 ID. runner에서 이 ID면 pre-check 힌트를 주입한다. */
export const PRECHECK_VARIANT_IDS = new Set(["S6"])

// ---------------------------------------------------------------------------
// 도구 정의 (BenchmarkToolDef — JSON Schema 포맷)
// ---------------------------------------------------------------------------

export function createToolDefs(): BenchmarkToolDef[] {
  const readDocument: BenchmarkToolDef = {
    name: "readDocument",
    description:
      "문서의 전체 텍스트를 읽습니다. 요약만으로 부족할 때 호출하세요.",
    parameters: {
      type: "object",
      properties: {
        documentId: {
          type: "string",
          description: "읽을 문서의 ID",
        },
      },
      required: ["documentId"],
    },
  }

  const readCareerNote: BenchmarkToolDef = {
    name: "readCareerNote",
    description:
      "커리어노트의 전체 내용을 읽습니다. 요약만으로 부족할 때 호출하세요.",
    parameters: {
      type: "object",
      properties: {
        careerNoteId: {
          type: "string",
          description: "읽을 커리어노트의 ID",
        },
      },
      required: ["careerNoteId"],
    },
  }

  const saveCareerNote: BenchmarkToolDef = {
    name: "saveCareerNote",
    description:
      "커리어노트를 생성하거나 갱신합니다. 반드시 사용자에게 먼저 제안하고 승인을 받은 후 호출하세요.",
    parameters: {
      type: "object",
      properties: {
        careerNoteId: {
          type: "string",
          description: "갱신할 커리어노트 ID. 없으면 새로 생성",
        },
        title: {
          type: "string",
          description: "커리어노트 제목",
        },
        content: {
          type: "string",
          description: "커리어노트 내용",
        },
        summary: {
          type: "string",
          description: "1~2줄 핵심 요약",
        },
        metadata: {
          type: "object",
          description: "메타데이터",
          properties: {
            role: { type: "string" },
            result: { type: "string" },
            feeling: { type: "string" },
          },
        },
      },
      required: ["title", "content", "summary"],
    },
  }

  return [readDocument, readCareerNote, saveCareerNote]
}

// ---------------------------------------------------------------------------
// Pre-check: 사용자 메시지 분류 + 동적 힌트 생성
// ---------------------------------------------------------------------------

interface PrecheckResult {
  hint: string
  classification: "number-change" | "new-experience" | "draft-request" | "general"
}

/**
 * 사용자 메시지와 참고자료 요약을 비교하여 도구 힌트를 생성한다.
 * 규칙 기반 분류 — 벤치마크 재현성을 위해 LLM 호출 없이 패턴 매칭.
 *
 * @param userMessage 사용자 메시지
 * @param contextSummaries 참고자료 요약 문자열 또는 문자열 배열
 */
export function classifyMessage(
  userMessage: string,
  contextSummaries: string | string[]
): PrecheckResult {
  const summariesStr = Array.isArray(contextSummaries)
    ? contextSummaries.join("\n")
    : contextSummaries

  // 1. 수치 변경 감지: 기존 기록과 다른 수치를 언급
  if (detectNumberChange(userMessage, summariesStr)) {
    return {
      classification: "number-change",
      hint: [
        "[TOOL HINT] 사용자가 기존 기록의 수치 변경을 언급했습니다.",
        "readCareerNote로 기존 기록을 확인한 후, 수정된 내용으로 saveCareerNote를 제안하세요.",
      ].join("\n"),
    }
  }

  // 2. 새 경험 감지: 참고자료에 없는 경험/수치
  if (detectNewExperience(userMessage, summariesStr)) {
    return {
      classification: "new-experience",
      hint: [
        "[TOOL HINT] 사용자가 참고자료에 없는 새 경험/수치를 언급했습니다.",
        "saveCareerNote 저장을 제안하세요. 기존 노트 조회는 불필요합니다.",
      ].join("\n"),
    }
  }

  // 3. 초안/작성 요청 감지
  if (detectDraftRequest(userMessage)) {
    return {
      classification: "draft-request",
      hint: [
        "[TOOL HINT] 사용자가 초안/문단 작성을 요청했습니다.",
        "readDocument로 관련 참고자료 원문을 읽은 후 작성하세요.",
      ].join("\n"),
    }
  }

  // 4. 일반 질문 — 도구 불필요
  return {
    classification: "general",
    hint: "",
  }
}

// ---------------------------------------------------------------------------
// Turn 2 Pre-check: 승인 후 힌트
// ---------------------------------------------------------------------------

/**
 * Turn 2 (사용자 승인 후) 전용 힌트.
 * "승인했으니 바로 saveCareerNote 호출" 지시.
 */
export function generateTurn2Hint(): string {
  return [
    "[TOOL HINT] 사용자가 커리어노트 저장을 승인했습니다.",
    "추가 조회 없이 바로 saveCareerNote를 호출하세요.",
  ].join("\n")
}

// ---------------------------------------------------------------------------
// 패턴 매칭 유틸리티
// ---------------------------------------------------------------------------

/** 기존 기록과 다른 수치를 언급했는지 감지 */
function detectNumberChange(
  message: string,
  contextSummaries: string
): boolean {
  // "아니라", "가 아니라", "에서 X로", "→" 등 변경 표현
  const changePatterns = [
    /아니라/,
    /에서\s*\d+/,
    /\d+.{0,5}(→|->|에서).{0,5}\d+/,
    /(늘었|줄었|변경|바뀌|수정|업데이트)/,
  ]

  const hasChangeExpression = changePatterns.some((p) => p.test(message))
  if (!hasChangeExpression) return false

  // 메시지에 숫자가 있고, 같은 엔티티가 컨텍스트에도 있는지 확인
  const messageNumbers = message.match(/\d+/g)
  if (!messageNumbers) return false

  // 컨텍스트에 등장하는 엔티티(프로젝트명, 지표명 등)가 메시지에도 있는지
  const contextWords = contextSummaries
    .split(/[\s,.\n]+/)
    .filter((w) => w.length >= 2)
  const messageWords = message.split(/[\s,.\n]+/)

  const sharedEntities = messageWords.filter((w) =>
    w.length >= 2 &&
    contextWords.some(
      (cw) => cw.length >= 2 && cw.includes(w)
    )
  )

  return sharedEntities.length > 0
}

/** 참고자료에 없는 새 경험/수치를 언급했는지 감지 */
function detectNewExperience(
  message: string,
  contextSummaries: string
): boolean {
  // 경험 서술 패턴
  const experiencePatterns = [
    /(만들었|개발했|구현했|달성했|처리했)/,
    /\d+.{0,10}(건|개|%|배|만|억)/,
    /(작년|올해|지난).{0,10}(에|부터)/,
  ]

  const hasExperience = experiencePatterns.some((p) => p.test(message))
  if (!hasExperience) return false

  // 핵심 키워드가 컨텍스트에 없는지 확인 (새 경험 = 컨텍스트에 없음)
  const contextLower = contextSummaries.toLowerCase()
  const keywords = message
    .match(/[가-힣a-zA-Z]{2,}/g)
    ?.filter((w) => w.length > 2) ?? []

  // 메시지의 주요 키워드 중 컨텍스트에 없는 것이 있으면 새 경험
  const newKeywords = keywords.filter(
    (w) => !contextLower.includes(w.toLowerCase())
  )

  return newKeywords.length >= 2
}

/** 초안/문단 작성 요청인지 감지 */
function detectDraftRequest(message: string): boolean {
  // 문서/초안 생성 요청: "써줘", "써주", "써봐", "만들어줘" + 자기소개서/초안/문단 관련
  // 단순히 "작성"이 포함된 일반 질문(팁 알려줘 등)은 제외
  const hasWriteRequest = /써줘|써\s*주|써봐|초안|문단/.test(message)
  if (hasWriteRequest) return true

  // "만들어" + 자소서/문서 관련 컨텍스트
  if (/만들어/.test(message) && /자기소개서|이력서|경력기술서|문서|문단|초안/.test(message)) {
    return true
  }

  return false
}
