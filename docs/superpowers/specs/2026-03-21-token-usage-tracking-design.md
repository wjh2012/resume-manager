# Token Usage Tracking Design

AI API 호출의 토큰 사용량을 추적하고, 사용자/관리자에게 사용 현황을 제공하는 기능.

## 목적

1. **사용자 대시보드** — 자신의 토큰 사용량, 비용, 추이를 상세 확인
2. **비용 관리** — 사용자별 사용 한도(Quota)를 유연하게 설정, 초과 시 차단
3. **운영 모니터링** — 관리자가 전체 시스템 사용량, 사용자별 랭킹, 모델/기능별 분포를 파악

## 추적 범위

- 사용자 API 키 호출 (커버레터, 면접, 인사이트) + 서버 API 키 호출 (임베딩) **모두 추적**
- 비용 계산도 **모두 수행**
- 사용량 데이터는 **무기한 보존**

## 접근 방식

**요청 단위 로그 테이블** — 각 API 호출마다 `TokenUsageLog` 레코드를 1개씩 저장하고, 대시보드에서는 DB 집계 쿼리로 통계를 계산. 사전 집계 테이블 없이 인덱스 + 날짜 범위 필터로 커버.

## 데이터 모델

### TokenUsageLog

각 AI API 호출의 토큰 사용 기록.

| 필드 | 타입 | 설명 |
|------|------|------|
| id | UUID, PK | — |
| userId | FK → User | 호출한 사용자 |
| provider | enum(openai, anthropic, google) | AI 프로바이더 |
| model | string | 실제 호출된 모델명 |
| feature | enum(COVER_LETTER, INTERVIEW, INSIGHT, EMBEDDING) | 기능 구분 |
| promptTokens | int | 입력 토큰 수 |
| completionTokens | int | 출력 토큰 수 |
| totalTokens | int | 총 토큰 수 |
| estimatedCost | Decimal | ModelPricing 기반 추정 비용 (USD) |
| isServerKey | boolean | 서버측 키 사용 여부 |
| metadata | JSON, nullable | conversationId 등 추적용 |
| createdAt | timestamp | 생성 시각 |

### ModelPricing

모델별 토큰 단가. `effectiveFrom`으로 가격 이력을 관리하며, 새 가격 등록 시 이전 레코드는 유지하고 신규 행을 추가한다.

| 필드 | 타입 | 설명 |
|------|------|------|
| id | UUID, PK | — |
| provider | enum(openai, anthropic, google) | AI 프로바이더 |
| model | string | 모델명 |
| inputPricePerM | Decimal | 입력 100만 토큰당 USD |
| outputPricePerM | Decimal | 출력 100만 토큰당 USD |
| effectiveFrom | timestamp | 적용 시작일 |
| createdAt | timestamp | 생성 시각 |

비용 계산 시 `TokenUsageLog.createdAt` 기준으로 해당 시점의 유효 단가(`effectiveFrom <= createdAt`인 최신 레코드)를 조회한다.

### Quota

사용자별 사용 한도. 한 사용자에 여러 Quota를 설정할 수 있다 (예: 월 토큰 한도 + 월 비용 한도).

| 필드 | 타입 | 설명 |
|------|------|------|
| id | UUID, PK | — |
| userId | FK → User | 대상 사용자 |
| limitType | enum(TOKENS, COST, REQUESTS) | 한도 유형 |
| limitValue | Decimal | 한도 값 |
| period | enum(DAILY, MONTHLY) | 적용 기간 |
| isActive | boolean | 활성 여부 |
| createdAt | timestamp | — |
| updatedAt | timestamp | — |

### User 모델 변경

`role` 필드 추가: `USER | ADMIN` (기본값 `USER`)

## 토큰 기록 아키텍처

### 기록 지점

| 기능 | SDK 메서드 | 사용량 소스 | 키 유형 |
|------|-----------|------------|---------|
| 커버레터 채팅 | `streamText()` | `onFinish` 콜백의 `usage` | 사용자 키 |
| 면접 채팅 | `streamText()` | `onFinish` 콜백의 `usage` | 사용자 키 |
| 인사이트 추출 | `generateObject()` | 반환값의 `usage` | 사용자 키 |
| 임베딩 | `embedMany()` | 반환값의 `usage` | 서버 키 |

### isServerKey 결정 방식

`createLanguageModel()`이 모델과 함께 `isServerKey` 정보를 반환한다. 라우트는 이 값을 `recordUsage()`에 그대로 전달한다. 나중에 서버 API 모드(사용자가 자기 키 없이 서버 키 사용)가 추가되면 `createLanguageModel()` 한 곳만 수정하면 된다.

### 서비스 레이어

```
lib/token-usage/
├── service.ts        — recordUsage(), getUserUsage()
├── pricing.ts        — calculateCost(), getCurrentPricing()
└── quota.ts          — checkQuotaExceeded(), getUserQuotas()
```

- `recordUsage()`: 토큰 로그 저장 + 비용 계산을 하나의 함수로
- `checkQuotaExceeded()`: API 호출 전에 한도 초과 여부 확인, 초과 시 에러

### Quota 체크 흐름

```
요청 → checkQuotaExceeded() → 초과 → 403 응답
                             → 미초과 → API 호출 → onFinish → recordUsage()
```

## API 엔드포인트

### 사용자용

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/token-usage` | 내 사용량 조회 (기간/기능/모델 필터) |
| GET | `/api/token-usage/summary` | 내 요약 통계 (기간별 합계, 기능별 비중) |

### 관리자용

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/admin/token-usage` | 전체 시스템 사용량 |
| GET | `/api/admin/token-usage/users` | 사용자별 사용량 랭킹 |
| GET | `/api/admin/model-pricing` | 모델 단가 목록 |
| POST | `/api/admin/model-pricing` | 새 단가 등록 |
| PUT | `/api/admin/model-pricing/[id]` | 단가 수정 |
| GET | `/api/admin/quotas` | 전체 Quota 목록 |
| POST | `/api/admin/quotas` | Quota 생성 |
| PUT | `/api/admin/quotas/[id]` | Quota 수정 |
| DELETE | `/api/admin/quotas/[id]` | Quota 삭제 |

관리자 API에는 `User.role === 'ADMIN'` 체크 미들웨어를 적용한다.

## 페이지 & UI

### 사용자 대시보드 (`/dashboard/usage`)

사이드바에 "사용량" 메뉴 추가.

- **상단 요약 카드**: 이번 달 총 토큰 / 총 비용 / 요청 횟수
- **일별 추이 차트**: 선택 기간 내 토큰 사용량 라인 차트
- **기능별 비중**: 커버레터 / 면접 / 인사이트 / 임베딩 도넛 차트
- **모델별 비교**: 모델별 토큰/비용 바 차트
- **기간 필터**: 7일 / 30일 / 90일 / 커스텀 범위
- **Quota 프로그레스 바**: 한도 대비 현재 사용량

차트 라이브러리: **Recharts**

### 관리자: 사용량 모니터링 (`/admin/usage`)

- **시스템 전체 요약**: 총 토큰 / 총 비용 / 활성 사용자 수
- **사용자별 랭킹 테이블**: 사용량 기준 정렬, 상세 보기
- **모델/기능별 분포 차트**
- **기간 필터**

### 관리자: 모델 단가 관리 (`/admin/model-pricing`)

- 모델별 단가 테이블 (인라인 편집)
- 새 단가 등록 폼

### 관리자: Quota 관리 (`/admin/quotas`)

- Quota 목록 테이블
- 생성/수정/삭제

### Quota 초과 시 UX

- API 호출 차단 + 토스트 알림: "사용 한도를 초과했습니다"
- 사용량 대시보드에 한도 대비 현재 사용량 프로그레스 바 표시

## 시드 데이터 (ModelPricing 초기값)

2025년 기준 모델별 단가:

| Provider | Model | Input $/1M | Output $/1M |
|----------|-------|-----------|------------|
| OpenAI | gpt-4o | $2.50 | $10.00 |
| OpenAI | gpt-4o-mini | $0.15 | $0.60 |
| OpenAI | text-embedding-3-small | $0.02 | — |
| Anthropic | claude-sonnet-4-20250514 | $3.00 | $15.00 |
| Anthropic | claude-haiku-4-5-20251001 | $0.80 | $4.00 |
| Google | gemini-2.0-flash | $0.10 | $0.40 |
| Google | gemini-2.5-pro | $1.25 | $10.00 |

Prisma seed 스크립트에서 초기 데이터로 삽입한다.
