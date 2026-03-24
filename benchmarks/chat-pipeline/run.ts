/**
 * chat-pipeline 벤치마크 러너
 *
 * 전략:
 *   - multistep: readDocument / readCareerNote tool loop, maxSteps=10
 *   - classification: 1단계 분류 → 서버사이드 fetch → 최종 응답 (2번 LLM 호출)
 *
 * Batch 모드:
 *   - multistep 시나리오 스킵 (maxSteps > 1이므로 batch API 불가)
 *   - classification 시나리오만 실행 (단일 completion = batch 가능)
 */

import type {
  BenchmarkProvider,
  BenchmarkRequest,
  BenchmarkResponse,
  BenchmarkToolDef,
} from "../lib/providers/types";
import { calculateCost, saveJson } from "../lib/index";
import type { CostResult } from "../lib/index";

interface BenchmarkResult {
  meta: {
    suite: string;
    provider: string;
    model: string;
    mode: "batch" | "realtime";
    timestamp: string;
    totalRuns: number;
    failedRuns: number;
  };
  results: Array<{
    id: string;
    scenario: string;
    pass: boolean;
    response: BenchmarkResponse;
    evaluationDetail: Record<string, unknown>;
  }>;
  cost: CostResult;
}
import { SCENARIOS, buildContext, scenarioLabel, type ChatPipelineScenario } from "./scenarios";
import { evaluateChatPipeline } from "./evaluate";
import { createToolDefs } from "../tool-calling/prompts";

// tool-calling과 공유하는 도구 정의에서 필요한 것만 추출
const allToolDefs = createToolDefs();
const TOOL_READ_DOCUMENT = allToolDefs.find((t) => t.name === "readDocument")!;
const TOOL_READ_CAREER_NOTE = allToolDefs.find((t) => t.name === "readCareerNote")!;

// ---------------------------------------------------------------------------
// 시스템 프롬프트 빌더
// ---------------------------------------------------------------------------

function buildMultistepSystemPrompt(scenario: ChatPipelineScenario): string {
  const context = buildContext(scenario);
  return `당신은 전문 자기소개서 작성 도우미입니다.
사용자가 네이버 클라우드의 시니어 백엔드 개발자 포지션에 지원하려 합니다.

아래 참고자료를 바탕으로 자기소개서 작성을 도와주세요:
- 사용자의 경험과 역량을 구체적으로 드러내는 문장을 작성하세요.
- 지원하는 회사와 포지션에 맞게 맞춤화하세요.
- 한국어로 작성하세요.
- 아래 참고자료는 요약입니다. 구체적인 경험, 수치, 세부 내용이 필요하면 readDocument 또는 readCareerNote 도구로 전문을 읽으세요.

[참고자료]
${context}`;
}

function buildClassificationPrompt(scenario: ChatPipelineScenario): string {
  const context = buildContext(scenario);
  const convText = scenario.userMessages
    .map((m) => `${"role" in m ? m.role : "unknown"}: ${("content" in m ? m.content : "")}`)
    .join("\n");
  const msgCount = scenario.userMessages.length;

  return `사용자 메시지와 참고자료 요약을 보고 JSON으로 판단하세요.
다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "documentsToRead": ["읽어야 할 문서 ID 목록, 요약만으로 충분하면 빈 배열"],
  "compareCareerNotes": false,
  "needsCompression": false
}

- documentsToRead: 전문을 읽어야 할 문서의 ID를 선택하세요. 요약만으로 충분하면 빈 배열.
- compareCareerNotes: 기존 커리어노트와 비교가 필요하면 true.
- needsCompression: 대화가 길어서 압축이 필요하면 true. (현재 ${msgCount}개 메시지)

[참고자료 요약]
${context}

[현재 대화]
${convText}`;
}

function buildClassificationSystemPrompt(
  scenario: ChatPipelineScenario,
  docsContext: string,
  notesContext: string,
): string {
  const summaryContext = buildContext(scenario);
  return `당신은 전문 자기소개서 작성 도우미입니다.
사용자가 네이버 클라우드의 시니어 백엔드 개발자 포지션에 지원하려 합니다.

아래 참고자료를 바탕으로 자기소개서 작성을 도와주세요:
- 사용자의 경험과 역량을 구체적으로 드러내는 문장을 작성하세요.
- 지원하는 회사와 포지션에 맞게 맞춤화하세요.
- 한국어로 작성하세요.

[참고자료 — 문서 전문]
${docsContext || "(없음)"}

[참고자료 — 커리어노트]
${notesContext || "(없음)"}

[참고자료 — 요약]
${summaryContext}`;
}

// ---------------------------------------------------------------------------
// 분류 결과 파싱
// ---------------------------------------------------------------------------

interface ClassificationOutput {
  documentsToRead: string[];
  compareCareerNotes: boolean;
  needsCompression: boolean;
}

function parseClassificationOutput(text: string): ClassificationOutput {
  // JSON 블록 추출 (```json ... ``` 또는 bare JSON)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { documentsToRead: [], compareCareerNotes: false, needsCompression: false };
  }
  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<ClassificationOutput>;
    return {
      documentsToRead: Array.isArray(parsed.documentsToRead) ? parsed.documentsToRead : [],
      compareCareerNotes: parsed.compareCareerNotes === true,
      needsCompression: parsed.needsCompression === true,
    };
  } catch {
    return { documentsToRead: [], compareCareerNotes: false, needsCompression: false };
  }
}

// ---------------------------------------------------------------------------
// 단일 시나리오 실행
// ---------------------------------------------------------------------------

async function runMultistepScenario(
  provider: BenchmarkProvider,
  model: string,
  scenario: ChatPipelineScenario,
): Promise<{ response: BenchmarkResponse; scenarioId: string }> {
  const req: BenchmarkRequest = {
    id: scenario.id,
    model,
    system: buildMultistepSystemPrompt(scenario),
    messages: scenario.userMessages.filter((m) => m.role !== "tool"),
    tools: [TOOL_READ_DOCUMENT, TOOL_READ_CAREER_NOTE],
    maxSteps: 10,
  };

  const response = await provider.run(req);
  return { response, scenarioId: scenario.id };
}

async function runClassificationScenario(
  provider: BenchmarkProvider,
  model: string,
  scenario: ChatPipelineScenario,
  batch: boolean,
): Promise<{ response: BenchmarkResponse; scenarioId: string }> {
  // Step 1: 분류 요청
  const classifyReq: BenchmarkRequest = {
    id: `${scenario.id}-classify`,
    model,
    system: "",
    messages: [{ role: "user", content: buildClassificationPrompt(scenario) }],
  };

  let classifyResponse: BenchmarkResponse;
  if (batch) {
    const responses = await provider.runBatch([classifyReq]);
    if (responses.length === 0) throw new Error(`Batch 응답 없음: ${classifyReq.id}`);
    classifyResponse = responses[0];
  } else {
    classifyResponse = await provider.run(classifyReq);
  }

  const classification = parseClassificationOutput(classifyResponse.text);

  // Step 2: 서버사이드 fetch (분류 결과 기반)
  const fetchedDocs = scenario.documents.filter((d) =>
    classification.documentsToRead.includes(d.id),
  );
  const fetchedNotes = classification.compareCareerNotes ? scenario.careerNotes : [];

  const docsContext = fetchedDocs.length > 0
    ? fetchedDocs.map((d) => `[${d.title}]\n${d.extractedText}`).join("\n\n---\n\n")
    : "";
  const notesContext = fetchedNotes.length > 0
    ? fetchedNotes.map((n) => `[${n.title}]\n${n.content}`).join("\n\n---\n\n")
    : "";

  // Step 3: 최종 응답 요청
  const responseReq: BenchmarkRequest = {
    id: `${scenario.id}-response`,
    model,
    system: buildClassificationSystemPrompt(scenario, docsContext, notesContext),
    messages: scenario.userMessages.filter((m) => m.role !== "tool"),
  };

  let finalResponse: BenchmarkResponse;
  if (batch) {
    const responses = await provider.runBatch([responseReq]);
    if (responses.length === 0) throw new Error(`Batch 응답 없음: ${responseReq.id}`);
    finalResponse = responses[0];
  } else {
    finalResponse = await provider.run(responseReq);
  }

  // 두 step의 토큰 합산 + tool calls에 분류 결과 기록
  const combinedResponse: BenchmarkResponse = {
    id: scenario.id,
    model: finalResponse.model,
    text: finalResponse.text,
    toolCalls: [
      // 분류 결과를 tool call로 표현 (평가 시 readDocument 인식을 위해)
      ...fetchedDocs.map((d) => ({ name: "readDocument", args: { documentId: d.id } })),
      ...fetchedNotes.map((n) => ({ name: "readCareerNote", args: { careerNoteId: n.id } })),
    ],
    inputTokens: classifyResponse.inputTokens + finalResponse.inputTokens,
    outputTokens: classifyResponse.outputTokens + finalResponse.outputTokens,
    durationMs: classifyResponse.durationMs + finalResponse.durationMs,
  };

  return { response: combinedResponse, scenarioId: scenario.id };
}

// ---------------------------------------------------------------------------
// 메인 러너
// ---------------------------------------------------------------------------

export async function runChatPipeline(
  provider: BenchmarkProvider,
  model: string,
  batch: boolean,
): Promise<BenchmarkResult> {
  const timestamp = new Date().toISOString();
  const results: BenchmarkResult["results"] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let failedRuns = 0;

  const activeScenarios = batch
    ? SCENARIOS.filter((s) => s.strategy === "classification")
    : SCENARIOS;

  if (batch) {
    const skipped = SCENARIOS.filter((s) => s.strategy === "multistep");
    if (skipped.length > 0) {
      console.warn(
        `[chat-pipeline] Batch 모드: multistep 시나리오 ${skipped.length}개 스킵 (maxSteps > 1)`,
        skipped.map((s) => s.id),
      );
    }
  }

  for (const scenario of activeScenarios) {
    try {
      let response: BenchmarkResponse;

      if (scenario.strategy === "multistep") {
        ({ response } = await runMultistepScenario(provider, model, scenario));
      } else {
        ({ response } = await runClassificationScenario(provider, model, scenario, batch));
      }

      const evaluation = evaluateChatPipeline(
        response.toolCalls,
        response.text,
        scenario.expectedDocIds,
        scenario.keyFacts,
      );

      const pass =
        evaluation.documentSelectionCorrect &&
        evaluation.responseQualityMetrics.keyFactsMissed.length === 0;

      totalInputTokens += response.inputTokens;
      totalOutputTokens += response.outputTokens;

      results.push({
        id: scenario.id,
        scenario: scenarioLabel(scenario),
        pass,
        response,
        evaluationDetail: {
          documentSelectionCorrect: evaluation.documentSelectionCorrect,
          keyFactsFound: evaluation.responseQualityMetrics.keyFactsFound,
          keyFactsMissed: evaluation.responseQualityMetrics.keyFactsMissed,
          toolCallCount: evaluation.toolCallCount,
          strategy: scenario.strategy,
        },
      });
    } catch (error) {
      failedRuns++;
      console.error(
        `[chat-pipeline] 시나리오 실패: ${scenario.id}`,
        error instanceof Error ? error.message : error,
      );

      // 실패한 시나리오는 빈 응답으로 기록
      results.push({
        id: scenario.id,
        scenario: scenarioLabel(scenario),
        pass: false,
        response: {
          id: scenario.id,
          model,
          text: "",
          toolCalls: [],
          inputTokens: 0,
          outputTokens: 0,
          durationMs: 0,
        },
        evaluationDetail: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  const cost = calculateCost(provider.name, model, totalInputTokens, totalOutputTokens);

  const benchmarkResult: BenchmarkResult = {
    meta: {
      suite: "chat-pipeline",
      provider: provider.name,
      model,
      mode: batch ? "batch" : "realtime",
      timestamp,
      totalRuns: activeScenarios.length,
      failedRuns,
    },
    results,
    cost,
  };

  const date = timestamp.split("T")[0];
  const modelSlug = model.replace(/\./g, "-");
  const mode = batch ? "batch" : "realtime";
  const baseName = `benchmark-result-${date}_${modelSlug}_${mode}`;
  const jsonPath = `benchmarks/chat-pipeline/results/${baseName}.json`;
  saveJson(benchmarkResult, jsonPath);

  return benchmarkResult;
}
