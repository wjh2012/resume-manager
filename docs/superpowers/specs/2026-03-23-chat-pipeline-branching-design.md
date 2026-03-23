# 채팅 파이프라인 프로바이더별 분기 설계

> 상태: 설계 완료 / 구현 대기
> 작성일: 2026-03-23

## 1. 배경

현재 채팅 API는 모든 프로바이더에 동일한 멀티스텝 tool loop 방식(`streamText` + tools + `stopWhen`)을 사용한다. 벤치마크 결과, 프로바이더별로 최적의 파이프라인이 다르다는 것이 확인되었다.

### 벤치마크 핵심 발견

| 프로바이더 | 멀티스텝 Tool Loop | 1단계 분류 + 서버 실행 | 최적 방식 |
|---|---|---|---|
| OpenAI (GPT) | 문서 선택 정확 | `documentsToRead:[]` 버그 빈발 | **멀티스텝** |
| Anthropic (Claude) | 정확하나 토큰 30~57% 과다 | 정확도 유사, 토큰 절약 | **분류방식** |
| Google (Gemini) | 도구 자체를 호출하지 않음 | 정확한 문서 선택 | **분류방식** |

벤치마크 상세: `benchmarks/chat-pipeline/v1/report.md`

## 2. 설계

### 2-1. 전체 흐름

```
사용자 메시지 도착
        │
        ▼
  인증 / 유효성 검사 / 할당량 체크 (기존 유지)
        │
        ▼
  사용자 AI 설정에서 프로바이더 확인
        │
        ├─ OpenAI ─────────────────────┐
        │                              │
        │  멀티스텝 Tool Loop           │
        │  streamText + tools          │
        │  (현재 방식 유지)             │
        │                              │
        ├─ Anthropic / Google ─────────┐
        │                              │
        │  1단계: generateText          │
        │    + Output.object            │
        │    → 분류 JSON 반환           │
        │                              │
        │  서버: Promise.all            │
        │    → 문서/노트 조회           │
        │    → 대화 압축 (필요 시)      │
        │                              │
        │  2단계: streamText            │
        │    → tools 없음              │
        │    → 텍스트만 스트리밍         │
        │                              │
        └──────────────┬───────────────┘
                       │
                       ▼
                스트리밍 응답 → 사용자
```

### 2-2. 분류 스키마 (Anthropic / Google 경로)

라우트별로 스키마가 다르다. 면접 라우트는 커리어노트를 사용하지 않으므로 `compareCareerNotes` 필드를 포함하지 않는다.

```typescript
// 커버레터용 스키마
const coverLetterClassificationSchema = z.object({
  documentsToRead: z.array(z.string())
    .describe("전문을 읽어야 할 문서 ID 목록. 요약만으로 충분하면 빈 배열."),
  compareCareerNotes: z.boolean()
    .describe("커리어노트 상세 비교가 필요하면 true"),
  needsCompression: z.boolean()
    .describe("대화가 길어서 압축이 필요하면 true"),
})

// 면접용 스키마 — compareCareerNotes 없음
const interviewClassificationSchema = z.object({
  documentsToRead: z.array(z.string())
    .describe("전문을 읽어야 할 문서 ID 목록. 요약만으로 충분하면 빈 배열."),
  needsCompression: z.boolean()
    .describe("대화가 길어서 압축이 필요하면 true"),
})
```

향후 판단 항목 추가 시 스키마에 필드만 추가하면 된다.

### 2-2a. 분류 프롬프트

분류 프롬프트에는 `buildContext`가 반환한 요약 컨텍스트, 대화 히스토리, 판단 지침을 포함한다. **`selectedDocumentIds`로 범위가 제한된 문서만 제공**하여 허용되지 않은 문서 ID가 반환되지 않도록 한다.

```typescript
const classificationPrompt = `사용자 메시지와 참고자료 요약을 보고 판단하세요:
1. documentsToRead: 전문을 읽어야 할 문서의 ID를 선택하세요. 요약만으로 충분하면 빈 배열.
${includeCareerNotes ? "2. compareCareerNotes: 기존 커리어노트와 비교가 필요하면 true." : ""}
${nextIndex}. needsCompression: 대화가 길어서 압축이 필요하면 true. (현재 ${messages.length}개 메시지)

[참고자료 요약]
${context}  ← buildContext에서 selectedDocumentIds로 필터링된 결과

[현재 대화]
${messages.map(m => \`\${m.role}: \${m.content}\`).join("\\n")}`
```

### 2-3. 분류 결과에 따른 서버 실행

```typescript
const [documents, careerNotes, compressedMessages] = await Promise.all([
  output.documentsToRead.length > 0
    ? prisma.document.findMany({
        where: { id: { in: output.documentsToRead }, userId },
        select: { id: true, title: true, extractedText: true },
      })
    : [],

  output.compareCareerNotes
    ? prisma.careerNote.findMany({
        where: { userId, status: "CONFIRMED" },
        select: { id: true, title: true, content: true, metadata: true },
      })
    : [],

  output.needsCompression
    ? compressMessages(messages)
    : messages,
])
```

### 2-4. 대화 압축 (`compressMessages`)

- **입력**: `ModelMessage[]` (`convertToModelMessages` 적용 후)
- **출력**: `ModelMessage[]` (동일 타입 — 2단계 `streamText`에 직접 전달 가능)
- 최근 4턴(user+assistant 2쌍)은 원본 유지
- 나머지를 `generateText`로 요약 (1회 호출) → `[이전 대화 요약]` 접두사 붙여 user 메시지로 선두에 삽입 (system 메시지는 `convertToModelMessages` 결과와 타입 호환 문제가 있으므로 user 메시지 사용)
- 사용 모델: 사용자 설정 모델과 동일 (별도 저렴한 모델 지정하지 않음)
- DB 저장 없음 — 이번 요청에서만 사용
- 1단계 분류에서 `needsCompression: true`일 때만 실행
- 압축 실패 시: 원본 메시지를 그대로 사용 (에러 로깅 후 진행)

### 2-5. 프로바이더 분기 위치

```typescript
// app/api/chat/cover-letter/route.ts (및 interview/route.ts)

const { model, provider } = await getLanguageModel(userId)

if (provider === "openai") {
  return handleMultiStepPipeline(model, system, messages, tools, ...)
} else {
  return handleClassificationPipeline(model, system, messages, ...)
}
```

공통 로직(인증, 유효성 검사, 컨텍스트 빌드, `convertToModelMessages`, onFinish)은 분기 밖에 둔다.

### 2-6. 분류 단계 실패 시 폴백

분류 단계(`generateText` + `Output.object`)가 실패(네트워크 오류, 잘못된 출력, rate limit 등)하면 **멀티스텝 경로로 폴백**한다.

```typescript
let result
try {
  result = await handleClassificationPipeline(model, system, modelMessages, ...)
} catch (error) {
  console.error("[classification fallback]", error)
  result = handleMultiStepPipeline(model, system, modelMessages, tools, ...)
}
```

이렇게 하면 분류 방식이 실패해도 사용자는 항상 응답을 받을 수 있다.

### 2-7. saveCareerNote 처리

현재와 동일하게 UI에서 별도 트리거 ("커리어노트 추출" 버튼 → `/api/career-notes/extract`). 채팅 파이프라인과 분리된 별도 API 엔드포인트이므로 두 경로 모두 동일.

### 2-8. 클라이언트 영향

- 분류 경로는 1단계(non-streaming)에서 지연이 발생한 후 2단계에서 스트리밍이 시작된다.
- 클라이언트 `useChat` 훅은 스트림 시작 지연을 자연스럽게 처리한다 (기존 멀티스텝에서도 도구 호출 중 지연이 있으므로 동일한 UX).
- 분류 경로에서는 도구 호출 UI 표시가 없다 (tools 미사용). 사용자에게 보이는 차이는 없음 — 현재도 도구 호출 표시는 부수적 정보.

### 2-9. `maxDuration` 조정

분류 경로는 최대 3회 순차 AI 호출(분류 + 압축 + 응답)이 발생한다. 느린 모델(sonnet-4.6 등)에서 60초를 초과할 수 있으므로 `maxDuration`을 `120`으로 상향한다.

## 3. 영향 범위

### 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `app/api/chat/cover-letter/route.ts` | 프로바이더 분기 추가 |
| `app/api/chat/interview/route.ts` | 동일 |
| `lib/ai/pipeline/multi-step.ts` | 멀티스텝 파이프라인 함수 (기존 로직 추출) |
| `lib/ai/pipeline/classification.ts` | 분류 파이프라인 함수 (신규) |
| `lib/ai/pipeline/compress.ts` | 대화 압축 함수 (신규) |
| `lib/ai/pipeline/schema.ts` | 분류 스키마 정의 (신규) |

### 변경 없는 파일

| 파일 | 이유 |
|---|---|
| `lib/ai/tools/*` | OpenAI 경로에서 그대로 사용 |
| `lib/ai/prompts/*` | 두 경로 모두 동일 프롬프트 |
| `lib/ai/context.ts` | 기존 요약 컨텍스트 빌드 유지 |
| `lib/ai/provider.ts` | provider 정보 이미 반환 중 |
| `components/chat/*` | 클라이언트 변경 없음 |

## 4. 토큰 사용량 기록

| 경로 | 기록 대상 |
|---|---|
| 멀티스텝 | onFinish에서 1회 (기존과 동일) |
| 분류방식 | 1단계 분류 + (압축 시 1회) + 2단계 응답 = 최대 3회 |

분류방식의 각 호출은 별도로 `recordUsage`를 호출하되, 동일한 `conversationId`로 묶는다. 각 `recordUsage`는 기존과 동일하게 `.catch()`로 에러를 삼켜 하나가 실패해도 나머지에 영향을 주지 않는다.

## 5. 제외 사항

- `ToolLoopAgent` 도입: 현재 `streamText` 직접 사용이 커스텀 로직에 더 적합. 향후 재사용 필요 시 검토.
- Gemini Pro 테스트: 유료 플랜 필요. flash-lite 결과 기반으로 분류방식 적용.
- 분류방식 폴백 로직 (`documentsToRead:[]` 시 전체 읽기): OpenAI에 분류방식을 적용하지 않으므로 불필요.

## 6. 벤치마크 기반 근거

### 가성비 최적 조합 (벤치마크 결과)

| 순위 | 모델 + 방식 | 정확도 | 비용 |
|---|---|---|---|
| 1 | gpt-5.4-nano + 멀티스텝 | ★★★★★ | $0.20/$1.25 per 1M |
| 2 | haiku-4.5 + 분류 | ★★★★☆ | $1.00/$5.00 per 1M |
| 3 | sonnet-4.6 + 분류 | ★★★★☆ | $3.00/$15.00 per 1M |
