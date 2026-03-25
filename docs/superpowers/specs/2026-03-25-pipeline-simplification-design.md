# 채팅 파이프라인 단순화 설계

> 상태: 설계 완료 / 구현 대기
> 작성일: 2026-03-25
> 선행 문서: `2026-03-23-chat-pipeline-branching-design.md` (이 설계로 대체)

## 1. 배경

### 벤치마크 결과 요약

| 방식 | 정확도 (gpt-5.4) | 비용 | 비고 |
|---|---|---|---|
| Deterministic Routing (structured output) | 79.3% | $1.77 | 문서 선택(tc-3) 38%로 약함 |
| Tool-calling | 41.7% | $3.58 | tc-2 0%, 개발자 페르소나 25% |

### 핵심 발견

1. **LLM이 못하는 결정**: 문서 선택(`documentsToRead`) — DR 38%, TC 32%
2. **LLM이 잘하는 결정**: 저장 판단(`saveCareerNote`) — DR 91%
3. **LLM이 안 해도 되는 결정**: 대화 압축, 커리어노트 포함 여부
4. **문서 규모가 작음**: 유저당 3~7개, 전문 합쳐도 10,000~20,000 토큰

### 결론

LLM 판단을 최소화하고, 선택된 문서는 전문 로드, 복잡한 분기 제거.

## 2. 설계

### 2-1. 변경 전후 비교

| | 변경 전 | 변경 후 |
|---|---|---|
| 파이프라인 | Classification + Multi-step (provider별 분기) | **단일 파이프라인** |
| LLM 결정 | documentsToRead, externalDocumentsToRead, compareCareerNotes, needsCompression, saveCareerNote | **없음** (응답 생성만) |
| 문서 로딩 | LLM이 선별 (정확도 38%) | 선택된 문서 **전문 로드** |
| 커리어노트 저장 | LLM 판단 (tool-calling / structured output) | **사용자 UI 액션** |
| 대화 압축 | LLM 판단 (`needsCompression`) | **토큰 50% 임계값** |
| API 호출 수 | 2~3회 (classify → compress → respond) | **1회** (compress 필요 시 2회) |
| Provider 분기 | OpenAI ≠ Anthropic/Google | **전체 동일** |

### 2-2. 새 파이프라인 흐름

```
사용자 메시지 도착
        │
        ▼
  인증 / 유효성 검사 (기존 유지)
        │
        ▼
  [코드] 선택된 문서 전문 로드
    ├─ documents: DB 관계로 연결된 참조문서 전문 (extractedText)
    ├─ externalDocuments: DB 관계로 연결된 외부문서 전문 (content)
    │   ├─ cover-letter: coverLetterExternalDocs 조인 테이블
    │   └─ interview: interviewExternalDoc 조인 테이블
    └─ careerNotes: CONFIRMED 상태 전체 (content), cover-letter만
        │
        ▼
  [코드] 문서 컨텍스트 조립 (buildFullContext — context.ts 신규 함수)
    └─ 기존 buildContext()의 요약 형식 대신 전문 형식으로 조립
        │
        ▼
  [코드] 대화 토큰 카운트 → 필요 시 compress()
    ├─ 대상: 시스템 프롬프트 + 문서 컨텍스트 + 대화 히스토리
    ├─ 임계값: 모델 컨텍스트 윈도우의 50%
    └─ 압축 대상은 대화 히스토리만 (문서 컨텍스트는 압축하지 않음)
        │
        ▼
  [LLM] streamText()
    ├─ 시스템 프롬프트 (기존 유지, 도구 안내 문구만 제거)
    ├─ 문서/외부문서/커리어노트 전문 주입
    ├─ 대화 히스토리 (필요 시 압축된)
    ├─ tools: 없음
    └─ → 스트리밍 응답
```

**OpenAI도 이 단일 파이프라인을 사용한다.** 기존 OpenAI 전용 multi-step(tool-calling) 경로는 제거. 벤치마크에서 tool-calling(41.7%)이 classification(79.3%)보다 낮았고, 문서 전문 로드로 선택 자체가 불필요해졌으므로 provider 분기의 근거가 사라짐.

### 2-3. 대화 압축 로직

**신규 구현 필요:**

- `countTokens(text: string): number` — 토크나이저 기반 토큰 카운트. provider별 정확한 토크나이저 대신 `gpt-tokenizer` 등 범용 라이브러리로 근사치 사용 (목적이 임계값 판단이므로 정확도보다 속도 우선).
- `getModelContextWindow(model: string): number` — `types/ai.ts`의 `PROVIDER_MODELS`에 `contextWindow` 필드 추가.

```typescript
const contextTokens = countTokens(systemPrompt + documentContext + messages)
const modelContextWindow = getModelContextWindow(model)

if (contextTokens > modelContextWindow * 0.5) {
  messages = await compress(model, messages)
  // compress 사용량은 recordUsage()로 별도 기록
}
```

- 기존 `compress.ts` 로직 유지 (최근 4개 메시지 보존, 나머지 요약)
- 트리거만 LLM 판단 → 토큰 임계값으로 변경
- **compress 토큰 사용량**: compress 호출 시 반환되는 usage를 `recordUsage()`로 기록 (기존 `preStageUsages` 패턴 대신 compress 직후 즉시 기록)

### 2-4. 커리어노트 저장

- 채팅에서 LLM이 저장을 제안/실행하지 않음
- 사용자가 UI에서 직접 저장 (별도 기능 — 이 설계 범위 밖)
- 기존 `saveCareerNote` 도구 제거

## 3. 제거 대상

| 파일 | 이유 |
|---|---|
| `lib/ai/pipeline/classify.ts` | classification 실행 로직 |
| `lib/ai/pipeline/classification.ts` | classification 파이프라인 |
| `lib/ai/pipeline/multi-step.ts` | tool-calling 파이프라인 |
| `lib/ai/pipeline/schema.ts` | classification 스키마 |
| `lib/ai/pipeline/index.ts` | `selectPipeline()` provider 분기 |
| `lib/ai/tools/read-document.ts` | LLM 도구 (문서 읽기) |
| `lib/ai/tools/read-external-document.ts` | LLM 도구 (외부문서 읽기) |
| `lib/ai/tools/read-career-note.ts` | LLM 도구 (커리어노트 읽기) |
| `lib/ai/tools/save-career-note.ts` | LLM 도구 (커리어노트 저장) |
| `lib/ai/tools/index.ts` | 도구 내보내기 + maxSteps 계산 |

## 4. 수정 대상

| 파일 | 변경 내용 |
|---|---|
| `lib/ai/context.ts` | `buildFullContext()` 신규 함수 추가 — 문서/외부문서/커리어노트 전문을 시스템 프롬프트용 문자열로 조립. 기존 `buildContext()`는 제거 또는 deprecated |
| `lib/ai/pipeline/compress.ts` | 유지, 외부에서 토큰 임계값으로 호출. 이미 `CompressResult`에 usage 포함 |
| `lib/ai/pipeline/on-finish.ts` | 유지 (streamText onFinish 콜백). 변경 최소화 |
| `lib/ai/prompts/cover-letter.ts` | 도구 관련 안내 문구 제거 |
| `lib/ai/prompts/interview.ts` | 도구 관련 안내 문구 제거 |
| `app/api/chat/cover-letter/route.ts` | 단일 파이프라인 호출로 단순화. `preStageUsages` 루프 제거, compress usage는 즉시 기록 |
| `app/api/chat/interview/route.ts` | 단일 파이프라인 호출로 단순화. `preStageUsages` 루프 제거, compress usage는 즉시 기록 |
| `types/ai.ts` | `PROVIDER_MODELS`에 `contextWindow` 필드 추가 |

## 4-1. 신규 구현

| 항목 | 위치 | 설명 |
|---|---|---|
| `countTokens()` | `lib/ai/tokens.ts` (신규) | 범용 토크나이저로 토큰 수 근사치 반환 |
| `getModelContextWindow()` | `lib/ai/tokens.ts` (신규) | `PROVIDER_MODELS`에서 contextWindow 조회 |
| `buildFullContext()` | `lib/ai/context.ts` | 문서 전문 조립 함수 |

## 5. 유지 대상

| 파일 | 이유 |
|---|---|
| `lib/ai/provider.ts` | 모델 생성 로직 (변경 없음) |
| `lib/ai/pipeline/compress.ts` | 압축 로직 유지 |
| `lib/ai/pipeline/on-finish.ts` | 토큰 사용량 추적, DB 저장 유지 |
| `lib/ai/prompts/` | 시스템 프롬프트 유지 (도구 문구만 제거) |

## 6. 벤치마크 영향

기존 벤치마크(`benchmarks/deterministic-routing/`, `benchmarks/tool-calling/`)는 이 설계의 근거 자료로 보존한다. 새 파이프라인에 대한 벤치마크는 필요 시 별도 설계.
