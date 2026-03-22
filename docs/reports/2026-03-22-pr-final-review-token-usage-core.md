# PR #48 최종 점검 보고서: Token Usage Core

## 개요
- 점검 일시: 2026-03-22
- 대상: PR #48 `feat: AI API 토큰 사용량 추적 + 사용자 대시보드`
- 브랜치: `feature/token-usage-core` → `develop`
- 스펙: `docs/superpowers/specs/2026-03-21-token-usage-tracking-design.md`
- 플랜: `docs/superpowers/plans/2026-03-21-token-usage-core.md`
- PR 범위: 스펙의 PR 1 (토큰 추적 핵심 + 사용자 대시보드). 관리자 시스템은 PR 2 범위.
- @claude 코드 리뷰: 3회 완료, 모든 피드백 반영 또는 GitHub Issues 등록
- 전체 달성률: **100%** (PR 1 범위 기준)

## 상세 점검 결과

### 데이터 모델 (스펙 대비)

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 1 | TokenUsageLog 모델 | ✅ 완료 | 모든 필드 일치. `provider`는 String (spec-deviations 기록됨) |
| 2 | ModelPricing 모델 | ✅ 완료 | append-only 설계, unique 제약 조건 일치 |
| 3 | Quota 모델 | ✅ 완료 | limitType/period enum, isActive, Decimal(12,2) 모두 일치 |
| 4 | User.role 필드 추가 | ✅ 완료 | `UserRole` enum (USER/ADMIN), 기본값 USER |
| 5 | TokenUsageLog 인덱스 (userId, createdAt) | ✅ 완료 | `@@index([userId, createdAt])` |
| 6 | TokenUsageLog 인덱스 (createdAt) | ✅ 완료 | `@@index([createdAt])` |
| 7 | ModelPricing unique (provider, model, effectiveFrom) | ✅ 완료 | `@@unique([provider, model, effectiveFrom])` |

### 서비스 레이어 (스펙 대비)

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 8 | `lib/token-usage/service.ts` — recordUsage() | ✅ 완료 | 비용 계산 + 로그 저장 단일 함수 |
| 9 | `lib/token-usage/service.ts` — getUserUsage() | ✅ 완료 | 기간/기능 필터 + 커서 페이지네이션 |
| 10 | `lib/token-usage/service.ts` — getUserUsageSummary() | ✅ 완료 | 집계 + 일별 raw SQL (타임존 반영) |
| 11 | `lib/token-usage/pricing.ts` — calculateCost() | ✅ 완료 | effectiveFrom 기반 유효 단가 조회, Decimal 연산 |
| 12 | `lib/token-usage/pricing.ts` — getCurrentPricing() | ✅ 완료 | (provider, model)별 최신 단가 반환 |
| 13 | `lib/token-usage/quota.ts` — checkQuotaExceeded() | ✅ 완료 | TOKENS/COST/REQUESTS 3가지 유형, soft-limit 문서화 |
| 14 | `lib/token-usage/quota.ts` — getUserQuotas() | ✅ 완료 | |
| 15 | `lib/token-usage/quota.ts` — getUserQuotasWithUsage() | ✅ 완료 | 대시보드 프로그레스 바용 |

### 토큰 기록 통합 (스펙 대비)

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 16 | 커버레터 채팅 — onFinish에서 recordUsage() | ✅ 완료 | `usage.inputTokens/outputTokens` 사용 (spec-deviations 기록) |
| 17 | 면접 채팅 — onFinish에서 recordUsage() | ✅ 완료 | 동일 패턴 |
| 18 | 인사이트 추출 — generateObject() usage 캡처 | ✅ 완료 | usage 디스트럭처링 추가, recordUsage() 호출 |
| 19 | 임베딩 — embedMany() usage 캡처 | ✅ 완료 | `totalTokens` 반환, promptTokens에 기록, completionTokens=0 |
| 20 | isServerKey 결정 — getLanguageModel() 반환 | ✅ 완료 | `{ model, isServerKey, provider, modelId }` 반환 |
| 21 | 임베딩 isServerKey=true 하드코딩 | ✅ 완료 | `documents/service.ts`에서 직접 지정 |

### Quota 체크 (스펙 대비)

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 22 | 커버레터 — 호출 전 checkQuotaExceeded() | ✅ 완료 | Promise.all 이전으로 배치 (2차 리뷰 반영) |
| 23 | 면접 — 호출 전 checkQuotaExceeded() | ✅ 완료 | 동일 |
| 24 | 인사이트 — 호출 전 checkQuotaExceeded() | ✅ 완료 | QuotaExceededError throw → route에서 403 |
| 25 | 임베딩(문서 업로드) — 호출 전 checkQuotaExceeded() | ✅ 완료 | 초과 시 임베딩 스킵, embeddingSkipped 반환 |
| 26 | Quota 초과 시 403 응답 | ✅ 완료 | "사용 한도를 초과했습니다." |
| 27 | 동시 요청 초과 허용 (soft-limit) | ✅ 완료 | JSDoc 주석 + 스펙 참조 명시 |

### API 엔드포인트 — 사용자용 (PR 1 범위)

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 28 | `GET /api/token-usage` | ✅ 완료 | 커서 페이지네이션, 기간/기능 필터, Zod 검증 |
| 29 | `GET /api/token-usage/summary` | ✅ 완료 | 기간별/커스텀 범위, Quota 현황 포함 |
| 30 | 페이지네이션 (cursor, limit 50/100) | ✅ 완료 | `limit` default 50, max 100 |

### API 엔드포인트 — 관리자용 (PR 2 범위, 이번 PR 범위 밖)

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 31 | `GET /api/admin/token-usage` | 📋 PR 2 | 범위 밖 |
| 32 | `GET /api/admin/token-usage/users` | 📋 PR 2 | 범위 밖 |
| 33 | `GET /api/admin/model-pricing` | 📋 PR 2 | 범위 밖 |
| 34 | `POST /api/admin/model-pricing` | 📋 PR 2 | 범위 밖 |
| 35 | `GET /api/admin/quotas` | 📋 PR 2 | 범위 밖 |
| 36 | `POST /api/admin/quotas` | 📋 PR 2 | 범위 밖 |
| 37 | `PUT /api/admin/quotas/[id]` | 📋 PR 2 | 범위 밖 |
| 38 | `DELETE /api/admin/quotas/[id]` | 📋 PR 2 | 범위 밖 |
| 39 | `requireAdmin()` 유틸리티 | 📋 PR 2 | 범위 밖 |

### UI — 사용자 대시보드 (PR 1 범위)

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 40 | `/dashboard/usage` 페이지 | ✅ 완료 | `app/(dashboard)/usage/page.tsx` |
| 41 | 사이드바 "사용량" 메뉴 | ✅ 완료 | `BarChart3` 아이콘, `/usage` |
| 42 | 상단 요약 카드 (토큰/비용/요청수) | ✅ 완료 | `summary-cards.tsx` |
| 43 | 일별 추이 라인 차트 | ✅ 완료 | `daily-chart.tsx` (Recharts LineChart) |
| 44 | 기능별 비중 도넛 차트 | ✅ 완료 | `feature-chart.tsx` (Recharts PieChart, innerRadius) |
| 45 | 모델별 비교 바 차트 | ✅ 완료 | `model-chart.tsx` (Recharts BarChart) |
| 46 | 기간 필터 (7일/30일/90일/커스텀) | ✅ 완료 | `period-filter.tsx` (Tabs + Calendar DateRange) |
| 47 | Quota 프로그레스 바 | ✅ 완료 | `quota-progress.tsx` (Progress + NaN 가드) |
| 48 | 차트 라이브러리: Recharts | ✅ 완료 | package.json에 recharts 추가 |

### UI — 관리자 페이지 (PR 2 범위, 이번 PR 범위 밖)

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 49 | `/admin/usage` 사용량 모니터링 | 📋 PR 2 | 범위 밖 |
| 50 | `/admin/model-pricing` 단가 관리 | 📋 PR 2 | 범위 밖 |
| 51 | `/admin/quotas` Quota 관리 | 📋 PR 2 | 범위 밖 |

### 시드 데이터

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 52 | ModelPricing 시드 (7개 모델) | ✅ 완료 | 스펙의 모든 모델/가격 일치 |
| 53 | prisma.seed 설정 | ✅ 완료 | `package.json` prisma.seed + `prisma.config.ts` |

### 테스트

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 54 | pricing.test.ts | ✅ 완료 | 비용 계산 + null 반환 케이스 |
| 55 | quota.test.ts | ✅ 완료 | 빈 quota + 초과 케이스, mock 타입 수정 완료 |
| 56 | service.test.ts | ✅ 완료 | recordUsage 정상/null 비용 케이스 |
| 57 | 기존 테스트 수정 | ✅ 완료 | provider.test, cover-letter/interview route test, documents service test |
| 58 | 전체 테스트 통과 | ✅ 완료 | 676/676 |

### 문서화

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 59 | `docs/features/11-token-usage.md` | ✅ 완료 | 동작 방식, 데이터 흐름, 컴포넌트 목록 |
| 60 | `docs/specs/api-reference.md` 업데이트 | ✅ 완료 | 토큰 사용량 API 2개 추가 |
| 61 | `docs/specs/database-schema.md` 업데이트 | ✅ 완료 | 3개 모델 + User.role 추가 |
| 62 | `docs/specs/architecture.md` 업데이트 | ✅ 완료 | 토큰 사용량 레이어 추가 |
| 63 | `docs/references/spec-deviations.md` 업데이트 | ✅ 완료 | 3건 추가 (provider String, Raw SQL, inputTokens) |

### Phase 스펙 정리 (부수 작업)

| # | 변경사항 | 상태 | 비고 |
|---|---------|------|------|
| 64 | Phase 0-7 스펙 → `docs/archive/phases/` 이동 | ✅ 완료 | 구현 완료된 스펙 아카이빙 |
| 65 | `docs/specs/README.md` 업데이트 | ✅ 완료 | 아카이브 안내 문구 |

## @claude 코드 리뷰 피드백 반영 현황

### 1차 리뷰 (10건)

| # | 항목 | 반영 상태 |
|---|------|----------|
| 1 | `mockFindMany` 미정의 변수 | ✅ 수정 |
| 2 | 에러 시 "로딩 중..." 고착 | ✅ `useReducer` + `FetchState` 유니온 타입 |
| 3 | `useTransition` 오용 | ✅ `useEffect` + `useReducer` 패턴 |
| 4 | N+1 쿼리 (quota) | ✅ JSDoc 주석 (1~3개 허용 설계) |
| 5 | Quota 체크 위치 (비싼 작업 후) | ✅ `Promise.all` 이전으로 이동 |
| 6 | TOCTOU 경쟁 조건 | ✅ soft-limit 문서화 |
| 7 | 임베딩 quota 체크 누락 | ✅ `uploadDocument`에 추가 |
| 8 | 타임존 이슈 (DATE UTC) | ✅ `AT TIME ZONE ${tz}` + 클라이언트 tz 전달 |
| 9 | `limitValue === 0` NaN | ✅ 가드 추가 |
| 10 | `UsageSummary` 타입 중복 | GitHub Issue #51 등록 |

### 2차 리뷰 (3건)

| # | 항목 | 반영 상태 |
|---|------|----------|
| 1 | `embeddingSkipped` 사용자 피드백 | ✅ `UploadResult.embeddingSkipped` 추가 |
| 2 | `getPeriodStart()` 서버 UTC 기준 | GitHub Issue #58 등록 |
| 3 | `tz` 정규식 오프셋 타임존 거부 | GitHub Issue #59 등록 |

### 3차 리뷰 (1건)

| # | 항목 | 반영 상태 |
|---|------|----------|
| 1 | `generateEmbeddings` mock 타입 불일치 | ✅ 수정 |

## 등록된 GitHub Issues (보류 항목)

| Issue | 제목 | 유형 |
|-------|------|------|
| #51 | UsageSummary 타입 공유 (page.tsx / service.ts) | refactor |
| #52 | startDate/endDate 쌍 검증 누락 | bug |
| #53 | resume 날짜 쌍 검증 누락 | bug |
| #54 | MessageRole enum 대소문자 불일치 | bug |
| #55 | experience isCurrent/endDate 교차 검증 | bug |
| #56 | INSIGHT_CATEGORY_LABELS 상수화 | enhancement |
| #57 | token-usage 날짜 쌍 검증 | bug |
| #58 | getPeriodStart() quota 기간 경계 서버 UTC | bug |
| #59 | tz 정규식 오프셋 기반 타임존 거부 | bug |

## 머지 가능 여부 판단

**머지 가능 (Approve)**

근거:
1. PR 1 범위(토큰 추적 핵심 + 사용자 대시보드)의 모든 요구사항이 구현 완료됨 (30/30 항목)
2. @claude 3회 코드 리뷰에서 발견된 모든 피드백이 수정 반영 또는 GitHub Issues로 등록됨
3. 잔여 이슈(#51, #52, #57~#59)는 모두 non-blocking이며 별도 PR로 처리 가능
4. 676/676 테스트 통과, typecheck/lint 통과
5. 스펙 대비 의도적 차이 3건이 `spec-deviations.md`에 정확히 기록됨
6. 기능 문서(`docs/features/11-token-usage.md`)와 스펙 문서(api-reference, database-schema, architecture) 동기화 완료
7. 관리자 시스템(PR 2 범위)은 이번 PR에 포함되지 않으나, 데이터 모델(Quota, ModelPricing, User.role)은 이미 준비되어 PR 2 착수에 문제 없음
