# Token Usage Core + User Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI API 호출의 토큰 사용량을 기록하고, 사용자에게 사용 현황 대시보드를 제공한다.

**Architecture:** Prisma 스키마에 TokenUsageLog, ModelPricing, Quota 모델 추가. `getLanguageModel()`이 `isServerKey`, `provider`, `modelId`를 함께 반환하도록 수정. 각 AI 호출 지점(커버레터, 면접, 인사이트, 임베딩)에서 `recordUsage()`로 토큰 기록. 사용자 대시보드는 Recharts로 차트 표시.

**Tech Stack:** Prisma, Vercel AI SDK v6 (`onFinish`, `usage`), Recharts, Zod, Vitest

**Spec:** `docs/superpowers/specs/2026-03-21-token-usage-tracking-design.md`

**Branch:** `feature/token-usage-core` (base: `develop`)

**Spec deviations:** TokenUsageLog와 ModelPricing의 `provider` 필드는 스펙에서 enum이지만, `types/ai.ts`의 `AIProvider` 타입과 동기화 부담을 줄이기 위해 Prisma에서는 `String`으로 정의한다. Zod 검증에서 enum 제약을 건다.

---

## File Structure

### New Files

| Path | Responsibility |
|------|---------------|
| `lib/token-usage/service.ts` | `recordUsage()`, `getUserUsage()`, `getUserUsageSummary()` |
| `lib/token-usage/pricing.ts` | `calculateCost()`, `getCurrentPricing()` |
| `lib/token-usage/quota.ts` | `checkQuotaExceeded()`, `getUserQuotas()`, `QuotaExceededError` |
| `lib/validations/token-usage.ts` | Zod schemas for token usage query params |
| `app/api/token-usage/route.ts` | GET — 사용자 사용량 목록 (커서 페이지네이션) |
| `app/api/token-usage/summary/route.ts` | GET — 사용자 요약 통계 |
| `app/(dashboard)/usage/page.tsx` | 사용자 사용량 대시보드 페이지 |
| `components/usage/summary-cards.tsx` | 상단 요약 카드 (토큰/비용/요청 수) |
| `components/usage/daily-chart.tsx` | 일별 추이 라인 차트 |
| `components/usage/feature-chart.tsx` | 기능별 비중 도넛 차트 |
| `components/usage/model-chart.tsx` | 모델별 비교 바 차트 |
| `components/usage/period-filter.tsx` | 기간 필터 컴포넌트 |
| `components/usage/quota-progress.tsx` | Quota 프로그레스 바 |
| `prisma/seed.ts` | ModelPricing 시드 데이터 |
| `tests/lib/token-usage/service.test.ts` | service 단위 테스트 |
| `tests/lib/token-usage/pricing.test.ts` | pricing 단위 테스트 |
| `tests/lib/token-usage/quota.test.ts` | quota 단위 테스트 |

### Modified Files

| Path | Change |
|------|--------|
| `prisma/schema.prisma` | TokenUsageLog, ModelPricing, Quota 모델 + enum 추가 |
| `lib/ai/provider.ts` | `getLanguageModel()` 반환 타입에 `isServerKey`, `provider`, `modelId` 추가 |
| `lib/ai/embedding.ts` | `generateEmbeddings()`에서 usage 반환 |
| `lib/insights/service.ts` | `generateObject()` usage 캡처 + `recordUsage()` 호출 + quota 체크 |
| `app/api/chat/cover-letter/route.ts` | `onFinish`에서 `recordUsage()` 호출 + quota 체크 |
| `app/api/chat/interview/route.ts` | `onFinish`에서 `recordUsage()` 호출 + quota 체크 |
| `app/api/insights/extract/route.ts` | `QuotaExceededError` 핸들링 추가 |
| `lib/documents/service.ts` | 임베딩 후 `recordUsage()` 호출 |
| `lib/config/navigation.ts` | "사용량" 메뉴 항목 추가 |
| `package.json` | recharts 의존성 + prisma.seed 설정 추가 |

---

## Task 1: Prisma 스키마 확장

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: enum 추가**

`schema.prisma` 파일 상단 enum 섹션에 추가:

```prisma
enum UsageFeature {
  COVER_LETTER
  INTERVIEW
  INSIGHT
  EMBEDDING
}

enum LimitType {
  TOKENS
  COST
  REQUESTS
}

enum LimitPeriod {
  DAILY
  MONTHLY
}

enum UserRole {
  USER
  ADMIN
}
```

- [ ] **Step 2: User 모델에 role 추가**

`User` 모델에 필드 추가:

```prisma
role      UserRole @default(USER)
```

그리고 relation 필드 추가:

```prisma
tokenUsageLogs TokenUsageLog[]
quotas         Quota[]
```

- [ ] **Step 3: TokenUsageLog 모델 추가**

```prisma
model TokenUsageLog {
  id               String       @id @default(uuid()) @db.Uuid
  userId           String       @map("user_id") @db.Uuid
  provider         String
  model            String
  feature          UsageFeature
  promptTokens     Int          @map("prompt_tokens")
  completionTokens Int          @map("completion_tokens")
  totalTokens      Int          @map("total_tokens")
  estimatedCost    Decimal?     @map("estimated_cost") @db.Decimal(10, 6)
  isServerKey      Boolean      @map("is_server_key")
  metadata         Json?
  createdAt        DateTime     @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([createdAt])
  @@map("token_usage_logs")
}
```

- [ ] **Step 4: ModelPricing 모델 추가**

```prisma
model ModelPricing {
  id              String   @id @default(uuid()) @db.Uuid
  provider        String
  model           String
  inputPricePerM  Decimal  @map("input_price_per_m") @db.Decimal(10, 6)
  outputPricePerM Decimal  @map("output_price_per_m") @db.Decimal(10, 6)
  effectiveFrom   DateTime @map("effective_from")
  createdAt       DateTime @default(now()) @map("created_at")

  @@unique([provider, model, effectiveFrom])
  @@map("model_pricing")
}
```

- [ ] **Step 5: Quota 모델 추가**

```prisma
model Quota {
  id         String      @id @default(uuid()) @db.Uuid
  userId     String      @map("user_id") @db.Uuid
  limitType  LimitType   @map("limit_type")
  limitValue Decimal     @map("limit_value") @db.Decimal(12, 2)
  period     LimitPeriod
  isActive   Boolean     @default(true) @map("is_active")
  createdAt  DateTime    @default(now()) @map("created_at")
  updatedAt  DateTime    @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("quotas")
}
```

- [ ] **Step 6: 마이그레이션 생성 및 적용**

Run: `npx prisma migrate dev --name add-token-usage-tracking`

- [ ] **Step 7: Prisma Client 생성 확인**

Run: `npx prisma generate`

- [ ] **Step 8: 커밋**

```bash
git add prisma/
git commit -m "feat(schema): add TokenUsageLog, ModelPricing, Quota models and User.role"
```

---

## Task 2: ModelPricing 시드 데이터

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (prisma.seed 설정)

- [ ] **Step 1: seed.ts 작성**

```typescript
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const MODEL_PRICING_SEED = [
  { provider: "openai", model: "gpt-4o", inputPricePerM: 2.5, outputPricePerM: 10.0 },
  { provider: "openai", model: "gpt-4o-mini", inputPricePerM: 0.15, outputPricePerM: 0.6 },
  { provider: "openai", model: "text-embedding-3-small", inputPricePerM: 0.02, outputPricePerM: 0 },
  { provider: "anthropic", model: "claude-sonnet-4-20250514", inputPricePerM: 3.0, outputPricePerM: 15.0 },
  { provider: "anthropic", model: "claude-haiku-4-5-20251001", inputPricePerM: 0.8, outputPricePerM: 4.0 },
  { provider: "google", model: "gemini-2.0-flash", inputPricePerM: 0.1, outputPricePerM: 0.4 },
  { provider: "google", model: "gemini-2.5-pro", inputPricePerM: 1.25, outputPricePerM: 10.0 },
]

async function main() {
  console.log("Seeding ModelPricing...")

  for (const pricing of MODEL_PRICING_SEED) {
    await prisma.modelPricing.upsert({
      where: {
        provider_model_effectiveFrom: {
          provider: pricing.provider,
          model: pricing.model,
          effectiveFrom: new Date("2025-01-01"),
        },
      },
      update: {
        inputPricePerM: pricing.inputPricePerM,
        outputPricePerM: pricing.outputPricePerM,
      },
      create: {
        ...pricing,
        effectiveFrom: new Date("2025-01-01"),
      },
    })
  }

  console.log("Seeding complete.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: package.json에 seed 설정 추가**

`package.json`에 최상위 `prisma` 키 추가:

```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

- [ ] **Step 3: 시드 실행**

Run: `npx prisma db seed`
Expected: "Seeding complete." 출력

- [ ] **Step 4: 커밋**

```bash
git add prisma/seed.ts package.json
git commit -m "feat(seed): add ModelPricing seed data for 7 models"
```

---

## Task 3: getLanguageModel() 수정 + AI 호출 지점 토큰 기록 통합

> Task 3과 7을 병합. `LanguageModelResult`를 처음부터 완전한 형태(`model`, `isServerKey`, `provider`, `modelId`)로 정의하고, 모든 호출 지점에서 토큰 기록까지 한번에 통합한다.

**Files:**
- Modify: `lib/ai/provider.ts`
- Modify: `lib/ai/embedding.ts`
- Modify: `app/api/chat/cover-letter/route.ts`
- Modify: `app/api/chat/interview/route.ts`
- Modify: `lib/insights/service.ts`
- Modify: `app/api/insights/extract/route.ts`
- Modify: `lib/documents/service.ts`

- [ ] **Step 1: provider.ts — LanguageModelResult 정의 및 getLanguageModel 수정**

`lib/ai/provider.ts` 전체를 다음으로 교체:

```typescript
import { type LanguageModel } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { prisma } from "@/lib/prisma"
import { AI_PROVIDERS, PROVIDER_MODELS, type AIProvider } from "@/types/ai"

export class AiSettingsNotFoundError extends Error {
  constructor() {
    super("AI 설정이 완료되지 않았습니다. 설정 페이지에서 API 키를 등록해주세요.")
  }
}

export interface LanguageModelResult {
  model: LanguageModel
  isServerKey: boolean
  provider: string
  modelId: string
}

// 순수 함수: SDK별 LanguageModel 생성
export function createLanguageModel(
  provider: AIProvider,
  model: string,
  apiKey: string,
): LanguageModel {
  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey })(model)
    case "anthropic":
      return createAnthropic({ apiKey })(model)
    case "google":
      return createGoogleGenerativeAI({ apiKey })(model)
    default: {
      const _exhaustive: never = provider
      throw new Error(`지원하지 않는 AI 제공자: ${_exhaustive}`)
    }
  }
}

// DB에서 사용자 AI 설정 조회 후 LanguageModel + 메타정보 반환
export async function getLanguageModel(userId: string): Promise<LanguageModelResult> {
  const settings = await prisma.aiSettings.findUnique({
    where: { userId },
    select: { provider: true, model: true, apiKey: true },
  })

  if (!settings?.apiKey) {
    throw new AiSettingsNotFoundError()
  }

  const provider = settings.provider as AIProvider
  if (!AI_PROVIDERS.includes(provider)) {
    throw new Error(`지원하지 않는 AI 제공자: ${settings.provider}`)
  }

  const validModels = PROVIDER_MODELS[provider]
  if (!validModels?.some((m) => m.value === settings.model)) {
    throw new Error(
      `지원하지 않는 모델입니다: ${settings.model} (${settings.provider})`,
    )
  }

  return {
    model: createLanguageModel(provider, settings.model, settings.apiKey),
    isServerKey: false,
    provider: settings.provider,
    modelId: settings.model,
  }
}
```

- [ ] **Step 2: embedding.ts — usage 반환하도록 수정**

`lib/ai/embedding.ts`의 `generateEmbeddings()` 수정:

```typescript
export async function generateEmbeddings(
  chunks: string[],
): Promise<{ embeddings: number[][]; totalTokens: number }> {
  const { embeddings, usage } = await embedMany({
    model: getEmbeddingModel(),
    values: chunks,
    maxRetries: 3,
  })
  return { embeddings, totalTokens: usage?.tokens ?? 0 }
}
```

- [ ] **Step 3: cover-letter 라우트 — getLanguageModel 디스트럭처링 변경 + onFinish에서 기록**

`app/api/chat/cover-letter/route.ts` 수정:

import 추가:
```typescript
import { recordUsage } from "@/lib/token-usage/service"
import { checkQuotaExceeded, QuotaExceededError } from "@/lib/token-usage/quota"
```

모델 로드 부분:
```typescript
const [context, { model, isServerKey, provider: aiProvider, modelId }] = await Promise.all([
  buildContext(user.id, { ... }),
  getLanguageModel(user.id),
])
```

모델 로드 직후 quota 체크 추가:
```typescript
const quotaResult = await checkQuotaExceeded(user.id)
if (quotaResult.exceeded) {
  return NextResponse.json(
    { error: "사용 한도를 초과했습니다." },
    { status: 403 },
  )
}
```

`streamText`의 `onFinish` 콜백 수정:
```typescript
onFinish: async ({ text, usage }) => {
  // 기존 메시지 저장 로직 (변경 없음)
  const ops = [
    ...(lastMessage.role === "user" && lastMessageContent
      ? [prisma.message.create({ data: { conversationId, role: MessageRole.USER, content: lastMessageContent } })]
      : []),
    ...(text
      ? [prisma.message.create({ data: { conversationId, role: MessageRole.ASSISTANT, content: text } })]
      : []),
  ]
  if (ops.length > 0) {
    await prisma.$transaction(ops)
  }

  // 토큰 사용량 기록
  if (usage) {
    await recordUsage({
      userId: user.id,
      provider: aiProvider,
      model: modelId,
      feature: "COVER_LETTER",
      promptTokens: usage.promptTokens ?? 0,
      completionTokens: usage.completionTokens ?? 0,
      totalTokens: (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0),
      isServerKey,
      metadata: { conversationId },
    }).catch((e) => console.error("토큰 사용량 기록 실패:", e))
  }
},
```

catch 블록에 `QuotaExceededError` 핸들링은 불필요 (라우트에서 직접 quota 체크하므로).

- [ ] **Step 4: interview 라우트 — 동일 패턴 적용**

`app/api/chat/interview/route.ts`에 Step 3과 동일한 변경 적용. `feature`를 `"INTERVIEW"`로 변경.

- [ ] **Step 5: insights/service.ts — usage 캡처 + recordUsage + quota 체크**

`lib/insights/service.ts`의 `extractInsights()` 수정:

import 추가:
```typescript
import { recordUsage } from "@/lib/token-usage/service"
import { checkQuotaExceeded, QuotaExceededError } from "@/lib/token-usage/quota"
```

함수 내부 수정:
```typescript
export async function extractInsights(userId: string, conversationId: string) {
  // ... 기존 conversation/messages 조회 로직 동일 ...

  // Quota 체크
  const quotaResult = await checkQuotaExceeded(userId)
  if (quotaResult.exceeded) {
    throw new QuotaExceededError()
  }

  const { model, isServerKey, provider: aiProvider, modelId } = await getLanguageModel(userId)
  const { object, usage } = await generateObject({
    model,
    schema: insightObjectSchema,
    system: insightExtractionPrompt,
    prompt: messages.map((m) => `${m.role}: ${m.content}`).join("\n"),
  })

  // 토큰 사용량 기록
  if (usage) {
    await recordUsage({
      userId,
      provider: aiProvider,
      model: modelId,
      feature: "INSIGHT",
      promptTokens: usage.promptTokens ?? 0,
      completionTokens: usage.completionTokens ?? 0,
      totalTokens: (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0),
      isServerKey,
      metadata: { conversationId },
    }).catch((e) => console.error("토큰 사용량 기록 실패:", e))
  }

  // ... 기존 트랜잭션 로직 동일 ...
}
```

- [ ] **Step 6: insights/extract/route.ts — QuotaExceededError 핸들링**

`app/api/insights/extract/route.ts`의 catch 블록에 추가:

```typescript
import { QuotaExceededError } from "@/lib/token-usage/quota"

// catch 블록 내:
if (error instanceof QuotaExceededError) {
  return NextResponse.json({ error: error.message }, { status: 403 })
}
```

- [ ] **Step 7: documents/service.ts — 임베딩 usage 기록**

`lib/documents/service.ts`의 `uploadDocument()`에서 임베딩 생성 부분 수정:

import 추가:
```typescript
import { recordUsage } from "@/lib/token-usage/service"
```

기존 `const embeddings = await generateEmbeddings(chunks)` 를 다음으로 변경:
```typescript
const { embeddings, totalTokens } = await generateEmbeddings(chunks)
```

임베딩 벡터 DB 업데이트 후 (트랜잭션 완료 후):
```typescript
if (totalTokens > 0) {
  await recordUsage({
    userId,
    provider: "openai",
    model: "text-embedding-3-small",
    feature: "EMBEDDING",
    promptTokens: totalTokens,
    completionTokens: 0,
    totalTokens,
    isServerKey: true,
  }).catch((e) => console.error("토큰 사용량 기록 실패:", e))
}
```

- [ ] **Step 8: 타입체크 + 린트 확인**

Run: `npm run typecheck && npm run lint`
Expected: 에러 없음

- [ ] **Step 9: 커밋**

```bash
git add lib/ai/provider.ts lib/ai/embedding.ts lib/documents/service.ts app/api/chat/cover-letter/route.ts app/api/chat/interview/route.ts lib/insights/service.ts app/api/insights/extract/route.ts
git commit -m "feat(token-usage): integrate token recording into all AI call points"
```

---

## Task 4: pricing 서비스

**Files:**
- Create: `lib/token-usage/pricing.ts`
- Create: `tests/lib/token-usage/pricing.test.ts`

- [ ] **Step 1: 테스트 작성**

`tests/lib/token-usage/pricing.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { Prisma } from "@prisma/client"
import { calculateCost } from "@/lib/token-usage/pricing"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    modelPricing: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"

const mockFindFirst = vi.mocked(prisma.modelPricing.findFirst)

describe("calculateCost", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("단가가 있으면 비용을 계산한다", async () => {
    mockFindFirst.mockResolvedValue({
      id: "1",
      provider: "openai",
      model: "gpt-4o",
      inputPricePerM: new Prisma.Decimal(2.5),
      outputPricePerM: new Prisma.Decimal(10),
      effectiveFrom: new Date(),
      createdAt: new Date(),
    })

    const cost = await calculateCost({
      provider: "openai",
      model: "gpt-4o",
      promptTokens: 1000,
      completionTokens: 500,
      at: new Date(),
    })

    // (1000 * 2.5 / 1_000_000) + (500 * 10 / 1_000_000) = 0.0025 + 0.005 = 0.0075
    expect(cost?.toNumber()).toBeCloseTo(0.0075)
  })

  it("단가가 없으면 null을 반환한다", async () => {
    mockFindFirst.mockResolvedValue(null)

    const cost = await calculateCost({
      provider: "openai",
      model: "unknown-model",
      promptTokens: 1000,
      completionTokens: 500,
      at: new Date(),
    })

    expect(cost).toBeNull()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/lib/token-usage/pricing.test.ts`
Expected: FAIL — 모듈 미존재

- [ ] **Step 3: pricing.ts 구현**

`lib/token-usage/pricing.ts`:

```typescript
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

interface CalculateCostParams {
  provider: string
  model: string
  promptTokens: number
  completionTokens: number
  at: Date
}

export async function calculateCost(
  params: CalculateCostParams,
): Promise<Prisma.Decimal | null> {
  const pricing = await prisma.modelPricing.findFirst({
    where: {
      provider: params.provider,
      model: params.model,
      effectiveFrom: { lte: params.at },
    },
    orderBy: { effectiveFrom: "desc" },
  })

  if (!pricing) return null

  const inputCost = new Prisma.Decimal(params.promptTokens)
    .mul(pricing.inputPricePerM)
    .div(1_000_000)
  const outputCost = new Prisma.Decimal(params.completionTokens)
    .mul(pricing.outputPricePerM)
    .div(1_000_000)

  return inputCost.add(outputCost)
}

export async function getCurrentPricing() {
  const allPricing = await prisma.modelPricing.findMany({
    orderBy: [{ provider: "asc" }, { model: "asc" }, { effectiveFrom: "desc" }],
  })

  // 각 (provider, model)별 최신 단가만 반환
  const latest = new Map<string, typeof allPricing[0]>()
  for (const p of allPricing) {
    const key = `${p.provider}:${p.model}`
    if (!latest.has(key)) {
      latest.set(key, p)
    }
  }

  return Array.from(latest.values())
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/lib/token-usage/pricing.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/token-usage/pricing.ts tests/lib/token-usage/pricing.test.ts
git commit -m "feat(token-usage): add pricing service with cost calculation"
```

---

## Task 5: quota 서비스

**Files:**
- Create: `lib/token-usage/quota.ts`
- Create: `tests/lib/token-usage/quota.test.ts`

- [ ] **Step 1: 테스트 작성**

`tests/lib/token-usage/quota.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { Prisma } from "@prisma/client"
import { checkQuotaExceeded } from "@/lib/token-usage/quota"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    quota: { findMany: vi.fn() },
    tokenUsageLog: { aggregate: vi.fn(), count: vi.fn() },
  },
}))

import { prisma } from "@/lib/prisma"

const mockQuotaFindMany = vi.mocked(prisma.quota.findMany)
const mockAggregate = vi.mocked(prisma.tokenUsageLog.aggregate)

describe("checkQuotaExceeded", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("Quota가 없으면 초과하지 않음", async () => {
    mockQuotaFindMany.mockResolvedValue([])
    const result = await checkQuotaExceeded("user-1")
    expect(result.exceeded).toBe(false)
  })

  it("토큰 한도 초과 시 exceeded=true", async () => {
    mockQuotaFindMany.mockResolvedValue([
      {
        id: "q1",
        userId: "user-1",
        limitType: "TOKENS",
        limitValue: new Prisma.Decimal(1000),
        period: "MONTHLY",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any)
    mockAggregate.mockResolvedValue({
      _sum: { totalTokens: 1500 },
    } as any)

    const result = await checkQuotaExceeded("user-1")
    expect(result.exceeded).toBe(true)
    expect(result.limitType).toBe("TOKENS")
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/lib/token-usage/quota.test.ts`
Expected: FAIL

- [ ] **Step 3: quota.ts 구현**

`lib/token-usage/quota.ts`:

```typescript
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export class QuotaExceededError extends Error {
  constructor() {
    super("사용 한도를 초과했습니다.")
  }
}

interface QuotaCheckResult {
  exceeded: boolean
  limitType?: string
  limitValue?: Prisma.Decimal
  currentUsage?: number
}

function getPeriodStart(period: string): Date {
  const now = new Date()
  if (period === "DAILY") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }
  // MONTHLY
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

export async function checkQuotaExceeded(
  userId: string,
): Promise<QuotaCheckResult> {
  const quotas = await prisma.quota.findMany({
    where: { userId, isActive: true },
  })

  if (quotas.length === 0) {
    return { exceeded: false }
  }

  for (const quota of quotas) {
    const periodStart = getPeriodStart(quota.period)

    if (quota.limitType === "TOKENS") {
      const agg = await prisma.tokenUsageLog.aggregate({
        where: { userId, createdAt: { gte: periodStart } },
        _sum: { totalTokens: true },
      })
      const used = agg._sum.totalTokens ?? 0
      if (used >= quota.limitValue.toNumber()) {
        return { exceeded: true, limitType: "TOKENS", limitValue: quota.limitValue, currentUsage: used }
      }
    } else if (quota.limitType === "COST") {
      const agg = await prisma.tokenUsageLog.aggregate({
        where: { userId, createdAt: { gte: periodStart } },
        _sum: { estimatedCost: true },
      })
      const used = agg._sum.estimatedCost?.toNumber() ?? 0
      if (used >= quota.limitValue.toNumber()) {
        return { exceeded: true, limitType: "COST", limitValue: quota.limitValue, currentUsage: used }
      }
    } else if (quota.limitType === "REQUESTS") {
      const count = await prisma.tokenUsageLog.count({
        where: { userId, createdAt: { gte: periodStart } },
      })
      if (count >= quota.limitValue.toNumber()) {
        return { exceeded: true, limitType: "REQUESTS", limitValue: quota.limitValue, currentUsage: count }
      }
    }
  }

  return { exceeded: false }
}

export async function getUserQuotas(userId: string) {
  return prisma.quota.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })
}

// Quota + 현재 사용량을 함께 반환 (대시보드 프로그레스 바용)
export async function getUserQuotasWithUsage(userId: string) {
  const quotas = await prisma.quota.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "desc" },
  })

  return Promise.all(
    quotas.map(async (quota) => {
      const periodStart = getPeriodStart(quota.period)
      let currentUsage = 0

      if (quota.limitType === "TOKENS") {
        const agg = await prisma.tokenUsageLog.aggregate({
          where: { userId, createdAt: { gte: periodStart } },
          _sum: { totalTokens: true },
        })
        currentUsage = agg._sum.totalTokens ?? 0
      } else if (quota.limitType === "COST") {
        const agg = await prisma.tokenUsageLog.aggregate({
          where: { userId, createdAt: { gte: periodStart } },
          _sum: { estimatedCost: true },
        })
        currentUsage = agg._sum.estimatedCost?.toNumber() ?? 0
      } else if (quota.limitType === "REQUESTS") {
        currentUsage = await prisma.tokenUsageLog.count({
          where: { userId, createdAt: { gte: periodStart } },
        })
      }

      return {
        id: quota.id,
        limitType: quota.limitType,
        limitValue: quota.limitValue.toNumber(),
        period: quota.period,
        currentUsage,
      }
    }),
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/lib/token-usage/quota.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/token-usage/quota.ts tests/lib/token-usage/quota.test.ts
git commit -m "feat(token-usage): add quota service with limit checking"
```

---

## Task 6: token-usage 핵심 서비스

**Files:**
- Create: `lib/token-usage/service.ts`
- Create: `tests/lib/token-usage/service.test.ts`

- [ ] **Step 1: 테스트 작성**

`tests/lib/token-usage/service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { Prisma } from "@prisma/client"
import { recordUsage } from "@/lib/token-usage/service"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tokenUsageLog: { create: vi.fn() },
  },
}))

vi.mock("@/lib/token-usage/pricing", () => ({
  calculateCost: vi.fn(),
}))

import { prisma } from "@/lib/prisma"
import { calculateCost } from "@/lib/token-usage/pricing"

const mockCreate = vi.mocked(prisma.tokenUsageLog.create)
const mockCalculateCost = vi.mocked(calculateCost)

describe("recordUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("비용 계산 후 로그를 저장한다", async () => {
    mockCalculateCost.mockResolvedValue(new Prisma.Decimal(0.0075))
    mockCreate.mockResolvedValue({} as any)

    await recordUsage({
      userId: "user-1",
      provider: "openai",
      model: "gpt-4o",
      feature: "COVER_LETTER",
      promptTokens: 1000,
      completionTokens: 500,
      totalTokens: 1500,
      isServerKey: false,
    })

    expect(mockCalculateCost).toHaveBeenCalledWith({
      provider: "openai",
      model: "gpt-4o",
      promptTokens: 1000,
      completionTokens: 500,
      at: expect.any(Date),
    })
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o",
        feature: "COVER_LETTER",
        estimatedCost: new Prisma.Decimal(0.0075),
      }),
    })
  })

  it("단가가 없으면 estimatedCost=null로 저장한다", async () => {
    mockCalculateCost.mockResolvedValue(null)
    mockCreate.mockResolvedValue({} as any)

    await recordUsage({
      userId: "user-1",
      provider: "openai",
      model: "unknown",
      feature: "COVER_LETTER",
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      isServerKey: false,
    })

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        estimatedCost: null,
      }),
    })
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/lib/token-usage/service.test.ts`
Expected: FAIL

- [ ] **Step 3: service.ts 구현**

`lib/token-usage/service.ts`:

```typescript
import { Prisma, type UsageFeature } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { calculateCost } from "./pricing"

interface RecordUsageParams {
  userId: string
  provider: string
  model: string
  feature: UsageFeature
  promptTokens: number
  completionTokens: number
  totalTokens: number
  isServerKey: boolean
  metadata?: Record<string, unknown>
}

export async function recordUsage(params: RecordUsageParams) {
  const estimatedCost = await calculateCost({
    provider: params.provider,
    model: params.model,
    promptTokens: params.promptTokens,
    completionTokens: params.completionTokens,
    at: new Date(),
  })

  await prisma.tokenUsageLog.create({
    data: {
      userId: params.userId,
      provider: params.provider,
      model: params.model,
      feature: params.feature,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      totalTokens: params.totalTokens,
      estimatedCost,
      isServerKey: params.isServerKey,
      metadata: params.metadata ?? Prisma.JsonNull,
    },
  })
}

interface GetUsageParams {
  userId: string
  cursor?: string
  limit?: number
  feature?: UsageFeature
  startDate?: Date
  endDate?: Date
}

export async function getUserUsage(params: GetUsageParams) {
  const limit = Math.min(params.limit ?? 50, 100)

  return prisma.tokenUsageLog.findMany({
    where: {
      userId: params.userId,
      ...(params.feature ? { feature: params.feature } : {}),
      ...(params.startDate || params.endDate
        ? {
            createdAt: {
              ...(params.startDate ? { gte: params.startDate } : {}),
              ...(params.endDate ? { lte: params.endDate } : {}),
            },
          }
        : {}),
    },
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    take: limit,
    orderBy: { createdAt: "desc" },
  })
}

interface UsageSummary {
  totalTokens: number
  totalCost: number
  requestCount: number
  byFeature: { feature: string; totalTokens: number; count: number }[]
  byModel: { model: string; totalTokens: number; totalCost: number }[]
  daily: { date: string; totalTokens: number; totalCost: number; count: number }[]
}

export async function getUserUsageSummary(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<UsageSummary> {
  const [totals, byFeature, byModel, logs] = await Promise.all([
    prisma.tokenUsageLog.aggregate({
      where: { userId, createdAt: { gte: startDate, lte: endDate } },
      _sum: { totalTokens: true, estimatedCost: true },
      _count: { _all: true },
    }),
    prisma.tokenUsageLog.groupBy({
      by: ["feature"],
      where: { userId, createdAt: { gte: startDate, lte: endDate } },
      _sum: { totalTokens: true },
      _count: { _all: true },
    }),
    prisma.tokenUsageLog.groupBy({
      by: ["model"],
      where: { userId, createdAt: { gte: startDate, lte: endDate } },
      _sum: { totalTokens: true, estimatedCost: true },
    }),
    prisma.$queryRaw<{ date: string; total_tokens: bigint; total_cost: string; count: bigint }[]>`
      SELECT
        DATE(created_at) as date,
        SUM(total_tokens) as total_tokens,
        SUM(estimated_cost) as total_cost,
        COUNT(*) as count
      FROM token_usage_logs
      WHERE user_id = ${userId}::uuid
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `,
  ])

  return {
    totalTokens: totals._sum.totalTokens ?? 0,
    totalCost: totals._sum.estimatedCost?.toNumber() ?? 0,
    requestCount: totals._count._all,
    byFeature: byFeature.map((f) => ({
      feature: f.feature,
      totalTokens: f._sum.totalTokens ?? 0,
      count: f._count._all,
    })),
    byModel: byModel.map((m) => ({
      model: m.model,
      totalTokens: m._sum.totalTokens ?? 0,
      totalCost: m._sum.estimatedCost?.toNumber() ?? 0,
    })),
    daily: logs.map((d) => ({
      date: d.date,
      totalTokens: Number(d.total_tokens),
      totalCost: parseFloat(d.total_cost ?? "0"),
      count: Number(d.count),
    })),
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/lib/token-usage/service.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/token-usage/service.ts tests/lib/token-usage/service.test.ts
git commit -m "feat(token-usage): add core service with recordUsage and usage queries"
```

---

## Task 7: 사용자용 API 엔드포인트

**Files:**
- Create: `lib/validations/token-usage.ts`
- Create: `app/api/token-usage/route.ts`
- Create: `app/api/token-usage/summary/route.ts`

- [ ] **Step 1: Zod 스키마 작성**

`lib/validations/token-usage.ts`:

```typescript
import { z } from "zod"

export const tokenUsageQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  feature: z.enum(["COVER_LETTER", "INTERVIEW", "INSIGHT", "EMBEDDING"]).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
})

export const usageSummaryQuerySchema = z.object({
  period: z.enum(["7d", "30d", "90d"]).optional().default("30d"),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
})
```

- [ ] **Step 2: GET /api/token-usage 구현**

`app/api/token-usage/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserUsage } from "@/lib/token-usage/service"
import { tokenUsageQuerySchema } from "@/lib/validations/token-usage"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  const params = Object.fromEntries(request.nextUrl.searchParams)
  const parsed = tokenUsageQuerySchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "유효하지 않은 입력입니다." },
      { status: 400 },
    )
  }

  try {
    const logs = await getUserUsage({ userId: user.id, ...parsed.data })
    const nextCursor = logs.length === parsed.data.limit ? logs[logs.length - 1]?.id : undefined
    return NextResponse.json({ data: logs, nextCursor })
  } catch (error) {
    console.error("[GET /api/token-usage]", error)
    return NextResponse.json({ error: "사용량 조회에 실패했습니다." }, { status: 500 })
  }
}
```

- [ ] **Step 3: GET /api/token-usage/summary 구현**

`app/api/token-usage/summary/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserUsageSummary } from "@/lib/token-usage/service"
import { getUserQuotasWithUsage } from "@/lib/token-usage/quota"
import { usageSummaryQuerySchema } from "@/lib/validations/token-usage"

function getDateRange(period: string) {
  const end = new Date()
  const start = new Date()
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30
  start.setDate(start.getDate() - days)
  return { start, end }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  const params = Object.fromEntries(request.nextUrl.searchParams)
  const parsed = usageSummaryQuerySchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "유효하지 않은 입력입니다." },
      { status: 400 },
    )
  }

  try {
    const { start, end } = parsed.data.startDate && parsed.data.endDate
      ? { start: parsed.data.startDate, end: parsed.data.endDate }
      : getDateRange(parsed.data.period)

    const [summary, quotas] = await Promise.all([
      getUserUsageSummary(user.id, start, end),
      getUserQuotasWithUsage(user.id),
    ])

    return NextResponse.json({ ...summary, quotas })
  } catch (error) {
    console.error("[GET /api/token-usage/summary]", error)
    return NextResponse.json({ error: "사용량 요약 조회에 실패했습니다." }, { status: 500 })
  }
}
```

- [ ] **Step 4: 타입체크 확인**

Run: `npm run typecheck`
Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add lib/validations/token-usage.ts app/api/token-usage/
git commit -m "feat(api): add user token usage endpoints with pagination"
```

---

## Task 8: 사용자 대시보드 UI

**Files:**
- Create: `app/(dashboard)/usage/page.tsx`
- Create: `components/usage/summary-cards.tsx`
- Create: `components/usage/daily-chart.tsx`
- Create: `components/usage/feature-chart.tsx`
- Create: `components/usage/model-chart.tsx`
- Create: `components/usage/period-filter.tsx`
- Create: `components/usage/quota-progress.tsx`
- Modify: `lib/config/navigation.ts`
- Modify: `package.json`

> **Note:** UI 구현 시 `/frontend-design` 스킬과 `/vercel-react-best-practices` 스킬을 참고한다.

- [ ] **Step 1: recharts 설치**

Run: `npm install recharts`

- [ ] **Step 2: 네비게이션에 사용량 메뉴 추가**

`lib/config/navigation.ts`의 `navItems` 배열에서 설정(Settings) 앞에 추가:

```typescript
import { BarChart3 } from "lucide-react"

// navItems 배열에 Settings 앞에 추가:
{ icon: BarChart3, label: "사용량", href: "/usage" },
```

`getPageTitle()`은 navItems를 순회하므로 별도 수정 불필요.

- [ ] **Step 3: period-filter.tsx 구현**

기간 선택 탭 컴포넌트. shadcn/ui `Tabs` 사용.

```typescript
"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PeriodFilterProps {
  value: string
  onChange: (period: string) => void
}

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList>
        <TabsTrigger value="7d">7일</TabsTrigger>
        <TabsTrigger value="30d">30일</TabsTrigger>
        <TabsTrigger value="90d">90일</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
```

- [ ] **Step 4: summary-cards.tsx 구현**

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Coins, Hash, Zap } from "lucide-react"

interface SummaryCardsProps {
  totalTokens: number
  totalCost: number
  requestCount: number
}

export function SummaryCards({ totalTokens, totalCost, requestCount }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">총 토큰</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTokens.toLocaleString()}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">추정 비용</CardTitle>
          <Coins className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${totalCost.toFixed(4)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">요청 횟수</CardTitle>
          <Hash className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{requestCount.toLocaleString()}</div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 5: daily-chart.tsx 구현**

```typescript
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface DailyChartProps {
  data: { date: string; totalTokens: number; totalCost: number; count: number }[]
}

export function DailyChart({ data }: DailyChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>일별 토큰 사용량</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} />
            <YAxis />
            <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString("ko-KR")} />
            <Line type="monotone" dataKey="totalTokens" stroke="hsl(var(--primary))" name="토큰" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 6: feature-chart.tsx 구현**

```typescript
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

const FEATURE_LABELS: Record<string, string> = {
  COVER_LETTER: "자기소개서",
  INTERVIEW: "모의면접",
  INSIGHT: "인사이트",
  EMBEDDING: "임베딩",
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"]

interface FeatureChartProps {
  data: { feature: string; totalTokens: number; count: number }[]
}

export function FeatureChart({ data }: FeatureChartProps) {
  const chartData = data.map((d) => ({ name: FEATURE_LABELS[d.feature] ?? d.feature, value: d.totalTokens }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>기능별 사용 비중</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 7: model-chart.tsx 구현**

```typescript
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface ModelChartProps {
  data: { model: string; totalTokens: number; totalCost: number }[]
}

export function ModelChart({ data }: ModelChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>모델별 사용량</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="model" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="totalTokens" fill="hsl(var(--primary))" name="토큰" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 8: quota-progress.tsx 구현**

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface QuotaProgressProps {
  quotas: {
    id: string
    limitType: string
    limitValue: number
    period: string
    currentUsage: number
  }[]
}

const LIMIT_LABELS: Record<string, string> = {
  TOKENS: "토큰",
  COST: "비용 ($)",
  REQUESTS: "요청 횟수",
}

const PERIOD_LABELS: Record<string, string> = {
  DAILY: "일간",
  MONTHLY: "월간",
}

export function QuotaProgress({ quotas }: QuotaProgressProps) {
  if (quotas.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>사용 한도</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {quotas.map((q) => {
          const pct = Math.min((q.currentUsage / q.limitValue) * 100, 100)
          return (
            <div key={q.id}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{PERIOD_LABELS[q.period]} {LIMIT_LABELS[q.limitType]}</span>
                <span>{q.currentUsage.toLocaleString()} / {q.limitValue.toLocaleString()}</span>
              </div>
              <Progress value={pct} />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 9: 대시보드 페이지 구현**

`app/(dashboard)/usage/page.tsx`:

```typescript
"use client"

import { useState, useEffect } from "react"
import { SummaryCards } from "@/components/usage/summary-cards"
import { DailyChart } from "@/components/usage/daily-chart"
import { FeatureChart } from "@/components/usage/feature-chart"
import { ModelChart } from "@/components/usage/model-chart"
import { PeriodFilter } from "@/components/usage/period-filter"
import { QuotaProgress } from "@/components/usage/quota-progress"

export default function UsagePage() {
  const [period, setPeriod] = useState("30d")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/token-usage/summary?period=${period}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [period])

  if (loading || !data) {
    return <div className="p-6">로딩 중...</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">사용량</h1>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      <SummaryCards
        totalTokens={data.totalTokens}
        totalCost={data.totalCost}
        requestCount={data.requestCount}
      />

      <QuotaProgress quotas={data.quotas} />

      <DailyChart data={data.daily} />

      <div className="grid gap-4 md:grid-cols-2">
        <FeatureChart data={data.byFeature} />
        <ModelChart data={data.byModel} />
      </div>
    </div>
  )
}
```

- [ ] **Step 10: 타입체크 + 린트 확인**

Run: `npm run typecheck && npm run lint`
Expected: 에러 없음

- [ ] **Step 11: 커밋**

```bash
git add package.json package-lock.json lib/config/navigation.ts components/usage/ app/(dashboard)/usage/
git commit -m "feat(ui): add user token usage dashboard with charts"
```

---

## Task 9: 최종 검증 및 정리

- [ ] **Step 1: 전체 테스트 실행**

Run: `npm run test`
Expected: 모든 테스트 PASS

- [ ] **Step 2: 타입체크 + 린트**

Run: `npm run typecheck && npm run lint`
Expected: 에러 없음

- [ ] **Step 3: /simplify 실행**

변경된 코드에 대해 `/simplify` 스킬 실행.

- [ ] **Step 4: 최종 커밋 (필요 시)**

수정사항이 있으면 커밋.
