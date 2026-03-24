# Benchmark CLI & Config 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Config 파일 기반 벤치마크 실행, CLI 복수 모델/페르소나 지원, 모델→provider 자동 매핑 구현

**Architecture:** 기존 `lib/cli.ts` 파서를 확장하고, 새 `lib/config.ts` 모듈에서 config 로드 + CLI 머지 + 유효성 검증을 담당. 각 suite의 `scenarios.ts`를 정적 상수에서 팩토리 함수로 전환하여 페르소나를 동적 주입. `run.ts` 진입점에서 모델×페르소나 루프 실행.

**Tech Stack:** TypeScript, Vitest, tsx

**Spec:** `docs/superpowers/specs/2026-03-24-benchmark-cli-config-design.md`

---

## File Structure

| 파일 | 역할 |
|------|------|
| `benchmarks/lib/config.ts` | **신규** — `BenchmarkConfig` 타입, `resolveProvider()`, config 로드, CLI 머지, 페르소나 유효성 검증 |
| `benchmarks/lib/cli.ts` | **수정** — `BenchmarkOptions` 타입 변경 (복수 models/providers/personas), `--persona`/`--config` 파싱 |
| `benchmarks/lib/index.ts` | **수정** — config 모듈 re-export 추가 |
| `benchmarks/lib/__tests__/cli.test.ts` | **수정** — 신규 옵션 테스트 추가 |
| `benchmarks/lib/__tests__/config.test.ts` | **신규** — config 로드, 머지, resolveProvider, 유효성 검증 테스트 |
| `benchmarks/tool-calling/scenarios.ts` | **수정** — `SCENARIOS` 상수 → `buildScenarios(personaId)` 팩토리 함수 |
| `benchmarks/tool-calling/prompts.ts` | **수정** — `buildContext()` → `buildContext(personaId)` 페르소나 필터링 |
| `benchmarks/tool-calling/run.ts` | **수정** — persona 파라미터 수신, `buildScenarios` 호출, 파일명에 persona 포함 |
| `benchmarks/chat-pipeline/scenarios.ts` | **수정** — `SCENARIOS` 상수 → `buildScenarios(personaId)` 팩토리 함수 |
| `benchmarks/chat-pipeline/run.ts` | **수정** — persona 파라미터 수신, `buildScenarios` 호출, 파일명에 persona 포함 |
| `benchmarks/run.ts` | **수정** — config 로드 + 모델×페르소나 루프, `resolveProvider` 사용 |
| `benchmarks/benchmark.config.ts` | **신규** — 예시 config 파일 |

---

### Task 1: `lib/config.ts` — 타입 정의 + resolveProvider

**Files:**
- Create: `benchmarks/lib/config.ts`
- Create: `benchmarks/lib/__tests__/config.test.ts`

- [ ] **Step 1: resolveProvider 테스트 작성**

```ts
// benchmarks/lib/__tests__/config.test.ts
import { describe, it, expect } from "vitest";
import { resolveProvider } from "../config";

describe("resolveProvider", () => {
  it("gpt- prefix → openai", () => {
    expect(resolveProvider("gpt-5.4-nano")).toBe("openai");
  });

  it("o1- prefix → openai", () => {
    expect(resolveProvider("o1-mini")).toBe("openai");
  });

  it("o3- prefix → openai", () => {
    expect(resolveProvider("o3-mini")).toBe("openai");
  });

  it("o4- prefix → openai", () => {
    expect(resolveProvider("o4-mini")).toBe("openai");
  });

  it("claude- prefix → anthropic", () => {
    expect(resolveProvider("claude-haiku-4-5-20251001")).toBe("anthropic");
  });

  it("gemini- prefix → google", () => {
    expect(resolveProvider("gemini-3.1-flash-lite-preview")).toBe("google");
  });

  it("알 수 없는 prefix → null", () => {
    expect(resolveProvider("unknown-model")).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npx vitest run benchmarks/lib/__tests__/config.test.ts`
Expected: FAIL — `resolveProvider` not found

- [ ] **Step 3: config.ts 구현 — 타입 + resolveProvider**

```ts
// benchmarks/lib/config.ts
import type { ProviderName } from "./providers/types";

export interface BenchmarkConfig {
  suites: "all" | Array<"tool-calling" | "chat-pipeline">;
  providers?: "all" | Array<"openai" | "anthropic" | "google">;
  models: string[];
  personas: string[];
  batch: boolean;
}

const MODEL_PREFIX_MAP: Array<{ prefix: string; provider: ProviderName }> = [
  { prefix: "gpt-", provider: "openai" },
  { prefix: "o1-", provider: "openai" },
  { prefix: "o3-", provider: "openai" },
  { prefix: "o4-", provider: "openai" },
  { prefix: "claude-", provider: "anthropic" },
  { prefix: "gemini-", provider: "google" },
];

export function resolveProvider(model: string): ProviderName | null {
  const match = MODEL_PREFIX_MAP.find((m) => model.startsWith(m.prefix));
  return match?.provider ?? null;
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `npx vitest run benchmarks/lib/__tests__/config.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add benchmarks/lib/config.ts benchmarks/lib/__tests__/config.test.ts
git commit -m "feat(benchmark): add BenchmarkConfig type and resolveProvider"
```

---

### Task 2: `lib/config.ts` — config 로드 + CLI 머지 + 페르소나 유효성 검증

**Files:**
- Modify: `benchmarks/lib/config.ts`
- Modify: `benchmarks/lib/__tests__/config.test.ts`

- [ ] **Step 1: loadConfig + mergeWithCli + validatePersonas 테스트 작성**

```ts
// benchmarks/lib/__tests__/config.test.ts — 기존 describe 아래에 추가
import { resolveProvider, mergeWithCli, validatePersonas } from "../config";
import type { BenchmarkConfig } from "../config";

describe("mergeWithCli", () => {
  const baseConfig: BenchmarkConfig = {
    suites: ["tool-calling"],
    providers: ["openai"],
    models: ["gpt-5.4-nano"],
    personas: ["sd-1"],
    batch: false,
  };

  it("CLI 옵션이 config를 override", () => {
    const cliOverrides = {
      suites: ["chat-pipeline"] as Array<"tool-calling" | "chat-pipeline">,
      models: ["claude-haiku-4-5-20251001"],
      batch: true,
    };
    const merged = mergeWithCli(baseConfig, cliOverrides);
    expect(merged.suites).toEqual(["chat-pipeline"]);
    expect(merged.models).toEqual(["claude-haiku-4-5-20251001"]);
    expect(merged.batch).toBe(true);
    // config의 providers, personas는 유지
    expect(merged.providers).toEqual(["openai"]);
    expect(merged.personas).toEqual(["sd-1"]);
  });

  it("CLI override가 없으면 config 값 유지", () => {
    const merged = mergeWithCli(baseConfig, {});
    expect(merged).toEqual(baseConfig);
  });
});

describe("validatePersonas", () => {
  it("유효한 페르소나 ID는 통과", () => {
    expect(() => validatePersonas(["sd-1", "jd-3"])).not.toThrow();
  });

  it("잘못된 페르소나 ID는 에러", () => {
    expect(() => validatePersonas(["sd-1", "invalid-99"])).toThrow("invalid-99");
  });

  it('"all"은 전체 페르소나 ID 배열로 변환', () => {
    const result = validatePersonas(["all"]);
    expect(result.length).toBeGreaterThanOrEqual(25);
    expect(result).toContain("sd-1");
    expect(result).toContain("uat-1");
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npx vitest run benchmarks/lib/__tests__/config.test.ts`
Expected: FAIL — `mergeWithCli`, `validatePersonas` not found

- [ ] **Step 3: config.ts에 mergeWithCli + validatePersonas 구현**

`benchmarks/lib/config.ts`에 아래 추가:

```ts
import { ALL_PERSONAS } from "../fixtures/mock-data";

export interface CliOverrides {
  suites?: BenchmarkConfig["suites"];
  providers?: BenchmarkConfig["providers"];
  models?: string[];
  personas?: string[];
  batch?: boolean;
}

export function mergeWithCli(config: BenchmarkConfig, cli: CliOverrides): BenchmarkConfig {
  return {
    suites: cli.suites ?? config.suites,
    providers: cli.providers ?? config.providers,
    models: cli.models ?? config.models,
    personas: cli.personas ?? config.personas,
    batch: cli.batch ?? config.batch,
  };
}

export function validatePersonas(personas: string[]): string[] {
  if (personas.length === 1 && personas[0] === "all") {
    return ALL_PERSONAS.map((p) => p.id);
  }

  const validIds = new Set(ALL_PERSONAS.map((p) => p.id));
  const invalid = personas.filter((id) => !validIds.has(id));
  if (invalid.length > 0) {
    throw new Error(`Unknown persona ID(s): ${invalid.join(", ")}`);
  }
  return personas;
}

export async function loadConfig(configPath: string): Promise<BenchmarkConfig> {
  const mod = await import(configPath);
  return mod.default as BenchmarkConfig;
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `npx vitest run benchmarks/lib/__tests__/config.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add benchmarks/lib/config.ts benchmarks/lib/__tests__/config.test.ts
git commit -m "feat(benchmark): add config load, merge, and persona validation"
```

---

### Task 3: `lib/cli.ts` — CLI 파서 확장

**Files:**
- Modify: `benchmarks/lib/cli.ts`
- Modify: `benchmarks/lib/__tests__/cli.test.ts`

- [ ] **Step 1: 기존 테스트를 새 타입에 맞게 수정 + 신규 옵션 테스트 추가**

`benchmarks/lib/__tests__/cli.test.ts`를 아래로 교체:

```ts
import { describe, it, expect } from "vitest";
import { parseArgs } from "../cli";

describe("parseArgs", () => {
  it("기본값", () => {
    const opts = parseArgs([]);
    expect(opts.suites).toEqual(["all"]);
    expect(opts.providers).toEqual(["all"]);
    expect(opts.models).toEqual([]);
    expect(opts.personas).toEqual([]);
    expect(opts.batch).toBe(false);
    expect(opts.configPath).toBeUndefined();
  });

  it("모든 옵션 파싱", () => {
    const opts = parseArgs([
      "--suite", "chat-pipeline",
      "--provider", "openai",
      "--model", "gpt-5.4,claude-haiku-4-5",
      "--persona", "sd-1,jd-3",
      "--config", "benchmarks/benchmark.config.ts",
      "--batch",
    ]);
    expect(opts.suites).toEqual(["chat-pipeline"]);
    expect(opts.providers).toEqual(["openai"]);
    expect(opts.models).toEqual(["gpt-5.4", "claude-haiku-4-5"]);
    expect(opts.personas).toEqual(["sd-1", "jd-3"]);
    expect(opts.configPath).toBe("benchmarks/benchmark.config.ts");
    expect(opts.batch).toBe(true);
  });

  it("--batch 플래그만 단독 사용", () => {
    const opts = parseArgs(["--batch"]);
    expect(opts.batch).toBe(true);
    expect(opts.suites).toEqual(["all"]);
  });

  it("--model 단일 값", () => {
    const opts = parseArgs(["--model", "gpt-5.4-nano"]);
    expect(opts.models).toEqual(["gpt-5.4-nano"]);
  });

  it("--persona all", () => {
    const opts = parseArgs(["--persona", "all"]);
    expect(opts.personas).toEqual(["all"]);
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npx vitest run benchmarks/lib/__tests__/cli.test.ts`
Expected: FAIL — `suites` property does not exist

- [ ] **Step 3: cli.ts 수정 — 새 BenchmarkOptions + 파싱 로직**

`benchmarks/lib/cli.ts`를 아래로 교체:

```ts
export interface BenchmarkOptions {
  suites: string[];
  providers: string[];
  models: string[];
  personas: string[];
  batch: boolean;
  configPath?: string;
}

export function parseArgs(argv: string[]): BenchmarkOptions {
  const getFlag = (name: string): string | undefined => {
    const idx = argv.indexOf(`--${name}`);
    return idx !== -1 && idx + 1 < argv.length && !argv[idx + 1].startsWith("--")
      ? argv[idx + 1]
      : undefined;
  };

  const splitComma = (value: string | undefined): string[] =>
    value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const suite = getFlag("suite");
  const provider = getFlag("provider");

  return {
    suites: suite ? [suite] : ["all"],
    providers: provider ? [provider] : ["all"],
    models: splitComma(getFlag("model")),
    personas: splitComma(getFlag("persona")),
    batch: argv.includes("--batch"),
    configPath: getFlag("config"),
  };
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `npx vitest run benchmarks/lib/__tests__/cli.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add benchmarks/lib/cli.ts benchmarks/lib/__tests__/cli.test.ts
git commit -m "feat(benchmark): extend CLI parser with --persona, --model multi, --config"
```

---

### Task 4: `lib/index.ts` — re-export 업데이트

**Files:**
- Modify: `benchmarks/lib/index.ts`

- [ ] **Step 1: index.ts에 config 모듈 re-export 추가**

`benchmarks/lib/index.ts`에 아래 블록 추가 (기존 CLI export 아래):

```ts
// Config loading and merging
export {
  type BenchmarkConfig,
  type CliOverrides,
  resolveProvider,
  mergeWithCli,
  validatePersonas,
  loadConfig,
} from "./config";
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit --project benchmarks/tsconfig.json` (tsconfig이 없으면 `npx tsc --noEmit benchmarks/lib/index.ts --esModuleInterop --moduleResolution node`)
Expected: 컴파일 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add benchmarks/lib/index.ts
git commit -m "feat(benchmark): re-export config module from lib/index"
```

---

### Task 5: tool-calling scenarios 팩토리 함수 전환

**Files:**
- Modify: `benchmarks/tool-calling/scenarios.ts`
- Modify: `benchmarks/tool-calling/prompts.ts`

현재 상태:
- `scenarios.ts`: `sd-1` 하드코딩, `SCENARIOS` 상수, `BASE_CONVERSATION` 상수
- `prompts.ts`: `buildContext()`가 `ALL_DOCUMENTS`/`ALL_CAREER_NOTES` 전체 사용 (페르소나 필터 없음)

- [ ] **Step 1: scenarios.ts — buildScenarios 팩토리 함수로 전환**

`benchmarks/tool-calling/scenarios.ts`를 아래로 교체:

```ts
/**
 * 도구 호출 판단력 벤치마크 — 시나리오 정의
 */

import type { BenchmarkMessage } from "../fixtures/types";
import type { MockPersona } from "../fixtures/mock-data";
import { ALL_PERSONAS, ALL_CONV_STYLES } from "../fixtures/mock-data";

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
  approvalMessage?: string;
}

/**
 * 페르소나 ID로 시나리오 배열을 생성한다.
 * 대화 히스토리는 해당 페르소나의 polite 스타일 앞 4쌍(8개 메시지)을 사용.
 */
export function buildScenarios(personaId: string): ToolCallingScenario[] {
  const persona = ALL_PERSONAS.find((p) => p.id === personaId);
  if (!persona) throw new Error(`Unknown persona: ${personaId}`);

  const convStyles = ALL_CONV_STYLES[personaId];
  if (!convStyles?.polite) throw new Error(`No polite conv style for persona: ${personaId}`);

  const baseConversation: BenchmarkMessage[] = convStyles.polite.slice(0, 8);

  return [
    {
      id: "tc-1",
      name: "새 경험",
      persona,
      messages: [
        ...baseConversation,
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
      persona,
      messages: [
        ...baseConversation,
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
      persona,
      messages: [
        ...baseConversation,
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
      persona,
      messages: [
        ...baseConversation,
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
}

// 하위 호환: 기존 코드에서 참조하는 경우를 위한 sd-1 기본 export
export const SCENARIOS = buildScenarios("sd-1");
export const BASE_CONVERSATION: BenchmarkMessage[] =
  ALL_CONV_STYLES["sd-1"]["polite"].slice(0, 8);
```

- [ ] **Step 2: prompts.ts — buildContext를 persona-aware로 변경**

`benchmarks/tool-calling/prompts.ts`의 `buildContext()` 함수 시그니처와 본문을 수정:

변경 전 (`prompts.ts:14-24`):
```ts
export function buildContext(): string {
  const docsSummary = ALL_DOCUMENTS.map(
    (d) => `[문서: ${d.title}] (ID: ${d.id})\n${d.summary}`
  ).join("\n\n---\n\n")

  const notesSummary = ALL_CAREER_NOTES.map(
    (n) => `[커리어노트: ${n.title}] (ID: ${n.id})\n${n.summary}`
  ).join("\n\n---\n\n")

  return docsSummary + "\n\n---\n\n" + notesSummary
}
```

변경 후:
```ts
export function buildContext(personaId?: string): string {
  const docs = personaId
    ? ALL_DOCUMENTS.filter((d) => d.personaId === personaId)
    : ALL_DOCUMENTS;
  const notes = personaId
    ? ALL_CAREER_NOTES.filter((n) => n.personaId === personaId)
    : ALL_CAREER_NOTES;

  const docsSummary = docs.map(
    (d) => `[문서: ${d.title}] (ID: ${d.id})\n${d.summary}`
  ).join("\n\n---\n\n")

  const notesSummary = notes.map(
    (n) => `[커리어노트: ${n.title}] (ID: ${n.id})\n${n.summary}`
  ).join("\n\n---\n\n")

  return docsSummary + "\n\n---\n\n" + notesSummary
}
```

또한 `JOB_POSTING_TEXT`(`prompts.ts:42-44`)도 persona-aware로 변경하되, 현재 sd-1-ext-1 하드코딩이므로 persona 기반으로 첫 번째 외부문서를 사용하도록 변경:

변경 전:
```ts
const JOB_POSTING_TEXT = ALL_EXTERNAL_DOCUMENTS.find(
  (d) => d.id === "sd-1-ext-1"
)!.extractedText
```

변경 후 — `getJobPostingText` 함수로 추출:
```ts
export function getJobPostingText(personaId?: string): string {
  const doc = personaId
    ? ALL_EXTERNAL_DOCUMENTS.find((d) => d.personaId === personaId)
    : ALL_EXTERNAL_DOCUMENTS.find((d) => d.id === "sd-1-ext-1");
  return doc?.extractedText ?? "";
}
```

이 함수를 사용하는 프롬프트 변형들(`S2`~`S6`)에서 `JOB_POSTING_TEXT` 상수 대신 `getJobPostingText(personaId)`를 호출하도록 변경. `buildSystemPrompt` 시그니처에 `personaId` 추가:

```ts
export interface PromptVariant {
  id: string
  label: string
  buildSystemPrompt: (context: string, personaId?: string) => string
}
```

각 variant의 `buildSystemPrompt`에서 `JOB_POSTING_TEXT` → `getJobPostingText(personaId)` 교체.
S1은 `JOB_POSTING_TEXT`를 사용하지 않으므로 시그니처만 맞추면 됨.
S2~S6의 모든 `buildSystemPrompt` 람다에 `personaId` 파라미터 추가하고, `JOB_POSTING_TEXT` → `getJobPostingText(personaId)` 교체.

- [ ] **Step 3: buildScenarios 테스트 추가**

`benchmarks/tool-calling/__tests__/scenarios.test.ts` (존재하면 추가, 없으면 생성):

```ts
import { describe, it, expect } from "vitest";
import { buildScenarios } from "../scenarios";

describe("buildScenarios", () => {
  it("sd-1으로 4개 시나리오 생성", () => {
    const scenarios = buildScenarios("sd-1");
    expect(scenarios).toHaveLength(4);
    expect(scenarios.map((s) => s.id)).toEqual(["tc-1", "tc-2", "tc-3", "tc-4"]);
    expect(scenarios[0].persona.id).toBe("sd-1");
  });

  it("다른 페르소나로도 생성 가능", () => {
    const scenarios = buildScenarios("jd-3");
    expect(scenarios).toHaveLength(4);
    expect(scenarios[0].persona.id).toBe("jd-3");
    expect(scenarios[0].messages.length).toBeGreaterThan(0);
  });

  it("존재하지 않는 페르소나는 에러", () => {
    expect(() => buildScenarios("invalid-99")).toThrow("Unknown persona");
  });
});
```

- [ ] **Step 4: 기존 + 신규 테스트 실행**

Run: `npx vitest run benchmarks/tool-calling/__tests__/`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add benchmarks/tool-calling/scenarios.ts benchmarks/tool-calling/prompts.ts benchmarks/tool-calling/__tests__/scenarios.test.ts
git commit -m "refactor(benchmark): convert tool-calling scenarios to factory function"
```

---

### Task 6: chat-pipeline scenarios 팩토리 함수 전환

**Files:**
- Modify: `benchmarks/chat-pipeline/scenarios.ts`

현재 상태: `sd-1` 데이터를 모듈 최상위에서 상수로 구성. `sd` 네임스페이스에서 직접 접근.

- [ ] **Step 1: buildScenarios 팩토리 함수 추가**

`benchmarks/chat-pipeline/scenarios.ts`를 아래로 교체:

```ts
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
```

- [ ] **Step 2: buildScenarios 테스트 추가**

`benchmarks/chat-pipeline/__tests__/scenarios.test.ts` (존재하면 추가, 없으면 생성):

```ts
import { describe, it, expect } from "vitest";
import { buildScenarios } from "../scenarios";

describe("buildScenarios", () => {
  it("sd-1으로 6개 시나리오 생성 (3 sizes × 2 strategies)", () => {
    const scenarios = buildScenarios("sd-1");
    expect(scenarios).toHaveLength(6);
    expect(scenarios.map((s) => s.id)).toEqual([
      "small-multistep", "small-classification",
      "medium-multistep", "medium-classification",
      "large-multistep", "large-classification",
    ]);
  });

  it("다른 페르소나로도 생성 가능", () => {
    const scenarios = buildScenarios("jd-3");
    expect(scenarios).toHaveLength(6);
    expect(scenarios[0].persona.id).toBe("jd-3");
  });

  it("존재하지 않는 페르소나는 에러", () => {
    expect(() => buildScenarios("invalid-99")).toThrow("Unknown persona");
  });
});
```

- [ ] **Step 3: 기존 + 신규 테스트 실행**

Run: `npx vitest run benchmarks/chat-pipeline/__tests__/`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add benchmarks/chat-pipeline/scenarios.ts benchmarks/chat-pipeline/__tests__/scenarios.test.ts
git commit -m "refactor(benchmark): convert chat-pipeline scenarios to factory function"
```

---

### Task 7: suite runners에 persona 파라미터 추가

**Files:**
- Modify: `benchmarks/tool-calling/run.ts`
- Modify: `benchmarks/chat-pipeline/run.ts`

- [ ] **Step 1: tool-calling/run.ts — persona 파라미터 추가**

`benchmarks/tool-calling/run.ts` 수정:

1. import 변경: `SCENARIOS` → `buildScenarios`

```ts
// 변경 전
import { SCENARIOS, BASE_CONVERSATION } from "./scenarios";

// 변경 후
import { buildScenarios } from "./scenarios";
import type { ToolCallingScenario } from "./scenarios";
```

2. `runToolCalling` 시그니처 변경:

```ts
// 변경 전
export async function runToolCalling(
  provider: BenchmarkProvider,
  model: string,
  batch: boolean,
): Promise<void> {

// 변경 후
export async function runToolCalling(
  provider: BenchmarkProvider,
  model: string,
  batch: boolean,
  personaId: string = "sd-1",
): Promise<void> {
```

3. 함수 본문 첫 줄에 시나리오 생성 추가:

```ts
const scenarios = buildScenarios(personaId);
```

4. `SCENARIOS` → `scenarios`로 전체 교체 (함수 내 모든 참조)

5. `buildRequests` 함수에 scenarios와 personaId 전달:

```ts
// 변경 전
function buildRequests(model: string): RequestEntry[] {
  const context = buildContext();

// 변경 후
function buildRequests(model: string, scenarios: ToolCallingScenario[], personaId: string): RequestEntry[] {
  const context = buildContext(personaId);
```

호출부도 변경:
```ts
// 변경 전
const entries = buildRequests(model);

// 변경 후
const entries = buildRequests(model, scenarios, personaId);
```

6. `variant.buildSystemPrompt` 호출에 personaId 전달:

```ts
// 변경 전 (run.ts:52)
const baseSystemPrompt = variant.buildSystemPrompt(context);

// 변경 후
const baseSystemPrompt = variant.buildSystemPrompt(context, personaId);
```

7. `SCENARIOS` → `scenarios` 전체 교체 — 함수 내 **모든** 참조를 교체해야 함:
   - `buildRequests` 내 시나리오 순회 (line 50)
   - 콘솔 로그의 시나리오 수 (line 186)
   - 페르소나 정보 (line 375)
   - JSON 출력의 scenarios 배열 (line 397-408)
   - 콘솔 요약 그리드 (line 469)

8. 결과 파일명에 persona 추가:

```ts
// 변경 전
const baseName = `benchmark-result-${date}_${modelSlug}_${mode}`;

// 변경 후
const baseName = `benchmark-result-${date}_${modelSlug}_${personaId}_${mode}`;
```

7. 콘솔 로그에 persona 추가:

```ts
console.log(`  Provider: ${provider.name} | Model: ${model} | Persona: ${personaId} | Mode: ${batch ? "batch" : "realtime"}`);
```

- [ ] **Step 2: chat-pipeline/run.ts — persona 파라미터 추가**

`benchmarks/chat-pipeline/run.ts` 수정:

1. import 변경 — `SCENARIOS` import 제거, `buildScenarios` 추가:

```ts
// 변경 전
import { SCENARIOS, buildContext, scenarioLabel, type ChatPipelineScenario } from "./scenarios";

// 변경 후 (SCENARIOS import 제거 — 함수 내에서 buildScenarios로 생성)
import { buildScenarios, buildContext, scenarioLabel, type ChatPipelineScenario } from "./scenarios";
```

2. `runChatPipeline` 시그니처 변경:

```ts
// 변경 전
export async function runChatPipeline(
  provider: BenchmarkProvider,
  model: string,
  batch: boolean,
): Promise<BenchmarkResult> {

// 변경 후
export async function runChatPipeline(
  provider: BenchmarkProvider,
  model: string,
  batch: boolean,
  personaId: string = "sd-1",
): Promise<BenchmarkResult> {
```

3. 함수 본문 첫 줄에 시나리오 생성:

```ts
const SCENARIOS = buildScenarios(personaId);
```

4. 결과 파일명에 persona 추가:

```ts
// 변경 전
const baseName = `benchmark-result-${date}_${modelSlug}_${mode}`;

// 변경 후
const baseName = `benchmark-result-${date}_${modelSlug}_${personaId}_${mode}`;
```

- [ ] **Step 3: 타입 체크**

Run: `npx vitest run benchmarks/`
Expected: 기존 테스트 PASS (기본값 `"sd-1"`으로 하위 호환)

- [ ] **Step 4: 커밋**

```bash
git add benchmarks/tool-calling/run.ts benchmarks/chat-pipeline/run.ts
git commit -m "feat(benchmark): add persona parameter to suite runners"
```

---

### Task 8: `run.ts` 진입점 — config 로드 + 모델×페르소나 루프

**Files:**
- Modify: `benchmarks/run.ts`

- [ ] **Step 1: run.ts 전체 교체**

`benchmarks/run.ts`를 아래로 교체:

```ts
import "dotenv/config";
import * as path from "node:path";
import {
  parseArgs,
  resolveProvider,
  mergeWithCli,
  validatePersonas,
  loadConfig,
  openaiProvider,
  anthropicProvider,
  googleProvider,
} from "./lib";
import type { BenchmarkProvider, BenchmarkConfig, CliOverrides } from "./lib";
import { runToolCalling } from "./tool-calling/run";
import { runChatPipeline } from "./chat-pipeline/run";

const PROVIDERS: Record<string, BenchmarkProvider> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  google: googleProvider,
};

const SUITES: Record<string, (provider: BenchmarkProvider, model: string, batch: boolean, personaId: string) => Promise<unknown>> = {
  "tool-calling": runToolCalling,
  "chat-pipeline": runChatPipeline,
};

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-5.4-nano",
  anthropic: "claude-haiku-4-5-20251001",
  google: "gemini-3.1-flash-lite-preview",
};

async function main() {
  const cliOpts = parseArgs(process.argv.slice(2));

  // Config 로드 + CLI 머지
  let config: BenchmarkConfig;

  if (cliOpts.configPath) {
    const configPath = path.resolve(cliOpts.configPath);
    const fileConfig = await loadConfig(configPath);

    // CLI에서 명시적으로 설정된 값만 override로 전달
    const argv = process.argv;
    const overrides: CliOverrides = {};
    if (argv.includes("--suite")) overrides.suites = cliOpts.suites as BenchmarkConfig["suites"];
    if (argv.includes("--provider")) overrides.providers = cliOpts.providers as BenchmarkConfig["providers"];
    if (argv.includes("--model")) overrides.models = cliOpts.models;
    if (argv.includes("--persona")) overrides.personas = cliOpts.personas;
    if (argv.includes("--batch")) overrides.batch = cliOpts.batch;

    config = mergeWithCli(fileConfig, overrides);
  } else {
    // config 없이 CLI만 사용
    config = {
      suites: cliOpts.suites as BenchmarkConfig["suites"],
      providers: cliOpts.providers as BenchmarkConfig["providers"],
      models: cliOpts.models,
      personas: cliOpts.personas.length > 0 ? cliOpts.personas : ["sd-1"],
      batch: cliOpts.batch,
    };
  }

  // 페르소나 유효성 검증 + "all" 확장
  const personas = validatePersonas(config.personas);

  // Suite 목록 resolve
  const suiteNames = config.suites === "all"
    ? Object.keys(SUITES)
    : Array.isArray(config.suites) ? config.suites : [config.suites];

  // Providers 필터 resolve
  const allowedProviders = !config.providers || config.providers === "all"
    ? null // 제한 없음
    : new Set(Array.isArray(config.providers) ? config.providers : [config.providers]);

  // Models resolve: 명시된 모델이 없으면, 허용된 provider들의 기본 모델 사용
  let models = config.models;
  if (models.length === 0) {
    if (allowedProviders) {
      models = [...allowedProviders].map((p) => DEFAULT_MODELS[p]).filter(Boolean);
    } else {
      models = Object.values(DEFAULT_MODELS);
    }
  }

  // 실행 루프: suite × model × persona
  for (const suiteName of suiteNames) {
    const suite = SUITES[suiteName];
    if (!suite) {
      console.error(`Unknown suite: ${suiteName}`);
      process.exit(1);
    }

    for (const model of models) {
      const providerName = resolveProvider(model);
      if (!providerName) {
        console.warn(`⚠ Unknown model prefix, skipping: ${model}`);
        continue;
      }

      if (allowedProviders && !allowedProviders.has(providerName)) {
        console.warn(`⚠ Provider "${providerName}" not in allowed list, skipping model: ${model}`);
        continue;
      }

      const provider = PROVIDERS[providerName];
      if (!provider) {
        console.error(`Unknown provider: ${providerName}`);
        continue;
      }

      for (const personaId of personas) {
        console.log(`\n▶ Running ${suiteName} | ${providerName}/${model} | persona: ${personaId} | ${config.batch ? "batch" : "realtime"}\n`);
        await suite(provider, model, config.batch, personaId);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: 타입 체크**

Run: `npx vitest run benchmarks/`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add benchmarks/run.ts
git commit -m "feat(benchmark): config-driven execution with model×persona loop"
```

---

### Task 9: 예시 config 파일 + v1 archive

**Files:**
- Create: `benchmarks/benchmark.config.ts`
- Move: `benchmarks/tool-calling/v1/` → `benchmarks/_archive/tool-calling/v1/`

- [ ] **Step 1: 예시 config 파일 생성**

```ts
// benchmarks/benchmark.config.ts
import type { BenchmarkConfig } from "./lib/config";

export default {
  suites: ["tool-calling"],
  providers: ["openai", "anthropic"],
  models: ["gpt-5.4-nano", "claude-haiku-4-5-20251001"],
  personas: ["sd-1", "jd-3"],
  batch: false,
} satisfies BenchmarkConfig;
```

- [ ] **Step 2: v1 archive 이동**

```bash
mv benchmarks/tool-calling/v1/ benchmarks/_archive/tool-calling/v1/
```

참고: `benchmarks/tool-calling/v1/`은 현재 untracked 상태이므로 이동 후 `_archive/`에 `.gitkeep` 또는 해당 결과 파일을 커밋하거나, `.gitignore`에 추가하여 무시.

- [ ] **Step 3: 커밋**

```bash
git add benchmarks/benchmark.config.ts
git add benchmarks/_archive/tool-calling/v1/
git commit -m "chore(benchmark): add example config file and archive v1 results"
```

---

### Task 10: 전체 통합 테스트

- [ ] **Step 1: 전체 벤치마크 테스트 실행**

Run: `npx vitest run benchmarks/`
Expected: 모든 테스트 PASS

- [ ] **Step 2: CLI dry-run 확인 (API 호출 없이 파싱만)**

Run: `npx tsx benchmarks/run.ts --suite tool-calling --model gpt-5.4-nano --persona sd-1 2>&1 | head -5`
Expected: `▶ Running tool-calling | openai/gpt-5.4-nano | persona: sd-1 | realtime` 출력 (API 키 없으면 에러이지만 파싱/매핑은 정상)

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 컴파일 에러 없음

- [ ] **Step 4: 최종 커밋 (필요 시)**

lint/format 수정이 필요하면 수정 후 커밋.
