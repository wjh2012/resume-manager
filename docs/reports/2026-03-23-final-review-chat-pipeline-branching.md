# 최종 점검 보고서: feat/chat-pipeline-branching

## 개요

- 점검 일시: 2026-03-23
- 대상 브랜치: `feat/chat-pipeline-branching` (develop 대비)
- 설계 스펙: `docs/superpowers/specs/2026-03-23-chat-context-optimization-design.md`
- 커밋 수: 14개 (리뷰 피드백 반영 4개 포함)
- 변경 규모: 25파일, +1,111 / -155

## 리뷰 피드백 반영 검증

PR #82에서 @claude 1차 리뷰(6건) + 재리뷰(2건)에 대한 반영 상태를 검증한다.

### 1차 리뷰 피드백

| # | 이슈 | 중요도 | 반영 상태 | 검증 |
|---|------|--------|----------|------|
| 1 | `includeCareerNotes` 파라미터가 실질적으로 무시됨 | 🔴 | ✅ 반영 | `classification.ts:40` — `params.includeCareerNotes && (result.compareCareerNotes ?? false)` 확인 |
| 2 | classification 결과에 대한 unsafe 타입 단언 | 🟡 | ✅ 반영 | `schema.ts:22-27` — `BaseClassification` 공통 인터페이스 도입, `classification.ts:38` — `as BaseClassification` 사용 |
| 3 | `on-finish.ts`의 `steps` 타입이 SDK와 분리됨 | 🟡 | 보류 | PR 코멘트에 사유 기록 (SDK 제네릭 복잡도). 현재 동작 문제 없음 |
| 4 | 불필요한 null 병합 연산자 (`finalMessages ?? []`) | 🟡 | 유지 | PR 코멘트에 사유 기록 (타입상 `undefined` 가능). false positive |
| 5 | `RECENT_TURNS` 상수 의미 불명확 | 🟢 | ✅ 반영 | `compress.ts:3-4` — `RECENT_MESSAGES = 4` + 설명 주석 확인 |
| 6 | classify 프롬프트에 판단 기준 부재 | 🟢 | 보류 | PR 코멘트에 사유 기록 (데이터 기반 별도 이터레이션 예정) |

### 재리뷰 피드백

| # | 이슈 | 중요도 | 반영 상태 | 검증 |
|---|------|--------|----------|------|
| A | `includeCareerNotes: false` 음성 케이스 테스트 누락 | 🟡 | ✅ 반영 | `classification.test.ts:145-169` — `includeCareerNotes: false`일 때 `compareCareerNotes: true`여도 조회 안 함 검증 확인 (커밋 73ae7b5) |
| B | `schema` 파라미터 타입이 `BaseClassification` 결과를 보장하지 않음 | 🟡 | 보류 | GitHub Issue #83으로 등록 완료 |

## 사용자 명시 수정사항 대비 검증

사용자가 최종 상태로 명시한 6개 수정사항을 코드에서 확인한다.

| # | 수정사항 | 상태 | 검증 근거 |
|---|---------|------|----------|
| 1 | includeCareerNotes 파라미터 강제 적용 | ✅ | `classification.ts:40` — AND 조건 결합 |
| 2 | BaseClassification 공통 인터페이스 도입 | ✅ | `schema.ts:22-27` — 인터페이스 정의, `classification.ts:6,38` — import 및 사용 |
| 3 | buildOnFinish 공통 모듈 추출 | ✅ | `on-finish.ts` — 공통 모듈, 양쪽 route에서 import 사용 확인 |
| 4 | classification 파이프라인 데이터 수집/압축 병렬화 | ✅ | `classification.ts:47-69` — `Promise.all([documents, careerNotes, compressed])` |
| 5 | 문서 접근 범위 필터링 (selectedDocumentIds) | ✅ | `classification.ts:44` — `allowedDocsToRead = docsToRead.filter(id => params.selectedDocumentIds.includes(id))` |
| 6 | includeCareerNotes 음성 케이스 테스트 추가 | ✅ | `classification.test.ts:145-169` |

## 스펙 대비 정합성

이 브랜치는 설계 스펙(채팅 컨텍스트 최적화)의 "Tool Use 도입" 항목을 확장하여, Anthropic/Google provider에서 도구 호출 대신 서버 사이드 분류+데이터 수집 방식을 구현한다.

| 스펙 요구사항 | 상태 | 비고 |
|-------------|------|------|
| 선택 문서 요약만 시스템 프롬프트에 포함 | ✅ | 양쪽 파이프라인 모두 `buildContext()` 사용 |
| readDocument 도구: 소유권 + 선택 범위 확인 | ✅ | multi-step: tool 내부 검증, classification: `allowedDocsToRead` 필터 |
| 면접은 커리어노트 미포함 | ✅ | interview route: `includeCareerNotes: false`, 스키마에 `compareCareerNotes` 없음, 파라미터 강제 적용 |
| 자소서는 커리어노트 포함 | ✅ | cover-letter route: `includeCareerNotes: true` |
| 토큰 사용량 추적 | ✅ | `onFinish`에서 main usage 기록 + pre-stage usage 별도 기록 |
| classification 실패 시 fallback | ✅ | 양쪽 route에서 try-catch → multi-step fallback |

## 품질 검증

| 항목 | 결과 |
|------|------|
| 테스트 | ✅ 741/741 통과 (59 파일) |
| 타입체크 | ✅ 이 브랜치에서 새로 도입된 에러 없음 (기존 12건은 develop에서도 동일) |
| 미사용 코드 | ✅ 이전 보고서의 `types.ts` 미사용 타입 문제 해소됨 (파일 제거 확인) |
| buildOnFinish 중복 | ✅ 이전 보고서의 중복 코드 문제 해소됨 (`on-finish.ts`로 추출) |
| selectedDocumentIds 범위 검증 | ✅ 이전 보고서의 중간 우선순위 이슈 해소됨 (`allowedDocsToRead` 필터 추가) |
| 문서 동기화 | ✅ `docs/features/05-ai-infra.md`, `docs/references/changelog.md`, `docs/references/decisions.md` 업데이트 확인 |

## 이전 보고서 대비 변화

이전 보고서(`2026-03-23-branch-review-chat-pipeline-branching.md`)에서 지적한 3개 권장 조치사항이 모두 해결되었다:

1. ~~`types.ts` 미사용 타입~~ → 파일 제거됨
2. ~~`buildOnFinish` 중복~~ → `on-finish.ts`로 추출
3. ~~`documentsToRead`의 `selectedDocumentIds` 범위 미검증~~ → 필터링 추가

## 보류/후속 사항

| 항목 | 추적 |
|------|------|
| classification 스키마 타입 안전성 강화 | GitHub Issue #83 |
| on-finish.ts SDK 타입 직접 참조 | 보류 (PR 코멘트 기록) |
| classify 프롬프트 판단 기준 추가 | 데이터 기반 별도 이터레이션 예정 |

## 전체 달성률

**100%** — 브랜치 목적 대비 모든 기능 구현 완료. 리뷰 피드백 전수 반영 또는 합리적 보류 처리. 이전 점검에서 지적된 3개 이슈 전량 해소.

## 머지 가능 여부

**승인** — 차단 이슈 없음. 테스트 전량 통과, 새 타입 에러 없음, 리뷰 피드백 반영 완료, 문서 동기화 완료.
