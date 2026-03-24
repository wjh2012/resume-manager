/**
 * chat-pipeline 벤치마크 시나리오
 *
 * Small/Medium/Large 3개 시나리오 × 2 전략 = 6개 ChatPipelineScenario
 * 모두 sd-1 (김철수) 페르소나 데이터 기반
 */

import type {
  MockPersona,
  MockDocument,
  MockExternalDocument,
  MockCareerNote,
} from "../fixtures/types";
import type { BenchmarkMessage } from "../fixtures/types";
import { sd } from "../fixtures/mock-data";

export interface ChatPipelineScenario {
  id: string;
  persona: MockPersona;
  documents: MockDocument[];
  externalDocs: MockExternalDocument[];
  careerNotes: MockCareerNote[];
  userMessages: BenchmarkMessage[];
  strategy: "multistep" | "classification";
  expectedDocIds: string[]; // which doc IDs should be selected
  keyFacts: string[]; // key facts that should appear in response
}

// ---------------------------------------------------------------------------
// sd-1 데이터
// ---------------------------------------------------------------------------

const sd1Persona = sd.PERSONAS.find((p) => p.id === "sd-1")!;
const sd1Docs = sd.DOCUMENTS.filter((d) => d.personaId === "sd-1");
const sd1ExternalDocs = sd.EXTERNAL_DOCUMENTS.filter((d) => d.personaId === "sd-1");
const sd1Notes = sd.CAREER_NOTES.filter((n) => n.personaId === "sd-1");

// sd-1의 polite 대화 스타일 (마지막 user 메시지만 남겨 최종 요청 시뮬레이션)
const sd1ConvPolite = sd.CONV_STYLES["sd-1"].polite as BenchmarkMessage[];
const sd1ConvTerse = sd.CONV_STYLES["sd-1"].terse as BenchmarkMessage[];
const sd1ConvJumpy = sd.CONV_STYLES["sd-1"].jumpy as BenchmarkMessage[];

// ---------------------------------------------------------------------------
// 시나리오 정의 (Small / Medium / Large)
// ---------------------------------------------------------------------------

/**
 * Small 시나리오: 문서 3개, 노트 2개, 정중한 대화 스타일
 * 예상 행동: doc-2(포트폴리오), doc-3(채용공고)는 반드시 읽어야 함
 */
const SMALL_MULTISTEP: ChatPipelineScenario = {
  id: "small-multistep",
  persona: sd1Persona,
  documents: sd1Docs.slice(0, 3),
  externalDocs: sd1ExternalDocs,
  careerNotes: sd1Notes.slice(0, 2),
  userMessages: sd1ConvPolite,
  strategy: "multistep",
  expectedDocIds: ["sd-1-doc-2", "sd-1-doc-3"],
  keyFacts: ["deploy-ez", "Stars 450", "Go", "Kubernetes"],
};

const SMALL_CLASSIFICATION: ChatPipelineScenario = {
  ...SMALL_MULTISTEP,
  id: "small-classification",
  strategy: "classification",
};

/**
 * Medium 시나리오: 문서 5개, 노트 3개, 짧은 대화 스타일
 */
const MEDIUM_MULTISTEP: ChatPipelineScenario = {
  id: "medium-multistep",
  persona: sd1Persona,
  documents: sd1Docs.slice(0, 5),
  externalDocs: sd1ExternalDocs,
  careerNotes: sd1Notes.slice(0, 3),
  userMessages: sd1ConvTerse,
  strategy: "multistep",
  expectedDocIds: ["sd-1-doc-2", "sd-1-doc-3"],
  keyFacts: ["deploy-ez", "Stars 450", "Go", "Kubernetes"],
};

const MEDIUM_CLASSIFICATION: ChatPipelineScenario = {
  ...MEDIUM_MULTISTEP,
  id: "medium-classification",
  strategy: "classification",
};

/**
 * Large 시나리오: 문서 7개(전체), 노트 5개(전체), 맥락 끊는 대화 스타일
 */
const LARGE_MULTISTEP: ChatPipelineScenario = {
  id: "large-multistep",
  persona: sd1Persona,
  documents: sd1Docs.slice(0, 7),
  externalDocs: sd1ExternalDocs,
  careerNotes: sd1Notes.slice(0, 5),
  userMessages: sd1ConvJumpy,
  strategy: "multistep",
  expectedDocIds: ["sd-1-doc-2", "sd-1-doc-3"],
  keyFacts: ["deploy-ez", "Stars 450", "Go", "Kubernetes"],
};

const LARGE_CLASSIFICATION: ChatPipelineScenario = {
  ...LARGE_MULTISTEP,
  id: "large-classification",
  strategy: "classification",
};

export const SCENARIOS: ChatPipelineScenario[] = [
  SMALL_MULTISTEP,
  SMALL_CLASSIFICATION,
  MEDIUM_MULTISTEP,
  MEDIUM_CLASSIFICATION,
  LARGE_MULTISTEP,
  LARGE_CLASSIFICATION,
];

/** 시나리오를 label로 표현 (결과 리포트용) */
export function scenarioLabel(scenario: ChatPipelineScenario): string {
  const sizeMap: Record<string, string> = {
    small: "소규모/정중한유저 (문서3/노트2)",
    medium: "중규모/짧은유저 (문서5/노트3)",
    large: "대규모/맥락끊는유저 (문서7/노트5)",
  };
  const size = scenario.id.split("-")[0];
  const strategyLabel = scenario.strategy === "multistep" ? "멀티스텝" : "분류방식";
  return `${sizeMap[size] ?? size} [${strategyLabel}]`;
}

/** 참고자료 요약 컨텍스트 문자열 생성 */
export function buildContext(scenario: ChatPipelineScenario): string {
  const docPart = scenario.documents
    .map((d) => `[문서: ${d.title}] (ID: ${d.id})\n${d.summary}`)
    .join("\n\n---\n\n");

  const extPart = scenario.externalDocs
    .map((d) => `[외부문서: ${d.title}] (ID: ${d.id})\n${d.summary}`)
    .join("\n\n---\n\n");

  const notePart = scenario.careerNotes
    .map((n) => `[커리어노트: ${n.title}] (ID: ${n.id})\n${n.summary}`)
    .join("\n\n---\n\n");

  return [docPart, extPart, notePart].filter(Boolean).join("\n\n---\n\n");
}
