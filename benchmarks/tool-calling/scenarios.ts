/**
 * 도구 호출 판단력 벤치마크 — 시나리오 정의
 */

import type { BenchmarkMessage } from "../fixtures/types";
import type { MockPersona } from "../fixtures/mock-data";
import { ALL_PERSONAS, ALL_CONV_STYLES } from "../fixtures/mock-data";

export interface ToolCallExpectation {
  /** 반드시 호출해야 하는 도구 (recall) */
  required: string[];
  /** 호출해도 fail이 아닌 도구 (precision에서 제외) */
  allowed: string[];
  /** 순서가 중요한 경우: [먼저, 나중] 쌍 */
  orderedPairs?: [string, string][];
}

export interface ToolCallingScenario {
  id: string;
  name: string;
  persona: MockPersona;
  messages: BenchmarkMessage[];
  expected: ToolCallExpectation;
  approvalMessage?: string;
}

// sd-1 페르소나
const sd1Persona = ALL_PERSONAS.find((p) => p.id === "sd-1")!;

// polite 스타일의 앞 4쌍 (8개 메시지) — 공통 대화 히스토리
export const BASE_CONVERSATION: BenchmarkMessage[] =
  ALL_CONV_STYLES["sd-1"]["polite"].slice(0, 8);

// ---------------------------------------------------------------------------
// 시나리오 정의
// ---------------------------------------------------------------------------

export const SCENARIOS: ToolCallingScenario[] = [
  {
    id: "tc-1",
    name: "새 경험",
    persona: sd1Persona,
    messages: [
      ...BASE_CONVERSATION,
      {
        role: "user",
        content: "작년에 Rust로 고성능 메시지 큐 만들었는데 초당 50만 건 처리했어",
      },
    ],
    approvalMessage: "네, 커리어노트로 저장해주세요.",
    expected: {
      required: ["saveCareerNote"],
      allowed: ["readDocument", "readCareerNote"],
      orderedPairs: [],
    },
  },
  {
    id: "tc-2",
    name: "수치 변경",
    persona: sd1Persona,
    messages: [
      ...BASE_CONVERSATION,
      {
        role: "user",
        content: "아 그 deploy-ez Stars가 450개가 아니라 800개로 늘었어",
      },
    ],
    approvalMessage: "네, 수정해서 저장해주세요.",
    expected: {
      required: ["readCareerNote", "saveCareerNote"],
      allowed: ["readDocument"],
      orderedPairs: [["readCareerNote", "saveCareerNote"]],
    },
  },
  {
    id: "tc-3",
    name: "초안 요청",
    persona: sd1Persona,
    messages: [
      ...BASE_CONVERSATION,
      {
        role: "user",
        content: "deploy-ez 프로젝트 중심으로 핵심역량 써줘",
      },
    ],
    expected: {
      required: ["readDocument"],
      allowed: ["readCareerNote"],
      orderedPairs: [],
    },
  },
  {
    id: "tc-4",
    name: "단순 질문",
    persona: sd1Persona,
    messages: [
      ...BASE_CONVERSATION,
      {
        role: "user",
        content: "자소서 분량은 보통 얼마나 돼?",
      },
    ],
    expected: {
      required: [],
      allowed: [],
      orderedPairs: [],
    },
  },
];
