# PR #48 점검 보고서: Token Usage Core + 사용자 대시보드

## 개요
- 점검 일시: 2026-03-21
- 대상: PR #48 (`feature/token-usage-core` → `develop`)
- 스펙: `docs/superpowers/specs/2026-03-21-token-usage-tracking-design.md`
- 플랜: `docs/superpowers/plans/2026-03-21-token-usage-core.md`
- 전체 달성률: **95%**

## PR 범위 확인

이 PR은 스펙의 **PR 1 범위**(토큰 추적 핵심 + 사용자 대시보드)를 구현한다. 관리자 시스템(관리자 API, 관리자 페이지)은 PR 2에서 구현 예정이므로 이 점검에서 제외한다.

## 상세 점검 결과

### 1. 데이터 모델 (Prisma Schema)

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 1 | TokenUsageLog 모델 | ✅ | 스펙/플랜과 동일. 모든 필드, 인덱스, 매핑 일치 |
| 2 | ModelPricing 모델 | ✅ | unique 제약조건 `(provider, model, effectiveFrom)` 포함 |
| 3 | Quota 모델 | ✅ | limitValue `Decimal(12,2)`, isActive 기본값 true |
| 4 | User.role 필드 추가 | ✅ | `UserRole` enum (USER/ADMIN), 기본값 USER |
| 5 | UsageFeature enum | ✅ | COVER_LETTER, INTERVIEW, INSIGHT, EMBEDDING |
| 6 | LimitType enum | ✅ | TOKENS, COST, REQUESTS |
| 7 | LimitPeriod enum | ✅ | DAILY, MONTHLY |
| 8 | provider 필드를 String으로 정의 | ✅ | 플랜의 의도적 차이(spec deviation): Prisma enum 대신 String 사용 |

### 2. 서비스 레이어

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 9 | `recordUsage()` | ✅ | 비용 계산 + 로그 저장 일체 처리 |
| 10 | `calculateCost()` | ✅ | effectiveFrom 기반 최신 단가 조회 |
| 11 | `getCurrentPricing()` | ✅ | 각 모델별 최신 단가 반환 |
| 12 | `checkQuotaExceeded()` | ✅ | TOKENS/COST/REQUESTS 3종 모두 처리 |
| 13 | `getUserQuotas()` | ✅ | |
| 14 | `getUserQuotasWithUsage()` | ✅ | 대시보드 프로그레스 바용 |
| 15 | `getUserUsage()` | ✅ | 커서 기반 페이지네이션, 기능/날짜 필터 |
| 16 | `getUserUsageSummary()` | ✅ | aggregate + groupBy + raw query(일별) |
| 17 | `QuotaExceededError` 클래스 | ✅ | |

### 3. AI 호출 지점 통합

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 18 | `getLanguageModel()` 반환 타입 변경 | ✅ | `{ model, isServerKey, provider, modelId }` |
| 19 | 커버레터 채팅 — onFinish에서 recordUsage | ✅ | `.catch()` 패턴으로 실패 시 무시 |
| 20 | 커버레터 채팅 — quota 체크 | ✅ | 모델 로드 직후, streamText 전에 체크 |
| 21 | 면접 채팅 — onFinish에서 recordUsage | ✅ | 동일 패턴 |
| 22 | 면접 채팅 — quota 체크 | ✅ | 동일 패턴 |
| 23 | 인사이트 추출 — generateObject 후 recordUsage | ✅ | usage 캡처 + 기록 |
| 24 | 인사이트 추출 — quota 체크 | ✅ | extractInsights 함수 내에서 체크 |
| 25 | 인사이트 추출 — QuotaExceededError 핸들링 | ✅ | extract route에서 403 반환 |
| 26 | 임베딩 — generateEmbeddings에서 usage 반환 | ✅ | `{ embeddings, totalTokens }` |
| 27 | 임베딩 — documents/service에서 recordUsage | ✅ | isServerKey: true, provider: "openai" |
| 28 | isServerKey 결정 방식 | ✅ | getLanguageModel()이 false 반환, 임베딩은 hardcoded true |

### 4. API 엔드포인트

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 29 | `GET /api/token-usage` | ✅ | 커서 페이지네이션, Zod 검증 |
| 30 | `GET /api/token-usage/summary` | ✅ | 기간별(7d/30d/90d) + 커스텀 날짜 범위 |
| 31 | Zod 검증 스키마 | ✅ | tokenUsageQuerySchema, usageSummaryQuerySchema |

### 5. 사용자 대시보드 UI

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 32 | `/dashboard/usage` 페이지 | ✅ | `app/(dashboard)/usage/page.tsx` |
| 33 | 사이드바 "사용량" 메뉴 | ✅ | BarChart3 아이콘, Settings 앞에 배치 |
| 34 | 상단 요약 카드 (토큰/비용/요청) | ✅ | summary-cards.tsx |
| 35 | 일별 추이 라인 차트 | ✅ | daily-chart.tsx (Recharts LineChart) |
| 36 | 기능별 비중 도넛 차트 | ✅ | feature-chart.tsx (Recharts PieChart) |
| 37 | 모델별 비교 바 차트 | ✅ | model-chart.tsx (Recharts BarChart) |
| 38 | 기간 필터 (7일/30일/90일) | ✅ | period-filter.tsx (Tabs 기반) |
| 39 | Quota 프로그레스 바 | ✅ | quota-progress.tsx (Progress 컴포넌트) |
| 40 | 차트 라이브러리: Recharts | ✅ | recharts ^3.8.0 설치 |
| 41 | 커스텀 범위 기간 필터 | ⚠️ | API에서는 startDate/endDate 지원하나 UI에 커스텀 범위 선택 UI 미구현 |

### 6. 시드 데이터

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 42 | prisma/seed.ts | ✅ | 7개 모델 단가 데이터 |
| 43 | package.json prisma.seed 설정 | ✅ | `npx tsx prisma/seed.ts` |
| 44 | prisma.config.ts seed 설정 | ✅ | migrations.seed 추가 |
| 45 | PrismaClient 어댑터 방식 | ✅ | PrismaPg 어댑터 사용 (기존 코드베이스 패턴) |

### 7. 테스트

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 46 | service.test.ts | ✅ | recordUsage 비용 계산/저장 테스트 |
| 47 | pricing.test.ts | ✅ | calculateCost 단가 있음/없음 테스트 |
| 48 | quota.test.ts | ✅ | checkQuotaExceeded 초과/미초과 테스트 |
| 49 | 기존 테스트 업데이트 | ✅ | provider.test.ts, cover-letter/interview route 테스트 수정 |

### 8. 기타 변경

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 50 | Phase 스펙 파일 아카이브 | ✅ | `docs/specs/phases/` → `docs/archive/phases/`로 이동, README 업데이트 |

## 주요 발견사항

### 스펙 대비 의도적 차이 (Spec Deviations)

1. **usage 프로퍼티명**: 플랜에서 `usage.promptTokens`/`usage.completionTokens`로 기술했으나, 실제 AI SDK v6의 `onFinish` 콜백과 `generateObject`는 `usage.inputTokens`/`usage.outputTokens`를 사용한다. 구현이 올바르게 SDK 실제 API에 맞춰져 있다.

2. **metadata 타입**: 플랜에서 `Record<string, unknown>`으로 정의했으나, 구현에서는 `Prisma.InputJsonValue`로 변경하여 Prisma JSON 필드와의 타입 호환성을 확보했다. 개선 사항.

3. **UsagePage에서 useTransition 사용**: 플랜에서는 `useState` + loading으로 단순 구현했으나, 구현에서는 `useTransition`을 활용하여 React 18+ 패턴을 적용했다. 개선 사항.

4. **UsageSummary 인터페이스 타입 안전성**: 플랜에서는 `useState<any>(null)`이었으나, 구현에서는 `UsageSummary` 인터페이스를 정의하여 타입 안전하게 구현했다. 개선 사항.

### 미구현 항목

1. **커스텀 기간 범위 UI** (41번): 스펙에서 "커스텀 범위" 기간 필터를 요구하나, 현재 7일/30일/90일 프리셋만 UI에 구현되어 있다. API 레이어에서는 `startDate`/`endDate` 커스텀 파라미터를 이미 지원하므로, UI에 날짜 선택기를 추가하면 해결된다. 이는 사용자 경험 개선 항목이며 핵심 기능 차단 요소는 아니다.

## 권장 조치사항

1. **(선택) 커스텀 기간 범위 UI 추가** — DatePicker를 period-filter에 통합하여 커스텀 날짜 범위 선택을 지원. PR 2 또는 별도 이슈로 처리 가능.

2. **(권장) spec-deviations.md 업데이트** — 다음 항목을 기록 권장:
   - AI SDK v6의 usage 프로퍼티명이 `inputTokens`/`outputTokens`임 (플랜의 `promptTokens`/`completionTokens`와 차이)
   - provider 필드를 Prisma enum 대신 String으로 정의 (플랜에 이미 명시됨)

## 결론

PR 1 범위의 구현이 스펙 및 플랜과 높은 수준으로 일치한다. 데이터 모델, 서비스 레이어, AI 호출 지점 통합, API 엔드포인트, 대시보드 UI, 시드 데이터, 테스트 모두 빠짐없이 구현되었다. 커스텀 기간 범위 UI만 부분 구현 상태이며, 이는 비차단 개선 항목이다. 기존 테스트도 `getLanguageModel()` 반환 타입 변경에 맞춰 올바르게 업데이트되었다.
