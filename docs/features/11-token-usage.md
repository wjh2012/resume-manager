# 토큰 사용량 추적 (Token Usage Tracking)

## 개요

AI API 호출(커버레터, 면접, 인사이트, 임베딩)의 토큰 사용량을 자동 기록하고, 모델별 단가를 기반으로 비용을 추정한다. 사용자는 대시보드에서 사용 현황을 확인하고, 관리자가 설정한 Quota에 의해 사용량이 제한될 수 있다.

## 동작 방식

1. **토큰 기록**: 각 AI 호출 완료 시 `recordUsage()`가 호출되어 TokenUsageLog에 기록
   - 채팅 (커버레터/면접): `streamText()` → `onFinish` 콜백에서 `usage` 캡처
   - 인사이트 추출: `generateObject()` 반환값의 `usage` 캡처
   - 임베딩: `embedMany()` 반환값의 `usage.tokens` 캡처
2. **비용 계산**: ModelPricing 테이블에서 해당 시점의 유효 단가를 조회하여 `estimatedCost` 산출
3. **Quota 체크**: AI 호출 전 `checkQuotaExceeded()`로 한도 초과 여부 확인. Admin Quota → User Quota 순서로 검사하며, 초과 시 source별 에러 메시지 구분 (403 차단)
4. **대시보드**: `/usage` 페이지에서 기간별 사용량, 기능별/모델별 분포, Admin Quota 현황, 사용자 자기 제한 설정을 표시

## 주요 컴포넌트

| 파일 | 역할 |
|------|------|
| `lib/token-usage/service.ts` | `recordUsage()`, `getUserUsage()`, `getUserUsageSummary()` |
| `lib/token-usage/pricing.ts` | `calculateCost()` — ModelPricing 기반 비용 계산 |
| `lib/token-usage/quota.ts` | `checkQuotaExceeded()`, `getUserQuotasWithUsage()`, `getUserUserQuotasWithUsage()`, `QuotaExceededError` |
| `app/api/token-usage/route.ts` | `GET` — 사용량 로그 (커서 페이지네이션) |
| `app/api/token-usage/summary/route.ts` | `GET` — 요약 통계 + Quota 현황 |
| `app/(dashboard)/usage/page.tsx` | 사용량 대시보드 페이지 |
| `components/usage/*.tsx` | 차트 컴포넌트 (Recharts) |
| `prisma/seed.ts` | ModelPricing 초기 단가 시드 데이터 (7개 모델) |

## 데이터 흐름

```
AI 호출 요청
  → checkQuotaExceeded(userId)
    → 초과 시 403 / QuotaExceededError
  → AI SDK 호출 (streamText / generateObject / embedMany)
  → usage 캡처
  → recordUsage()
    → calculateCost() (ModelPricing 조회)
    → TokenUsageLog 저장
  → 응답 반환

대시보드 조회
  → GET /api/token-usage/summary?period=30d
  → getUserUsageSummary() (집계 + 일별 raw SQL)
  → getUserQuotasWithUsage() (Quota + 현재 사용량)
  → 차트 렌더링 (Recharts)
```

## 서버 키 구분

| 기능 | 키 유형 | isServerKey |
|------|---------|-------------|
| 커버레터/면접/인사이트 | 사용자 API 키 | `false` |
| 임베딩 | 서버 환경변수 (`OPENAI_API_KEY`) | `true` |

`getLanguageModel()`이 `isServerKey` 값을 반환하며, 임베딩은 항상 서버 키로 하드코딩된다.

## 관리자 시스템

`User.role === "ADMIN"` 사용자만 접근 가능한 관리 기능.

### 인증/인가

`requireAdmin()` 유틸리티가 Supabase 인증 + DB role 체크를 수행. 모든 관리자 API에 적용. 실패 시 403.

### 관리자 페이지

| 페이지 | 경로 | 기능 |
|--------|------|------|
| 사용량 모니터링 | `/admin/usage` | 시스템 전체 사용량 요약, 사용자별 랭킹, 모델/기능별 분포 차트 |
| 모델 단가 관리 | `/admin/model-pricing` | ModelPricing 목록 + 새 단가 등록 (append-only) |
| Quota 관리 | `/admin/quotas` | Quota 목록 + 생성/삭제 |

### 관리자 API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/admin/token-usage` | 전체 시스템 사용량 |
| GET | `/api/admin/token-usage/users` | 사용자별 랭킹 |
| GET | `/api/admin/model-pricing` | 단가 목록 |
| POST | `/api/admin/model-pricing` | 새 단가 등록 |
| GET | `/api/admin/quotas` | Quota 목록 |
| POST | `/api/admin/quotas` | Quota 생성 |
| PUT | `/api/admin/quotas/[id]` | Quota 수정 |
| DELETE | `/api/admin/quotas/[id]` | Quota 삭제 |

### 주요 컴포넌트

| 파일 | 역할 |
|------|------|
| `lib/auth/require-admin.ts` | 관리자 인증/인가 유틸리티 |
| `lib/admin/usage-service.ts` | 시스템 사용량 + 사용자 랭킹 서비스 |
| `lib/admin/pricing-service.ts` | 모델 단가 CRUD |
| `lib/admin/quota-service.ts` | Quota CRUD |
| `components/admin/*.tsx` | 관리자 UI 컴포넌트 |

### 사이드바

`adminNavItems`는 `User.role === "ADMIN"`일 때만 사이드바에 "관리자" 그룹으로 표시된다. `app/(dashboard)/layout.tsx`에서 DB role을 조회하여 `AppSidebar`에 전달한다.
