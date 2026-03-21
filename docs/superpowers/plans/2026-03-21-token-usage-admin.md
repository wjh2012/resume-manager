# Token Usage Admin System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자가 전체 시스템 사용량, 사용자별 랭킹, 모델/기능별 분포를 모니터링하고, 모델 단가와 Quota를 관리할 수 있는 관리자 시스템을 구축한다.

**Architecture:** PR 1 (token-usage-core)에서 추가된 스키마와 서비스 위에 관리자 API 엔드포인트와 관리자 페이지를 구축. `requireAdmin()` 유틸리티로 인증/인가 처리.

**Tech Stack:** Prisma, Next.js App Router, Recharts, shadcn/ui, Zod, Vitest

**Spec:** `docs/superpowers/specs/2026-03-21-token-usage-tracking-design.md`

**Branch:** `feature/token-usage-admin` (base: `develop` — PR 1 머지 후 생성)

**Prerequisite:** PR 1 (token-usage-core) 머지 완료

**Spec deviations:** 일별 집계와 사용자 랭킹 쿼리에 Prisma raw SQL 사용. Prisma `groupBy`가 `DATE()` 함수와 JOIN 기반 집계를 지원하지 않아 불가피한 선택. `docs/references/spec-deviations.md`에 기록할 것.

---

## File Structure

### New Files

| Path | Responsibility |
|------|---------------|
| `lib/auth/require-admin.ts` | `requireAdmin()` — 인증 + admin 역할 검증 유틸리티 |
| `lib/admin/usage-service.ts` | 관리자용 사용량 조회 서비스 |
| `lib/admin/pricing-service.ts` | 모델 단가 관리 서비스 |
| `lib/admin/quota-service.ts` | 관리자 Quota CRUD 서비스 |
| `lib/validations/admin.ts` | 관리자 API용 Zod 스키마 |
| `lib/utils/date-range.ts` | `getDateRange()` 공유 유틸리티 |
| `app/api/admin/token-usage/route.ts` | GET — 전체 시스템 사용량 |
| `app/api/admin/token-usage/users/route.ts` | GET — 사용자별 사용량 랭킹 |
| `app/api/admin/model-pricing/route.ts` | GET, POST — 모델 단가 목록/등록 |
| `app/api/admin/quotas/route.ts` | GET, POST — Quota 목록/생성 |
| `app/api/admin/quotas/[id]/route.ts` | PUT, DELETE — Quota 수정/삭제 |
| `app/(dashboard)/admin/usage/page.tsx` | 관리자 사용량 모니터링 페이지 |
| `app/(dashboard)/admin/model-pricing/page.tsx` | 모델 단가 관리 페이지 |
| `app/(dashboard)/admin/quotas/page.tsx` | Quota 관리 페이지 |
| `components/admin/system-summary.tsx` | 시스템 전체 요약 카드 |
| `components/admin/user-ranking-table.tsx` | 사용자별 랭킹 테이블 |
| `components/admin/distribution-charts.tsx` | 모델/기능별 분포 차트 |
| `components/admin/pricing-table.tsx` | 모델 단가 테이블 + 등록 폼 |
| `components/admin/quota-table.tsx` | Quota 테이블 + CRUD UI |
| `tests/lib/auth/require-admin.test.ts` | requireAdmin 단위 테스트 |
| `tests/lib/admin/usage-service.test.ts` | 관리자 사용량 서비스 테스트 |
| `tests/lib/admin/pricing-service.test.ts` | 단가 서비스 테스트 |
| `tests/lib/admin/quota-service.test.ts` | Quota 서비스 테스트 |

### Modified Files

| Path | Change |
|------|--------|
| `lib/config/navigation.ts` | `adminNavItems` 추가 + `getPageTitle()` 업데이트 |
| `components/layout/app-sidebar.tsx` | admin 메뉴 그룹 조건부 렌더링 |
| `app/api/token-usage/summary/route.ts` | `getDateRange`를 공유 유틸로 교체 |

---

## Task 1: requireAdmin() 유틸리티

**Files:**
- Create: `lib/auth/require-admin.ts`
- Create: `tests/lib/auth/require-admin.test.ts`

- [ ] **Step 1: 테스트 작성**

`tests/lib/auth/require-admin.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}))

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"

const mockCreateClient = vi.mocked(createClient)
const mockFindUnique = vi.mocked(prisma.user.findUnique)

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("인증되지 않으면 null을 반환한다", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) },
    } as any)

    const result = await requireAdmin()
    expect(result).toBeNull()
  })

  it("ADMIN 역할이면 user를 반환한다", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } }, error: null }) },
    } as any)
    mockFindUnique.mockResolvedValue({ id: "u1", role: "ADMIN" } as any)

    const result = await requireAdmin()
    expect(result).toEqual({ id: "u1", role: "ADMIN" })
  })

  it("USER 역할이면 null을 반환한다", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } }, error: null }) },
    } as any)
    mockFindUnique.mockResolvedValue({ id: "u1", role: "USER" } as any)

    const result = await requireAdmin()
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/lib/auth/require-admin.test.ts`
Expected: FAIL

- [ ] **Step 3: requireAdmin() 구현**

`lib/auth/require-admin.ts`:

```typescript
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  })

  if (!dbUser || dbUser.role !== "ADMIN") return null

  return dbUser
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/lib/auth/require-admin.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/auth/require-admin.ts tests/lib/auth/require-admin.test.ts
git commit -m "feat(auth): add requireAdmin() utility for admin route protection"
```

---

## Task 2: 공유 유틸리티 + Zod 스키마

**Files:**
- Create: `lib/utils/date-range.ts`
- Create: `lib/validations/admin.ts`
- Modify: `app/api/token-usage/summary/route.ts` (PR 1에서 만든 파일의 getDateRange를 공유 유틸로 교체)

- [ ] **Step 1: getDateRange 공유 유틸 작성**

`lib/utils/date-range.ts`:

```typescript
export function getDateRange(period: string): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30
  start.setDate(start.getDate() - days)
  return { start, end }
}
```

- [ ] **Step 2: PR 1의 token-usage/summary/route.ts에서 로컬 getDateRange를 공유 유틸로 교체**

```typescript
import { getDateRange } from "@/lib/utils/date-range"
// 로컬 getDateRange 함수 삭제
```

- [ ] **Step 3: Zod 스키마 작성**

`lib/validations/admin.ts`:

```typescript
import { z } from "zod"

export const createModelPricingSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google"]),
  model: z.string().min(1, "모델명을 입력해주세요."),
  inputPricePerM: z.coerce.number().min(0, "0 이상이어야 합니다."),
  outputPricePerM: z.coerce.number().min(0, "0 이상이어야 합니다."),
  effectiveFrom: z.coerce.date(),
})

export const createQuotaSchema = z.object({
  userId: z.string().uuid("유효하지 않은 사용자 ID입니다."),
  limitType: z.enum(["TOKENS", "COST", "REQUESTS"]),
  limitValue: z.coerce.number().positive("양수여야 합니다."),
  period: z.enum(["DAILY", "MONTHLY"]),
  isActive: z.boolean().optional().default(true),
})

export const updateQuotaSchema = z.object({
  limitValue: z.coerce.number().positive("양수여야 합니다.").optional(),
  isActive: z.boolean().optional(),
})

export const adminUsageQuerySchema = z.object({
  period: z.enum(["7d", "30d", "90d"]).optional().default("30d"),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
})
```

- [ ] **Step 4: 타입체크 확인**

Run: `npm run typecheck`
Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add lib/utils/date-range.ts lib/validations/admin.ts app/api/token-usage/summary/route.ts
git commit -m "feat(admin): add shared date-range util and admin Zod schemas"
```

---

## Task 3: 관리자 사용량 서비스

**Files:**
- Create: `lib/admin/usage-service.ts`
- Create: `tests/lib/admin/usage-service.test.ts`

- [ ] **Step 1: 테스트 작성**

`tests/lib/admin/usage-service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { getSystemUsageSummary, getUserRanking } from "@/lib/admin/usage-service"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tokenUsageLog: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}))

import { prisma } from "@/lib/prisma"

const mockAggregate = vi.mocked(prisma.tokenUsageLog.aggregate)
const mockGroupBy = vi.mocked(prisma.tokenUsageLog.groupBy)
const mockQueryRaw = vi.mocked(prisma.$queryRaw)

describe("getSystemUsageSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("전체 시스템 사용량을 집계한다", async () => {
    mockAggregate.mockResolvedValue({
      _sum: { totalTokens: 10000, estimatedCost: { toNumber: () => 0.5 } },
      _count: { _all: 20 },
    } as any)
    mockGroupBy
      .mockResolvedValueOnce([
        { feature: "COVER_LETTER", _sum: { totalTokens: 6000 }, _count: { _all: 12 } },
      ] as any)
      .mockResolvedValueOnce([
        { model: "gpt-4o", _sum: { totalTokens: 8000, estimatedCost: { toNumber: () => 0.4 } } },
      ] as any)
      .mockResolvedValueOnce([{ userId: "u1" }] as any) // activeUsers
    mockQueryRaw.mockResolvedValue([]) // daily

    const start = new Date("2026-01-01")
    const end = new Date("2026-01-31")
    const result = await getSystemUsageSummary(start, end)

    expect(result.totalTokens).toBe(10000)
    expect(result.requestCount).toBe(20)
    expect(result.byFeature).toHaveLength(1)
    expect(result.byModel).toHaveLength(1)
  })
})

describe("getUserRanking", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("사용자별 랭킹을 반환한다", async () => {
    mockQueryRaw.mockResolvedValue([
      {
        user_id: "u1",
        email: "test@test.com",
        name: "Test",
        total_tokens: BigInt(5000),
        total_cost: "0.25",
        request_count: BigInt(10),
      },
    ])

    const result = await getUserRanking({
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-31"),
    })

    expect(result).toHaveLength(1)
    expect(result[0].totalTokens).toBe(5000)
    expect(result[0].email).toBe("test@test.com")
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/lib/admin/usage-service.test.ts`
Expected: FAIL

- [ ] **Step 3: usage-service.ts 구현**

`lib/admin/usage-service.ts`:

```typescript
import { prisma } from "@/lib/prisma"

export async function getSystemUsageSummary(startDate: Date, endDate: Date) {
  const [totals, byFeature, byModel, activeUsers, daily] = await Promise.all([
    prisma.tokenUsageLog.aggregate({
      where: { createdAt: { gte: startDate, lte: endDate } },
      _sum: { totalTokens: true, estimatedCost: true },
      _count: { _all: true },
    }),
    prisma.tokenUsageLog.groupBy({
      by: ["feature"],
      where: { createdAt: { gte: startDate, lte: endDate } },
      _sum: { totalTokens: true },
      _count: { _all: true },
    }),
    prisma.tokenUsageLog.groupBy({
      by: ["model"],
      where: { createdAt: { gte: startDate, lte: endDate } },
      _sum: { totalTokens: true, estimatedCost: true },
    }),
    prisma.tokenUsageLog.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: startDate, lte: endDate } },
    }).then((r) => r.length),
    prisma.$queryRaw<{ date: string; total_tokens: bigint; total_cost: string; count: bigint }[]>`
      SELECT
        DATE(created_at) as date,
        SUM(total_tokens) as total_tokens,
        SUM(estimated_cost) as total_cost,
        COUNT(*) as count
      FROM token_usage_logs
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `,
  ])

  return {
    totalTokens: totals._sum.totalTokens ?? 0,
    totalCost: totals._sum.estimatedCost?.toNumber() ?? 0,
    requestCount: totals._count._all,
    activeUsers,
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
    daily: daily.map((d) => ({
      date: d.date,
      totalTokens: Number(d.total_tokens),
      totalCost: parseFloat(d.total_cost ?? "0"),
      count: Number(d.count),
    })),
  }
}

interface UserRankingParams {
  startDate: Date
  endDate: Date
  limit?: number
}

export async function getUserRanking(params: UserRankingParams) {
  const limit = Math.min(params.limit ?? 50, 100)

  const rankings = await prisma.$queryRaw<{
    user_id: string
    email: string
    name: string | null
    total_tokens: bigint
    total_cost: string
    request_count: bigint
  }[]>`
    SELECT
      u.id as user_id,
      u.email,
      u.name,
      SUM(t.total_tokens) as total_tokens,
      SUM(t.estimated_cost) as total_cost,
      COUNT(*) as request_count
    FROM token_usage_logs t
    JOIN users u ON u.id = t.user_id
    WHERE t.created_at >= ${params.startDate}
      AND t.created_at <= ${params.endDate}
    GROUP BY u.id, u.email, u.name
    ORDER BY total_tokens DESC
    LIMIT ${limit}
  `

  return rankings.map((r) => ({
    userId: r.user_id,
    email: r.email,
    name: r.name,
    totalTokens: Number(r.total_tokens),
    totalCost: parseFloat(r.total_cost ?? "0"),
    requestCount: Number(r.request_count),
  }))
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/lib/admin/usage-service.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/admin/usage-service.ts tests/lib/admin/usage-service.test.ts
git commit -m "feat(admin): add system usage and user ranking services"
```

---

## Task 4: 관리자 단가/Quota 서비스

**Files:**
- Create: `lib/admin/pricing-service.ts`
- Create: `lib/admin/quota-service.ts`
- Create: `tests/lib/admin/pricing-service.test.ts`
- Create: `tests/lib/admin/quota-service.test.ts`

- [ ] **Step 1: pricing 테스트 작성**

`tests/lib/admin/pricing-service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { createModelPricing, listModelPricing } from "@/lib/admin/pricing-service"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    modelPricing: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"

const mockCreate = vi.mocked(prisma.modelPricing.create)
const mockFindMany = vi.mocked(prisma.modelPricing.findMany)

describe("createModelPricing", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("새 단가를 생성한다", async () => {
    const input = {
      provider: "openai",
      model: "gpt-4o",
      inputPricePerM: 2.5,
      outputPricePerM: 10.0,
      effectiveFrom: new Date("2026-01-01"),
    }
    mockCreate.mockResolvedValue({ id: "p1", ...input, createdAt: new Date() } as any)

    const result = await createModelPricing(input)
    expect(mockCreate).toHaveBeenCalledWith({ data: input })
    expect(result.id).toBe("p1")
  })
})

describe("listModelPricing", () => {
  it("단가 목록을 반환한다", async () => {
    mockFindMany.mockResolvedValue([])

    const result = await listModelPricing()
    expect(result).toEqual([])
    expect(mockFindMany).toHaveBeenCalledWith({
      orderBy: [{ provider: "asc" }, { model: "asc" }, { effectiveFrom: "desc" }],
    })
  })
})
```

- [ ] **Step 2: quota 테스트 작성**

`tests/lib/admin/quota-service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { createQuota, listQuotas, updateQuota, deleteQuota } from "@/lib/admin/quota-service"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    quota: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"

const mockCreate = vi.mocked(prisma.quota.create)
const mockFindMany = vi.mocked(prisma.quota.findMany)
const mockUpdate = vi.mocked(prisma.quota.update)
const mockDelete = vi.mocked(prisma.quota.delete)

describe("createQuota", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("새 Quota를 생성한다", async () => {
    const input = {
      userId: "u1",
      limitType: "TOKENS" as const,
      limitValue: 100000,
      period: "MONTHLY" as const,
    }
    mockCreate.mockResolvedValue({ id: "q1", ...input, isActive: true } as any)

    const result = await createQuota(input)
    expect(mockCreate).toHaveBeenCalledWith({ data: input })
    expect(result.id).toBe("q1")
  })
})

describe("updateQuota", () => {
  it("Quota를 업데이트한다", async () => {
    mockUpdate.mockResolvedValue({ id: "q1", isActive: false } as any)

    await updateQuota("q1", { isActive: false })
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: "q1" }, data: { isActive: false } })
  })
})

describe("deleteQuota", () => {
  it("Quota를 삭제한다", async () => {
    mockDelete.mockResolvedValue({} as any)

    await deleteQuota("q1")
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "q1" } })
  })
})
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run tests/lib/admin/pricing-service.test.ts tests/lib/admin/quota-service.test.ts`
Expected: FAIL

- [ ] **Step 4: pricing-service.ts 구현**

`lib/admin/pricing-service.ts`:

```typescript
import { prisma } from "@/lib/prisma"

interface CreatePricingParams {
  provider: string
  model: string
  inputPricePerM: number
  outputPricePerM: number
  effectiveFrom: Date
}

export async function createModelPricing(params: CreatePricingParams) {
  return prisma.modelPricing.create({
    data: params,
  })
}

export async function listModelPricing() {
  return prisma.modelPricing.findMany({
    orderBy: [{ provider: "asc" }, { model: "asc" }, { effectiveFrom: "desc" }],
  })
}
```

- [ ] **Step 5: quota-service.ts 구현**

`lib/admin/quota-service.ts`:

```typescript
import { prisma } from "@/lib/prisma"

interface CreateQuotaParams {
  userId: string
  limitType: "TOKENS" | "COST" | "REQUESTS"
  limitValue: number
  period: "DAILY" | "MONTHLY"
  isActive?: boolean
}

export async function createQuota(params: CreateQuotaParams) {
  return prisma.quota.create({ data: params })
}

export async function listQuotas() {
  return prisma.quota.findMany({
    include: { user: { select: { email: true, name: true } } },
    orderBy: { createdAt: "desc" },
  })
}

export async function updateQuota(
  id: string,
  data: { limitValue?: number; isActive?: boolean },
) {
  return prisma.quota.update({ where: { id }, data })
}

export async function deleteQuota(id: string) {
  return prisma.quota.delete({ where: { id } })
}
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npx vitest run tests/lib/admin/pricing-service.test.ts tests/lib/admin/quota-service.test.ts`
Expected: PASS

- [ ] **Step 7: 커밋**

```bash
git add lib/admin/ tests/lib/admin/pricing-service.test.ts tests/lib/admin/quota-service.test.ts
git commit -m "feat(admin): add pricing and quota management services with tests"
```

---

## Task 5: 관리자 API 엔드포인트

**Files:**
- Create: `app/api/admin/token-usage/route.ts`
- Create: `app/api/admin/token-usage/users/route.ts`
- Create: `app/api/admin/model-pricing/route.ts`
- Create: `app/api/admin/quotas/route.ts`
- Create: `app/api/admin/quotas/[id]/route.ts`

- [ ] **Step 1: GET /api/admin/token-usage**

`app/api/admin/token-usage/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { getSystemUsageSummary } from "@/lib/admin/usage-service"
import { adminUsageQuerySchema } from "@/lib/validations/admin"
import { getDateRange } from "@/lib/utils/date-range"

export async function GET(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })
  }

  const params = Object.fromEntries(request.nextUrl.searchParams)
  const parsed = adminUsageQuerySchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  try {
    const { start, end } = getDateRange(parsed.data.period)
    const summary = await getSystemUsageSummary(start, end)
    return NextResponse.json(summary)
  } catch (error) {
    console.error("[GET /api/admin/token-usage]", error)
    return NextResponse.json({ error: "시스템 사용량 조회에 실패했습니다." }, { status: 500 })
  }
}
```

- [ ] **Step 2: GET /api/admin/token-usage/users**

`app/api/admin/token-usage/users/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { getUserRanking } from "@/lib/admin/usage-service"
import { adminUsageQuerySchema } from "@/lib/validations/admin"
import { getDateRange } from "@/lib/utils/date-range"

export async function GET(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })
  }

  const params = Object.fromEntries(request.nextUrl.searchParams)
  const parsed = adminUsageQuerySchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  try {
    const { start, end } = getDateRange(parsed.data.period)
    const rankings = await getUserRanking({
      startDate: start,
      endDate: end,
      limit: parsed.data.limit,
    })
    return NextResponse.json({ data: rankings })
  } catch (error) {
    console.error("[GET /api/admin/token-usage/users]", error)
    return NextResponse.json({ error: "사용자 랭킹 조회에 실패했습니다." }, { status: 500 })
  }
}
```

- [ ] **Step 3: GET/POST /api/admin/model-pricing**

`app/api/admin/model-pricing/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { listModelPricing, createModelPricing } from "@/lib/admin/pricing-service"
import { createModelPricingSchema } from "@/lib/validations/admin"

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })
  }

  try {
    const pricing = await listModelPricing()
    return NextResponse.json({ data: pricing })
  } catch (error) {
    console.error("[GET /api/admin/model-pricing]", error)
    return NextResponse.json({ error: "단가 목록 조회에 실패했습니다." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "유효하지 않은 요청입니다." }, { status: 400 })
  }

  const parsed = createModelPricingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  try {
    const pricing = await createModelPricing(parsed.data)
    return NextResponse.json(pricing, { status: 201 })
  } catch (error) {
    console.error("[POST /api/admin/model-pricing]", error)
    return NextResponse.json({ error: "단가 등록에 실패했습니다." }, { status: 500 })
  }
}
```

- [ ] **Step 4: GET/POST /api/admin/quotas**

`app/api/admin/quotas/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { listQuotas, createQuota } from "@/lib/admin/quota-service"
import { createQuotaSchema } from "@/lib/validations/admin"

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })
  }

  try {
    const quotas = await listQuotas()
    return NextResponse.json({ data: quotas })
  } catch (error) {
    console.error("[GET /api/admin/quotas]", error)
    return NextResponse.json({ error: "Quota 목록 조회에 실패했습니다." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "유효하지 않은 요청입니다." }, { status: 400 })
  }

  const parsed = createQuotaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  try {
    const quota = await createQuota(parsed.data)
    return NextResponse.json(quota, { status: 201 })
  } catch (error) {
    console.error("[POST /api/admin/quotas]", error)
    return NextResponse.json({ error: "Quota 생성에 실패했습니다." }, { status: 500 })
  }
}
```

- [ ] **Step 5: PUT/DELETE /api/admin/quotas/[id]**

`app/api/admin/quotas/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { updateQuota, deleteQuota } from "@/lib/admin/quota-service"
import { updateQuotaSchema } from "@/lib/validations/admin"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "유효하지 않은 요청입니다." }, { status: 400 })
  }

  const parsed = updateQuotaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  try {
    const quota = await updateQuota(id, parsed.data)
    return NextResponse.json(quota)
  } catch (error) {
    console.error("[PUT /api/admin/quotas]", error)
    return NextResponse.json({ error: "Quota 수정에 실패했습니다." }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })
  }

  const { id } = await params

  try {
    await deleteQuota(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/admin/quotas]", error)
    return NextResponse.json({ error: "Quota 삭제에 실패했습니다." }, { status: 500 })
  }
}
```

- [ ] **Step 6: 타입체크 확인**

Run: `npm run typecheck`
Expected: 에러 없음

- [ ] **Step 7: 커밋**

```bash
git add app/api/admin/
git commit -m "feat(admin-api): add admin endpoints for usage, pricing, and quotas"
```

---

## Task 6: 관리자 페이지 UI

**Files:**
- Create: `components/admin/system-summary.tsx`
- Create: `components/admin/user-ranking-table.tsx`
- Create: `components/admin/distribution-charts.tsx`
- Create: `components/admin/pricing-table.tsx`
- Create: `components/admin/quota-table.tsx`
- Create: `app/(dashboard)/admin/usage/page.tsx`
- Create: `app/(dashboard)/admin/model-pricing/page.tsx`
- Create: `app/(dashboard)/admin/quotas/page.tsx`
- Modify: `lib/config/navigation.ts`
- Modify: `components/layout/app-sidebar.tsx`

> **Note:** UI 구현 시 `/frontend-design` 스킬과 `/vercel-react-best-practices` 스킬을 참고한다.

- [ ] **Step 1: 네비게이션에 관리자 메뉴 추가**

`lib/config/navigation.ts` 수정:

```typescript
import {
  BarChart3,
  DollarSign,
  FileCheck,
  FileText,
  Home,
  Lightbulb,
  MessageSquare,
  PenTool,
  Settings,
  Shield,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  icon: LucideIcon
  label: string
  href: string
}

export const navItems: NavItem[] = [
  { icon: Home, label: "대시보드", href: "/" },
  { icon: FileText, label: "참고자료", href: "/documents" },
  { icon: PenTool, label: "자기소개서", href: "/cover-letters" },
  { icon: MessageSquare, label: "모의면접", href: "/interviews" },
  { icon: Lightbulb, label: "인사이트", href: "/insights" },
  { icon: FileCheck, label: "이력서", href: "/resumes" },
  { icon: BarChart3, label: "사용량", href: "/usage" },
  { icon: Settings, label: "설정", href: "/settings" },
]

export const adminNavItems: NavItem[] = [
  { icon: BarChart3, label: "사용량 모니터링", href: "/admin/usage" },
  { icon: DollarSign, label: "모델 단가", href: "/admin/model-pricing" },
  { icon: Shield, label: "Quota 관리", href: "/admin/quotas" },
]

const allNavItems = [...navItems, ...adminNavItems]

export function getPageTitle(pathname: string): string {
  const exact = allNavItems.find((item) => item.href === pathname)
  if (exact) return exact.label

  const match = allNavItems.find(
    (item) => item.href !== "/" && pathname.startsWith(item.href),
  )
  return match?.label ?? ""
}
```

- [ ] **Step 2: app-sidebar.tsx에 admin 메뉴 그룹 조건부 렌더링**

`components/layout/app-sidebar.tsx`에서 user role을 확인하여 `adminNavItems`를 별도 `SidebarGroup`으로 렌더링. 현재 사용자의 role 정보가 필요하므로, 사이드바에서 DB user를 조회하거나 레이아웃에서 prop으로 전달한다.

- [ ] **Step 3: system-summary.tsx 구현**

시스템 전체 요약 카드 — 총 토큰, 총 비용, 요청 수, 활성 사용자 수. shadcn/ui Card 사용. 4열 그리드.

- [ ] **Step 4: user-ranking-table.tsx 구현**

사용자별 랭킹 테이블. shadcn/ui Table 사용. 컬럼: 순위, 이메일, 이름, 총 토큰, 추정 비용, 요청 수.

- [ ] **Step 5: distribution-charts.tsx 구현**

기능별 도넛 차트 + 모델별 바 차트. PR 1의 FeatureChart/ModelChart와 동일한 패턴. 재사용 가능하다면 PR 1 컴포넌트를 import.

- [ ] **Step 6: 관리자 사용량 페이지 구현**

`app/(dashboard)/admin/usage/page.tsx` — PeriodFilter (PR 1 재사용) + SystemSummary + UserRankingTable + DistributionCharts 조합.

- [ ] **Step 7: pricing-table.tsx + 관리자 단가 페이지 구현**

단가 테이블 (provider, model, input price, output price, effective from) + 새 단가 등록 폼 (Dialog). `app/(dashboard)/admin/model-pricing/page.tsx`.

- [ ] **Step 8: quota-table.tsx + 관리자 Quota 페이지 구현**

Quota 테이블 (사용자, 유형, 한도, 기간, 활성) + 생성 Dialog + 수정/삭제 액션. `app/(dashboard)/admin/quotas/page.tsx`.

- [ ] **Step 9: 타입체크 + 린트 + 테스트**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: 에러 없음

- [ ] **Step 10: 커밋**

```bash
git add lib/config/navigation.ts components/layout/app-sidebar.tsx components/admin/ app/(dashboard)/admin/
git commit -m "feat(admin-ui): add admin pages for usage monitoring, pricing, and quotas"
```

---

## Task 7: 최종 검증 및 정리

- [ ] **Step 1: 전체 테스트 실행**

Run: `npm run test`
Expected: 모든 테스트 PASS

- [ ] **Step 2: 타입체크 + 린트**

Run: `npm run typecheck && npm run lint`
Expected: 에러 없음

- [ ] **Step 3: /simplify 실행**

변경된 코드에 대해 `/simplify` 스킬 실행.

- [ ] **Step 4: spec-deviations.md 업데이트**

Raw SQL 사용 사유를 `docs/references/spec-deviations.md`에 기록.

- [ ] **Step 5: 최종 커밋 (필요 시)**

수정사항이 있으면 커밋.
