import * as path from "node:path";
import pLimit from "p-limit";

import type {
  BenchmarkProvider,
  BenchmarkRequest,
  BenchmarkResponse,
} from "../lib/index";
import { calculateCost, saveJson } from "../lib/index";
import { ROUTING_PROMPT_VARIANTS, buildContext } from "./prompts";
import { routingSchema, type RoutingClassification } from "./schema";
import { buildScenarios, type RoutingScenario } from "./scenarios";
import { evaluateRouting } from "./evaluate";

// ---------------------------------------------------------------------------
// 요청 빌더
// ---------------------------------------------------------------------------

interface RequestEntry {
  request: BenchmarkRequest;
  scenarioId: string;
  scenarioName: string;
  variantId: string;
  scenario: RoutingScenario;
}

function buildRequests(
  model: string,
  scenarios: RoutingScenario[],
  personaId: string,
): RequestEntry[] {
  const context = buildContext(personaId);
  const entries: RequestEntry[] = [];

  for (const scenario of scenarios) {
    for (const variant of ROUTING_PROMPT_VARIANTS) {
      const systemPrompt = variant.buildSystemPrompt(context, personaId);

      const request: BenchmarkRequest = {
        id: `${scenario.id}_${variant.id}`,
        model,
        system: systemPrompt,
        messages: scenario.messages,
        outputSchema: routingSchema,
      };

      entries.push({
        request,
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        variantId: variant.id,
        scenario,
      });
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// 메인 실행 함수
// ---------------------------------------------------------------------------

export async function runDeterministicRouting(
  provider: BenchmarkProvider,
  model: string,
  batch: boolean,
  personaId: string = "sd-1",
): Promise<void> {
  const scenarios = buildScenarios(personaId);
  const entries = buildRequests(model, scenarios, personaId);

  console.log("=".repeat(70));
  console.log("  Deterministic Routing 벤치마크");
  console.log(
    `  Provider: ${provider.name} | Model: ${model} | Persona: ${personaId} | Mode: ${batch ? "batch" : "realtime"}`,
  );
  console.log(
    `  시나리오: ${scenarios.length}개 × 프롬프트: ${ROUTING_PROMPT_VARIANTS.length}개 = ${entries.length} runs`,
  );
  console.log("=".repeat(70));
  console.log();

  // -----------------------------------------------------------------------
  // Provider 지원 검증
  // -----------------------------------------------------------------------

  const SUPPORTED_PROVIDERS = ["openai"];
  if (!SUPPORTED_PROVIDERS.includes(provider.name)) {
    throw new Error(
      `Deterministic Routing은 structured output이 필요합니다. ` +
      `현재 "${provider.name}"은 미지원. 지원 provider: ${SUPPORTED_PROVIDERS.join(", ")}`,
    );
  }

  if (batch) {
    console.warn("  ⚠ Deterministic Routing은 structured output을 사용하므로 batch 모드 미지원. realtime으로 실행합니다.");
  }

  // -----------------------------------------------------------------------
  // 실행 (Realtime)
  // -----------------------------------------------------------------------

  const limit = pLimit(5);
  const runResults: Array<{
    entry: RequestEntry;
    response: BenchmarkResponse;
    error?: string;
  }> = [];

  const promises = entries.map((entry) =>
    limit(async () => {
      console.log(`  > ${entry.request.id} 실행 중...`);
      try {
        const response = await provider.run(entry.request);
        console.log(`  < ${entry.request.id} 완료`);
        return { entry, response };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`  ! ${entry.request.id} 실패: ${errorMsg}`);
        return {
          entry,
          response: {
            id: entry.request.id,
            model,
            text: "",
            toolCalls: [],
            inputTokens: 0,
            outputTokens: 0,
            durationMs: 0,
          } as BenchmarkResponse,
          error: errorMsg,
        };
      }
    }),
  );

  const settled = await Promise.all(promises);
  runResults.push(...settled);

  // -----------------------------------------------------------------------
  // 평가
  // -----------------------------------------------------------------------

  const evaluated = runResults.map((r) => {
    const { entry, response } = r;

    let actual: RoutingClassification;
    try {
      actual = JSON.parse(response.text) as RoutingClassification;
    } catch {
      actual = { documentsToRead: [], careerNotesToRead: [], saveCareerNote: false };
    }

    const evalResult = evaluateRouting(actual, entry.scenario.expected);

    return {
      id: entry.request.id,
      scenarioId: entry.scenarioId,
      variantId: entry.variantId,
      pass: r.error ? false : evalResult.pass,
      evaluation: evalResult,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      durationMs: response.durationMs,
      error: r.error,
    };
  });

  // -----------------------------------------------------------------------
  // 비용 + 요약
  // -----------------------------------------------------------------------

  const totalInput = runResults.reduce((sum, r) => sum + r.response.inputTokens, 0);
  const totalOutput = runResults.reduce((sum, r) => sum + r.response.outputTokens, 0);
  const cost = calculateCost(provider.name, model, totalInput, totalOutput);

  const passCount = evaluated.filter((r) => r.pass).length;
  const errorCount = evaluated.filter((r) => r.error).length;
  const totalCount = evaluated.length;

  const firstPersona = scenarios[0]?.persona;
  const persona = firstPersona
    ? { id: firstPersona.id, name: firstPersona.name, label: firstPersona.label }
    : undefined;

  // -----------------------------------------------------------------------
  // JSON 저장
  // -----------------------------------------------------------------------

  const output = {
    meta: {
      suite: "deterministic-routing",
      provider: provider.name,
      model,
      mode: "realtime" as const,
      timestamp: new Date().toISOString(),
      persona,
    },
    variants: ROUTING_PROMPT_VARIANTS.map((v) => ({ id: v.id, label: v.label })),
    scenarios: scenarios.map((s) => {
      const lastMsg = s.messages[s.messages.length - 1];
      return {
        id: s.id,
        name: s.name,
        userMessage: lastMsg.role === "user" ? lastMsg.content : "",
        expected: s.expected,
      };
    }),
    results: evaluated.map((r) => ({
      id: r.id,
      scenarioId: r.scenarioId,
      variantId: r.variantId,
      pass: r.pass,
      evaluation: {
        details: r.evaluation.details,
        actual: r.evaluation.actual,
      },
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
      failCount: totalCount - passCount,
      errorCount,
      passRate: totalCount > 0 ? `${((passCount / totalCount) * 100).toFixed(1)}%` : "0.0%",
    },
  };

  const date = output.meta.timestamp.split("T")[0];
  const modelSlug = model.replace(/\./g, "-");
  const baseName = `benchmark-result-${date}_${modelSlug}_${personaId}_realtime`;
  const jsonPath = path.join("benchmarks", "deterministic-routing", "results", `${baseName}.json`);

  saveJson(output, jsonPath);
  console.log(`\n  JSON: ${jsonPath}`);

  // -----------------------------------------------------------------------
  // 콘솔 요약 그리드
  // -----------------------------------------------------------------------

  console.log("\n" + "=".repeat(70));
  console.log("  결과 요약");
  console.log("=".repeat(70) + "\n");

  const variantIds = ROUTING_PROMPT_VARIANTS.map((v) => v.id);
  const headerRow = ["시나리오", ...variantIds];
  console.log("  " + headerRow.map((h) => h.padEnd(14)).join(""));

  for (const scenario of scenarios) {
    const row = [scenario.name];
    for (const variant of ROUTING_PROMPT_VARIANTS) {
      const id = `${scenario.id}_${variant.id}`;
      const r = evaluated.find((e) => e.id === id);
      if (!r) {
        row.push("SKIP");
      } else if (r.error) {
        row.push("ERROR");
      } else {
        row.push(r.pass ? "PASS" : "FAIL");
      }
    }
    console.log("  " + row.map((c) => c.padEnd(14)).join(""));
  }

  console.log(
    `\n  Pass Rate: ${passCount}/${totalCount} (${((passCount / totalCount) * 100).toFixed(1)}%)`,
  );
  console.log();
}
