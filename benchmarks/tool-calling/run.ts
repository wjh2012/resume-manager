/**
 * 도구 호출 판단력 벤치마크 — 오케스트레이터
 *
 * 시나리오 × 프롬프트 변형 조합을 실행하고, 평가·비용 계산·JSON 저장을 수행한다.
 * 리포트 생성은 별도 LLM이 JSON을 읽어 수행한다.
 */

import * as path from "node:path";
import pLimit from "p-limit";

import type {
  BenchmarkProvider,
  BenchmarkRequest,
  BenchmarkResponse,
} from "../lib/index";
import { calculateCost, saveJson } from "../lib/index";
import {
  PROMPT_VARIANTS,
  PRECHECK_VARIANT_IDS,
  buildContext,
  classifyMessage,
  generateTurn2Hint,
  createToolDefs,
} from "./prompts";
import { buildScenarios } from "./scenarios";
import type { ToolCallingScenario } from "./scenarios";
import { evaluateToolCalling, detectProposal } from "./evaluate";

// ---------------------------------------------------------------------------
// 요청 빌더
// ---------------------------------------------------------------------------

interface RequestEntry {
  request: BenchmarkRequest;
  scenarioId: string;
  scenarioName: string;
  variantId: string;
  expectedRequired: string[];
  expectedAllowed: string[];
  expectedOrderedPairs: [string, string][];
  approvalMessage?: string;
  /** Turn 1 시스템 프롬프트 (Turn 2를 위해 보관) */
  baseSystemPrompt: string;
}

function buildRequests(model: string, scenarios: ToolCallingScenario[], personaId: string): RequestEntry[] {
  const context = buildContext(personaId);
  const tools = createToolDefs();
  const entries: RequestEntry[] = [];

  for (const scenario of scenarios) {
    for (const variant of PROMPT_VARIANTS) {
      const baseSystemPrompt = variant.buildSystemPrompt(context, personaId);

      // Pre-check 변형이면 사용자 메시지를 분류하고 힌트를 시스템 프롬프트에 주입
      let systemPrompt = baseSystemPrompt;
      if (PRECHECK_VARIANT_IDS.has(variant.id)) {
        const lastMessage = scenario.messages[scenario.messages.length - 1];
        const userMessage =
          lastMessage.role === "user" ? lastMessage.content : "";
        const precheck = classifyMessage(userMessage, context);
        if (precheck.hint) {
          systemPrompt = `${baseSystemPrompt}\n\n${precheck.hint}`;
        }
      }

      const request: BenchmarkRequest = {
        id: `${scenario.id}_${variant.id}`,
        model,
        system: systemPrompt,
        messages: scenario.messages,
        tools,
        maxSteps: 5,
      };

      entries.push({
        request,
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        variantId: variant.id,
        expectedRequired: scenario.expected.required,
        expectedAllowed: scenario.expected.allowed,
        expectedOrderedPairs: scenario.expected.orderedPairs ?? [],
        approvalMessage: scenario.approvalMessage,
        baseSystemPrompt,
      });
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// 2턴 실행 (실시간 전용)
// ---------------------------------------------------------------------------

interface RunResult {
  entry: RequestEntry;
  response: BenchmarkResponse;
  turn2Executed: boolean;
  error?: string;
}

async function runEntry(
  provider: BenchmarkProvider,
  entry: RequestEntry,
): Promise<RunResult> {
  const tools = createToolDefs();
  const turn1Response = await provider.run(entry.request);

  let finalResponse = turn1Response;
  let turn2Executed = false;

  // 2턴 실행 조건:
  // 1. approvalMessage가 있는 시나리오
  // 2. Turn 1에서 saveCareerNote를 호출하지 않음
  // 3. Turn 1 응답에서 제안을 감지함
  if (entry.approvalMessage) {
    const hasSaveCall = turn1Response.toolCalls.some(
      (c) => c.name === "saveCareerNote",
    );
    const proposalDetected = detectProposal(
      turn1Response.text,
      entry.expectedRequired,
    );

    if (!hasSaveCall && proposalDetected) {
      turn2Executed = true;

      // Turn 2 시스템 프롬프트: base + Turn2 힌트
      const turn2Hint = generateTurn2Hint();
      const turn2System = `${entry.baseSystemPrompt}\n\n${turn2Hint}`;

      // Turn 2 메시지: 원본 메시지 + Turn 1 응답 + 승인 메시지
      const turn2Messages = [
        ...entry.request.messages,
        { role: "assistant" as const, content: turn1Response.text },
        { role: "user" as const, content: entry.approvalMessage },
      ];

      const turn2Request: BenchmarkRequest = {
        id: `${entry.request.id}_turn2`,
        model: entry.request.model,
        system: turn2System,
        messages: turn2Messages,
        tools,
        maxSteps: 5,
      };

      const turn2Response = await provider.run(turn2Request);

      // Turn 1 + Turn 2 결과를 병합
      finalResponse = {
        id: turn1Response.id,
        model: turn1Response.model,
        text: `${turn1Response.text}\n\n--- [Turn 2: 승인 후] ---\n\n${turn2Response.text}`,
        toolCalls: [
          ...turn1Response.toolCalls,
          ...turn2Response.toolCalls,
        ],
        inputTokens: turn1Response.inputTokens + turn2Response.inputTokens,
        outputTokens: turn1Response.outputTokens + turn2Response.outputTokens,
        durationMs: turn1Response.durationMs + turn2Response.durationMs,
      };
    }
  }

  return { entry, response: finalResponse, turn2Executed };
}

// ---------------------------------------------------------------------------
// 메인 실행 함수
// ---------------------------------------------------------------------------

export async function runToolCalling(
  provider: BenchmarkProvider,
  model: string,
  batch: boolean,
  personaId: string = "sd-1",
): Promise<void> {
  const scenarios = buildScenarios(personaId);
  const entries = buildRequests(model, scenarios, personaId);

  console.log("=".repeat(70));
  console.log("  도구 호출 판단력 벤치마크");
  console.log(`  Provider: ${provider.name} | Model: ${model} | Persona: ${personaId} | Mode: ${batch ? "batch" : "realtime"}`);
  console.log(
    `  시나리오: ${scenarios.length}개 × 프롬프트: ${PROMPT_VARIANTS.length}개 = ${entries.length} runs`,
  );
  console.log("=".repeat(70));
  console.log();

  const runResults: RunResult[] = [];

  if (batch) {
    // -----------------------------------------------------------------------
    // Batch 모드: 2턴 시나리오 제외
    // -----------------------------------------------------------------------
    const batchEntries = entries.filter((e) => {
      if (e.approvalMessage) {
        console.warn(
          `  [SKIP] ${e.request.id} — 2턴 시나리오는 Batch 모드에서 지원되지 않습니다.`,
        );
        return false;
      }
      return true;
    });

    const requests = batchEntries.map((e) => e.request);
    const responses = await provider.runBatch(requests);

    // ID 기반 매핑 (부분 실패 시 응답 수 < 요청 수 대응)
    const responseMap = new Map(responses.map((r) => [r.id, r]));
    for (const entry of batchEntries) {
      const response = responseMap.get(entry.request.id);
      if (!response) {
        // 배치에서 누락된 요청 → 에러 처리
        runResults.push({
          entry,
          response: {
            id: entry.request.id,
            model: entry.request.model,
            text: "",
            toolCalls: [],
            inputTokens: 0,
            outputTokens: 0,
            durationMs: 0,
          },
          turn2Executed: false,
          error: "Batch 응답에서 누락됨 (부분 실패)",
        });
        continue;
      }
      runResults.push({ entry, response, turn2Executed: false });
    }
  } else {
    // -----------------------------------------------------------------------
    // Realtime 모드: 동시성 5로 실행
    // -----------------------------------------------------------------------
    const limit = pLimit(5);

    const promises = entries.map((entry) =>
      limit(async () => {
        console.log(`  > ${entry.request.id} 실행 중...`);
        try {
          const result = await runEntry(provider, entry);
          const status = result.turn2Executed ? "(2턴)" : "";
          console.log(`  < ${entry.request.id} 완료 ${status}`);
          return result;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error(`  ! ${entry.request.id} 실패: ${errorMsg}`);
          const errorResponse: BenchmarkResponse = {
            id: entry.request.id,
            model,
            text: "",
            toolCalls: [],
            inputTokens: 0,
            outputTokens: 0,
            durationMs: 0,
          };
          return {
            entry,
            response: errorResponse,
            turn2Executed: false,
            error: errorMsg,
          };
        }
      }),
    );

    const settled = await Promise.all(promises);
    runResults.push(...settled);
  }

  // -------------------------------------------------------------------------
  // 평가
  // -------------------------------------------------------------------------

  interface EvaluationDetail {
    pass: boolean;
    toolCallsCorrect: boolean;
    proposalDetected: boolean;
    turn2Executed: boolean;
    overCall: boolean;
    underCall: boolean;
    expectedRequired: string[];
    expectedAllowed: string[];
    calledTools: string[];
    error?: string;
  }

  interface EvaluatedEntry {
    id: string;
    scenarioId: string;
    variantId: string;
    pass: boolean;
    evaluation: EvaluationDetail;
    actualToolCalls: { name: string; args: unknown }[];
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
    error?: string;
  }

  const evaluated: EvaluatedEntry[] = runResults.map((r) => {
    const { entry, response, turn2Executed } = r;
    const errorMsg = r.error;

    const evalResult = evaluateToolCalling(
      response.toolCalls,
      {
        required: entry.expectedRequired,
        allowed: entry.expectedAllowed,
        orderedPairs: entry.expectedOrderedPairs,
      },
      response.text,
      turn2Executed,
    );

    const evaluation: EvaluationDetail = {
      pass: evalResult.pass,
      toolCallsCorrect: evalResult.toolCallsCorrect ?? false,
      proposalDetected: evalResult.proposalDetected ?? false,
      turn2Executed,
      overCall: evalResult.overCall ?? false,
      underCall: evalResult.underCall ?? false,
      expectedRequired: entry.expectedRequired,
      expectedAllowed: entry.expectedAllowed,
      calledTools: response.toolCalls.map((c) => c.name),
      error: errorMsg,
    };

    return {
      id: entry.request.id,
      scenarioId: entry.scenarioId,
      variantId: entry.variantId,
      pass: evalResult.pass,
      evaluation,
      actualToolCalls: response.toolCalls.map((c) => ({
        name: c.name,
        args: c.args,
      })),
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      durationMs: response.durationMs,
      error: errorMsg,
    };
  });

  // -------------------------------------------------------------------------
  // 비용 계산
  // -------------------------------------------------------------------------

  const totalInput = runResults.reduce(
    (sum, r) => sum + r.response.inputTokens,
    0,
  );
  const totalOutput = runResults.reduce(
    (sum, r) => sum + r.response.outputTokens,
    0,
  );
  const cost = calculateCost(provider.name, model, totalInput, totalOutput);

  // -------------------------------------------------------------------------
  // 요약 통계
  // -------------------------------------------------------------------------

  const passCount = evaluated.filter((r) => r.pass).length;
  const errorCount = evaluated.filter((r) => r.error).length;
  const totalCount = evaluated.length;
  const failCount = totalCount - passCount;

  // -------------------------------------------------------------------------
  // 페르소나 정보 (첫 번째 시나리오 기준)
  // -------------------------------------------------------------------------

  const firstPersona = scenarios[0]?.persona;
  const persona = firstPersona
    ? { id: firstPersona.id, name: firstPersona.name, label: firstPersona.label }
    : undefined;

  // -------------------------------------------------------------------------
  // 풍부한 JSON 조립
  // -------------------------------------------------------------------------

  const output = {
    meta: {
      suite: "tool-calling",
      provider: provider.name,
      model,
      mode: batch ? "batch" : ("realtime" as "batch" | "realtime"),
      timestamp: new Date().toISOString(),
      persona,
    },
    variants: PROMPT_VARIANTS.map((v) => ({
      id: v.id,
      label: v.label,
    })),
    scenarios: scenarios.map((s) => {
      const lastMsg = s.messages[s.messages.length - 1];
      const userMessage = lastMsg.role === "user" ? lastMsg.content : "";
      return {
        id: s.id,
        name: s.name,
        userMessage,
        expectedTools: s.expected.required,
        allowedTools: s.expected.allowed,
        orderedPairs: s.expected.orderedPairs ?? [],
        is2Turn: !!s.approvalMessage,
      };
    }),
    results: evaluated.map((r) => ({
      id: r.id,
      scenarioId: r.scenarioId,
      variantId: r.variantId,
      pass: r.pass,
      evaluation: {
        toolCallsCorrect: r.evaluation.toolCallsCorrect,
        proposalDetected: r.evaluation.proposalDetected,
        turn2Executed: r.evaluation.turn2Executed,
        overCall: r.evaluation.overCall,
        underCall: r.evaluation.underCall,
      },
      actualToolCalls: r.actualToolCalls,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      durationMs: r.durationMs,
      ...(r.error ? { error: r.error } : {}),
    })),
    cost: {
      batchCost: cost.batchCost,
      realtimeCost: cost.realtimeCost,
      savings: cost.savings,
      inputTokens: totalInput,
      outputTokens: totalOutput,
    },
    summary: {
      totalRuns: totalCount,
      passCount,
      failCount,
      errorCount,
      passRate: totalCount > 0 ? `${((passCount / totalCount) * 100).toFixed(1)}%` : "0.0%",
    },
  };

  // -------------------------------------------------------------------------
  // JSON 저장
  // -------------------------------------------------------------------------

  const date = output.meta.timestamp.split("T")[0];
  const modelSlug = model.replace(/\./g, "-");
  const mode = output.meta.mode;
  const baseName = `benchmark-result-${date}_${modelSlug}_${personaId}_${mode}`;
  const jsonPath = path.join("benchmarks", "tool-calling", "results", `${baseName}.json`);

  saveJson(output, jsonPath);
  console.log(`\n  JSON: ${jsonPath}`);

  // -------------------------------------------------------------------------
  // 콘솔 요약 그리드 (시나리오 × 변형)
  // -------------------------------------------------------------------------

  console.log("\n" + "=".repeat(70));
  console.log("  결과 요약");
  console.log("=".repeat(70) + "\n");

  const variantIds = PROMPT_VARIANTS.map((v) => v.id);
  const headerRow = ["시나리오", ...variantIds];
  console.log("  " + headerRow.map((h) => h.padEnd(14)).join(""));

  for (const scenario of scenarios) {
    const row = [scenario.name];
    for (const variant of PROMPT_VARIANTS) {
      const id = `${scenario.id}_${variant.id}`;
      const r = evaluated.find((e) => e.id === id);
      if (!r) {
        row.push("SKIP");
      } else if (r.error) {
        row.push("ERROR");
      } else if (r.pass) {
        row.push(r.evaluation.turn2Executed ? "PASS(2T)" : "PASS");
      } else {
        row.push(r.evaluation.proposalDetected ? "FAIL(P)" : "FAIL");
      }
    }
    console.log("  " + row.map((c) => c.padEnd(14)).join(""));
  }

  console.log(
    `\n  Pass Rate: ${passCount}/${totalCount} (${((passCount / totalCount) * 100).toFixed(1)}%)`,
  );
  console.log();
}
