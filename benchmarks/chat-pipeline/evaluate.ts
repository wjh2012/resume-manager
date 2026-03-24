/**
 * chat-pipeline 평가 모듈
 *
 * - documentSelectionCorrect: 예상 문서 ID가 모두 tool call에 포함됐는지
 * - responseQualityMetrics: key facts가 응답 텍스트에 포함됐는지
 * - toolCallCount: 총 tool call 횟수
 */

import type { BenchmarkToolCall } from "../lib/providers/types";

export interface ChatPipelineEvaluation {
  documentSelectionCorrect: boolean;
  responseQualityMetrics: {
    keyFactsFound: string[];
    keyFactsMissed: string[];
  };
  toolCallCount: number;
}

/**
 * chat-pipeline 결과 평가
 *
 * @param toolCalls    실행된 tool call 목록
 * @param responseText LLM 최종 응답 텍스트
 * @param expectedDocIds 반드시 선택됐어야 할 문서/노트 ID 목록
 * @param keyFacts     응답에 포함됐어야 할 핵심 사실 목록 (대소문자 무관 부분 매치)
 */
export function evaluateChatPipeline(
  toolCalls: BenchmarkToolCall[],
  responseText: string,
  expectedDocIds: string[],
  keyFacts: string[],
): ChatPipelineEvaluation {
  // 1. 문서 선택 정확도
  // readDocument(documentId) 또는 readCareerNote(careerNoteId) tool call에서
  // 사용된 ID 집합을 구한 뒤, expectedDocIds가 모두 포함됐는지 확인
  const selectedIds = new Set<string>();
  for (const tc of toolCalls) {
    if (tc.name === "readDocument" && typeof tc.args.documentId === "string") {
      selectedIds.add(tc.args.documentId);
    }
    if (tc.name === "readCareerNote" && typeof tc.args.careerNoteId === "string") {
      selectedIds.add(tc.args.careerNoteId);
    }
  }

  const documentSelectionCorrect =
    expectedDocIds.length === 0 ||
    expectedDocIds.every((id) => selectedIds.has(id));

  // 2. 응답 품질 — key facts 대소문자 무관 부분 매치
  const lowerResponse = responseText.toLowerCase();
  const keyFactsFound: string[] = [];
  const keyFactsMissed: string[] = [];

  for (const fact of keyFacts) {
    if (lowerResponse.includes(fact.toLowerCase())) {
      keyFactsFound.push(fact);
    } else {
      keyFactsMissed.push(fact);
    }
  }

  return {
    documentSelectionCorrect,
    responseQualityMetrics: { keyFactsFound, keyFactsMissed },
    toolCallCount: toolCalls.length,
  };
}
