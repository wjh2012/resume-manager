# Phase 7: 마무리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대시보드 홈 리뉴얼, 로딩 Skeleton 추가, 자소서 작업공간 모바일 반응형, 최종 검증으로 서비스 완성도를 높인다.

**Architecture:** Server Component 기반 대시보드 홈에서 Prisma count/findMany로 통계·최근 활동을 조회한다. 각 라우트에 맞춤 loading.tsx를 추가하고, 자소서 작업공간은 모바일에서 Tabs로 전환한다.

**Tech Stack:** Next.js App Router, Prisma, shadcn/ui (Skeleton, Tabs, Card), Tailwind CSS, lucide-react

## 스펙 대비 실제 작업 범위 축소

코드베이스 탐색 결과, 스펙에서 요구하는 여러 항목이 이미 구현되어 있어 실제 작업은 다음으로 한정된다:

| 스펙 항목 | 상태 | 비고 |
|-----------|------|------|
| 대시보드 홈 | **작업 필요** | 현재 환영 메시지 + 카드 3개 → 통계 5개 + 빠른 접근 3개 + 최근 활동 |
| 로딩 Skeleton | **부분 작업** | documents만 있음, 나머지 4개 페이지 + 대시보드 추가 |
| 반응형 디자인 | **부분 작업** | 카드 그리드 전부 반응형 완료, 이력서 미리보기 `hidden lg:block` 완료. 자소서 작업공간 탭 전환만 필요 |
| 토스트 알림 | **이미 완료** | 모든 사용자 액션에 toast 이미 적용됨 |
| 빈 상태 | **이미 완료** | 5개 목록 모두 구현됨 |
| 에러 상태 | **이미 완료** | 글로벌 + 대시보드 에러 바운더리 존재 |

## 파일 구조

```
신규:
  lib/dashboard/service.ts          — 대시보드 통계 + 최근 활동 서비스
  components/dashboard/stat-card.tsx — 통계 카드 컴포넌트
  components/dashboard/quick-action-card.tsx — 빠른 접근 카드 컴포넌트
  components/dashboard/recent-activity.tsx   — 최근 활동 섹션 컴포넌트
  app/(dashboard)/loading.tsx       — 대시보드 홈 로딩 Skeleton
  app/(dashboard)/cover-letters/loading.tsx  — 자소서 로딩 Skeleton
  app/(dashboard)/interviews/loading.tsx     — 면접 로딩 Skeleton
  app/(dashboard)/insights/loading.tsx       — 인사이트 로딩 Skeleton
  app/(dashboard)/resumes/loading.tsx        — 이력서 로딩 Skeleton
  tests/lib/dashboard/service.test.ts        — 대시보드 서비스 테스트

수정:
  app/(dashboard)/page.tsx          — 대시보드 홈 리뉴얼
  components/cover-letters/cover-letter-workspace.tsx — 모바일 탭 전환
```

---

### Task 1: 대시보드 서비스 레이어

**Files:**
- Create: `lib/dashboard/service.ts`
- Create: `tests/lib/dashboard/service.test.ts`

- [ ] **Step 1: Write the failing test for getDashboardStats**

```ts
// tests/lib/dashboard/service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { getDashboardStats } from "@/lib/dashboard/service"

// prisma mock — 기존 테스트 패턴 참조 (tests/lib/documents/service.test.ts)
// count + findMany를 모두 포함 (getDashboardStats + getRecentActivity 양쪽에서 사용)
vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: { count: vi.fn() },
    coverLetter: { count: vi.fn(), findMany: vi.fn() },
    interviewSession: { count: vi.fn(), findMany: vi.fn() },
    insight: { count: vi.fn(), findMany: vi.fn() },
    resume: { count: vi.fn() },
  },
}))

import { prisma } from "@/lib/prisma"

describe("getDashboardStats", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns counts for all 5 models", async () => {
    vi.mocked(prisma.document.count).mockResolvedValue(10)
    vi.mocked(prisma.coverLetter.count).mockResolvedValue(3)
    vi.mocked(prisma.interviewSession.count).mockResolvedValue(5)
    vi.mocked(prisma.insight.count).mockResolvedValue(12)
    vi.mocked(prisma.resume.count).mockResolvedValue(2)

    const stats = await getDashboardStats("user-1")

    expect(stats).toEqual({
      documents: 10,
      coverLetters: 3,
      interviews: 5,
      insights: 12,
      resumes: 2,
    })

    // All calls should filter by userId
    expect(prisma.document.count).toHaveBeenCalledWith({ where: { userId: "user-1" } })
    expect(prisma.coverLetter.count).toHaveBeenCalledWith({ where: { userId: "user-1" } })
    expect(prisma.interviewSession.count).toHaveBeenCalledWith({ where: { userId: "user-1" } })
    expect(prisma.insight.count).toHaveBeenCalledWith({ where: { userId: "user-1" } })
    expect(prisma.resume.count).toHaveBeenCalledWith({ where: { userId: "user-1" } })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/dashboard/service.test.ts`
Expected: FAIL — module `@/lib/dashboard/service` not found

- [ ] **Step 3: Implement getDashboardStats**

```ts
// lib/dashboard/service.ts
import { prisma } from "@/lib/prisma"

export interface DashboardStats {
  documents: number
  coverLetters: number
  interviews: number
  insights: number
  resumes: number
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const [documents, coverLetters, interviews, insights, resumes] = await Promise.all([
    prisma.document.count({ where: { userId } }),
    prisma.coverLetter.count({ where: { userId } }),
    prisma.interviewSession.count({ where: { userId } }),
    prisma.insight.count({ where: { userId } }),
    prisma.resume.count({ where: { userId } }),
  ])

  return { documents, coverLetters, interviews, insights, resumes }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/dashboard/service.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing test for getRecentActivity**

```ts
// tests/lib/dashboard/service.test.ts (추가 — 같은 파일에 describe 블록만 추가)
// vi.mock은 이미 Step 1에서 findMany 포함하여 정의됨. import만 추가:
import { getRecentActivity } from "@/lib/dashboard/service"

describe("getRecentActivity", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns recent cover letters, interviews, and insights", async () => {
    const mockCoverLetters = [
      { id: "cl-1", title: "자소서 1", updatedAt: new Date("2026-03-20") },
    ]
    const mockInterviews = [
      { id: "iv-1", title: "면접 1", status: "COMPLETED", updatedAt: new Date("2026-03-19") },
    ]
    const mockInsights = [
      { id: "in-1", category: "strength", content: "인사이트 내용", updatedAt: new Date("2026-03-18") },
    ]

    vi.mocked(prisma.coverLetter.findMany).mockResolvedValue(mockCoverLetters as never)
    vi.mocked(prisma.interviewSession.findMany).mockResolvedValue(mockInterviews as never)
    vi.mocked(prisma.insight.findMany).mockResolvedValue(mockInsights as never)

    const activity = await getRecentActivity("user-1")

    expect(activity.coverLetters).toEqual(mockCoverLetters)
    expect(activity.interviews).toEqual(mockInterviews)
    expect(activity.insights).toEqual(mockInsights)

    // Verify ordering and limits
    expect(prisma.coverLetter.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { id: true, title: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 3,
    })
    expect(prisma.interviewSession.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { id: true, title: true, status: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 3,
    })
    expect(prisma.insight.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { id: true, category: true, content: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    })
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run tests/lib/dashboard/service.test.ts`
Expected: FAIL — `getRecentActivity` not exported

- [ ] **Step 7: Implement getRecentActivity**

```ts
// lib/dashboard/service.ts (추가)
export interface RecentActivity {
  coverLetters: { id: string; title: string; updatedAt: Date }[]
  interviews: { id: string; title: string; status: string; updatedAt: Date }[]
  insights: { id: string; category: string; content: string; updatedAt: Date }[]
}

export async function getRecentActivity(userId: string): Promise<RecentActivity> {
  const [coverLetters, interviews, insights] = await Promise.all([
    prisma.coverLetter.findMany({
      where: { userId },
      select: { id: true, title: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 3,
    }),
    prisma.interviewSession.findMany({
      where: { userId },
      select: { id: true, title: true, status: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 3,
    }),
    prisma.insight.findMany({
      where: { userId },
      select: { id: true, category: true, content: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ])

  return { coverLetters, interviews, insights }
}
```

- [ ] **Step 8: Run all tests to verify they pass**

Run: `npx vitest run tests/lib/dashboard/service.test.ts`
Expected: PASS (all tests)

- [ ] **Step 9: Commit**

```bash
git add lib/dashboard/service.ts tests/lib/dashboard/service.test.ts
git commit -m "feat(dashboard): add dashboard service layer for stats and recent activity"
```

---

### Task 2: 대시보드 UI 컴포넌트

**Files:**
- Create: `components/dashboard/stat-card.tsx`
- Create: `components/dashboard/quick-action-card.tsx`
- Create: `components/dashboard/recent-activity.tsx`

**참고 패턴:**
- 기존 카드 스타일: `rounded-xl border p-6`, hover 시 `shadow-sm` 전환
- 아이콘: lucide-react, `h-5 w-5` 또는 `h-6 w-6`
- 내비게이션 아이콘 매핑: `lib/config/navigation.ts` 참조 (FileText, PenTool, MessageSquare, Lightbulb, FileCheck)

- [ ] **Step 1: Create stat-card.tsx**

```tsx
// components/dashboard/stat-card.tsx
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface StatCardProps {
  icon: LucideIcon
  value: number
  label: string
  href: string
}

export function StatCard({ icon: Icon, value, label, href }: StatCardProps) {
  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-sm">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <Icon aria-hidden="true" className="text-muted-foreground h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-muted-foreground text-sm">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
```

- [ ] **Step 2: Create quick-action-card.tsx**

```tsx
// components/dashboard/quick-action-card.tsx
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface QuickActionCardProps {
  icon: LucideIcon
  title: string
  description: string
  href: string
}

export function QuickActionCard({ icon: Icon, title, description, href }: QuickActionCardProps) {
  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-sm">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <Icon aria-hidden="true" className="text-primary h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
```

- [ ] **Step 3: Create recent-activity.tsx**

```tsx
// components/dashboard/recent-activity.tsx
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { RecentActivity } from "@/lib/dashboard/service"

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  })
}

function interviewStatusLabel(status: string): string {
  return status === "COMPLETED" ? "완료" : "진행 중"
}

interface RecentActivitySectionProps {
  activity: RecentActivity
}

export function RecentActivitySection({ activity }: RecentActivitySectionProps) {
  const hasAny =
    activity.coverLetters.length > 0 ||
    activity.interviews.length > 0 ||
    activity.insights.length > 0

  if (!hasAny) {
    return (
      <p className="text-muted-foreground py-8 text-center">
        아직 활동이 없습니다
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* 최근 자기소개서 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">최근 자기소개서</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activity.coverLetters.length === 0 ? (
            <p className="text-muted-foreground text-sm">없음</p>
          ) : (
            activity.coverLetters.map((cl) => (
              <Link
                key={cl.id}
                href={`/cover-letters/${cl.id}`}
                className="hover:bg-muted flex items-center justify-between rounded-md px-2 py-1.5 transition-colors"
              >
                <span className="truncate text-sm font-medium">{cl.title}</span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {formatDate(cl.updatedAt)}
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      {/* 최근 모의면접 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">최근 모의면접</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activity.interviews.length === 0 ? (
            <p className="text-muted-foreground text-sm">없음</p>
          ) : (
            activity.interviews.map((iv) => (
              <Link
                key={iv.id}
                href={`/interviews/${iv.id}`}
                className="hover:bg-muted flex items-center justify-between rounded-md px-2 py-1.5 transition-colors"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium">{iv.title}</span>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {interviewStatusLabel(iv.status)}
                  </Badge>
                </div>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {formatDate(iv.updatedAt)}
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      {/* 최근 인사이트 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">최근 인사이트</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activity.insights.length === 0 ? (
            <p className="text-muted-foreground text-sm">없음</p>
          ) : (
            activity.insights.map((ins) => (
              <div
                key={ins.id}
                className="space-y-1 rounded-md px-2 py-1.5"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {ins.category}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {formatDate(ins.updatedAt)}
                  </span>
                </div>
                <p className="text-muted-foreground line-clamp-1 text-sm">
                  {ins.content}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/stat-card.tsx components/dashboard/quick-action-card.tsx components/dashboard/recent-activity.tsx
git commit -m "feat(dashboard): add stat-card, quick-action-card, recent-activity components"
```

---

### Task 3: 대시보드 홈 페이지 리뉴얼

**Files:**
- Modify: `app/(dashboard)/page.tsx`

**참고:**
- 기존 파일은 Server Component로 `countDocuments()`만 호출
- 새 구현은 `getDashboardStats()` + `getRecentActivity()` 호출
- 기존 `animate-fade-in-up` 애니메이션 패턴 유지

- [ ] **Step 1: Rewrite dashboard page**

```tsx
// app/(dashboard)/page.tsx
import { redirect } from "next/navigation"
import {
  FileText,
  PenTool,
  MessageSquare,
  Lightbulb,
  FileCheck,
} from "lucide-react"
import { getAuthUser } from "@/lib/supabase/user"
import { getDashboardStats, getRecentActivity } from "@/lib/dashboard/service"
import { StatCard } from "@/components/dashboard/stat-card"
import { QuickActionCard } from "@/components/dashboard/quick-action-card"
import { RecentActivitySection } from "@/components/dashboard/recent-activity"

export default async function DashboardPage() {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const [stats, activity] = await Promise.all([
    getDashboardStats(user.id),
    getRecentActivity(user.id),
  ])

  return (
    <div className="space-y-8">
      {/* 통계 카드 */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">전체 현황</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatCard icon={FileText} value={stats.documents} label="업로드한 문서" href="/documents" />
          <StatCard icon={PenTool} value={stats.coverLetters} label="자기소개서" href="/cover-letters" />
          <StatCard icon={MessageSquare} value={stats.interviews} label="모의면접" href="/interviews" />
          <StatCard icon={Lightbulb} value={stats.insights} label="인사이트" href="/insights" />
          <StatCard icon={FileCheck} value={stats.resumes} label="이력서" href="/resumes" />
        </div>
      </section>

      {/* 빠른 접근 */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">빠른 시작</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <QuickActionCard
            icon={PenTool}
            title="새 자기소개서 작성"
            description="AI와 함께 자기소개서를 작성합니다"
            href="/cover-letters/new"
          />
          <QuickActionCard
            icon={MessageSquare}
            title="모의면접 시작"
            description="AI 면접관과 실전 연습을 합니다"
            href="/interviews/new"
          />
          <QuickActionCard
            icon={FileCheck}
            title="이력서 작성"
            description="이력서를 작성하고 PDF로 내보냅니다"
            href="/resumes/new"
          />
        </div>
      </section>

      {/* 최근 활동 */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">최근 활동</h2>
        <RecentActivitySection activity={activity} />
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Verify the page renders**

Run: `npx next build` (또는 dev 서버에서 `/` 접속)
Expected: 대시보드 홈에 통계 5개 + 빠른 접근 3개 + 최근 활동 표시

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/page.tsx
git commit -m "feat(dashboard): redesign home page with stats, quick actions, and recent activity"
```

---

### Task 4: 대시보드 로딩 Skeleton

**Files:**
- Create: `app/(dashboard)/loading.tsx`

- [ ] **Step 1: Create dashboard loading.tsx**

```tsx
// app/(dashboard)/loading.tsx
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* 통계 카드 */}
      <section>
        <Skeleton className="mb-4 h-6 w-24" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 p-6">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-7 w-12" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 빠른 접근 */}
      <section>
        <Skeleton className="mb-4 h-6 w-20" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 p-6">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 최근 활동 */}
      <section>
        <Skeleton className="mb-4 h-6 w-24" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-28" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 3 }, (_, j) => (
                  <div key={j} className="flex items-center justify-between px-2 py-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(dashboard)/loading.tsx
git commit -m "feat(dashboard): add dashboard home loading skeleton"
```

---

### Task 5: 목록 페이지 로딩 Skeleton (4개)

**Files:**
- Create: `app/(dashboard)/cover-letters/loading.tsx`
- Create: `app/(dashboard)/interviews/loading.tsx`
- Create: `app/(dashboard)/insights/loading.tsx`
- Create: `app/(dashboard)/resumes/loading.tsx`

**참고 패턴:**
- `app/(dashboard)/documents/loading.tsx` — 헤더 Skeleton + 리스트 Skeleton 컴포넌트 조합
- 기존 skeleton 컴포넌트: `cover-letter-list-skeleton.tsx`, `interview-list-skeleton.tsx`
- 인사이트와 이력서는 skeleton 컴포넌트가 없으므로 loading.tsx에 인라인 작성

- [ ] **Step 1: Create cover-letters/loading.tsx**

```tsx
// app/(dashboard)/cover-letters/loading.tsx
import { Skeleton } from "@/components/ui/skeleton"
import { CoverLetterListSkeleton } from "@/components/cover-letters/cover-letter-list-skeleton"

export default function CoverLettersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-5 w-56" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <CoverLetterListSkeleton />
    </div>
  )
}
```

- [ ] **Step 2: Create interviews/loading.tsx**

```tsx
// app/(dashboard)/interviews/loading.tsx
import { Skeleton } from "@/components/ui/skeleton"
import { InterviewListSkeleton } from "@/components/interviews/interview-list-skeleton"

export default function InterviewsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <InterviewListSkeleton />
    </div>
  )
}
```

- [ ] **Step 3: Create insights/loading.tsx**

인사이트 페이지는 헤더 패턴이 다름 (아이콘 + 제목, 버튼 없음, 카테고리 필터 바 있음).

```tsx
// app/(dashboard)/insights/loading.tsx
import { Skeleton } from "@/components/ui/skeleton"

export default function InsightsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-6" />
        <Skeleton className="h-8 w-24" />
      </div>
      {/* 카테고리 필터 바 */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-md" />
        ))}
      </div>
      {/* 카드 그리드 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-3 rounded-xl border p-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create resumes/loading.tsx**

```tsx
// app/(dashboard)/resumes/loading.tsx
import { Skeleton } from "@/components/ui/skeleton"

export default function ResumesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-5 w-56" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-3 rounded-xl border p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-5 w-32" />
              </div>
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/cover-letters/loading.tsx app/(dashboard)/interviews/loading.tsx app/(dashboard)/insights/loading.tsx app/(dashboard)/resumes/loading.tsx
git commit -m "feat: add loading skeletons for cover-letters, interviews, insights, resumes pages"
```

---

### Task 6: 자소서 작업공간 모바일 반응형

**Files:**
- Modify: `components/cover-letters/cover-letter-workspace.tsx`

**참고:**
- 현재: `ResizablePanelGroup` (horizontal)으로 에디터/채팅 2분할
- 변경: 모바일에서 `Tabs`로 전환, 태블릿 이상에서 기존 유지
- `useIsMobile()` 훅 사용 (`hooks/use-mobile.ts`)
- `Tabs` 컴포넌트: `components/ui/tabs.tsx` (shadcn/ui)

- [ ] **Step 1: Modify cover-letter-workspace.tsx for mobile tabs**

기존 `ResizablePanelGroup`을 조건부로 렌더링:

```tsx
// components/cover-letters/cover-letter-workspace.tsx
"use client"

import { useState, useCallback } from "react"
import type { UIMessage } from "ai"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useIsMobile } from "@/hooks/use-mobile"
import { CoverLetterEditor } from "./cover-letter-editor"
import { CoverLetterChat } from "./cover-letter-chat"

interface DocumentItem {
  id: string
  title: string
  type: string
}

interface CoverLetterWorkspaceProps {
  coverLetterId: string
  conversationId: string
  initialContent: string
  initialMessages: UIMessage[]
  documents: DocumentItem[]
  selectedDocumentIds: string[]
}

export function CoverLetterWorkspace({
  coverLetterId,
  conversationId,
  initialContent,
  initialMessages,
  documents,
  selectedDocumentIds,
}: CoverLetterWorkspaceProps) {
  const [content, setContent] = useState(initialContent)
  const isMobile = useIsMobile()

  const handleAppendToEditor = useCallback((text: string) => {
    setContent((prev) => (prev ? prev + "\n\n" + text : text))
  }, [])

  const editor = (
    <CoverLetterEditor
      coverLetterId={coverLetterId}
      content={content}
      onContentChange={setContent}
    />
  )

  const chat = (
    <CoverLetterChat
      coverLetterId={coverLetterId}
      conversationId={conversationId}
      initialMessages={initialMessages}
      documents={documents}
      initialSelectedDocIds={selectedDocumentIds}
      onAppendToEditor={handleAppendToEditor}
    />
  )

  if (isMobile) {
    return (
      <Tabs defaultValue="editor" className="flex h-full flex-col">
        <TabsList className="w-full shrink-0">
          <TabsTrigger value="editor" className="flex-1">에디터</TabsTrigger>
          <TabsTrigger value="chat" className="flex-1">AI 채팅</TabsTrigger>
        </TabsList>
        <TabsContent value="editor" className="mt-0 min-h-0 flex-1 overflow-hidden">
          {editor}
        </TabsContent>
        <TabsContent value="chat" className="mt-0 min-h-0 flex-1 overflow-hidden">
          {chat}
        </TabsContent>
      </Tabs>
    )
  }

  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full">
      <ResizablePanel defaultSize={50} minSize={30} className="overflow-hidden">
        {editor}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50} minSize={30} className="overflow-hidden">
        {chat}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
```

- [ ] **Step 2: Test mobile view**

Dev 서버에서 브라우저 DevTools 모바일 뷰(375px)로 자소서 상세 페이지 접속:
- "에디터" / "AI 채팅" 탭이 상단에 표시되는지 확인
- 탭 전환이 동작하는지 확인
- 데스크톱 뷰(1280px)에서 기존 2분할이 유지되는지 확인

- [ ] **Step 3: Commit**

```bash
git add components/cover-letters/cover-letter-workspace.tsx
git commit -m "feat(cover-letter): add mobile tab layout for workspace"
```

---

### Task 7: 최종 검증

**Files:** None (검증만)

- [ ] **Step 1: Run typecheck**

Run: `npx tsc --noEmit` (또는 `npm run typecheck`)
Expected: 에러 없음

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: 경고 최소화

- [ ] **Step 4: Run existing tests**

Run: `npx vitest run`
Expected: 기존 테스트 모두 PASS

- [ ] **Step 5: Fix any issues found**

typecheck/build/lint/test에서 발견된 이슈 수정

- [ ] **Step 6: Final commit (if fixes needed)**

```bash
git add -A
git commit -m "fix: resolve build/typecheck issues for phase-7"
```
