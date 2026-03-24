# 벤치마크 프레임워크 리팩토링 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 chat-pipeline, tool-calling 벤치마크를 공통 인프라(Provider 래퍼, Batch API, 비용 계산, 리포트) 위에 전면 재작성한다.

**Architecture:** `benchmarks/lib/`에 공통 유틸(Provider 인터페이스, 비용 계산, 리포트 생성, CLI 파싱)을 두고, 각 벤치마크 스위트(chat-pipeline, tool-calling)가 자유롭게 활용하는 느슨한 규격. 실시간(Vercel AI SDK) + Batch(네이티브 SDK) 듀얼 모드.

**Tech Stack:** TypeScript, Vercel AI SDK (`ai`), OpenAI/Anthropic/Google 네이티브 SDK, Vitest, p-limit

**Spec:** `docs/superpowers/specs/2026-03-24-benchmark-refactor-design.md`

---

## File Map

### 신규 생성

| 파일 | 책임 |
|---|---|
| `benchmarks/lib/providers/types.ts` | BenchmarkProvider, BenchmarkRequest, BenchmarkResponse 등 공통 타입 |
| `benchmarks/lib/providers/openai.ts` | OpenAI 실시간(AI SDK) + Batch(네이티브) 구현체 |
| `benchmarks/lib/providers/anthropic.ts` | Anthropic 실시간(AI SDK) + Batch(네이티브) 구현체 |
| `benchmarks/lib/providers/google.ts` | Google 실시간(AI SDK) + Batch(네이티브) 구현체 |
| `benchmarks/lib/cost.ts` | PRICING 테이블, calculateCost(), CostResult |
| `benchmarks/lib/report.ts` | BenchmarkResult 타입, saveReport() (JSON + Markdown) |
| `benchmarks/lib/cli.ts` | BenchmarkOptions 파싱 (--suite, --provider, --model, --batch) |
| `benchmarks/lib/index.ts` | lib/ re-export 허브 |
| `benchmarks/tool-calling/prompts.ts` | S1~S6 프롬프트 변형 + precheck 로직 통합 |
| `benchmarks/tool-calling/scenarios.ts` | 4개 시나리오 재작성 (새 타입 기반) |
| `benchmarks/tool-calling/evaluate.ts` | judgePass, detectProposal → ToolCallingEvaluation |
| `benchmarks/tool-calling/run.ts` | tool-calling 스위트 오케스트레이터 |
| `benchmarks/chat-pipeline/scenarios.ts` | 페르소나 기반 시나리오 (multistep / classification) |
| `benchmarks/chat-pipeline/evaluate.ts` | 문서 선택 정확도 + 응답 품질 평가 |
| `benchmarks/chat-pipeline/run.ts` | chat-pipeline 스위트 오케스트레이터 |
| `benchmarks/run.ts` | 통합 진입점 (npm run bench) |

### 테스트 파일

| 파일 | 대상 |
|---|---|
| `benchmarks/lib/__tests__/cost.test.ts` | calculateCost 단위 테스트 |
| `benchmarks/lib/__tests__/cli.test.ts` | CLI 파싱 단위 테스트 |
| `benchmarks/lib/__tests__/report.test.ts` | 리포트 생성 단위 테스트 |
| `benchmarks/tool-calling/__tests__/evaluate.test.ts` | judgePass/detectProposal 단위 테스트 |
| `benchmarks/tool-calling/__tests__/prompts.test.ts` | classifyMessage precheck 단위 테스트 |

### 수정

| 파일 | 변경 |
|---|---|
| `package.json` | `"bench"` 스크립트 추가, devDependencies 추가 |
| `benchmarks/fixtures/types.ts` | BenchmarkMessage 타입 추가 (기존 ConvMessage 유지 + 확장) |

### 이동 (아카이브)

| 원본 | 대상 |
|---|---|
| `benchmarks/chat-pipeline/v1/` | `benchmarks/_archive/chat-pipeline/v1/` |
| `benchmarks/tool-calling/v1/` | `benchmarks/_archive/tool-calling/v1/` |
| `benchmarks/tool-calling/v2/` | `benchmarks/_archive/tool-calling/v2/` |

---

## Task 1: 기존 코드 아카이브 + 의존성 설치

**Files:**
- Move: `benchmarks/chat-pipeline/v1/` → `benchmarks/_archive/chat-pipeline/v1/`
- Move: `benchmarks/tool-calling/v1/` → `benchmarks/_archive/tool-calling/v1/`
- Move: `benchmarks/tool-calling/v2/` → `benchmarks/_archive/tool-calling/v2/`
- Modify: `package.json`

- [ ] **Step 1: 기존 벤치마크 코드를 _archive/로 이동**

```bash
mkdir -p benchmarks/_archive/chat-pipeline
mkdir -p benchmarks/_archive/tool-calling
mv benchmarks/chat-pipeline/v1 benchmarks/_archive/chat-pipeline/v1
mv benchmarks/tool-calling/v1 benchmarks/_archive/tool-calling/v1
mv benchmarks/tool-calling/v2 benchmarks/_archive/tool-calling/v2
```

- [ ] **Step 2: 새 디렉토리 구조 생성**

```bash
mkdir -p benchmarks/lib/providers
mkdir -p benchmarks/lib/__tests__
mkdir -p benchmarks/chat-pipeline/results
mkdir -p benchmarks/tool-calling/results
mkdir -p benchmarks/tool-calling/__tests__
mkdir -p benchmarks/chat-pipeline/__tests__
```

- [ ] **Step 3: devDependencies 추가**

```bash
npm install -D openai @anthropic-ai/sdk @google/genai p-limit
```

- [ ] **Step 4: package.json에 bench 스크립트 추가**

`package.json`의 scripts에 추가:
```json
"bench": "tsx benchmarks/run.ts"
```

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "refactor(benchmark): 기존 벤치마크 아카이브 + 새 디렉토리 구조 + 의존성 추가"
```

---

## Task 2: 공통 타입 정의 (`lib/providers/types.ts`)

**Files:**
- Create: `benchmarks/lib/providers/types.ts`
- Modify: `benchmarks/fixtures/types.ts`

- [ ] **Step 1: fixtures/types.ts에 BenchmarkMessage 타입 추가**

`benchmarks/fixtures/types.ts` 파일 끝에 추가:
```typescript
/** 벤치마크용 메시지 — ConvMessage 확장 (tool role 포함) */
export type BenchmarkMessage =
  | { role: "user" | "assistant"; content: string }
  | { role: "tool"; toolCallId: string; content: string };
```

- [ ] **Step 2: lib/providers/types.ts 작성**

```typescript
// benchmarks/lib/providers/types.ts
import type { BenchmarkMessage } from "../../fixtures/types";

export type { BenchmarkMessage };

/** 도구 정의 — Provider 중립적 포맷 */
export interface BenchmarkToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

/** 도구 호출 결과 — Provider 중립적 포맷 */
export interface BenchmarkToolCall {
  name: string;
  args: Record<string, unknown>;
}

/** 단일 요청 정의 */
export interface BenchmarkRequest {
  id: string;
  model: string;
  system: string;
  messages: BenchmarkMessage[];
  tools?: BenchmarkToolDef[];
  maxSteps?: number; // 실시간 전용 (Batch에서는 무시)
}

/** 단일 응답 */
export interface BenchmarkResponse {
  id: string;
  model: string;
  text: string;
  toolCalls: BenchmarkToolCall[];
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

/** Provider 구현체 인터페이스 */
export interface BenchmarkProvider {
  name: "openai" | "anthropic" | "google";
  run(req: BenchmarkRequest): Promise<BenchmarkResponse>;
  runBatch(reqs: BenchmarkRequest[]): Promise<BenchmarkResponse[]>;
}

export type ProviderName = BenchmarkProvider["name"];
```

- [ ] **Step 3: 커밋**

```bash
git add benchmarks/lib/providers/types.ts benchmarks/fixtures/types.ts
git commit -m "feat(benchmark): 공통 Provider 타입 정의 + BenchmarkMessage 확장"
```

---

## Task 3: 비용 계산 모듈 (`lib/cost.ts`)

**Files:**
- Create: `benchmarks/lib/cost.ts`
- Test: `benchmarks/lib/__tests__/cost.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
// benchmarks/lib/__tests__/cost.test.ts
import { describe, it, expect } from "vitest";
import { calculateCost } from "../cost";

describe("calculateCost", () => {
  it("OpenAI gpt-5.4 배치 비용 계산", () => {
    const result = calculateCost("openai", "gpt-5.4", 1_000_000, 1_000_000);
    expect(result.batchCost).toBeCloseTo(1.25 + 7.5); // $8.75
    expect(result.realtimeCost).toBeCloseTo(8.75 / 0.5); // $17.50
    expect(result.savings).toBeCloseTo(8.75);
  });

  it("Anthropic sonnet-4.6 배치 비용 계산", () => {
    const result = calculateCost("anthropic", "sonnet-4.6", 500_000, 200_000);
    // batch: 500K * 1.50/1M + 200K * 7.50/1M = 0.75 + 1.50 = 2.25
    expect(result.batchCost).toBeCloseTo(2.25);
    expect(result.realtimeCost).toBeCloseTo(4.50);
  });

  it("Google gemini-3.1-flash-lite 배치 비용 계산", () => {
    const result = calculateCost("google", "gemini-3.1-flash-lite", 1_000_000, 1_000_000);
    expect(result.batchCost).toBeCloseTo(0.125 + 0.75);
    expect(result.realtimeCost).toBeCloseTo(0.875 / 0.5);
  });

  it("모델 별칭으로 조회 (API 긴 이름 → PRICING 짧은 키)", () => {
    const result = calculateCost("anthropic", "claude-haiku-4-5-20251001", 1_000_000, 1_000_000);
    expect(result.batchCost).toBeCloseTo(0.5 + 2.5); // haiku-4.5 가격
  });

  it("알 수 없는 모델은 비용 0 반환", () => {
    const result = calculateCost("openai", "unknown-model", 1_000, 1_000);
    expect(result.batchCost).toBe(0);
    expect(result.realtimeCost).toBe(0);
  });

  it("토큰 수 보존", () => {
    const result = calculateCost("openai", "gpt-5.4", 3552, 755);
    expect(result.inputTokens).toBe(3552);
    expect(result.outputTokens).toBe(755);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run benchmarks/lib/__tests__/cost.test.ts
```
Expected: FAIL (모듈 없음)

- [ ] **Step 3: cost.ts 구현**

```typescript
// benchmarks/lib/cost.ts

/** Provider/모델별 토큰 가격 ($/1M tokens, Batch 가격 기준) */
const PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  "openai:gpt-5.4": { input: 1.25, output: 7.5 },
  "openai:gpt-5.4-nano": { input: 0.1, output: 0.625 },
  "openai:gpt-4o": { input: 1.25, output: 5.0 },
  "openai:gpt-4o-mini": { input: 0.075, output: 0.3 },
  // Anthropic
  "anthropic:haiku-4.5": { input: 0.5, output: 2.5 },
  "anthropic:sonnet-4.6": { input: 1.5, output: 7.5 },
  // Google
  "google:gemini-3.1-flash-lite": { input: 0.125, output: 0.75 },
  "google:gemini-3.1-pro": { input: 1.0, output: 6.0 },
};

/** API 모델명 → PRICING 키 정규화 (긴 이름을 짧은 키로 매핑) */
const MODEL_ALIASES: Record<string, string> = {
  "claude-haiku-4-5-20251001": "haiku-4.5",
  "claude-sonnet-4-6": "sonnet-4.6",
  "gemini-3.1-flash-lite-preview": "gemini-3.1-flash-lite",
  "gemini-3.1-pro-preview": "gemini-3.1-pro",
};

function normalizeModel(model: string): string {
  return MODEL_ALIASES[model] ?? model;
}

/** 3사 모두 동일: Batch = 실시간 × 0.5 */
const BATCH_DISCOUNT = 0.5;

export interface CostResult {
  batchCost: number;
  realtimeCost: number;
  savings: number;
  inputTokens: number;
  outputTokens: number;
}

export function calculateCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
): CostResult {
  const key = `${provider}:${normalizeModel(model)}`;
  const price = PRICING[key];

  if (!price) {
    return { batchCost: 0, realtimeCost: 0, savings: 0, inputTokens, outputTokens };
  }

  const batchCost =
    (inputTokens / 1_000_000) * price.input +
    (outputTokens / 1_000_000) * price.output;
  const realtimeCost = batchCost / BATCH_DISCOUNT;
  const savings = realtimeCost - batchCost;

  return { batchCost, realtimeCost, savings, inputTokens, outputTokens };
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run benchmarks/lib/__tests__/cost.test.ts
```
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add benchmarks/lib/cost.ts benchmarks/lib/__tests__/cost.test.ts
git commit -m "feat(benchmark): 비용 계산 모듈 (Batch 가격 + 실시간 역산)"
```

---

## Task 4: CLI 파싱 모듈 (`lib/cli.ts`)

**Files:**
- Create: `benchmarks/lib/cli.ts`
- Test: `benchmarks/lib/__tests__/cli.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
// benchmarks/lib/__tests__/cli.test.ts
import { describe, it, expect } from "vitest";
import { parseArgs } from "../cli";

describe("parseArgs", () => {
  it("기본값", () => {
    const opts = parseArgs([]);
    expect(opts.suite).toBe("all");
    expect(opts.provider).toBe("all");
    expect(opts.model).toBeUndefined();
    expect(opts.batch).toBe(false);
  });

  it("모든 옵션 파싱", () => {
    const opts = parseArgs([
      "--suite", "chat-pipeline",
      "--provider", "openai",
      "--model", "gpt-5.4",
      "--batch",
    ]);
    expect(opts.suite).toBe("chat-pipeline");
    expect(opts.provider).toBe("openai");
    expect(opts.model).toBe("gpt-5.4");
    expect(opts.batch).toBe(true);
  });

  it("--batch 플래그만 단독 사용", () => {
    const opts = parseArgs(["--batch"]);
    expect(opts.batch).toBe(true);
    expect(opts.suite).toBe("all");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run benchmarks/lib/__tests__/cli.test.ts
```
Expected: FAIL

- [ ] **Step 3: cli.ts 구현**

```typescript
// benchmarks/lib/cli.ts

export interface BenchmarkOptions {
  suite: string;
  provider: string;
  model?: string;
  batch: boolean;
}

export function parseArgs(argv: string[]): BenchmarkOptions {
  const getFlag = (name: string): string | undefined => {
    const idx = argv.indexOf(`--${name}`);
    return idx !== -1 && idx + 1 < argv.length && !argv[idx + 1].startsWith("--")
      ? argv[idx + 1]
      : undefined;
  };

  return {
    suite: getFlag("suite") ?? "all",
    provider: getFlag("provider") ?? "all",
    model: getFlag("model"),
    batch: argv.includes("--batch"),
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run benchmarks/lib/__tests__/cli.test.ts
```
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add benchmarks/lib/cli.ts benchmarks/lib/__tests__/cli.test.ts
git commit -m "feat(benchmark): CLI 옵션 파싱 모듈"
```

---

## Task 5: 리포트 생성 모듈 (`lib/report.ts`)

**Files:**
- Create: `benchmarks/lib/report.ts`
- Test: `benchmarks/lib/__tests__/report.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
// benchmarks/lib/__tests__/report.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { generateMarkdown, type BenchmarkResult } from "../report";

const MOCK_RESULT: BenchmarkResult = {
  meta: {
    suite: "tool-calling",
    provider: "openai",
    model: "gpt-5.4",
    mode: "batch",
    timestamp: "2026-03-24T12:00:00Z",
    totalRuns: 4,
    failedRuns: 0,
  },
  results: [
    {
      id: "tc-1",
      scenario: "새 경험",
      pass: true,
      response: {
        id: "tc-1", model: "gpt-5.4", text: "응답",
        toolCalls: [{ name: "saveCareerNote", args: {} }],
        inputTokens: 3000, outputTokens: 500, durationMs: 2000,
      },
      evaluationDetail: { toolCallsCorrect: true },
    },
    {
      id: "tc-2",
      scenario: "단순 질문",
      pass: false,
      response: {
        id: "tc-2", model: "gpt-5.4", text: "응답",
        toolCalls: [{ name: "readDocument", args: {} }],
        inputTokens: 2000, outputTokens: 300, durationMs: 1500,
      },
      evaluationDetail: { overCall: true },
    },
  ],
  cost: {
    batchCost: 0.01,
    realtimeCost: 0.02,
    savings: 0.01,
    inputTokens: 5000,
    outputTokens: 800,
  },
};

describe("generateMarkdown", () => {
  it("헤더에 메타 정보 포함", () => {
    const md = generateMarkdown(MOCK_RESULT);
    expect(md).toContain("gpt-5.4");
    expect(md).toContain("openai");
    expect(md).toContain("batch");
  });

  it("Pass Rate 계산", () => {
    const md = generateMarkdown(MOCK_RESULT);
    expect(md).toContain("1/2");
    expect(md).toContain("50.0%");
  });

  it("Cost 테이블 포함", () => {
    const md = generateMarkdown(MOCK_RESULT);
    expect(md).toContain("Batch");
    expect(md).toContain("Realtime");
  });

  it("failedRuns가 있으면 표시", () => {
    const withFailures = { ...MOCK_RESULT, meta: { ...MOCK_RESULT.meta, failedRuns: 1 } };
    const md = generateMarkdown(withFailures);
    expect(md).toContain("Failed");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run benchmarks/lib/__tests__/report.test.ts
```
Expected: FAIL

- [ ] **Step 3: report.ts 구현**

```typescript
// benchmarks/lib/report.ts
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import type { BenchmarkResponse, BenchmarkToolCall } from "./providers/types";
import type { CostResult } from "./cost";

export interface BenchmarkResult {
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

export function generateMarkdown(result: BenchmarkResult): string {
  const { meta, results, cost } = result;
  const passCount = results.filter((r) => r.pass).length;
  const totalCount = results.length;
  const passRate = totalCount > 0 ? ((passCount / totalCount) * 100).toFixed(1) : "0.0";

  let md = `# ${meta.suite} Benchmark Report\n\n`;
  md += `- **Model**: ${meta.model} | **Provider**: ${meta.provider} | **Mode**: ${meta.mode}\n`;
  md += `- **Date**: ${meta.timestamp.split("T")[0]} | **Total Runs**: ${meta.totalRuns}\n`;

  if (meta.failedRuns > 0) {
    md += `- **Failed Runs (API Error)**: ${meta.failedRuns}\n`;
  }

  md += `\n## Results\n\n`;
  md += `| Scenario | Pass | Input Tokens | Output Tokens | Duration |\n`;
  md += `|----------|------|-------------|---------------|----------|\n`;

  for (const r of results) {
    const pass = r.pass ? "✅" : "❌";
    const inp = r.response.inputTokens.toLocaleString();
    const out = r.response.outputTokens.toLocaleString();
    const dur = `${r.response.durationMs.toLocaleString()}ms`;
    md += `| ${r.scenario} | ${pass} | ${inp} | ${out} | ${dur} |\n`;
  }

  md += `\n**Pass Rate: ${passCount}/${totalCount} (${passRate}%)**\n`;

  md += `\n## Cost\n\n`;
  md += `| | Batch (실제) | Realtime (역산) | 절감액 |\n`;
  md += `|---|---|---|---|\n`;
  md += `| **Total** | **$${cost.batchCost.toFixed(4)}** | **$${cost.realtimeCost.toFixed(4)}** | **$${cost.savings.toFixed(4)}** |\n`;

  return md;
}

export function saveReport(result: BenchmarkResult, baseDir: string): { jsonPath: string; mdPath: string } {
  const date = result.meta.timestamp.split("T")[0];
  const modelSlug = result.meta.model.replace(/\./g, "-");
  const mode = result.meta.mode;
  const baseName = `benchmark-result-${date}_${modelSlug}_${mode}`;

  const resultsDir = join(baseDir, "results");
  mkdirSync(resultsDir, { recursive: true });

  const jsonPath = join(resultsDir, `${baseName}.json`);
  const mdPath = join(resultsDir, `${baseName}.md`);

  writeFileSync(jsonPath, JSON.stringify(result, null, 2), "utf-8");
  writeFileSync(mdPath, generateMarkdown(result), "utf-8");

  return { jsonPath, mdPath };
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run benchmarks/lib/__tests__/report.test.ts
```
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add benchmarks/lib/report.ts benchmarks/lib/__tests__/report.test.ts
git commit -m "feat(benchmark): 리포트 생성 모듈 (JSON + Markdown)"
```

---

## Task 6: OpenAI Provider 구현 (`lib/providers/openai.ts`)

**Files:**
- Create: `benchmarks/lib/providers/openai.ts`

**참조:** `benchmarks/_archive/chat-pipeline/v1/openai.ts`, `benchmarks/_archive/chat-pipeline/v1/common.ts`의 generateText 사용 패턴

- [ ] **Step 1: openai.ts 구현 — 실시간 모드**

```typescript
// benchmarks/lib/providers/openai.ts
import { generateText, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import type {
  BenchmarkProvider,
  BenchmarkRequest,
  BenchmarkResponse,
  BenchmarkToolDef,
  BenchmarkToolCall,
  BenchmarkMessage,
} from "./types";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.");
  return createOpenAI({ apiKey });
}

/** BenchmarkToolDef → Vercel AI SDK tool 변환 */
function convertTools(defs: BenchmarkToolDef[]) {
  const tools: Record<string, ReturnType<typeof tool>> = {};
  for (const def of defs) {
    tools[def.name] = tool({
      description: def.description,
      parameters: z.object(
        Object.fromEntries(
          Object.entries((def.parameters as { properties?: Record<string, unknown> }).properties ?? {}).map(
            ([k]) => [k, z.any()],
          ),
        ),
      ),
      execute: async (args) => JSON.stringify({ success: true, tool: def.name, args }),
    });
  }
  return tools;
}

/** BenchmarkResponse의 toolCalls 추출 */
function extractToolCalls(steps: Array<{ toolCalls?: Array<{ toolName: string; args: Record<string, unknown> }> }>): BenchmarkToolCall[] {
  const calls: BenchmarkToolCall[] = [];
  for (const step of steps) {
    for (const tc of step.toolCalls ?? []) {
      calls.push({ name: tc.toolName, args: tc.args });
    }
  }
  return calls;
}

async function run(req: BenchmarkRequest): Promise<BenchmarkResponse> {
  const client = getClient();
  const model = client(req.model);
  const start = performance.now();

  const result = await generateText({
    model,
    system: req.system,
    messages: req.messages.map((m) =>
      m.role === "tool"
        ? { role: "tool" as const, content: [{ type: "tool-result" as const, toolCallId: m.toolCallId, result: m.content }] }
        : { role: m.role, content: m.content },
    ),
    tools: req.tools ? convertTools(req.tools) : undefined,
    maxSteps: req.maxSteps ?? 1,
  });

  const durationMs = Math.round(performance.now() - start);
  const inputTokens = result.usage?.promptTokens ?? 0;
  const outputTokens = result.usage?.completionTokens ?? 0;

  return {
    id: req.id,
    model: req.model,
    text: result.text ?? "",
    toolCalls: extractToolCalls(result.steps ?? []),
    inputTokens,
    outputTokens,
    durationMs,
  };
}
```

- [ ] **Step 2: openai.ts — Batch 모드 구현**

같은 파일에 `runBatch` 추가:

```typescript
import OpenAI from "openai";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function getNativeClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.");
  return new OpenAI({ apiKey });
}

/** BenchmarkToolDef → OpenAI function calling 형식 */
function convertToolsForBatch(defs: BenchmarkToolDef[]): OpenAI.ChatCompletionTool[] {
  return defs.map((def) => ({
    type: "function" as const,
    function: {
      name: def.name,
      description: def.description,
      parameters: def.parameters,
    },
  }));
}

async function runBatch(reqs: BenchmarkRequest[]): Promise<BenchmarkResponse[]> {
  const client = getNativeClient();

  // 1. JSONL 생성
  const lines = reqs.map((req) => {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: req.system },
      ...req.messages.map((m) =>
        m.role === "tool"
          ? { role: "tool" as const, tool_call_id: m.toolCallId, content: m.content }
          : { role: m.role as "user" | "assistant", content: m.content },
      ),
    ];
    return JSON.stringify({
      custom_id: req.id,
      method: "POST",
      url: "/v1/chat/completions",
      body: {
        model: req.model,
        messages,
        ...(req.tools ? { tools: convertToolsForBatch(req.tools) } : {}),
      },
    });
  });

  const tmpFile = join(tmpdir(), `bench-batch-${Date.now()}.jsonl`);
  writeFileSync(tmpFile, lines.join("\n"), "utf-8");

  // 2. 파일 업로드 + 배치 생성
  const file = await client.files.create({
    file: new File([lines.join("\n")], "batch.jsonl", { type: "application/jsonl" }),
    purpose: "batch",
  });
  unlinkSync(tmpFile);

  const batch = await client.batches.create({
    input_file_id: file.id,
    endpoint: "/v1/chat/completions",
    completion_window: "24h",
  });

  // 3. 폴링
  let current = batch;
  let delay = 30_000;
  const maxWait = 2 * 60 * 60 * 1000; // 2시간
  const startTime = Date.now();

  while (!["completed", "failed", "expired", "cancelled"].includes(current.status)) {
    if (Date.now() - startTime > maxWait) {
      throw new Error(`Batch 타임아웃 (2시간 초과): ${current.id}`);
    }
    console.error(`[OpenAI Batch] status=${current.status}, waiting ${delay / 1000}s...`);
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.5, 120_000); // 지수 백오프, 최대 2분
    current = await client.batches.retrieve(current.id);
  }

  if (current.status === "expired" || current.status === "cancelled") {
    throw new Error(`Batch 실패: status=${current.status}, id=${current.id}`);
  }

  // 4. 결과 수집 (completed 또는 failed — failed도 output_file_id가 있을 수 있음: 부분 성공)
  const outputFileId = current.output_file_id;
  if (!outputFileId) throw new Error(`output_file_id 없음 (status=${current.status})`);
  const outputContent = await client.files.content(outputFileId);
  const text = await outputContent.text();
  const outputLines = text.trim().split("\n").map((l) => JSON.parse(l));

  const responseMap = new Map<string, BenchmarkResponse>();
  for (const line of outputLines) {
    const body = line.response?.body;
    if (!body) continue;
    const choice = body.choices?.[0];
    const usage = body.usage;
    const toolCalls: BenchmarkToolCall[] = (choice?.message?.tool_calls ?? []).map(
      (tc: { function: { name: string; arguments: string } }) => ({
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments),
      }),
    );
    responseMap.set(line.custom_id, {
      id: line.custom_id,
      model: body.model ?? reqs[0]?.model ?? "",
      text: choice?.message?.content ?? "",
      toolCalls,
      inputTokens: usage?.prompt_tokens ?? 0,
      outputTokens: usage?.completion_tokens ?? 0,
      durationMs: 0,
    });
  }

  // 5. 요청 순서대로 반환, 실패건은 stderr 출력 후 제외
  const failedIds = reqs.filter((req) => !responseMap.has(req.id)).map((r) => r.id);
  if (failedIds.length > 0) {
    console.error(`[OpenAI Batch] ${failedIds.length}건 실패: ${failedIds.join(", ")}`);
  }

  return reqs
    .map((req) => responseMap.get(req.id))
    .filter((r): r is BenchmarkResponse => r !== undefined);
}

export const openaiProvider: BenchmarkProvider = {
  name: "openai",
  run,
  runBatch,
};
```

- [ ] **Step 3: 커밋**

```bash
git add benchmarks/lib/providers/openai.ts
git commit -m "feat(benchmark): OpenAI Provider 구현 (실시간 + Batch)"
```

---

## Task 7: Anthropic Provider 구현 (`lib/providers/anthropic.ts`)

**Files:**
- Create: `benchmarks/lib/providers/anthropic.ts`

- [ ] **Step 1: anthropic.ts 구현**

실시간 모드는 Vercel AI SDK(`@ai-sdk/anthropic`), Batch는 네이티브 SDK(`@anthropic-ai/sdk`) 사용. 구조는 openai.ts와 동일한 패턴.

핵심 차이점:
- 실시간: `createAnthropic()`으로 모델 생성, `generateText()`에 전달
- Batch 제출: `client.messages.batches.create({ requests: [...] })` — 인라인 요청 배열
- Batch 결과: `client.messages.batches.results(batchId)` async iterator
- system 메시지: 별도 `system` 파라미터 (messages에 포함하지 않음)

- [ ] **Step 2: 커밋**

```bash
git add benchmarks/lib/providers/anthropic.ts
git commit -m "feat(benchmark): Anthropic Provider 구현 (실시간 + Batch)"
```

---

## Task 8: Google Provider 구현 (`lib/providers/google.ts`)

**Files:**
- Create: `benchmarks/lib/providers/google.ts`

- [ ] **Step 1: google.ts 구현**

실시간 모드는 Vercel AI SDK(`@ai-sdk/google`), Batch는 네이티브 SDK(`@google/genai`) 사용.

핵심 차이점:
- 실시간: `createGoogleGenerativeAI()`로 모델 생성
- Batch 제출: `client.batches.create({ model, src: inlineRequests })` — 인라인 요청
- Batch 상태: `client.batches.get(name)`, state가 `JOB_STATE_SUCCEEDED` 등
- Batch 결과: `batch.dest.inlinedResponses` 에서 직접 읽기
- system: `systemInstruction` 필드
- messages → `contents` 배열 (role: "user" | "model")
- tools → `functionDeclarations` 형식

- [ ] **Step 2: 커밋**

```bash
git add benchmarks/lib/providers/google.ts
git commit -m "feat(benchmark): Google Provider 구현 (실시간 + Batch)"
```

---

## Task 9: lib/index.ts re-export 허브

**Files:**
- Create: `benchmarks/lib/index.ts`

- [ ] **Step 1: index.ts 작성**

```typescript
// benchmarks/lib/index.ts
export { calculateCost, type CostResult } from "./cost";
export { parseArgs, type BenchmarkOptions } from "./cli";
export {
  generateMarkdown,
  saveReport,
  type BenchmarkResult,
} from "./report";
export {
  type BenchmarkProvider,
  type BenchmarkRequest,
  type BenchmarkResponse,
  type BenchmarkToolDef,
  type BenchmarkToolCall,
  type BenchmarkMessage,
  type ProviderName,
} from "./providers/types";
export { openaiProvider } from "./providers/openai";
export { anthropicProvider } from "./providers/anthropic";
export { googleProvider } from "./providers/google";
```

- [ ] **Step 2: 커밋**

```bash
git add benchmarks/lib/index.ts
git commit -m "feat(benchmark): lib/ re-export 허브"
```

---

## Task 10: tool-calling 프롬프트 재작성

**Files:**
- Create: `benchmarks/tool-calling/prompts.ts`
- Test: `benchmarks/tool-calling/__tests__/prompts.test.ts`

**참조:** `benchmarks/_archive/tool-calling/v1/prompts.ts` (S1~S4), `benchmarks/_archive/tool-calling/v2/prompts.ts` (S4~S6), `benchmarks/_archive/tool-calling/v2/precheck.ts` (classifyMessage)

- [ ] **Step 1: precheck 로직 테스트 작성**

```typescript
// benchmarks/tool-calling/__tests__/prompts.test.ts
import { describe, it, expect } from "vitest";
import { classifyMessage } from "../prompts";

describe("classifyMessage", () => {
  it("수치 변경 감지", () => {
    const result = classifyMessage("스타 수가 400개가 아니라 450개야", ["스타 400개"]);
    expect(result.classification).toBe("number-change");
    expect(result.hint).toContain("readCareerNote");
  });

  it("새 경험 감지", () => {
    const result = classifyMessage("작년에 API 서버를 구현했는데 트래픽 300만건 처리했어", []);
    expect(result.classification).toBe("new-experience");
    expect(result.hint).toContain("saveCareerNote");
  });

  it("초안 요청 감지", () => {
    const result = classifyMessage("자기소개서 첫 문단 써줘", []);
    expect(result.classification).toBe("draft-request");
    expect(result.hint).toContain("readDocument");
  });

  it("일반 질문", () => {
    const result = classifyMessage("이력서 작성할 때 팁 알려줘", []);
    expect(result.classification).toBe("general");
    expect(result.hint).toBe("");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run benchmarks/tool-calling/__tests__/prompts.test.ts
```

- [ ] **Step 3: prompts.ts 구현**

기존 `_archive/tool-calling/v1/prompts.ts`의 S1~S4와 `v2/prompts.ts`의 S5~S6, `v2/precheck.ts`의 classifyMessage를 하나의 파일로 통합.

핵심 export:
- `type PromptVariant = { id: string; label: string; buildSystemPrompt: (context: string) => string }`
- `PROMPT_VARIANTS: PromptVariant[]` (S1~S6)
- `PRECHECK_VARIANT_IDS: Set<string>` (S6)
- `classifyMessage(message: string, contextSummaries: string[]): PrecheckResult`
- `generateTurn2Hint(): string`
- `buildContext(): string` — 문서/노트 요약 구성
- `createToolDefs(): BenchmarkToolDef[]` — Provider 중립적 도구 정의

`createToolDefs()`는 기존 `createTools()`의 AI SDK `tool()` 대신 `BenchmarkToolDef` 형식 반환.

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run benchmarks/tool-calling/__tests__/prompts.test.ts
```

- [ ] **Step 5: 커밋**

```bash
git add benchmarks/tool-calling/prompts.ts benchmarks/tool-calling/__tests__/prompts.test.ts
git commit -m "feat(benchmark): tool-calling 프롬프트 S1~S6 + precheck 통합"
```

---

## Task 11: tool-calling 시나리오 + 평가 로직

**Files:**
- Create: `benchmarks/tool-calling/scenarios.ts`
- Create: `benchmarks/tool-calling/evaluate.ts`
- Test: `benchmarks/tool-calling/__tests__/evaluate.test.ts`

**참조:** `benchmarks/_archive/tool-calling/v1/scenarios.ts`, `benchmarks/_archive/tool-calling/v1/runner.ts` (judgePass, detectProposal)

- [ ] **Step 1: evaluate 테스트 작성**

```typescript
// benchmarks/tool-calling/__tests__/evaluate.test.ts
import { describe, it, expect } from "vitest";
import { evaluateToolCalling } from "../evaluate";
import type { BenchmarkToolCall } from "../../lib/providers/types";

describe("evaluateToolCalling", () => {
  it("정확한 도구 호출 → pass", () => {
    const result = evaluateToolCalling(
      [{ name: "saveCareerNote", args: {} }],
      { required: ["saveCareerNote"], allowed: ["readDocument"] },
      "제안된 내용을 저장했습니다",
    );
    expect(result.pass).toBe(true);
    expect(result.toolCallsCorrect).toBe(true);
  });

  it("필요한 도구 미호출 → underCall", () => {
    const result = evaluateToolCalling(
      [],
      { required: ["readDocument"], allowed: [] },
      "문서를 확인하겠습니다",
    );
    expect(result.pass).toBe(false);
    expect(result.underCall).toBe(true);
  });

  it("불필요한 도구 호출 → overCall", () => {
    const result = evaluateToolCalling(
      [{ name: "readDocument", args: {} }],
      { required: [], allowed: [] },
      "관련 문서를 읽어보겠습니다",
    );
    expect(result.pass).toBe(false);
    expect(result.overCall).toBe(true);
  });

  it("제안 감지", () => {
    const result = evaluateToolCalling(
      [],
      { required: ["saveCareerNote"], allowed: [] },
      "이 경험을 커리어노트에 저장할까요?",
    );
    expect(result.proposalDetected).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run benchmarks/tool-calling/__tests__/evaluate.test.ts
```

- [ ] **Step 3: scenarios.ts 구현**

기존 4개 시나리오를 새 타입으로 재작성. `fixtures/mock-data`에서 페르소나 데이터 import.

```typescript
// benchmarks/tool-calling/scenarios.ts
import type { BenchmarkMessage } from "../fixtures/types";
import type { MockPersona } from "../fixtures/mock-data";

export interface ToolCallExpectation {
  required: string[];
  allowed: string[];
  orderedPairs?: [string, string][];
}

export interface ToolCallingScenario {
  id: string;
  name: string;
  persona: MockPersona;
  messages: BenchmarkMessage[];
  expected: ToolCallExpectation;
  approvalMessage?: string; // 2턴 시나리오용
}

// 기존 _archive/tool-calling/v1/scenarios.ts의 4개 시나리오를
// 새 타입으로 재정의 (mock-data에서 sd-1 페르소나 사용)
```

- [ ] **Step 4: evaluate.ts 구현**

기존 `_archive/tool-calling/v1/runner.ts`의 `judgePass()`, `detectProposal()` 로직 이식.

```typescript
// benchmarks/tool-calling/evaluate.ts
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

export function evaluateToolCalling(
  actualCalls: BenchmarkToolCall[],
  expected: ToolCallExpectation,
  responseText: string,
  turn2Executed?: boolean,
): ToolCallingEvaluation { /* ... */ }
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
npx vitest run benchmarks/tool-calling/__tests__/evaluate.test.ts
```

- [ ] **Step 6: 커밋**

```bash
git add benchmarks/tool-calling/scenarios.ts benchmarks/tool-calling/evaluate.ts benchmarks/tool-calling/__tests__/evaluate.test.ts
git commit -m "feat(benchmark): tool-calling 시나리오 + 평가 로직 재작성"
```

---

## Task 12: tool-calling 러너 (`run.ts`)

**Files:**
- Create: `benchmarks/tool-calling/run.ts`

**참조:** `benchmarks/_archive/tool-calling/v2/runner.ts`의 실행 흐름

- [ ] **Step 1: run.ts 구현**

핵심 로직:
1. 시나리오 × 프롬프트 변형 조합으로 `BenchmarkRequest[]` 생성
2. `provider.run()` 또는 `provider.runBatch()`로 실행
3. `evaluateToolCalling()`으로 판정
4. `calculateCost()`, `saveReport()`로 결과 저장
5. S6 변형은 classifyMessage()로 precheck hint 주입
6. 2턴 시나리오(approvalMessage 있는 경우): Turn 1 결과 확인 후 Turn 2 실행
7. `--batch` 모드에서 2턴 시나리오는 건너뛰고 경고 출력

```typescript
// benchmarks/tool-calling/run.ts
import pLimit from "p-limit";
import type { BenchmarkProvider, BenchmarkRequest, BenchmarkResponse } from "../lib";
import { calculateCost, saveReport, type BenchmarkResult } from "../lib";
import { SCENARIOS } from "./scenarios";
import { PROMPT_VARIANTS, PRECHECK_VARIANT_IDS, classifyMessage, generateTurn2Hint, buildContext, createToolDefs } from "./prompts";
import { evaluateToolCalling } from "./evaluate";

export async function runToolCalling(
  provider: BenchmarkProvider,
  model: string,
  batch: boolean,
): Promise<BenchmarkResult> { /* ... */ }
```

- [ ] **Step 2: 커밋**

```bash
git add benchmarks/tool-calling/run.ts
git commit -m "feat(benchmark): tool-calling 러너 재작성"
```

---

## Task 13: chat-pipeline 시나리오 + 평가 + 러너

**Files:**
- Create: `benchmarks/chat-pipeline/scenarios.ts`
- Create: `benchmarks/chat-pipeline/evaluate.ts`
- Create: `benchmarks/chat-pipeline/run.ts`
- Test: `benchmarks/chat-pipeline/__tests__/evaluate.test.ts`

**참조:** `benchmarks/_archive/chat-pipeline/v1/common.ts`의 benchmarkMultiStep/benchmarkClassification

- [ ] **Step 1: scenarios.ts 구현**

fixtures에서 페르소나 선택, 문서/노트 할당, 대화 스타일 구성. 기존 3개 시나리오(Small/Medium/Large) 패턴을 25개 페르소나로 확장 가능하도록 설계.

```typescript
// benchmarks/chat-pipeline/scenarios.ts
import type { MockPersona, MockDocument, MockExternalDocument, MockCareerNote, ConvMessage } from "../fixtures/mock-data";
import type { BenchmarkMessage } from "../fixtures/types";

export interface ChatPipelineScenario {
  id: string;
  persona: MockPersona;
  documents: MockDocument[];
  externalDocs: MockExternalDocument[];
  careerNotes: MockCareerNote[];
  userMessages: BenchmarkMessage[];
  strategy: "multistep" | "classification";
}
```

- [ ] **Step 2: evaluate.ts 구현**

기존 `common.ts`의 문서 선택 정확도 + 응답 품질 체크 로직 이식.

```typescript
// benchmarks/chat-pipeline/evaluate.ts
import type { BenchmarkToolCall } from "../lib/providers/types";

export interface ChatPipelineEvaluation {
  documentSelectionCorrect: boolean;
  responseQualityMetrics: {
    keyFactsFound: string[];
    keyFactsMissed: string[];
  };
  toolCallCount: number;
}

export function evaluateChatPipeline(
  toolCalls: BenchmarkToolCall[],
  responseText: string,
  expectedDocIds: string[],
  keyFacts: string[],
): ChatPipelineEvaluation { /* ... */ }
```

- [ ] **Step 3: evaluate 테스트 작성**

```typescript
// benchmarks/chat-pipeline/__tests__/evaluate.test.ts
import { describe, it, expect } from "vitest";
import { evaluateChatPipeline } from "../evaluate";

describe("evaluateChatPipeline", () => {
  it("올바른 문서 선택 → documentSelectionCorrect", () => {
    const result = evaluateChatPipeline(
      [{ name: "readDocument", args: { documentId: "doc-2" } },
       { name: "readDocument", args: { documentId: "doc-3" } }],
      "Stars 450개 이상, npm 다운로드 2K+",
      ["doc-2", "doc-3"],
      ["Stars 450", "npm 2K"],
    );
    expect(result.documentSelectionCorrect).toBe(true);
    expect(result.responseQualityMetrics.keyFactsFound).toContain("Stars 450");
  });

  it("문서 미선택 → documentSelectionCorrect false", () => {
    const result = evaluateChatPipeline(
      [],
      "일반적인 응답입니다",
      ["doc-2"],
      ["Stars 450"],
    );
    expect(result.documentSelectionCorrect).toBe(false);
  });

  it("keyFact 누락 감지", () => {
    const result = evaluateChatPipeline(
      [{ name: "readDocument", args: { documentId: "doc-2" } }],
      "Stars 450개 달성",
      ["doc-2"],
      ["Stars 450", "npm 2K"],
    );
    expect(result.responseQualityMetrics.keyFactsMissed).toContain("npm 2K");
  });
});
```

- [ ] **Step 4: 테스트 실패 확인**

```bash
npx vitest run benchmarks/chat-pipeline/__tests__/evaluate.test.ts
```
Expected: FAIL

- [ ] **Step 5: evaluate.ts 구현 (테스트 통과)**

- [ ] **Step 6: run.ts 구현**

tool-calling/run.ts와 동일한 패턴. `--batch` 모드에서 multistep 전략(maxSteps > 1)은 건너뛰고 경고.

- [ ] **Step 7: 테스트 통과 확인**

```bash
npx vitest run benchmarks/chat-pipeline/__tests__/evaluate.test.ts
```

- [ ] **Step 8: 커밋**

```bash
git add benchmarks/chat-pipeline/scenarios.ts benchmarks/chat-pipeline/evaluate.ts benchmarks/chat-pipeline/run.ts benchmarks/chat-pipeline/__tests__/evaluate.test.ts
git commit -m "feat(benchmark): chat-pipeline 스위트 재작성"
```

---

## Task 14: 통합 진입점 (`benchmarks/run.ts`)

**Files:**
- Create: `benchmarks/run.ts`

- [ ] **Step 1: run.ts 구현**

```typescript
// benchmarks/run.ts
import "dotenv/config";
import { parseArgs, openaiProvider, anthropicProvider, googleProvider } from "./lib";
import type { BenchmarkProvider } from "./lib";
import { runToolCalling } from "./tool-calling/run";
import { runChatPipeline } from "./chat-pipeline/run";

const PROVIDERS: Record<string, BenchmarkProvider> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  google: googleProvider,
};

const SUITES: Record<string, (provider: BenchmarkProvider, model: string, batch: boolean) => Promise<unknown>> = {
  "tool-calling": runToolCalling,
  "chat-pipeline": runChatPipeline,
};

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const providerNames = opts.provider === "all"
    ? Object.keys(PROVIDERS)
    : [opts.provider];

  const suiteNames = opts.suite === "all"
    ? Object.keys(SUITES)
    : [opts.suite];

  for (const suiteName of suiteNames) {
    const suite = SUITES[suiteName];
    if (!suite) { console.error(`Unknown suite: ${suiteName}`); process.exit(1); }

    for (const providerName of providerNames) {
      const provider = PROVIDERS[providerName];
      if (!provider) { console.error(`Unknown provider: ${providerName}`); process.exit(1); }

      const model = opts.model ?? getDefaultModel(providerName);
      console.log(`\n▶ Running ${suiteName} with ${providerName}/${model} (${opts.batch ? "batch" : "realtime"})\n`);
      await suite(provider, model, opts.batch);
    }
  }
}

function getDefaultModel(provider: string): string {
  switch (provider) {
    case "openai": return "gpt-5.4-nano";
    case "anthropic": return "claude-haiku-4-5-20251001";
    case "google": return "gemini-3.1-flash-lite-preview";
    default: throw new Error(`Unknown provider: ${provider}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: 로컬 실행 검증 (실시간 모드)**

```bash
npm run bench -- --suite tool-calling --provider openai --model gpt-5.4-nano
```
Expected: 4 시나리오 × 6 변형 = 24건 실행, 결과 JSON + MD 생성

- [ ] **Step 3: 커밋**

```bash
git add benchmarks/run.ts
git commit -m "feat(benchmark): 통합 진입점 + npm run bench CLI"
```

---

## Task 15: 통합 검증 + 마무리

- [ ] **Step 1: 전체 테스트 통과 확인**

```bash
npx vitest run benchmarks/
```

- [ ] **Step 2: 실시간 모드 스모크 테스트**

```bash
npm run bench -- --suite tool-calling --provider openai --model gpt-5.4-nano
```
결과 파일이 `benchmarks/tool-calling/results/`에 생성되는지 확인.

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: 최종 커밋**

```bash
git add -A
git commit -m "feat(benchmark): 벤치마크 프레임워크 리팩토링 완료"
```
