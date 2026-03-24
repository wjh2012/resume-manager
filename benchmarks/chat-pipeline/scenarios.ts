/**
 * chat-pipeline 벤치마크 시나리오
 *
 * Small/Medium/Large 3개 시나리오 × 2 전략 = 6개 ChatPipelineScenario
 */

import type {
  MockPersona,
  MockDocument,
  MockExternalDocument,
  MockCareerNote,
} from "../fixtures/types";
import type { BenchmarkMessage } from "../fixtures/types";
import {
  ALL_PERSONAS,
  ALL_CONV_STYLES,
  ALL_DOCUMENTS,
  ALL_EXTERNAL_DOCUMENTS,
  ALL_CAREER_NOTES,
} from "../fixtures/mock-data";

export interface ChatPipelineScenario {
  id: string;
  persona: MockPersona;
  documents: MockDocument[];
  externalDocs: MockExternalDocument[];
  careerNotes: MockCareerNote[];
  userMessages: BenchmarkMessage[];
  strategy: "multistep" | "classification";
  expectedDocIds: string[];
  keyFacts: string[];
}

/**
 * 페르소나 ID로 시나리오 배열을 생성한다.
 *
 * Small: 문서 3개, 노트 2개, polite 스타일
 * Medium: 문서 5개, 노트 3개, terse 스타일
 * Large: 문서 7개, 노트 5개, jumpy 스타일
 *
 * expectedDocIds: 해당 페르소나의 두 번째(포트폴리오), 세 번째(채용공고) 문서 ID
 * keyFacts: 페르소나별 데이터에 의존하므로, 범용 팩트 키워드 사용
 */
export function buildScenarios(personaId: string): ChatPipelineScenario[] {
  const persona = ALL_PERSONAS.find((p) => p.id === personaId);
  if (!persona) throw new Error(`Unknown persona: ${personaId}`);

  const docs = ALL_DOCUMENTS.filter((d) => d.personaId === personaId);
  const extDocs = ALL_EXTERNAL_DOCUMENTS.filter((d) => d.personaId === personaId);
  const notes = ALL_CAREER_NOTES.filter((n) => n.personaId === personaId);
  const convStyles = ALL_CONV_STYLES[personaId];
  if (!convStyles) throw new Error(`No conv styles for persona: ${personaId}`);

  const convPolite = convStyles.polite as BenchmarkMessage[];
  const convTerse = convStyles.terse as BenchmarkMessage[];
  const convJumpy = convStyles.jumpy as BenchmarkMessage[];

  // 포트폴리오(2번째)와 채용공고(3번째) 문서를 기대 ID로 설정
  // NOTE: 이 인덱싱은 sd-1 기준이며, 다른 페르소나에서는 문서 구조가 다를 수 있음.
  // 페르소나별 비교 리포트를 생성하지 않으므로 (데이터 다양성 용도),
  // 정확한 pass/fail보다 LLM의 전반적 판단 패턴을 관찰하는 용도로 사용.
  const expectedDocIds = docs.length >= 3
    ? [docs[1].id, docs[2].id]
    : docs.map((d) => d.id);

  // keyFacts는 페르소나의 문서 내용에서 추출해야 하지만,
  // 현재는 시나리오 평가에서 응답 텍스트에 포함 여부만 확인하므로
  // 페르소나의 첫 번째 문서 제목을 범용 팩트로 사용
  const keyFacts = docs.length > 0
    ? [docs[0].title, persona.name]
    : [persona.name];

  const buildPair = (
    size: string,
    docSlice: MockDocument[],
    noteSlice: MockCareerNote[],
    conv: BenchmarkMessage[],
  ): [ChatPipelineScenario, ChatPipelineScenario] => {
    const base: ChatPipelineScenario = {
      id: `${size}-multistep`,
      persona,
      documents: docSlice,
      externalDocs: extDocs,
      careerNotes: noteSlice,
      userMessages: conv,
      strategy: "multistep",
      expectedDocIds,
      keyFacts,
    };
    return [
      base,
      { ...base, id: `${size}-classification`, strategy: "classification" },
    ];
  };

  return [
    ...buildPair("small", docs.slice(0, 3), notes.slice(0, 2), convPolite),
    ...buildPair("medium", docs.slice(0, 5), notes.slice(0, 3), convTerse),
    ...buildPair("large", docs.slice(0, 7), notes.slice(0, 5), convJumpy),
  ];
}

// 하위 호환
export const SCENARIOS = buildScenarios("sd-1");

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
