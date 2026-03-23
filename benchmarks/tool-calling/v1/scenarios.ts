/**
 * 도구 호출 판단력 벤치마크 — 시나리오 정의
 */

import {
  MOCK_DOCUMENTS,
  MOCK_CAREER_NOTES,
} from "../../chat-pipeline/v1/common"

// polite 스타일의 앞 4쌍 (8개 메시지) — 공통 대화 히스토리
export const BASE_CONVERSATION: Array<{
  role: "user" | "assistant"
  content: string
}> = [
  {
    role: "user",
    content: "안녕하세요, 네이버 클라우드 지원하려고 합니다.",
  },
  {
    role: "assistant",
    content:
      "네, 네이버 클라우드 시니어 백엔드 개발자 포지션에 지원하시는군요! 채용공고와 참고자료를 확인해보겠습니다. 어떤 부분의 자기소개서를 먼저 작성할까요?",
  },
  {
    role: "user",
    content:
      "일단 전체적인 구조를 잡아주세요. 어떤 항목을 넣으면 좋을지 추천해주세요.",
  },
  {
    role: "assistant",
    content:
      "네이버 클라우드 채용공고를 보면 Kubernetes, MSA, 대규모 분산 시스템, 오픈소스 기여를 중시합니다. 다음 구조를 추천드립니다:\n\n1. 지원 동기\n2. 핵심 역량\n3. 프로젝트 경험\n4. 성장 가능성\n\n어떤 항목부터 시작할까요?",
  },
  {
    role: "user",
    content:
      "좋네요. 2번 핵심 역량부터 시작하죠. 제 Kubernetes 경험을 중심으로 써주세요.",
  },
  {
    role: "assistant",
    content:
      "Kubernetes 관련 경험을 정리해보겠습니다. deploy-ez에서 Docker + Kubernetes 자동 배포 경험, 경력기술서에 ArgoCD 기반 GitOps 파이프라인 경험이 있으시네요.",
  },
  {
    role: "user",
    content:
      "네, deploy-ez 프로젝트에서의 Kubernetes 경험과 회사에서의 경험을 합쳐서 하나의 스토리로 만들어주세요.",
  },
  {
    role: "assistant",
    content:
      "좋습니다. deploy-ez 오픈소스에서 시작된 K8s 자동화가 회사에서 12개 서비스 GitOps로 이어진 스토리로 작성하겠습니다.",
  },
]

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
      allowed: [],
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
