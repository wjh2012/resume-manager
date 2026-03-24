/**
 * 도구 호출 판단력 벤치마크 — 시나리오 정의
 */

import {
  MOCK_DOCUMENTS,
  MOCK_CAREER_NOTES,
  CONV_STYLES,
} from "../../fixtures/mock-data"

// polite 스타일의 앞 4쌍 (8개 메시지) — 공통 대화 히스토리
export const BASE_CONVERSATION = CONV_STYLES.polite.slice(0, 8)

// ---------------------------------------------------------------------------
// 시나리오 정의
// ---------------------------------------------------------------------------

export interface ToolCallExpectation {
  /** 반드시 호출해야 하는 도구 (recall) */
  required: string[]
  /** 호출해도 fail이 아닌 도구 (precision에서 제외) */
  allowed: string[]
  /** 순서가 중요한 경우: [먼저, 나중] 쌍 */
  orderedPairs: [string, string][]
}

export interface ToolCallingScenario {
  id: number
  label: string
  description: string
  lastUserMessage: string
  expected: ToolCallExpectation
  /** 2턴 시나리오: Turn1에서 제안 감지 시 보낼 승인 메시지 */
  approvalMessage?: string
}

export const SCENARIOS: ToolCallingScenario[] = [
  {
    id: 1,
    label: "새 경험",
    description: "문서에 없는 새로운 경험/수치 → 제안 → 승인 → saveCareerNote 생성",
    lastUserMessage:
      "작년에 Rust로 고성능 메시지 큐 만들었는데 초당 50만 건 처리했어",
    approvalMessage: "네, 커리어노트로 저장해주세요.",
    expected: {
      required: ["saveCareerNote"],
      allowed: ["readDocument", "readCareerNote"],
      orderedPairs: [],
    },
  },
  {
    id: 2,
    label: "수치 변경",
    description:
      "기존 커리어노트와 다른 수치 → readCareerNote 확인 → 제안 → 승인 → saveCareerNote 갱신",
    lastUserMessage:
      "아 그 deploy-ez Stars가 450개가 아니라 800개로 늘었어",
    approvalMessage: "네, 수정해서 저장해주세요.",
    expected: {
      required: ["readCareerNote", "saveCareerNote"],
      allowed: ["readDocument"],
      orderedPairs: [["readCareerNote", "saveCareerNote"]],
    },
  },
  {
    id: 3,
    label: "초안 요청",
    description:
      "구체적 문장 작성 요청 → readDocument로 전문 읽기",
    lastUserMessage:
      "deploy-ez 프로젝트 중심으로 핵심역량 써줘",
    expected: {
      required: ["readDocument"],
      allowed: ["readCareerNote"],
      orderedPairs: [],
    },
  },
  {
    id: 4,
    label: "단순 질문",
    description: "도구 호출 없이 답변 가능한 일반 질문",
    lastUserMessage: "자소서 분량은 보통 얼마나 돼?",
    expected: {
      required: [],
      allowed: [],
      orderedPairs: [],
    },
  },
]

// 목업 데이터 재수출
export { MOCK_DOCUMENTS, MOCK_CAREER_NOTES }
