# Deterministic Routing 벤치마크 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** LLM에게 도구 호출을 맡기는 대신 structured output으로 의도를 분류(routing)시키는 방식의 정확도를 벤치마크한다. 기존 tool-calling 벤치마크와 동일한 시나리오(tc-1~4)·페르소나(25개)를 사용하여 직접 비교 가능한 결과를 생성한다.

**Architecture:** 새 벤치마크 스위트 `deterministic-routing/`를 추가한다. Vercel AI SDK의 `generateText` + `Output.object`를 사용해 Zod 스키마 기반 structured output을 받고, 분류 결과의 정확도를 평가한다. 기존 인프라(config, provider, cost, report, fixtures)를 100% 재사용한다.

**Tech Stack:** TypeScript, Vercel AI SDK (`generateText`, `Output.object`), Zod, 기존 벤치마크 인프라

---

## 핵심 차이: tool-calling vs deterministic-routing

```
tool-calling:    LLM → 도구 직접 호출 → 호출 내역으로 평가
routing:         LLM → JSON 분류 출력 → 분류 정확도로 평가
```

동일 시나리오, 동일 페르소나, 동일 모델이므로 결과를 나란히 비교할 수 있다.

---

## 파일 구조

```
benchmarks/deterministic-routing/
  schema.ts        ← 라우팅 Zod 스키마 정의
  scenarios.ts     ← tc-1~4 시나리오 + 기대 분류 결과
  prompts.ts       ← R1~R4 프롬프트 변형
  evaluate.ts      ← 분류 정확도 평가 로직
  run.ts           ← 오케스트레이터 (generateText + Output.object)
  __tests__/
    evaluate.test.ts
    scenarios.test.ts
```

수정 파일:
- `benchmarks/run.ts` — SUITES에 `deterministic-routing` 등록
- `benchmarks/lib/config.ts` — `BenchmarkConfig.suites` 타입에 `"deterministic-routing"` 추가
- `benchmarks/lib/providers/types.ts` — `BenchmarkRequest`에 `outputSchema?` 필드 추가
- `benchmarks/lib/providers/openai.ts` — structured output 지원 추가

---

### Task 1: Provider에 structured output 지원 추가

**Files:**
- Modify: `benchmarks/lib/providers/types.ts`
- Modify: `benchmarks/lib/providers/openai.ts`

`BenchmarkRequest`에 `outputSchema` 옵션을 추가하고, provider의 `run()`에서 schema가 있으면 `Output.object`로 실행한다. 응답의 `text`에 JSON 문자열이 들어간다.

- [ ] **Step 1: types.ts에 outputSchema 필드 추가**

`benchmarks/lib/providers/types.ts`의 `BenchmarkRequest`에 추가:

```typescript
import type { z } from "zod";

export interface BenchmarkRequest {
  id: string;
  model: string;
  system: string;
  messages: BenchmarkMessage[];
  tools?: BenchmarkToolDef[];
  maxSteps?: number;
  outputSchema?: z.ZodType;  // structured output용 Zod 스키마
}
```

- [ ] **Step 2: openai provider에 structured output 분기 추가**

`benchmarks/lib/providers/openai.ts`의 `run()` 함수에서:

```typescript
import { generateText, Output } from "ai";

async function run(req: BenchmarkRequest): Promise<BenchmarkResponse> {
  const openai = getClient();
  const start = Date.now();

  if (req.outputSchema) {
    // Structured output 모드: 도구 없이 JSON 분류 결과만 받음
    const result = await generateText({
      model: openai(req.model),
      system: req.system,
      messages: convertMessages(req.messages),
      output: Output.object({ schema: req.outputSchema }),
    });

    if (!result.output) {
      throw new Error(`Structured output이 비어있습니다: ${req.id}`);
    }

    const durationMs = Date.now() - start;
    return {
      id: req.id,
      model: req.model,
      text: JSON.stringify(result.output),
      toolCalls: [],
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      durationMs,
    };
  }

  // 기존 tool-calling 모드 (변경 없음)
  // ...
}
```

- [ ] **Step 3: 커밋**

```bash
git add benchmarks/lib/providers/types.ts benchmarks/lib/providers/openai.ts
git commit -m "feat(benchmark): provider에 structured output (outputSchema) 지원 추가"
```

---

### Task 2: 라우팅 스키마 정의

**Files:**
- Create: `benchmarks/deterministic-routing/schema.ts`

4개 시나리오의 분류 결과를 표현하는 Zod 스키마. 프로덕션 `lib/ai/pipeline/schema.ts`의 `coverLetterClassificationSchema`를 확장하되, `saveCareerNote` 판단과 `careerNotesToRead`를 추가한다.

- [ ] **Step 1: schema.ts 작성**

```typescript
import { z } from "zod";

/**
 * Deterministic Routing 벤치마크용 분류 스키마.
 *
 * LLM이 사용자 메시지를 보고 "어떤 데이터가 필요하고, 어떤 액션이 필요한지"를
 * structured output으로 판단한다.
 */
export const routingSchema = z.object({
  /** 전문을 읽어야 할 문서 ID 목록. 요약만으로 충분하면 빈 배열. */
  documentsToRead: z.array(z.string())
    .describe("전문을 읽어야 할 문서 ID 목록. 요약만으로 충분하면 빈 배열."),

  /** 전문을 읽어야 할 커리어노트 ID 목록. 수정 전 확인이 필요할 때 사용. */
  careerNotesToRead: z.array(z.string())
    .describe("전문을 읽어야 할 커리어노트 ID 목록. 수정이 필요할 때 기존 내용 확인용."),

  /** 새 경험 저장 또는 기존 노트 수정이 필요하면 true. */
  saveCareerNote: z.boolean()
    .describe("커리어노트 저장/수정이 필요하면 true."),
});

export type RoutingClassification = z.infer<typeof routingSchema>;
```

- [ ] **Step 2: 커밋**

```bash
git add benchmarks/deterministic-routing/schema.ts
git commit -m "feat(benchmark): deterministic-routing 분류 스키마 정의"
```

---

### Task 3: 시나리오 정의

**Files:**
- Create: `benchmarks/deterministic-routing/scenarios.ts`

tool-calling의 `buildScenarios`를 기반으로 하되, `expected`를 `RoutingClassification` 형태로 변환한다.

tc-2의 `careerNotesToRead` 기대값은 해당 페르소나의 deploy-ez 관련 노트 ID를 동적으로 찾는다. sd-1의 경우 `sd-1-note-4` (GitOps 기반 배포 자동화 — deploy-ez 관련). 다른 페르소나는 컨텍스트에 deploy-ez가 없으므로 빈 배열이 정답 — 이 경우 `saveCareerNote`만 true면 pass로 처리한다.

- [ ] **Step 1: scenarios.ts 작성**

```typescript
import type { BenchmarkMessage } from "../fixtures/types";
import type { MockPersona } from "../fixtures/mock-data";
import type { RoutingClassification } from "./schema";
import { ALL_PERSONAS, ALL_CONV_STYLES, ALL_CAREER_NOTES } from "../fixtures/mock-data";

export interface RoutingExpectation {
  /** 정확히 일치해야 하는 필드 */
  exact?: Partial<RoutingClassification>;
  /** 최소 조건: 이 조건만 만족하면 pass */
  atLeast?: Partial<RoutingClassification>;
  /** 비어있으면 안 되는 배열 필드 */
  nonEmpty?: Array<"documentsToRead" | "careerNotesToRead">;
}

export interface RoutingScenario {
  id: string;
  name: string;
  persona: MockPersona;
  messages: BenchmarkMessage[];
  expected: RoutingExpectation;
}

/**
 * tc-2에서 "deploy-ez" 관련 노트 ID를 찾는다.
 * 해당 페르소나에 deploy-ez 관련 노트가 없으면 빈 배열.
 */
function findDeployEzNoteIds(personaId: string): string[] {
  return ALL_CAREER_NOTES
    .filter((n) => n.personaId === personaId)
    .filter((n) => {
      const text = `${n.title} ${n.summary} ${n.content}`.toLowerCase();
      return text.includes("deploy-ez") || text.includes("deploy");
    })
    .map((n) => n.id);
}

export function buildScenarios(personaId: string): RoutingScenario[] {
  const persona = ALL_PERSONAS.find((p) => p.id === personaId);
  if (!persona) throw new Error(`Unknown persona: ${personaId}`);

  const convStyles = ALL_CONV_STYLES[personaId];
  if (!convStyles?.polite) throw new Error(`No polite conv style: ${personaId}`);

  const baseConversation: BenchmarkMessage[] = convStyles.polite.slice(0, 8);
  const deployEzNoteIds = findDeployEzNoteIds(personaId);

  return [
    {
      id: "tc-1",
      name: "새 경험",
      persona,
      messages: [
        ...baseConversation,
        { role: "user", content: "작년에 Rust로 고성능 메시지 큐 만들었는데 초당 50만 건 처리했어" },
      ],
      expected: {
        exact: {
          documentsToRead: [],
          careerNotesToRead: [],
          saveCareerNote: true,
        },
      },
    },
    {
      id: "tc-2",
      name: "수치 변경",
      persona,
      messages: [
        ...baseConversation,
        { role: "user", content: "아 그 deploy-ez Stars가 450개가 아니라 800개로 늘었어" },
      ],
      expected: deployEzNoteIds.length > 0
        ? {
            // deploy-ez 노트가 있는 페르소나: 노트 읽기 + 저장 필요
            atLeast: { saveCareerNote: true },
            exact: { documentsToRead: [] },
          }
        : {
            // deploy-ez 노트가 없는 페르소나: 최소한 저장 의도는 있어야 함
            atLeast: { saveCareerNote: true },
          },
    },
    {
      id: "tc-3",
      name: "초안 요청",
      persona,
      messages: [
        ...baseConversation,
        { role: "user", content: "deploy-ez 프로젝트 중심으로 핵심역량 써줘" },
      ],
      expected: {
        atLeast: {
          saveCareerNote: false,
        },
        nonEmpty: ["documentsToRead"],
      },
    },
    {
      id: "tc-4",
      name: "단순 질문",
      persona,
      messages: [
        ...baseConversation,
        { role: "user", content: "자소서 분량은 보통 얼마나 돼?" },
      ],
      expected: {
        exact: {
          documentsToRead: [],
          careerNotesToRead: [],
          saveCareerNote: false,
        },
      },
    },
  ];
}
```

- [ ] **Step 2: 테스트 작성**

Create: `benchmarks/deterministic-routing/__tests__/scenarios.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { buildScenarios } from "../scenarios";

describe("buildScenarios", () => {
  it("sd-1 기준 4개 시나리오 생성", () => {
    const scenarios = buildScenarios("sd-1");
    expect(scenarios).toHaveLength(4);
    expect(scenarios.map((s) => s.id)).toEqual(["tc-1", "tc-2", "tc-3", "tc-4"]);
  });

  it("tc-1 새 경험: saveCareerNote true 기대", () => {
    const scenarios = buildScenarios("sd-1");
    const tc1 = scenarios.find((s) => s.id === "tc-1")!;
    expect(tc1.expected.exact?.saveCareerNote).toBe(true);
  });

  it("tc-4 단순 질문: 모든 필드 빈값/false 기대", () => {
    const scenarios = buildScenarios("sd-1");
    const tc4 = scenarios.find((s) => s.id === "tc-4")!;
    expect(tc4.expected.exact).toEqual({
      documentsToRead: [],
      careerNotesToRead: [],
      saveCareerNote: false,
    });
  });

  it("알 수 없는 페르소나 → 에러", () => {
    expect(() => buildScenarios("unknown")).toThrow();
  });
});
```

- [ ] **Step 3: 테스트 실행**

Run: `npx vitest run benchmarks/deterministic-routing/__tests__/scenarios.test.ts`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add benchmarks/deterministic-routing/scenarios.ts benchmarks/deterministic-routing/__tests__/scenarios.test.ts
git commit -m "feat(benchmark): deterministic-routing 시나리오 정의 + 테스트"
```

---

### Task 4: 평가 로직

**Files:**
- Create: `benchmarks/deterministic-routing/evaluate.ts`
- Create: `benchmarks/deterministic-routing/__tests__/evaluate.test.ts`

분류 결과(JSON)를 기대값과 비교하여 pass/fail을 판정한다.

- [ ] **Step 1: evaluate.ts 작성**

```typescript
import type { RoutingClassification } from "./schema";
import type { RoutingExpectation } from "./scenarios";

export interface RoutingEvaluation {
  pass: boolean;
  details: {
    documentsToReadCorrect: boolean;
    careerNotesToReadCorrect: boolean;
    saveCareerNoteCorrect: boolean;
  };
  actual: RoutingClassification;
}

export function evaluateRouting(
  actual: RoutingClassification,
  expected: RoutingExpectation,
): RoutingEvaluation {
  let documentsToReadCorrect = true;
  let careerNotesToReadCorrect = true;
  let saveCareerNoteCorrect = true;

  // exact 필드 비교
  if (expected.exact) {
    if (expected.exact.documentsToRead !== undefined) {
      documentsToReadCorrect = arraysEqual(
        actual.documentsToRead,
        expected.exact.documentsToRead,
      );
    }
    if (expected.exact.careerNotesToRead !== undefined) {
      careerNotesToReadCorrect = arraysEqual(
        actual.careerNotesToRead,
        expected.exact.careerNotesToRead,
      );
    }
    if (expected.exact.saveCareerNote !== undefined) {
      saveCareerNoteCorrect = actual.saveCareerNote === expected.exact.saveCareerNote;
    }
  }

  // atLeast 필드 비교 (최소 조건)
  if (expected.atLeast) {
    if (expected.atLeast.saveCareerNote !== undefined) {
      saveCareerNoteCorrect = actual.saveCareerNote === expected.atLeast.saveCareerNote;
    }
    if (expected.atLeast.documentsToRead !== undefined) {
      documentsToReadCorrect = expected.atLeast.documentsToRead.every(
        (id) => actual.documentsToRead.includes(id),
      );
    }
    if (expected.atLeast.careerNotesToRead !== undefined) {
      careerNotesToReadCorrect = expected.atLeast.careerNotesToRead.every(
        (id) => actual.careerNotesToRead.includes(id),
      );
    }
  }

  // nonEmpty 필드 비교: 해당 배열이 비어있으면 fail
  if (expected.nonEmpty) {
    for (const field of expected.nonEmpty) {
      if (actual[field].length === 0) {
        if (field === "documentsToRead") documentsToReadCorrect = false;
        if (field === "careerNotesToRead") careerNotesToReadCorrect = false;
      }
    }
  }

  const pass = documentsToReadCorrect && careerNotesToReadCorrect && saveCareerNoteCorrect;

  return {
    pass,
    details: { documentsToReadCorrect, careerNotesToReadCorrect, saveCareerNoteCorrect },
    actual,
  };
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}
```

- [ ] **Step 2: 테스트 작성**

```typescript
import { describe, it, expect } from "vitest";
import { evaluateRouting } from "../evaluate";

describe("evaluateRouting", () => {
  it("tc-1: saveCareerNote true → pass", () => {
    const result = evaluateRouting(
      { documentsToRead: [], careerNotesToRead: [], saveCareerNote: true },
      { exact: { documentsToRead: [], careerNotesToRead: [], saveCareerNote: true } },
    );
    expect(result.pass).toBe(true);
  });

  it("tc-1: saveCareerNote false → fail", () => {
    const result = evaluateRouting(
      { documentsToRead: [], careerNotesToRead: [], saveCareerNote: false },
      { exact: { documentsToRead: [], careerNotesToRead: [], saveCareerNote: true } },
    );
    expect(result.pass).toBe(false);
    expect(result.details.saveCareerNoteCorrect).toBe(false);
  });

  it("tc-2: atLeast saveCareerNote true → pass", () => {
    const result = evaluateRouting(
      { documentsToRead: [], careerNotesToRead: ["note-1"], saveCareerNote: true },
      { atLeast: { saveCareerNote: true }, exact: { documentsToRead: [] } },
    );
    expect(result.pass).toBe(true);
  });

  it("nonEmpty: documentsToRead 비어있으면 fail", () => {
    const result = evaluateRouting(
      { documentsToRead: [], careerNotesToRead: [], saveCareerNote: false },
      { atLeast: { saveCareerNote: false }, nonEmpty: ["documentsToRead"] },
    );
    expect(result.pass).toBe(false);
    expect(result.details.documentsToReadCorrect).toBe(false);
  });

  it("nonEmpty: documentsToRead 있으면 pass", () => {
    const result = evaluateRouting(
      { documentsToRead: ["doc-1"], careerNotesToRead: [], saveCareerNote: false },
      { atLeast: { saveCareerNote: false }, nonEmpty: ["documentsToRead"] },
    );
    expect(result.pass).toBe(true);
  });

  it("tc-4: 모두 비어있음 → pass", () => {
    const result = evaluateRouting(
      { documentsToRead: [], careerNotesToRead: [], saveCareerNote: false },
      { exact: { documentsToRead: [], careerNotesToRead: [], saveCareerNote: false } },
    );
    expect(result.pass).toBe(true);
  });

  it("tc-4: 불필요한 도구 분류 → fail", () => {
    const result = evaluateRouting(
      { documentsToRead: ["doc-1"], careerNotesToRead: [], saveCareerNote: false },
      { exact: { documentsToRead: [], careerNotesToRead: [], saveCareerNote: false } },
    );
    expect(result.pass).toBe(false);
  });
});
```

- [ ] **Step 3: 테스트 실행**

Run: `npx vitest run benchmarks/deterministic-routing/__tests__/evaluate.test.ts`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add benchmarks/deterministic-routing/evaluate.ts benchmarks/deterministic-routing/__tests__/evaluate.test.ts
git commit -m "feat(benchmark): deterministic-routing 평가 로직 + 테스트"
```

---

### Task 5: 프롬프트 변형

**Files:**
- Create: `benchmarks/deterministic-routing/prompts.ts`

tool-calling의 S1~S6에 대응하는 4개 변형. LLM에게 분류 스키마 + 참고자료 요약을 주고 structured output을 유도한다.

- [ ] **Step 1: prompts.ts 작성**

```typescript
import { getJobPostingText } from "../tool-calling/prompts";
export { buildContext } from "../tool-calling/prompts";

export interface RoutingPromptVariant {
  id: string;
  label: string;
  buildSystemPrompt: (context: string, personaId?: string) => string;
}

/**
 * R1: 최소 — 스키마 설명 없이 context만 제공
 */
const R1: RoutingPromptVariant = {
  id: "R1",
  label: "최소",
  buildSystemPrompt: (context, personaId) => `당신은 자기소개서 작성 도우미의 의도 분류기입니다.
사용자 메시지를 보고 어떤 데이터 접근과 액션이 필요한지 판단하세요.

[채용공고]
${getJobPostingText(personaId)}

[참고자료]
${context}`,
};

/**
 * R2: 필드별 가이드 — 각 필드의 의미와 판단 기준을 설명
 */
const R2: RoutingPromptVariant = {
  id: "R2",
  label: "필드별 가이드",
  buildSystemPrompt: (context, personaId) => `당신은 자기소개서 작성 도우미의 의도 분류기입니다.
사용자 메시지를 보고 어떤 데이터 접근과 액션이 필요한지 판단하세요.

판단 기준:
- documentsToRead: 초안 작성이나 구체적 사례가 필요할 때 관련 문서 ID를 선택. 단순 질문이면 빈 배열.
- careerNotesToRead: 기존 기록의 수치 변경/수정이 필요할 때 해당 노트 ID를 선택. 새 경험이면 빈 배열.
- saveCareerNote: 새 경험/성과를 언급하거나, 기존 기록의 수정이 필요하면 true. 단순 질문이나 초안 작성만이면 false.

[채용공고]
${getJobPostingText(personaId)}

[참고자료]
${context}`,
};

/**
 * R3: few-shot — R2 + 판단 예시 4개
 */
const R3: RoutingPromptVariant = {
  id: "R3",
  label: "few-shot",
  buildSystemPrompt: (context, personaId) => `당신은 자기소개서 작성 도우미의 의도 분류기입니다.
사용자 메시지를 보고 어떤 데이터 접근과 액션이 필요한지 판단하세요.

판단 기준:
- documentsToRead: 초안 작성이나 구체적 사례가 필요할 때 관련 문서 ID를 선택. 단순 질문이면 빈 배열.
- careerNotesToRead: 기존 기록의 수치 변경/수정이 필요할 때 해당 노트 ID를 선택. 새 경험이면 빈 배열.
- saveCareerNote: 새 경험/성과를 언급하거나, 기존 기록의 수정이 필요하면 true. 단순 질문이나 초안 작성만이면 false.

[판단 예시]
1. "작년에 AWS 마이그레이션 리드했어"
   → { documentsToRead: [], careerNotesToRead: [], saveCareerNote: true }
   이유: 참고자료에 없는 새 경험 → 저장 필요

2. "성능 개선은 40%가 아니라 60%였어"
   → { documentsToRead: [], careerNotesToRead: ["관련-노트-ID"], saveCareerNote: true }
   이유: 기존 기록의 수치 변경 → 노트 확인 후 수정 필요

3. "핵심역량 써줘"
   → { documentsToRead: ["관련-문서-ID"], careerNotesToRead: [], saveCareerNote: false }
   이유: 초안 작성에 원문 필요 → 문서 읽기

4. "자소서 분량은 보통 얼마나 돼?"
   → { documentsToRead: [], careerNotesToRead: [], saveCareerNote: false }
   이유: 일반 질문 → 데이터 접근 불필요

[채용공고]
${getJobPostingText(personaId)}

[참고자료]
${context}`,
};

/**
 * R4: 단계별 의사결정 — if/else 체인으로 판단 과정을 명시
 */
const R4: RoutingPromptVariant = {
  id: "R4",
  label: "단계별 판단",
  buildSystemPrompt: (context, personaId) => `당신은 자기소개서 작성 도우미의 의도 분류기입니다.
사용자 메시지를 보고 어떤 데이터 접근과 액션이 필요한지 판단하세요.

다음 순서대로 판단하세요:

1단계: saveCareerNote 판단
  - 사용자가 참고자료에 없는 새 경험/성과/수치를 언급했는가? → true
  - 기존 기록과 다른 수치를 언급했는가? → true
  - 위에 해당하지 않으면 → false

2단계: careerNotesToRead 판단
  - saveCareerNote가 true이고, 기존 커리어노트의 수정이 필요한 경우 → 해당 노트 ID 선택
  - 완전히 새로운 경험이면 → 빈 배열

3단계: documentsToRead 판단
  - 초안/문단 작성이 필요한가? → 관련 문서 ID 선택
  - 구체적 수치나 사례를 인용해야 하는가? → 관련 문서 ID 선택
  - 위에 해당하지 않으면 → 빈 배열

[채용공고]
${getJobPostingText(personaId)}

[참고자료]
${context}`,
};

export const ROUTING_PROMPT_VARIANTS: RoutingPromptVariant[] = [R1, R2, R3, R4];
```

- [ ] **Step 2: 커밋**

```bash
git add benchmarks/deterministic-routing/prompts.ts
git commit -m "feat(benchmark): deterministic-routing 프롬프트 변형 R1~R4"
```

---

### Task 6: 오케스트레이터

**Files:**
- Create: `benchmarks/deterministic-routing/run.ts`

tool-calling/run.ts 패턴을 따르되, 도구 없이 structured output으로 분류 결과만 받는다. 2턴 로직은 불필요 (분류는 단일 요청).

- [ ] **Step 1: run.ts 작성**

```typescript
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
  // 실행 (Realtime만 — structured output은 batch API 미지원)
  // -----------------------------------------------------------------------

  // structured output 지원 provider 검증
  const SUPPORTED_PROVIDERS = new Set(["openai"]);
  if (!SUPPORTED_PROVIDERS.has(provider.name)) {
    throw new Error(
      `Deterministic Routing은 structured output이 필요합니다. ` +
      `현재 "${provider.name}"은 미지원. 지원 provider: ${[...SUPPORTED_PROVIDERS].join(", ")}`,
    );
  }

  if (batch) {
    console.warn("  ⚠ Deterministic Routing은 structured output을 사용하므로 batch 모드 미지원. realtime으로 실행합니다.");
  }

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
```

- [ ] **Step 2: 커밋**

```bash
git add benchmarks/deterministic-routing/run.ts
git commit -m "feat(benchmark): deterministic-routing 오케스트레이터"
```

---

### Task 7: 메인 러너에 스위트 등록

**Files:**
- Modify: `benchmarks/run.ts`
- Modify: `benchmarks/lib/config.ts`

- [ ] **Step 1: config.ts의 suites 타입 확장**

`benchmarks/lib/config.ts`의 `BenchmarkConfig.suites` 유니온에 `"deterministic-routing"` 추가:

```typescript
export interface BenchmarkConfig {
  suites: "all" | Array<"tool-calling" | "chat-pipeline" | "deterministic-routing">;
  // ...
}
```

- [ ] **Step 2: run.ts에 import + SUITES 등록**

`benchmarks/run.ts`에 `runDeterministicRouting`을 import하고 SUITES에 등록:

```typescript
import { runDeterministicRouting } from "./deterministic-routing/run";

const SUITES = {
  "tool-calling": runToolCalling,
  "chat-pipeline": runChatPipeline,
  "deterministic-routing": runDeterministicRouting,
};
```

- [ ] **Step 3: 커밋**

```bash
git add benchmarks/run.ts benchmarks/lib/config.ts
git commit -m "feat(benchmark): deterministic-routing 스위트를 메인 러너에 등록"
```

---

### Task 8: results 디렉토리 + .gitkeep

**Files:**
- Create: `benchmarks/deterministic-routing/results/.gitkeep`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p benchmarks/deterministic-routing/results
touch benchmarks/deterministic-routing/results/.gitkeep
```

- [ ] **Step 2: 커밋**

```bash
git add benchmarks/deterministic-routing/results/.gitkeep
git commit -m "chore: deterministic-routing results 디렉토리 추가"
```

---

### Task 9: 스모크 테스트 — 단일 페르소나로 실행

- [ ] **Step 1: sd-1 페르소나, gpt-5.4-nano로 실행**

```bash
npx tsx benchmarks/run.ts --suite deterministic-routing --model gpt-5.4-nano --persona sd-1
```

Expected: 16 runs (4 시나리오 × 4 변형) 완료, JSON 파일 생성, 콘솔 그리드 출력.

- [ ] **Step 2: 결과 확인 및 버그 수정**

JSON 파일을 열어 pass/fail 패턴을 확인한다. 평가 로직 버그가 있으면 수정.

- [ ] **Step 3: 수정사항 있으면 커밋**

```bash
git add -A benchmarks/deterministic-routing/
git commit -m "fix(benchmark): deterministic-routing 스모크 테스트 피드백 반영"
```
