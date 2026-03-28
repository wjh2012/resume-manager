# 사용자 자기 제한 (User Quota)

## 개요

사용자가 스스로 월간 토큰/비용 사용 제한을 설정할 수 있는 자기 관리 기능. 관리자가 설정하는 Admin Quota(시스템 상한선)와 별도로 `UserQuota` 테이블에서 분리 운영되며, 둘 중 하나라도 초과하면 AI 채팅이 차단된다.

## 동작 방식

1. **자기 제한 설정**: `/usage` 페이지에서 TOKENS 또는 COST 유형의 월간 제한을 추가/수정/토글/삭제
2. **Quota 체크**: AI 호출 전 `checkQuotaExceeded()`가 Admin Quota → User Quota 순서로 검사
3. **차단 시 메시지 구분**: Admin Quota 초과 시 "사용 한도를 초과했습니다.", User Quota 초과 시 "설정하신 자기 제한을 초과했습니다."
4. **대시보드 표시**: 프로그레스 바로 현재 사용량 대비 제한값을 시각화. 비활성 제한도 표시(토글 off 상태)

## 주요 컴포넌트

| 파일 | 역할 |
|------|------|
| `lib/user-quota/service.ts` | UserQuota CRUD (listUserQuotas, createUserQuota, updateUserQuota, deleteUserQuota) |
| `lib/token-usage/quota.ts` | `checkQuotaExceeded()` — Admin + User 둘 다 검증, `getUserUserQuotasWithUsage()` — 대시보드용 |
| `lib/validations/user-quota.ts` | Zod 스키마 (TOKENS/COST만 허용, REQUESTS 제외) |
| `app/api/user-quotas/route.ts` | `GET` (목록), `POST` (생성, P2002 중복 처리) |
| `app/api/user-quotas/[id]/route.ts` | `PUT` (수정), `DELETE` (삭제) — 소유권 검증 |
| `components/usage/user-quota-settings.tsx` | 자기 제한 설정 UI (추가/수정/토글/삭제 + 프로그레스 바) |
| `types/token-usage.ts` | `UserQuotaWithUsage` 타입 정의 |

## 데이터 흐름

```
자기 제한 설정
  → POST /api/user-quotas (생성) 또는 PUT /api/user-quotas/[id] (수정)
  → Supabase 인증 → 소유권 검증
  → UserQuota 테이블 CRUD
  → 대시보드 새로고침

AI 호출 시 검사
  → checkQuotaExceeded(userId)
    → Admin Quota 우선 검사 (isActive: true)
    → User Quota 검사 (isActive: true)
    → 초과 시 QuotaExceededError (source: "ADMIN" | "USER")
  → 채팅 UI에서 source별 에러 메시지 표시

대시보드 조회
  → GET /api/token-usage/summary
  → getUserUserQuotasWithUsage(userId)
    → 전체 UserQuota 조회 (비활성 포함)
    → 단일 aggregate로 토큰 + 비용 사용량 조회
  → 프로그레스 바 렌더링
```
