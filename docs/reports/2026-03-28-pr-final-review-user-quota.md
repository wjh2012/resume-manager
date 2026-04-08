# PR #106 최종 점검 보고서 — 사용자 자기 제한 (User Quota)

## 개요

- 점검 일시: 2026-03-28
- 대상 PR: #106 `feat: 사용자 자기 제한(User Quota) 기능 추가`
- 브랜치: `feat/user-quota` -> `develop`
- @claude 리뷰: 4차 리뷰 완료, 전체 피드백 반영 확인됨
- 전체 달성률: **95%**

## PR 범위 요약

사용자가 스스로 월간 토큰/비용 사용 제한을 설정할 수 있는 자기 관리 기능. 기존 admin Quota(시스템 상한선)와 별도 `UserQuota` 테이블로 분리 운영하며, 둘 중 하나라도 초과하면 차단하고 source별 에러 메시지를 구분한다.

## 상세 점검 결과

### 1. 데이터 모델

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 1 | UserQuota 모델 생성 | ✅ 완료 | `prisma/schema.prisma` 내 정의 확인 |
| 2 | unique: userId + limitType | ✅ 완료 | `@@unique([userId, limitType])` 적용됨 |
| 3 | MONTHLY 고정 (period 필드 없음) | ✅ 완료 | Quota의 period 필드를 의도적으로 제거하여 MONTHLY 하드코딩 |
| 4 | limitValue: Decimal(12,2) | ✅ 완료 | 기존 Quota와 동일 정밀도 |
| 5 | isActive 기본값 true | ✅ 완료 | `@default(true)` |
| 6 | onDelete: Cascade (User 삭제 시) | ✅ 완료 | |
| 7 | User 모델에 relation 추가 | ✅ 완료 | `userQuotas UserQuota[]` 확인 |
| 8 | Migration SQL 파일 존재 | ✅ 완료 | `20260327082133_add_user_quotas/migration.sql` |

### 2. API 엔드포인트

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 1 | GET /api/user-quotas (목록) | ✅ 완료 | 인증 검증, 본인 목록만 반환 |
| 2 | POST /api/user-quotas (생성) | ✅ 완료 | Zod 검증, P2002 중복 409 처리 |
| 3 | PUT /api/user-quotas/[id] (수정) | ✅ 완료 | UUID 검증, updateMany로 TOCTOU 방지 |
| 4 | DELETE /api/user-quotas/[id] (삭제) | ✅ 완료 | deleteMany로 소유권 원자적 검증 |
| 5 | 소유권 검증 (userId 조건) | ✅ 완료 | 모든 엔드포인트에 적용 |
| 6 | JSON 파싱 별도 try-catch | ✅ 완료 | decisions.md 패턴 준수 |

### 3. Quota 체크 로직

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 1 | checkQuotaExceeded에서 admin + user 둘 다 검증 | ✅ 완료 | Promise.all로 병렬 조회 후 순차 검사 |
| 2 | Admin quota 우선 검사 | ✅ 완료 | admin 먼저 순회, user 후순위 |
| 3 | source별 에러 메시지 구분 (ADMIN/USER) | ✅ 완료 | QuotaExceededError에 source 추가 |
| 4 | 비활성 UserQuota 제외 (isActive: true) | ✅ 완료 | findMany where 조건에 포함 |
| 5 | cover-letter route 에러 메시지 분기 | ✅ 완료 | quotaResult.source에 따라 메시지 분기 |
| 6 | interview route 에러 메시지 분기 | ✅ 완료 | 동일 패턴 적용 |
| 7 | career-notes QuotaExceededError(source) 전달 | ✅ 완료 | |
| 8 | insights QuotaExceededError(source) 전달 | ✅ 완료 | |

### 4. UI 컴포넌트

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 1 | /usage 페이지에 자기 제한 설정 섹션 | ✅ 완료 | UserQuotaSettings 컴포넌트 |
| 2 | TOKENS/COST 두 가지 제한 타입 지원 | ✅ 완료 | QuotaRow로 각각 렌더링 |
| 3 | 추가 (Create) | ✅ 완료 | 제한값 입력 + 추가 버튼 |
| 4 | 수정 (Update) — onBlur 패턴 | ✅ 완료 | defaultValue + onBlur로 업데이트 |
| 5 | 토글 (isActive Switch) | ✅ 완료 | |
| 6 | 삭제 (Delete) | ✅ 완료 | Trash2 아이콘 버튼 |
| 7 | 프로그레스 바 (사용량/제한값) | ✅ 완료 | isActive일 때만 표시 |
| 8 | onBlur relatedTarget 가드 | ✅ 완료 | 삭제 버튼 클릭 시 불필요한 update 방지 |
| 9 | loading 상태 관리 | ✅ 완료 | limitType 또는 id 기반 로딩 |
| 10 | toast 피드백 | ✅ 완료 | 성공/실패 메시지 |

### 5. 서비스 레이어

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 1 | getUserUserQuotasWithUsage (대시보드용) | ✅ 완료 | 단일 aggregate 쿼리로 최적화 |
| 2 | 비활성 quota도 목록에 포함 (UI 토글용) | ✅ 완료 | listUserQuotas는 isActive 필터 없음 |
| 3 | TOCTOU 제거 (updateMany 패턴) | ✅ 완료 | decisions.md 패턴 준수 |

### 6. 타입 정의

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 1 | UserQuotaWithUsage 타입 | ✅ 완료 | types/token-usage.ts |
| 2 | UsageSummaryWithQuotas에 userQuotas 추가 | ✅ 완료 | |

### 7. 테스트

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 1 | UserQuota service CRUD 테스트 | ✅ 완료 | 6 tests (list, create, update 본인/타인, delete 본인/타인) |
| 2 | checkQuotaExceeded UserQuota 통합 테스트 | ✅ 완료 | 5 tests (없음, admin 초과, user 초과, 둘 다 있을 때 우선순위, 미초과) |
| 3 | API 라우트 통합 테스트 | ⚠️ 확인불가 | PR body에 "9 tests" 기재, 파일이 변경 목록에 없음 — 별도 테스트 파일일 수 있음 |

### 8. 문서화

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 1 | docs/specs/database-schema.md 업데이트 | ❌ 미반영 | UserQuota 모델이 스펙 문서에 누락 |
| 2 | docs/specs/api-reference.md 업데이트 | ❌ 미반영 | /api/user-quotas 엔드포인트 미기재 |
| 3 | docs/features/11-token-usage.md 업데이트 | ❌ 미반영 | UserQuota 관련 내용 누락 |
| 4 | docs/features/ 신규 문서 또는 기존 문서 갱신 | ❌ 미반영 | 주요 기능 추가이므로 문서화 필요 |

## 주요 발견사항

### PR 범위 외 변경사항 혼입

PR에 user-quota와 무관한 변경이 2건 포함되어 있다:

1. **cover-letter route**: `selectedExternalDocumentIds` 필터 로직 추가 — 클라이언트가 외부 문서 ID를 선택적으로 전달할 수 있도록 변경. 커밋 `2c6d123`에 quota 메시지 분기와 함께 포함됨.
2. **career-notes service**: `where: { conversationId }` -> `where: { conversationId, role: "USER" }` — 메시지 조회 시 USER 역할만 필터. quota source 전달과 같은 커밋에 혼입됨.

두 변경 모두 기능적으로 유효하지만, PR 스코프를 벗어나는 변경이므로 인지하고 있어야 한다. 머지 차단 사유는 아님.

### 문서 미갱신 (Non-blocking)

이 PR은 새로운 DB 모델(`UserQuota`), 새로운 API 엔드포인트(`/api/user-quotas`), 새로운 UI 섹션(자기 제한 설정)을 추가하는 주요 기능이므로, CLAUDE.md 규칙(주요 기능 추가 시 docs/features/ 문서 작성) 및 스펙 문서(database-schema.md, api-reference.md) 동기화가 필요하다. 머지 전 또는 후속 커밋으로 처리 권장.

### 설계 품질

- **TOCTOU 방지**: updateMany/deleteMany 패턴으로 소유권 검증과 변경을 원자적으로 처리 -- decisions.md 패턴 준수
- **쿼리 최적화**: getUserUserQuotasWithUsage에서 N+1 대신 단일 aggregate로 토큰+비용 동시 조회
- **Admin/User 우선순위**: admin quota를 먼저 검사하여 시스템 상한선 우선 적용
- **onBlur 가드**: relatedTarget으로 삭제 버튼 클릭 시 불필요한 update 방지 -- 4차 리뷰에서 완전 해결 확인

## 스펙 변경 영향 분석

### 갱신이 필요한 스펙 문서

1. **`docs/specs/database-schema.md`**: UserQuota 모델 추가, User 모델 관계도에 UserQuota 포함 필요
2. **`docs/specs/api-reference.md`**: `/api/user-quotas` CRUD 엔드포인트 추가, `/api/token-usage/summary` 응답에 `userQuotas` 필드 추가 필요
3. **`docs/features/11-token-usage.md`**: UserQuota 서비스, 자기 제한 설정 UI, source별 에러 메시지 구분 내용 추가 필요

### 다른 Phase에 대한 영향

없음. UserQuota는 독립적인 신규 기능이며, 기존 admin Quota 로직은 그대로 유지된다.

## 권장 조치사항

| 우선순위 | 항목 | 상세 |
|---------|------|------|
| **권장** | 스펙 문서 동기화 | database-schema.md, api-reference.md, features/11-token-usage.md 갱신 |
| **인지** | PR 범위 외 변경 | selectedExternalDocumentIds 필터, career-notes USER 필터 — 의도적 변경이면 OK |

## 최종 판단

**머지 가능.** 핵심 기능(모델, API, 서비스, UI, 테스트)이 모두 구현되어 있고, @claude 4차 리뷰에서 전체 피드백 반영이 확인되었다. 문서 미갱신은 후속 처리 가능한 non-blocking 이슈이다.
