# Branch 점검 보고서: feat/chat-pipeline-branching

## 개요

- 점검 일시: 2026-03-23
- 대상 브랜치: `feat/chat-pipeline-branching` (develop 대비)
- 설계 스펙: `docs/superpowers/specs/2026-03-23-chat-context-optimization-design.md`
- 구현 계획: `docs/superpowers/plans/2026-03-23-chat-context-optimization.md`
- 변경 범위: `lib/ai/pipeline/` 신규 모듈 + 채팅 라우트 통합 + 테스트
- 커밋 수: 10개

## 브랜치 목적

설계 스펙의 "Tool Use 도입" 중 provider 기반 파이프라인 분기를 구현한다:
- OpenAI: multi-step (기존 tool-based `streamText` + `tools` + `stopWhen`)
- Anthropic/Google: classification (분류 -> 데이터 수집 -> 압축 -> 응답)

## 상세 점검 결과

### 1. 파이프라인 모듈 (`lib/ai/pipeline/`)

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 1 | provider 기반 파이프라인 선택 (`selectPipeline`) | ✅ 완료 | `index.ts` — openai -> multi-step, 그 외 -> classification |
| 2 | multi-step 파이프라인: `streamText` + `tools` + `stopWhen` 사용 | ✅ 완료 | `multi-step.ts` — `calculateMaxSteps` 활용 |
| 3 | classification 파이프라인: 분류 -> 데이터 수집 -> 압축 -> 응답 | ✅ 완료 | `classification.ts` — 4단계 순차 실행 |
| 4 | 분류 스키마: 자소서용 (documentsToRead, compareCareerNotes, needsCompression) | ✅ 완료 | `schema.ts` |
| 5 | 분류 스키마: 면접용 (documentsToRead, needsCompression, compareCareerNotes 없음) | ✅ 완료 | `schema.ts` |
| 6 | 분류 함수: `generateText` + `Output.object` 사용 | ✅ 완료 | `classify.ts` |
| 7 | 대화 압축: 4턴 초과 시 앞부분 요약 + 최근 4턴 유지 | ✅ 완료 | `compress.ts` |
| 8 | 대화 압축: 실패 시 원본 메시지 그대로 사용 (graceful fallback) | ✅ 완료 | `compress.ts:55-58` — try-catch로 원본 반환 |
| 9 | classification 파이프라인: tools 없이 streamText 호출 | ✅ 완료 | `classification.ts:91` — tools 미전달 |
| 10 | classification 파이프라인: pre-stage 토큰 사용량 수집 | ✅ 완료 | `classification.ts:25,34,70` — 분류+압축 usage 수집 |
| 11 | classification 파이프라인: 분류 결과에 따라 병렬 데이터 수집 | ✅ 완료 | `classification.ts:43-59` — `Promise.all` 사용 |

### 2. 채팅 라우트 통합

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 12 | cover-letter route: `selectPipeline` -> 분기 처리 | ✅ 완료 | `route.ts:122-172` |
| 13 | cover-letter route: classification 실패 시 multi-step fallback | ✅ 완료 | `route.ts:157-171` |
| 14 | cover-letter route: pre-stage 토큰 사용량 개별 기록 | ✅ 완료 | `route.ts:147-154` |
| 15 | interview route: `selectPipeline` -> 분기 처리 | ✅ 완료 | `route.ts:132-175` |
| 16 | interview route: classification 실패 시 multi-step fallback | ✅ 완료 | `route.ts:165-174` |
| 17 | interview route: pre-stage 토큰 사용량 개별 기록 | ✅ 완료 | `route.ts:155-162` |
| 18 | interview route: 커리어노트 미포함 (스펙: 면접은 커리어노트 미포함) | ✅ 완료 | `route.ts:151` — `includeCareerNotes: false` |
| 19 | cover-letter route: 커리어노트 포함 | ✅ 완료 | `route.ts:143` — `includeCareerNotes: true` |

### 3. 스펙과의 정합성

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 20 | step 수 동적 계산: `선택 문서 수 + 커리어노트 수 + 2`, 상한 15 | ✅ 완료 | `lib/ai/tools/index.ts:9-14` — 이전 PR에서 구현, 이 브랜치에서 활용 |
| 21 | `stopWhen: stepCountIs(N)` 사용 | ✅ 완료 | `multi-step.ts:20` |
| 22 | classification에서 문서 전문 조회 시 소유권 확인 | ✅ 완료 | `classification.ts:47` — `userId` 조건 포함 |
| 23 | classification에서 커리어노트 조회 시 CONFIRMED만 | ✅ 완료 | `classification.ts:55` — `status: "CONFIRMED"` |

### 4. 테스트

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 24 | `selectPipeline` 테스트: openai/anthropic/google/unknown | ✅ 완료 | `tests/lib/ai/pipeline/index.test.ts` |
| 25 | `classify` 테스트: 정상 반환 + output null 에러 | ✅ 완료 | `tests/lib/ai/pipeline/classify.test.ts` |
| 26 | `compressMessages` 테스트: 4턴 이하 스킵, 초과 시 압축, 실패 시 원본 | ✅ 완료 | `tests/lib/ai/pipeline/compress.test.ts` |
| 27 | `handleClassification` 테스트: 문서 조회, 압축, 커리어노트 조회 | ✅ 완료 | `tests/lib/ai/pipeline/classification.test.ts` |
| 28 | `handleMultiStep` 테스트: tools + stopWhen 전달 확인 | ✅ 완료 | `tests/lib/ai/pipeline/multi-step.test.ts` |
| 29 | schema 테스트: 유효/무효 입력 파싱 | ✅ 완료 | `tests/lib/ai/pipeline/schema.test.ts` |
| 30 | 기존 route 테스트 업데이트: pipeline mock 반영 | ✅ 완료 | cover-letter, interview route 테스트 |
| 31 | chat-message 테스트 업데이트 | ✅ 완료 | tool part 렌더링 테스트 추가 |

## 주요 발견사항

### 이슈 없음 (양호)

1. **classification fallback 구현 양호**: 분류 파이프라인 실패 시 multi-step으로 자동 전환하여 서비스 안정성을 확보했다.
2. **pre-stage 토큰 추적 양호**: 분류/압축 단계의 토큰 사용량을 별도 기록하여 비용 추적이 가능하다.
3. **소유권 검증 일관성**: classification 내부의 DB 쿼리에서도 `userId` 조건을 일관되게 적용했다.

### 경미한 관찰사항 (비차단)

1. **`PipelineParams`, `PipelineResult` 타입 미사용**: `types.ts`에 정의된 두 타입이 어디에서도 import되지 않는다. `classification.ts`는 자체 `ClassificationPipelineParams`를, `multi-step.ts`는 자체 `MultiStepParams`를 사용한다. 공통 타입 의도였다면 활용하거나, 불필요하면 제거하는 것이 좋다.

2. **`buildOnFinish` 헬퍼 중복**: cover-letter `route.ts`와 interview `route.ts`에 `BuildOnFinishParams` 인터페이스와 `buildOnFinish` 함수가 완전히 동일하게 중복 정의되어 있다. 공통 모듈로 추출하면 유지보수성이 향상된다.

3. **classification 파이프라인의 `selectedDocumentIds` 범위 미검증**: `classify()` 결과의 `documentsToRead`에 LLM이 `selectedDocumentIds` 범위 밖의 ID를 반환할 가능성이 있다. `classification.ts:47`에서 `id: { in: docsToRead }` + `userId`로 쿼리하므로 다른 사용자 문서 접근은 차단되지만, `selectedDocumentIds` 범위 밖의 자기 문서에 접근할 수 있다. multi-step 경로의 `readDocument` 도구는 `allowedDocumentIds.includes(documentId)` 검증이 있어 이 문제가 없다.

## 스펙 대비 요약

이 브랜치는 설계 스펙의 전체 범위 중 "파이프라인 분기" 부분만을 구현한다. 설계 스펙에는 파이프라인 분기에 대한 직접적인 명세가 없으며 (Tool Use 기반 단일 경로만 기술), 이 구현은 스펙의 도구 사용 패턴을 Anthropic/Google provider에서도 지원하기 위한 확장이다. 스펙에 명시된 `readDocument`, `readCareerNote`, `saveCareerNote` 도구는 multi-step 경로에서 그대로 사용되며, classification 경로에서는 서버 사이드에서 동일한 데이터 수집을 수행한다.

## 전체 달성률

**100%** — 브랜치 목적(provider 기반 파이프라인 분기) 대비 모든 기능이 구현되었고 테스트가 작성되어 있다.

## 권장 조치사항

| 우선순위 | 조치 | 사유 |
|---------|------|------|
| 낮음 | `lib/ai/pipeline/types.ts`의 미사용 타입 제거 또는 활용 | 데드 코드 방지 |
| 낮음 | `buildOnFinish` 헬퍼를 공통 모듈로 추출 | 중복 코드 제거 |
| 중간 | classification 경로에서 `documentsToRead`를 `selectedDocumentIds` 범위로 필터링 | multi-step 경로와의 접근 제어 일관성 |
