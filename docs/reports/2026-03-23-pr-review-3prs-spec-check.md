# 3개 PR 스펙 대비 구현 점검 보고서

## 개요
- 점검 일시: 2026-03-23
- 대상: PR #80, PR #75, PR #76
- 방법: `git diff develop...브랜치` 기반 실제 변경사항과 GitHub Issues 요구사항 대조

---

## PR #80 — `bugfix/fix-timezone-and-hydration`

### 변경 파일 (4개)
`app/api/admin/token-usage/route.ts`, `components/interviews/interview-card.tsx`, `lib/admin/usage-service.ts`, `lib/validations/admin.ts`

| # | 이슈 | 요구사항 | 상태 | 비고 |
|---|------|---------|------|------|
| 1 | #50 | `DATE(created_at)` -> `DATE(created_at AT TIME ZONE tz)` 적용 | ✅ 완료 | `lib/admin/usage-service.ts`에서 `DATE(created_at AT TIME ZONE ${tz})` 적용, `GROUP BY 1`로 정리 |
| 2 | #50 | 타임존 파라미터 도입 | ✅ 완료 | `adminUsageQuerySchema`에 `tz` 필드 추가 (regex 검증 + max(64) + default "UTC"), API route에서 서비스로 전달 |
| 3 | #29 | Hydration 경고 해소 | ⚠️ 부분 완료 | `interview-card.tsx`의 formatDate span에 `suppressHydrationWarning` 추가. 그러나 이슈 원문의 영향 범위는 "UserMenu (DropdownMenuTrigger), AI 설정 폼 (SelectTrigger x 2)"이며, interview-card는 언급되지 않음. Radix UI ID mismatch가 근본 원인이므로 `suppressHydrationWarning`은 증상 우회에 해당 |

### 발견사항

1. **#29 범위 불일치**: 이슈 #29는 "Radix UI Hydration ID Mismatch"로, 영향 범위가 UserMenu의 DropdownMenuTrigger와 AI 설정 폼의 SelectTrigger이다. PR에서는 `interview-card.tsx`의 날짜 표시 span에 `suppressHydrationWarning`을 추가했는데, 이는 이슈 원문의 대상 컴포넌트가 아니다. 날짜 포매팅으로 인한 hydration 경고 해소에는 유효하지만, 이슈 #29의 Radix UI ID mismatch 문제와는 별개의 문제를 해결한 것이다.

2. **PR #76과 파일 충돌**: `interview-card.tsx`와 `lib/admin/usage-service.ts`를 PR #76과 공유한다. 특히 `interview-card.tsx`는 PR #80이 한 줄(suppressHydrationWarning)만 수정하고, PR #76은 formatDate import 변경 + suppressHydrationWarning을 모두 포함한다. PR #76이 PR #80의 변경을 이미 포함하고 있으므로 **merge 순서에 따라 충돌 발생**. `lib/admin/usage-service.ts`는 PR #80이 타임존(lines 1, 26-33), PR #76이 activeUsers(lines 18-28)를 수정하며, 수정 범위가 달라 자동 merge 가능하다.

### 달성률: 80%

---

## PR #75 — `bugfix/fix-validation-and-timezone`

### 변경 파일 (5개 + 테스트 2개)
`lib/validations/resume.ts`, `lib/validations/token-usage.ts`, `lib/token-usage/quota.ts`, `tests/lib/validations/resume.test.ts`, `tests/lib/validations/token-usage.test.ts`

| # | 이슈 | 요구사항 | 상태 | 비고 |
|---|------|---------|------|------|
| 1 | #53 | resume 스키마 endDate >= startDate 검증 | ✅ 완료 | `endNotBeforeStart` 헬퍼 함수로 education, experience, project, certification 4개 스키마 모두 적용 |
| 2 | #53 | certification은 issueDate/expiryDate 필드명 사용 | ✅ 완료 | `endNotBeforeStart(data, ctx, "issueDate", "expiryDate")` 필드명 지정 |
| 3 | #55 | experience isCurrent=true일 때 endDate 교차 검증 | ✅ 완료 | `superRefine`에서 `data.isCurrent && data.endDate` 체크, "재직 중인 경우 종료일을 입력할 수 없습니다" 메시지 |
| 4 | #57 | token-usage 스키마 endDate >= startDate 검증 | ✅ 완료 | `refineEndDateAfterStartDate` 헬퍼로 `tokenUsageQuerySchema`, `usageSummaryQuerySchema` 양쪽 적용 |
| 5 | #52 | usageSummaryQuerySchema startDate/endDate 쌍 검증 (둘 다 있거나 둘 다 없어야) | ❌ 미구현 | `refineEndDateAfterStartDate`는 순서 검증만 수행. "둘 다 있거나 둘 다 없어야" 하는 쌍 존재 검증이 누락됨 |
| 6 | #58 | getPeriodStart() UTC 전환 | ✅ 완료 | `new Date(year, month, date)` -> `new Date(Date.UTC(getUTCFullYear(), getUTCMonth(), getUTCDate()))` DAILY/MONTHLY 모두 적용 |
| 7 | — | 테스트 추가 | ✅ 완료 | resume 날짜 검증 테스트 105줄, token-usage 검증 테스트 74줄 신규 추가 |

### 발견사항

1. **#52 미구현**: 이슈 #52의 핵심은 "startDate와 endDate는 함께 지정해야 합니다"인데, 현재 `usageSummaryQuerySchema`에는 `refineEndDateAfterStartDate`(순서 검증)만 적용되어 있다. startDate만 전달하면 여전히 기본 30일 범위로 폴백하는 문제가 해결되지 않았다.

2. **tz regex 패턴 개선**: token-usage 스키마의 기존 `tz` regex가 `/^[A-Za-z_/]+$/`에서 `/^[A-Za-z0-9_/+-]+$/`로 확장되고 `.max(64)` 제한이 추가됨. PR #80의 admin 스키마와 동일한 패턴으로 통일되어 일관성이 좋다.

### 달성률: 83%

---

## PR #76 — `refactor/batch-code-cleanup`

### 변경 파일 (13개)
`types/token-usage.ts` (신규), `lib/utils.ts`, `lib/admin/usage-service.ts`, `lib/token-usage/service.ts`, `app/(dashboard)/usage/page.tsx`, `components/cover-letters/cover-letter-card.tsx`, `components/documents/document-card.tsx`, `components/interviews/interview-card.tsx`, `components/resumes/resume-card.tsx`, `components/dashboard/recent-activity.tsx`, `components/career-notes/merge-proposal-dialog.tsx`, `tests/lib/admin/usage-service.test.ts`, `tests/lib/utils.test.ts`

| # | 이슈 | 요구사항 | 상태 | 비고 |
|---|------|---------|------|------|
| 1 | #51 | UsageSummary 타입을 types/token-usage.ts로 공유 추출 | ✅ 완료 | `types/token-usage.ts`에 `UsageSummary` + `UsageSummaryWithQuotas` 정의. `service.ts`와 `page.tsx` 양쪽에서 import |
| 2 | #62 | activeUsers `COUNT(DISTINCT user_id)` 최적화 | ✅ 완료 | `groupBy + .then(r => r.length)` -> `$queryRaw COUNT(DISTINCT user_id)` 변경, BigInt 처리 포함 |
| 3 | #35 | 4개 카드 컴포넌트의 중복 formatDate 제거 | ✅ 완료 | `cover-letter-card`, `document-card`, `interview-card`, `resume-card` 4개 모두 로컬 `formatDate` 삭제, `lib/utils.ts`의 공유 `formatDate` import |
| 4 | #35 | 공유 formatDate 함수 추가 | ✅ 완료 | `lib/utils.ts`에 `formatDate()` 추가 (year/month/day, locale: undefined) |
| 5 | #37 | interviewStatusLabel 상수화 | ⚠️ 부분 완료 | `recent-activity.tsx`만 `INTERVIEW_STATUS_LABEL` Record로 변경. `interview-card.tsx`는 여전히 `isCompleted ? "종료됨" : "진행중"` 인라인 분기 사용 |
| 6 | #37 | 라벨 텍스트 통일 ("완료" vs "종료됨") | ❌ 미구현 | `recent-activity.tsx`는 "완료"/"진행 중", `interview-card.tsx`는 "종료됨"/"진행중". 불일치 여전히 존재 |
| 7 | #37 | 공유 상수 파일 생성 | ❌ 미구현 | 이슈에서 제안한 `lib/constants/interview-status.ts` 미생성. `recent-activity.tsx`에 로컬 상수로만 정의 |
| 8 | #73 | 병합 제안 다이얼로그 반응형 grid | ✅ 완료 | `grid-cols-2` -> `grid-cols-1 md:grid-cols-2` 변경 |
| 9 | — | 테스트 업데이트 | ✅ 완료 | admin usage-service 테스트 COUNT DISTINCT 반영, utils 테스트에 formatDate/formatShortDate 추가 |

### 발견사항

1. **#37 부분 적용**: 이슈 #37의 핵심 목표는 (a) 상수 파일로 추출, (b) 라벨 텍스트 통일인데, `recent-activity.tsx`만 상수화하고 `interview-card.tsx`는 미적용이다. 라벨 불일치("완료" vs "종료됨", "진행 중" vs "진행중")도 해결되지 않았다.

2. **formatDate locale 변경**: 기존 4개 카드의 `formatDate`는 `"ko-KR"` locale을 하드코딩했으나, 공유 함수는 `undefined`(브라우저 기본 locale)를 사용한다. `formatShortDate`도 동일하게 `undefined`로 변경되었다. 다국어 지원 가능성을 열어둔 것으로 보이나, 한국어 단일 서비스에서 locale 출력이 달라질 수 있다. SSR(서버)과 CSR(브라우저)의 locale이 다르면 hydration mismatch의 원인이 될 수 있으므로 `suppressHydrationWarning` 추가와 맞물린 변경으로 보인다.

3. **PR #80과 파일 충돌** (위 PR #80 섹션 참조): `interview-card.tsx`에서 PR #76이 PR #80의 변경(suppressHydrationWarning)을 이미 포함하므로, merge 순서에 따라 충돌이 발생할 수 있다.

### 달성률: 78%

---

## PR 간 충돌 분석

| 공유 파일 | PR #80 변경 | PR #76 변경 | 충돌 위험 |
|----------|------------|------------|----------|
| `interview-card.tsx` | line 78: `suppressHydrationWarning` 추가 | lines 16-24: formatDate import 변경 + line 78: `suppressHydrationWarning` 추가 | **높음** — 동일 줄 수정. PR #76이 PR #80의 변경을 포함 |
| `lib/admin/usage-service.ts` | line 1: tz 파라미터 추가, lines 26-33: AT TIME ZONE | lines 18-28: activeUsers COUNT DISTINCT | **낮음** — 수정 범위 분리됨 |

**권장**: PR #76을 먼저 merge하면 PR #80의 interview-card 변경이 이미 반영되어 충돌이 줄어든다. 또는 PR #80에서 interview-card 변경을 제거하고 PR #76에 위임하는 방법도 있다.

---

## 종합 요약

| PR | 이슈 수 | 완료 | 부분 완료 | 미구현 | 달성률 |
|----|---------|------|----------|--------|--------|
| #80 | 2 | 1 | 1 (#29 범위 불일치) | 0 | 80% |
| #75 | 5 | 4 | 0 | 1 (#52) | 83% |
| #76 | 5 | 3 | 1 (#37) | 1 (#37 통일) | 78% |

## 권장 조치사항

1. **PR #75 - #52 미구현**: `usageSummaryQuerySchema`에 startDate/endDate 쌍 존재 검증 추가 필요
   ```typescript
   .refine(
     (d) => (d.startDate && d.endDate) || (!d.startDate && !d.endDate),
     { message: "startDate와 endDate는 함께 지정해야 합니다." }
   )
   ```

2. **PR #76 - #37 불완전**: `interview-card.tsx`도 공유 상수를 사용하도록 변경하고, 라벨 텍스트 통일 필요 ("완료"/"진행 중"으로 통일 또는 "종료됨"/"진행중"으로 통일)

3. **PR #80 - #29 재검토**: `suppressHydrationWarning`이 이슈 #29의 Radix UI ID mismatch를 해결하는 것인지, 아니면 날짜 포매팅 hydration 경고만 해결하는 것인지 명확히 하고, 이슈 close 조건 재확인 필요

4. **충돌 방지**: 3개 PR의 merge 순서를 PR #75 -> PR #76 -> PR #80 으로 하되, PR #80 merge 전 interview-card.tsx rebase 필요
