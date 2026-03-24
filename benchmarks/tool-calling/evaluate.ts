/**
 * 도구 호출 판단력 벤치마크 — 평가 로직
 */

import type { BenchmarkToolCall } from "../lib/providers/types";
import type { ToolCallExpectation } from "./scenarios";

export interface ToolCallingEvaluation {
  pass: boolean;
  toolCallsCorrect: boolean;
  proposalDetected: boolean;
  turn2Executed: boolean;
  overCall: boolean;
  underCall: boolean;
}

// ---------------------------------------------------------------------------
// 제안 인식 패턴
// ---------------------------------------------------------------------------

const PROPOSAL_PATTERNS: Record<string, RegExp[]> = {
  saveCareerNote: [
    /커리어노트.{0,20}(저장|기록|생성|추가|갱신|업데이트|수정|반영)/,
    /(저장|기록|생성|추가|갱신|업데이트).{0,20}커리어노트/,
    /노트.{0,10}(저장|남겨|기록)/,
    /(저장|기록).{0,10}(해둘|해놓|해드릴|할까|할게|하겠)/,
  ],
  readDocument: [
    /(문서|전문|원문).{0,20}(읽|확인|조회|살펴)/,
    /(상세|구체적|자세).{0,20}(확인|읽|조회)/,
  ],
  readCareerNote: [
    /커리어노트.{0,20}(읽|확인|조회|비교)/,
    /(기존|현재).{0,20}(노트|기록).{0,20}(확인|비교)/,
  ],
};

export function detectProposal(
  responseText: string,
  expectedTools: string[],
): boolean {
  if (expectedTools.length === 0) return false;
  for (const toolName of expectedTools) {
    const patterns = PROPOSAL_PATTERNS[toolName];
    if (!patterns) continue;
    if (patterns.some((p) => p.test(responseText))) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// pass 판정
// ---------------------------------------------------------------------------

export function evaluateToolCalling(
  actualCalls: BenchmarkToolCall[],
  expected: ToolCallExpectation,
  responseText: string,
  turn2Executed?: boolean,
): ToolCallingEvaluation {
  const calledNames = actualCalls.map((c) => c.name);
  const acceptableTools = new Set([
    ...expected.required,
    ...expected.allowed,
  ]);

  // underCall: required 도구 중 호출되지 않은 것
  const underCall = expected.required.some((req) => !calledNames.includes(req));

  // overCall: acceptable 범위 밖의 도구 호출
  const overCall = calledNames.some((name) => !acceptableTools.has(name));

  // 시나리오 4 (기대 도구 없음): 도구가 호출되면 overCall
  const noToolsExpected =
    expected.required.length === 0 && expected.allowed.length === 0;

  // orderedPairs 순서 확인
  let orderCorrect = true;
  if (expected.orderedPairs) {
    for (const [first, second] of expected.orderedPairs) {
      const firstIdx = calledNames.indexOf(first);
      const secondIdx = calledNames.indexOf(second);
      if (firstIdx === -1 || secondIdx === -1) {
        orderCorrect = false;
        break;
      }
      // 같은 위치이거나 first가 나중이면 fail
      if (firstIdx >= secondIdx) {
        orderCorrect = false;
        break;
      }
    }
  }

  const toolCallsCorrect =
    !underCall &&
    !overCall &&
    orderCorrect &&
    !(noToolsExpected && calledNames.length > 0);

  const proposalDetected = detectProposal(responseText, expected.required);

  const pass = toolCallsCorrect;

  return {
    pass,
    toolCallsCorrect,
    proposalDetected,
    turn2Executed: turn2Executed ?? false,
    overCall: overCall || (noToolsExpected && calledNames.length > 0),
    underCall,
  };
}
