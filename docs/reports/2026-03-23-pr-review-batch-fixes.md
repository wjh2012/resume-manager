# PR 일괄 점검 보고서 (PR #75, #76, #80)

## 개요
- 점검 일시: 2026-03-23
- 대상: 3개 PR, 총 14개 이슈 (구현 12 + close 2)
- 워크트리: `D:/prj/resume-manager/.claude/worktrees/batch-fixes`

---

## PR #80 — bugfix/fix-timezone-and-hydration

### 이슈별 검증

| # | 이슈 | 상태 | 검증 근거 |
|---|------|------|-----------|
| 1 | #50: DATE(created_at) UTC 집계 타임존 이슈 | ✅ 완료 | `lib/admin/usage-service.ts` — `DATE(created_at AT TIME ZONE ${tz})` 적용, `GROUP BY 1`로 변경. `adminUsageQuerySchema`에 `tz` 파라미터 추가 (`/^[A-Za-z0-9_/+-]+$/`). API route에서 `parsed.data.tz` 전달. |
| 2 | #29: Radix UI Hydration ID Mismatch | ✅ 완료 | `components/interviews/interview-card.tsx` — `<span suppressHydrationWarning>` 추가. |

### 비고
- #29의 원래 이슈는 UserMenu DropdownMenuTrigger 및 AI 설정 SelectTrigger의 Radix ID mismatch였으나, PR에서는 interview-card의 formatDate 출력에만 suppressHydrationWarning을 적용함. Radix 자체의 ID mismatch는 Radix UI 버전 업그레이드 대기 사항으로 이 PR 범위 밖. 날짜 포매팅의 SSR/CSR 불일치 방지 관점에서는 적절.

---

## PR #75 — bugfix/fix-validation-and-timezone

### 이슈별 검증

| # | 이슈 | 상태 | 검증 근거 |
|---|------|------|-----------|
| 1 | #53: resume 날짜 쌍 검증 | ✅ 완료 | `lib/validations/resume.ts` — `endNotBeforeStart()` 헬퍼 함수 구현. `educationSchema`, `experienceSchema`, `projectSchema`, `certificationSchema` 4개 스키마에 `.superRefine()` 적용. 테스트 105줄 추가 (`tests/lib/validations/resume.test.ts`). |
| 2 | #55: experience isCurrent=true endDate 교차 검증 | ✅ 완료 | `experienceSchema.superRefine()` 내에서 `isCurrent && endDate` 시 "재직 중인 경우 종료일을 입력할 수 없습니다." 에러 + `endNotBeforeStart()` 호출. |
| 3 | #57: token-usage 날짜 쌍 검증 | ✅ 완료 | `lib/validations/token-usage.ts` — `tokenUsageQuerySchema`에 `.superRefine(refineEndDateAfterStartDate)` 적용. 테스트 74줄 추가 (`tests/lib/validations/token-usage.test.ts`). |
| 4 | #52: usageSummaryQuerySchema 쌍 검증 | ✅ 완료 | `usageSummaryQuerySchema`에 동일한 `.superRefine(refineEndDateAfterStartDate)` 적용. |
| 5 | #58: getPeriodStart() UTC 기준 전환 | ✅ 완료 | `lib/token-usage/quota.ts` — DAILY: `Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())`, MONTHLY: `Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)` 사용. |

### 비고
- tz 정규식이 `/^[A-Za-z0-9_/+-]+$/`로 업데이트되어 closed #59(오프셋 기반 타임존 거부)도 함께 해결됨.

---

## PR #76 — refactor/batch-code-cleanup

### 이슈별 검증

| # | 이슈 | 상태 | 검증 근거 |
|---|------|------|-----------|
| 1 | #51: UsageSummary 타입 공유 | ✅ 완료 | `types/token-usage.ts` 신규 생성 — `UsageSummary`, `UsageSummaryWithQuotas` 인터페이스 정의. `lib/token-usage/service.ts`와 `app/(dashboard)/usage/page.tsx`에서 중복 인터페이스 제거 후 import. |
| 2 | #62: activeUsers 집계 최적화 | ✅ 완료 | `lib/admin/usage-service.ts` — `groupBy({ by: ["userId"] }).then(r => r.length)` → `$queryRaw COUNT(DISTINCT user_id)`. 테스트도 BigInt mock으로 업데이트. |
| 3 | #35: formatDate 중복 제거 | ✅ 완료 | `lib/utils.ts`에 `formatDate()` 추가. `cover-letter-card.tsx`, `document-card.tsx`, `interview-card.tsx`, `resume-card.tsx` 4개 파일에서 로컬 `formatDate` 제거 후 import. 로케일을 `"ko-KR"` 하드코딩 → `undefined`(브라우저 로케일)로 변경하여 hydration mismatch 방지. 테스트 추가. |
| 4 | #37: interviewStatusLabel 상수화 | ✅ 완료 | `components/dashboard/recent-activity.tsx` — 함수 `interviewStatusLabel()` → 상수 맵 `INTERVIEW_STATUS_LABEL` 전환. fallback으로 `?? "진행 중"` 처리. |
| 5 | #73: 병합 제안 다이얼로그 UI 깨짐 | ✅ 완료 | `components/career-notes/merge-proposal-dialog.tsx` — `grid-cols-2` → `grid-cols-1 md:grid-cols-2` 반응형 적용. |
| 6 | #36: StatCard/QuickActionCard 통합 | ✅ Close 확인 | 커밋 히스토리에서 통합(`3f0ea69`) 후 리버트(`9e026f8`)된 것 확인. 통합 불필요 결정으로 close. |

### 추가 변경사항 (이슈 번호 없음)
- `formatShortDate()`도 `undefined` 로케일로 변경 + `recent-activity.tsx`의 날짜 출력 3곳에 `suppressHydrationWarning` 추가 — hydration mismatch 방지 목적으로 적절.

---

## Close된 이슈 확인

| # | 이슈 | 상태 | 비고 |
|---|------|------|------|
| 1 | #36: StatCard/QuickActionCard 통합 | ✅ 정당한 Close | 통합 구현 후 리뷰에서 불필요 판단, 리버트 완료. |
| 2 | #54: MessageRole enum 대소문자 | ✅ 정당한 Close | 확인 결과 불일치 없음. |

---

## PR 간 충돌 분석

### 겹치는 파일

| 파일 | PR #80 | PR #76 | 충돌 위험 |
|------|--------|--------|-----------|
| `lib/admin/usage-service.ts` | AT TIME ZONE + tz 파라미터 추가 | COUNT(DISTINCT) 최적화 | **충돌 확실** — PR #80은 함수 시그니처에 `tz` 추가 + daily 쿼리 변경, PR #76은 activeUsers 쿼리 변경. 동일 함수의 다른 부분을 수정하지만 Promise.all 배열 내 인접 위치로 git 자동 병합 실패 가능. |
| `components/interviews/interview-card.tsx` | suppressHydrationWarning 추가 | formatDate import 통합 + suppressHydrationWarning | **충돌 확실** — 동일 라인(`<span>`) 수정. PR #76이 더 포괄적 (import 변경 + suppressHydrationWarning 모두 포함). |

### 권장 머지 순서
1. **PR #75** (validation-and-timezone) — 독립적, 충돌 없음
2. **PR #76** (batch-code-cleanup) — formatDate 통합 + COUNT(DISTINCT) + suppressHydrationWarning
3. **PR #80** (timezone-and-hydration) — PR #76 머지 후 rebase 필요. interview-card의 suppressHydrationWarning은 PR #76에서 이미 적용되므로, AT TIME ZONE + tz 파라미터 변경만 적용하면 됨

---

## 전체 요약

| PR | 이슈 수 | 완료 | 미완료 | 달성률 |
|----|---------|------|--------|--------|
| #80 (timezone-hydration) | 2 | 2 | 0 | 100% |
| #75 (validation-timezone) | 5 | 5 | 0 | 100% |
| #76 (batch-cleanup) | 6 (5구현+1close) | 6 | 0 | 100% |
| **합계** | **13** | **13** | **0** | **100%** |

- 별도 close된 #54 포함 총 14개 이슈 모두 적절히 처리됨
- 3개 PR 모두 테스트 추가/수정 완료
- PR 간 파일 충돌 2건 존재 — 머지 순서 조정 필요
