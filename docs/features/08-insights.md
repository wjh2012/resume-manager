# 인사이트 추출

> Phase 5 — 대화에서 사용자 강점/경험/동기 자동 추출

## 개요

자기소개서/면접 대화에서 사용자의 강점, 경험, 동기 등 비정형 정보를 AI로 자동 추출하여 관리하고, 이후 AI 채팅 컨텍스트에 자동 반영한다.

## 핵심 흐름

1. **추출** — 자기소개서/면접 채팅 헤더의 Lightbulb 버튼 클릭 → 확인 다이얼로그 → AI가 대화 내용에서 인사이트 추출
2. **자동 추출** — 면접 종료 시 "인사이트 자동 추출" 체크박스(기본 체크)로 종료와 동시에 추출
3. **관리** — 인사이트 대시보드에서 카테고리별 필터, 시간순/카테고리별 정렬, 수정(다이얼로그), 삭제(낙관적 UI)
4. **활용** — 축적된 인사이트가 자기소개서/면접 AI 채팅 시 컨텍스트에 자동 포함

## 데이터 구조

### Insight

```
Insight
  ├── id, userId, conversationId (출처 대화)
  ├── category: strength | experience | motivation | skill | other
  ├── title, content
  └── createdAt, updatedAt
```

### 카테고리

| 카테고리 | 한국어 | 배지 색상 |
|----------|--------|-----------|
| strength | 강점 | 초록 |
| experience | 경험 | 파랑 |
| motivation | 동기 | 보라 |
| skill | 기술 | 주황 |
| other | 기타 | 회색 |

## 서비스 레이어 (`lib/insights/service.ts`)

- `extractInsights`: 대화 소유권 검증(`findFirst` + userId) → 메시지 로드 → 기존 인사이트 삭제 → `generateObject`로 구조화 추출 → `$transaction` 일괄 생성
- `listInsights`: 카테고리 필터 옵션, 출처 대화 관계 포함
- `updateInsight`: `updateMany` 소유권 패턴
- `deleteInsight`: `deleteMany` 소유권 패턴
- `countByCategory`: `groupBy`로 카테고리별 개수 집계

### 에러 클래스

- `InsightNotFoundError`: 인사이트 또는 대화가 존재하지 않을 때
- `InsightForbiddenError`: 소유권이 없을 때

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/insights/extract` | 대화에서 인사이트 추출 |
| PUT | `/api/insights/[id]` | 인사이트 수정 |
| DELETE | `/api/insights/[id]` | 인사이트 삭제 |

목록 조회는 Server Component에서 `listInsights()` 직접 호출 (API route 없음).

## 페이지 구조

```
app/(dashboard)/insights/
  └── page.tsx — 인사이트 대시보드 (RSC, Suspense)
```

## 컴포넌트

| 컴포넌트 | 설명 |
|---------|------|
| `InsightCard` | 카테고리 배지, 출처 링크, 수정/삭제 버튼 |
| `InsightList` | 카테고리 탭 필터 + 정렬 토글 + 낙관적 삭제 (`useOptimistic`) |
| `InsightEditDialog` | 제목/내용/카테고리 편집 폼 |

## AI 추출 방식

`generateObject` (ai SDK) + Zod 스키마로 구조화된 인사이트를 추출한다. 프롬프트는 `lib/ai/prompts/insight-extraction.ts`에 정의.

```typescript
const { object } = await generateObject({
  model,
  schema: insightObjectSchema,  // z.object({ insights: z.array(...) })
  system: insightExtractionPrompt,
  prompt: messages.map(m => `${m.role}: ${m.content}`).join("\n"),
})
```

## 컨텍스트 자동 통합

`lib/ai/context.ts`의 `buildContext()`에 `includeInsights: true` 옵션 전달 시 최근 10개 인사이트가 AI 시스템 프롬프트에 자동 포함된다.

- 자기소개서 채팅: `includeInsights: true` (기존 구현)
- 면접 채팅: `includeInsights: true` (Phase 5에서 추가)
