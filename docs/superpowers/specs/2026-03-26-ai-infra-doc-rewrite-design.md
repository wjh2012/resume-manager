# AI 인프라 문서 재작성 설계

> 2026-03-26

## 목적

`docs/features/05-ai-infra.md`를 현재 코드에 맞게 재작성한다. 삭제된 tool use, multi-step/classification 파이프라인 분기 내용을 제거하고, 현행 단일 파이프라인 흐름을 중심으로 정리한다.

## 배경

PR #93(deterministic-routing 벤치마크 + 파이프라인 단순화)에서 채팅 파이프라인이 대폭 변경됨:

- tool use 4개 도구 (`readDocument`, `readExternalDocument`, `readCareerNote`, `saveCareerNote`) 삭제
- provider별 파이프라인 분기 (`selectPipeline`, `multi-step`, `classification`) 삭제
- 단일 파이프라인으로 통합: 문서 전문 주입 → 압축 → streamText

현재 `05-ai-infra.md`에는 삭제된 내용이 그대로 남아 있어 코드와 괴리 상당.

## 문서 구조

파이프라인 흐름 중심(요청 → 응답 순서)으로 구성한다.

### 섹션 구성

```
# AI 인프라 — 채팅 파이프라인

## 개요
## 파이프라인 흐름도 (Mermaid)
## 단계별 상세
  ### 1. 인증 & 요청 검증
  ### 2. 쿼터 체크
  ### 3. 컨텍스트 빌드 + 모델 로딩 (병렬)
  ### 4. 시스템 프롬프트
  ### 5. 대화 압축
  ### 6. 스트리밍 응답 & 후처리
## 지원 모델
## 주요 파일 맵
```

### 각 섹션 내용

**개요**: 한 줄 요약 + 변경 배경 (tool-calling → classification → 전문 주입으로의 진화)

**파이프라인 흐름도**: Mermaid flowchart. 인증 → 검증 → 소유권확인 → 쿼터 → [컨텍스트빌드 || 모델로딩] → 시스템프롬프트 → 압축판단 → streamText → onFinish(DB+토큰)

**단계별 상세**:
1. 인증 & 검증 — Supabase auth, Zod 스키마(`coverLetterChatSchema`/`interviewChatSchema`), 소유권 체크. cover-letter vs interview 차이(외부문서 조회 경로, 커리어노트 포함 여부)
2. 쿼터 — `checkQuotaExceeded`: TOKENS/COST/REQUESTS × DAILY/MONTHLY
3. 컨텍스트 + 모델 — `buildFullContext`(문서 전문 + 외부 문서 + 커리어노트), `getLanguageModel`(DB → factory). `Promise.all`로 병렬
4. 시스템 프롬프트 — `buildCoverLetterSystemPrompt` / `buildInterviewSystemPrompt` 파라미터 설명
5. 압축 — `compressIfNeeded`: 토큰 > contextWindow × 50% 시 이전 대화 LLM 요약, 최근 4턴 유지
6. 응답 + 후처리 — `streamText` (tools 없음), `onFinish`에서 메시지 DB 저장 + `recordUsage` + 비용 계산(`ModelPricing`)

**지원 모델**: `types/ai.ts`의 `PROVIDER_MODELS` 테이블

**주요 파일 맵**: 파일 경로 ↔ 역할 테이블

### 의도적 제외

- 삭제된 tool use, multi-step, classification, selectPipeline 관련 내용
- 벤치마크 인프라 (별도 문서 영역)
- 채팅 UI 컴포넌트
- 설정 페이지 / API key 관리

## 작업 범위

- `docs/features/05-ai-infra.md` 전체 재작성 (기존 내용 대체)
- 새 파일 생성 없음
