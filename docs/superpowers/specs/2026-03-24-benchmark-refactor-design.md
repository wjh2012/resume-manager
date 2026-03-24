# 벤치마크 프레임워크 리팩토링 설계

## 개요

기존 chat-pipeline, tool-calling 벤치마크를 전면 재작성하고, 공통 유틸 라이브러리 + LLM Batch API를 도입하여 비용을 절감한다. 모든 벤치마크는 `benchmarks/fixtures/` mock 데이터를 사용한다.

## 목표

- 공통 인프라(Provider 래퍼, 비용 계산, 리포트 생성)로 새 벤치마크 추가 용이하게
- LLM Batch API로 토큰 비용 50% 절감 (3사 모두)
- 듀얼 모드: 실시간(개발용) / Batch(대규모 실행용) 선택
- 비용 리포트에 Batch 실제 비용 + 역산 실시간 비용 표시

## 디렉토리 구조

```
benchmarks/
├── _archive/                    # 기존 코드 보존
│   ├── chat-pipeline/v1/
│   ├── tool-calling/v1/
│   └── tool-calling/v2/
│
├── fixtures/                    # 기존 유지 (25 페르소나)
│   ├── types.ts
│   ├── mock-data.ts
│   └── personas/
│
├── lib/                         # 공통 유틸
│   ├── providers/
│   │   ├── types.ts             # Provider 공통 인터페이스
│   │   ├── openai.ts            # OpenAI 실시간(AI SDK) + Batch(네이티브)
│   │   ├── anthropic.ts         # Anthropic 실시간(AI SDK) + Batch(네이티브)
│   │   └── google.ts            # Google 실시간(AI SDK) + Batch(네이티브)
│   ├── cost.ts                  # 토큰 가격표 + 비용 계산 + 실시간 역산
│   ├── report.ts                # JSON 저장 + Markdown 리포트 생성
│   ├── cli.ts                   # CLI 옵션 파싱
│   └── index.ts                 # re-export
│
├── chat-pipeline/               # 재작성
│   ├── scenarios.ts
│   ├── evaluate.ts
│   ├── run.ts
│   └── results/
│
├── tool-calling/                # 재작성
│   ├── scenarios.ts
│   ├── prompts.ts
│   ├── evaluate.ts
│   ├── run.ts
│   └── results/
│
└── run.ts                       # 통합 진입점 (npm run bench)
```

## Provider 계층

실시간과 Batch 두 경로를 하나의 인터페이스로 감싼다.

```typescript
// lib/providers/types.ts

/** 단일 요청 정의 */
interface BenchmarkRequest {
  id: string                    // 결과 매칭용 (Batch custom_id로도 사용)
  model: string
  system: string
  messages: ConvMessage[]
  tools?: ToolDefinition[]
  maxSteps?: number
}

/** 단일 응답 */
interface BenchmarkResponse {
  id: string
  model: string
  text: string
  toolCalls: ToolCall[]
  inputTokens: number
  outputTokens: number
  durationMs: number           // Batch는 0 또는 총 대기시간
}

/** Provider 구현체 */
interface BenchmarkProvider {
  name: "openai" | "anthropic" | "google"

  /** 실시간 단건 호출 (Vercel AI SDK) */
  run(req: BenchmarkRequest): Promise<BenchmarkResponse>

  /** Batch 다건 호출 (네이티브 SDK) */
  runBatch(reqs: BenchmarkRequest[]): Promise<BenchmarkResponse[]>
}
```

- `run()`: Vercel AI SDK `generateText()` 사용
- `runBatch()`: 각 Provider 네이티브 SDK로 배치 제출 → 폴링 → 결과 수집

### Batch 실행 흐름

3사 모두 폴링 방식이며 웹훅은 지원하지 않는다.

```
runBatch(requests)
  → Provider별 형식으로 요청 변환
  → 배치 제출 (API 호출)
  → 폴링 루프 (30~60초 간격, 상태 확인, 진행률 출력)
  → 완료 시 결과 수집
  → BenchmarkResponse[]로 정규화해서 반환
```

#### Provider별 Batch 메커니즘

| | OpenAI | Anthropic | Google |
|---|---|---|---|
| **제출** | JSONL 파일 업로드 → `batches.create()` | 인라인 요청 배열 `messages.batches.create()` | 인라인 요청 `batches.create()` |
| **상태 확인** | `batches.retrieve(id)` 폴링 | `messages.batches.retrieve(id)` 폴링 | `batches.get(name)` 폴링 |
| **결과 수신** | output JSONL 파일 다운로드 | `.results()` 스트리밍 이터레이터 | 인라인 응답 on job object |
| **SLA** | 24시간 | 24시간 | 24시간 (48h 만료) |
| **최대 배치** | 50K건 / 200MB | 100K건 / 256MB | 2GB |

## 비용 계산

```typescript
// lib/cost.ts

/** Provider/모델별 토큰 가격 ($/1M tokens, Batch 가격 기준) */
const PRICING: Record<string, { input: number, output: number }> = {
  // OpenAI (Batch 가격)
  "openai:gpt-5.4":       { input: 1.25,  output: 7.50  },
  "openai:gpt-5.4-nano":  { input: 0.10,  output: 0.625 },
  "openai:gpt-4o":        { input: 1.25,  output: 5.00  },
  "openai:gpt-4o-mini":   { input: 0.075, output: 0.30  },
  // Anthropic (Batch 가격)
  "anthropic:haiku-4.5":  { input: 0.50,  output: 2.50  },
  "anthropic:sonnet-4.6": { input: 1.50,  output: 7.50  },
  // Google (Batch 가격)
  "google:gemini-3.1-flash-lite": { input: 0.125, output: 0.75 },
  "google:gemini-3.1-pro":        { input: 1.00,  output: 6.00 },
}

const BATCH_DISCOUNT = 0.5  // 3사 모두 동일: Batch = 실시간 × 0.5

interface CostResult {
  batchCost: number           // 실제 Batch 비용
  realtimeCost: number        // 역산 실시간 비용 (batchCost / BATCH_DISCOUNT)
  savings: number             // realtimeCost - batchCost
  inputTokens: number
  outputTokens: number
}
```

## CLI & 실행 흐름

```typescript
// lib/cli.ts
interface BenchmarkOptions {
  suite: string          // "chat-pipeline" | "tool-calling" | "all"
  provider: string       // "openai" | "anthropic" | "google" | "all"
  model?: string         // 특정 모델 지정 (생략 시 스위트 기본값)
  batch: boolean         // --batch 플래그 (기본: false = 실시간)
}
```

```bash
# package.json
"bench": "tsx benchmarks/run.ts"

# 사용 예시
npm run bench -- --suite chat-pipeline --provider openai --model gpt-5.4
npm run bench -- --suite tool-calling --provider all --batch
npm run bench -- --suite all --provider all --batch
```

### 실행 흐름

```
npm run bench
  → run.ts: CLI 옵션 파싱
  → 해당 스위트의 run.ts 호출
  → 스위트가 시나리오 구성 + BenchmarkRequest[] 생성
  → batch 모드?
      ├─ yes → provider.runBatch(requests)
      └─ no  → Promise.all(requests.map(r => provider.run(r)))
  → 스위트의 evaluate()로 결과 판정
  → lib/cost.ts로 비용 계산
  → lib/report.ts로 JSON + Markdown 저장
```

## 리포트 출력

```typescript
// lib/report.ts

interface BenchmarkResult {
  meta: {
    suite: string
    provider: string
    model: string
    mode: "batch" | "realtime"
    timestamp: string
    totalRuns: number
  }
  results: Array<{
    id: string
    scenario: string
    pass: boolean
    response: BenchmarkResponse
    evaluationDetail: Record<string, unknown>  // 스위트별 자유 형식
  }>
  cost: CostResult
}
```

### 저장 경로

```
benchmarks/<suite>/results/
  ├── benchmark-result-2026-03-24_gpt-5-4_batch.json
  └── benchmark-result-2026-03-24_gpt-5-4_batch.md
```

### Markdown 리포트 예시

```markdown
# chat-pipeline Benchmark Report

- **Model**: gpt-5.4 | **Provider**: openai | **Mode**: batch
- **Date**: 2026-03-24 | **Total Runs**: 12

## Results

| Scenario | Pass | Input Tokens | Output Tokens | Duration |
|----------|------|-------------|---------------|----------|
| Small    | ✅   | 3,552       | 755           | 5,640ms  |
| Medium   | ❌   | 5,120       | 1,200         | 8,320ms  |

**Pass Rate: 8/12 (66.7%)**

## Cost

| | Batch (실제) | Realtime (역산) | 절감액 |
|---|---|---|---|
| Input  | $0.0044 | $0.0088 | $0.0044 |
| Output | $0.0057 | $0.0114 | $0.0057 |
| **Total** | **$0.0101** | **$0.0202** | **$0.0101** |
```

## 벤치마크 재작성: chat-pipeline

기존 v1의 "Multistep Tool Loop vs 1-Step Classification" 비교를 새 인프라 위에 재작성.

```typescript
// benchmarks/chat-pipeline/scenarios.ts
interface ChatPipelineScenario {
  id: string
  persona: MockPersona
  documents: MockDocument[]
  externalDocs: MockExternalDocument[]
  careerNotes: MockCareerNote[]
  userMessages: ConvMessage[]       // 페르소나별 대화 스타일
  strategy: "multistep" | "classification"
}
```

```typescript
// benchmarks/chat-pipeline/evaluate.ts
interface ChatPipelineEvaluation {
  documentSelectionCorrect: boolean   // 올바른 문서를 선택했는가
  responseQualityMetrics: {           // 응답에 핵심 정보가 포함되었는가
    keyFactsFound: string[]
    keyFactsMissed: string[]
  }
  toolCallCount: number              // 효율성
}
```

### 기존 대비 변경점

- mock 데이터를 `fixtures/`에서 import (이미 이전 완료)
- Provider별 파일(openai.ts, anthropic.ts, google.ts) 제거 → `run.ts` 하나로 통합
- 결과 저장/리포트는 `lib/report.ts`에 위임

## 벤치마크 재작성: tool-calling

기존 v1(S1~S5) + v2(S4~S6, precheck) 통합 재작성.

```typescript
// benchmarks/tool-calling/prompts.ts
type PromptVariant = "S1" | "S2" | "S3" | "S4" | "S5" | "S6"

function buildSystemPrompt(variant: PromptVariant, precheckHint?: string): string
function classifyMessage(message: string): PrecheckCategory  // S6용
```

```typescript
// benchmarks/tool-calling/scenarios.ts
interface ToolCallingScenario {
  id: string
  name: string                        // "새 경험" | "숫자 변경" | "초안 요청" | "일반 질문"
  persona: MockPersona
  messages: ConvMessage[]             // 멀티턴 포함 (proposal → approval)
  expectedTools: string[]             // 정답 도구
  allowedTools: string[]
  expectedOrder?: [string, string][]  // 순서 검증
}
```

```typescript
// benchmarks/tool-calling/evaluate.ts
interface ToolCallingEvaluation {
  pass: boolean
  toolCallsCorrect: boolean
  proposalDetected: boolean           // 제안 감지 여부
  turn2Executed: boolean              // 2턴 실행 여부
  overCall: boolean                   // 불필요한 도구 호출
  underCall: boolean                  // 필요한 도구 미호출
}
```

### 기존 대비 변경점

- v1/v2 분리 제거 → 하나의 tool-calling으로 통합
- S1~S6 전체를 한 번에 실행 가능
- Provider별 파일 제거 → `run.ts` 하나, CLI에서 Provider/모델 선택
- `runner.ts`의 `judgePass()`, `detectProposal()` 로직은 `evaluate.ts`로 이동

## 추가 패키지 (devDependencies)

| 패키지 | 용도 |
|---|---|
| `openai` | OpenAI Batch API 네이티브 SDK |
| `@anthropic-ai/sdk` | Anthropic Message Batches 네이티브 SDK |
| `@google/genai` | Google Gemini Batch API 네이티브 SDK |

## 설계 원칙

- **느슨한 규격**: 공통 유틸(`lib/`)만 제공, 벤치마크 구조는 자유
- **듀얼 모드**: `--batch` 플래그로 실시간/Batch 선택, 기본은 실시간
- **비용 투명성**: 모든 리포트에 Batch 실제 비용 + 역산 실시간 비용 표시
- **3사 통일 할인율**: Batch = 실시간 × 0.5 (OpenAI, Anthropic, Google 모두 50% 할인)
