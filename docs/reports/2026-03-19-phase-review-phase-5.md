# Phase 5 점검 보고서

## 개요
- 점검 일시: 2026-03-19 (최종 점검)
- 대상 Phase: Phase 5 (인사이트 추출)
- 점검 범위: 커밋 683ce3f..HEAD (PR 리뷰 피드백 반영 포함)
- 전체 달성률: **100%**

## 1. 완료 기준 점검

| # | 완료 기준 | 상태 | 검증 근거 |
|---|----------|------|-----------|
| 1 | 인사이트 추출 API (`generateObject` + Zod 스키마) | ✅ 완료 | `app/api/insights/extract/route.ts` + `lib/insights/service.ts`의 `extractInsights()` — `generateObject` + `insightObjectSchema` (Zod) 사용 확인 |
| 2 | 자기소개서/면접 UI에 "인사이트 추출" 버튼 | ✅ 완료 | `cover-letter-chat.tsx` 헤더에 Lightbulb 아이콘 버튼 + AlertDialog 확인. `interview-chat.tsx` 헤더에 동일 버튼 + 종료 다이얼로그 체크박스 확인 |
| 3 | 인사이트 대시보드 (카테고리별 필터) | ✅ 완료 | `app/(dashboard)/insights/page.tsx` SC + `insight-list.tsx` CC — 6개 카테고리 탭(전체/강점/경험/동기/기술/기타) + 각 탭 개수 배지 + 정렬 토글(시간순/카테고리별) |
| 4 | 인사이트 CRUD (수정, 삭제) | ✅ 완료 | PUT `app/api/insights/[id]/route.ts` (수정) + DELETE 동일 파일 (삭제). `insight-edit-dialog.tsx` (수정 UI) + `insight-card.tsx` AlertDialog (삭제 UI). 낙관적 삭제 구현 |
| 5 | 컨텍스트 빌더에 인사이트 자동 통합 | ✅ 완료 | `app/api/chat/interview/route.ts:103`에 `includeInsights: true` 추가 확인. 자기소개서는 기존 구현 (`app/api/chat/cover-letter/route.ts`에 이미 존재) |

## 2. 파일 목록 대비 실제 존재 여부

### 디자인 스펙 기준 (신규 파일)

| 파일 | 존재 | 비고 |
|------|------|------|
| `lib/validations/insight.ts` | ✅ | `extractInsightsSchema` + `updateInsightSchema` 정의 |
| `lib/insights/service.ts` | ✅ | 6개 함수: extractInsights, listInsights, updateInsight, deleteInsight, countByCategory + 에러 클래스 3개 (InsightNotFoundError, ConversationNotFoundError, InsightForbiddenError) |
| `app/api/insights/extract/route.ts` | ✅ | POST 핸들러 |
| `app/api/insights/[id]/route.ts` | ✅ | PUT + DELETE 핸들러 |
| `app/(dashboard)/insights/page.tsx` | ✅ | SC, Suspense 래핑 |
| `components/insights/insight-list.tsx` | ✅ | CC, 카테고리 탭 + 정렬 + 낙관적 삭제 |
| `components/insights/insight-card.tsx` | ✅ | 카테고리 배지 + 출처 링크 + 수정/삭제 버튼 |
| `components/insights/insight-edit-dialog.tsx` | ✅ | Dialog 기반 편집 폼 |

### 디자인 스펙 기준 (수정 파일)

| 파일 | 수정됨 | 비고 |
|------|--------|------|
| `components/cover-letters/cover-letter-chat.tsx` | ✅ | 헤더에 Lightbulb 추출 버튼 + AlertDialog 추가 |
| `components/interviews/interview-chat.tsx` | ✅ | 헤더에 추출 버튼 + 종료 다이얼로그에 자동 추출 체크박스 추가 |
| `app/api/chat/interview/route.ts` | ✅ | `includeInsights: true` 추가 |

### 원본 스펙 기준 (의도적 생략)

| 파일 | 상태 | 비고 |
|------|------|------|
| `app/api/insights/route.ts` | 생략 (의도적) | `spec-deviations.md`에 기록됨. SC 직접 호출 패턴 (기존 interviews, cover-letters와 일관) |

## 3. decisions.md 패턴 준수 검증

| 패턴 | 준수 | 검증 |
|------|------|------|
| **Zod safeParse 통일** | ✅ | `extract/route.ts:34` — `extractInsightsSchema.safeParse(body)`. `[id]/route.ts:49` — `updateInsightSchema.safeParse(body)` |
| **JSON 파싱 별도 try-catch** | ✅ | `extract/route.ts:25-32` — `request.json()` 별도 try-catch + 400 응답. `[id]/route.ts:39-47` — 동일 패턴 |
| **updateMany/deleteMany 소유권** | ✅ | `service.ts:108-119` — `updateMany({ where: { id, userId } })` + count 확인 + `findUnique` 분기(NotFound/Forbidden). `deleteMany`도 동일 패턴 (122-133행) |
| **접근성 label-input 연결** | ✅ | `insight-edit-dialog.tsx` — `Label htmlFor="insight-category"` + `SelectTrigger id="insight-category"`, `htmlFor="insight-title"` + `Input id="insight-title"`, `htmlFor="insight-content"` + `Textarea id="insight-content"`. `interview-chat.tsx` — `label htmlFor="extract-insights"` + `Checkbox id="extract-insights"`. `cover-letter-chat.tsx` — `label htmlFor="doc-{id}"` + `Checkbox id="doc-{id}"` |
| **conversationId 소유권 검증** | ✅ | `service.ts:40-44` — `findFirst({ where: { id: conversationId, userId } })` + `ConversationNotFoundError` throw |

## 4. 상세 구현 품질 점검

### 긍정적 사항

1. **서비스 레이어 분리**: `lib/insights/service.ts`로 비즈니스 로직 격리 — 기존 패턴과 일관
2. **에러 처리 체계화**: `InsightNotFoundError`, `ConversationNotFoundError`, `InsightForbiddenError`, `AiSettingsNotFoundError` 분기 처리
3. **낙관적 UI**: `useOptimistic` + `useTransition`으로 삭제 시 즉각 UI 반영 — interviews 패턴과 일관
4. **Suspense 래핑**: 대시보드 페이지에서 `InsightListSection` async 컴포넌트를 Suspense로 래핑
5. **카테고리 배지 색상**: 스펙 5종 색상 모두 구현 (green/blue/purple/orange/gray) + 다크모드 대응
6. **출처 링크**: `getSourceLink()` 함수로 conversation.type 기반 자기소개서/면접 경로 생성
7. **면접 종료 시 자동 추출**: 체크박스(기본 체크) + `handleComplete` 내에서 `extractOnComplete` 조건부 호출
8. **재추출 확인 다이얼로그**: "수동 편집 내용을 포함하여 모두 삭제 후 다시 추출됩니다" 안내 — 디자인 리뷰 제안 반영
9. **빈 메시지 방어**: `service.ts:46-48` — messages.length === 0이면 빈 배열 반환 (불필요한 AI 호출 방지)
10. **deleteMany에 userId 포함**: `service.ts:50` — 재추출 시 `deleteMany({ where: { conversationId, userId } })` 소유권 조건 포함

### 주의 사항 (비차단)

| # | 항목 | 설명 | 심각도 |
|---|------|------|--------|
| 1 | `getInsight` 함수 미구현 | 디자인 스펙에 `getInsight(userId, id)` 단일 조회가 명시되었으나 구현되지 않음. 현재 코드에서 사용처가 없으므로 영향 없음 | 낮음 |
| 2 | 추출 프롬프트 "JSON 배열로 응답하세요" | `insight-extraction.ts:22-23`에 `generateObject` + Zod 스키마와 중복되는 JSON 형식 지시문이 있음. 기능에 영향은 없으나 불필요한 지시 | 낮음 |
| 3 | 추출 확인 다이얼로그 항상 표시 | 스펙: 기존 인사이트 존재 시에만 확인. 실제: 항상 표시. `spec-deviations.md`에 기록됨 (AI API 비용 고려) | 없음 (의도적) |

## 5. spec-deviations.md 기록 확인

Phase 5 관련 의도적 차이 3건 모두 `spec-deviations.md`에 기록 확인:
1. `app/api/insights/route.ts` 생략 (SC 직접 호출)
2. 인사이트 추출 확인 다이얼로그 항상 표시 (API 비용 고려)
3. `insight-edit-dialog.tsx` 신규 추가 (다이얼로그 선택 + 분리)

## 6. Phase 6-7 영향 분석

### Phase 6 (이력서 빌더)
- **영향 없음**. Phase 5는 인사이트 추출 기능이며 Phase 6(이력서 CRUD + PDF)과 독립적.
- Phase 6 스펙의 수정 대상 파일이 "없음"으로 명시되어 있어 충돌 가능성 없음.

### Phase 7 (마무리)
- **영향 없음, 일부 선행 충족**.
  - `app/(dashboard)/insights/loading.tsx`: Phase 5에서 insights 페이지가 생성되었으므로 Phase 7에서 loading.tsx 추가 유효
  - "추출한 인사이트 수" 통계: `countByCategory` 서비스 함수 활용 가능
  - "최근 추출한 인사이트 (5개)": `listInsights` 서비스 함수 활용 가능
  - 인사이트 빈 상태 메시지: Phase 5에서 이미 구현 완료 (`insight-list.tsx:155-157`)
  - 인사이트 추출 토스트: Phase 5에서 이미 구현 완료 (cover-letter-chat, interview-chat)
- **Phase 6-7 스펙 수정 필요 없음**.

## 7. 스펙 외 추가 구현 평가

| # | 추가 구현 | 평가 |
|---|----------|------|
| 1 | `InsightNotFoundError`, `InsightForbiddenError` 커스텀 에러 클래스 | 긍정적: API route에서 에러 분기 명확화 |
| 2 | UUID 정규식 검증 (`[id]/route.ts:12-13`) | 긍정적: 잘못된 ID 형식 조기 차단 |
| 3 | 빈 메시지 방어 (`service.ts:46-48`) | 긍정적: 메시지 없는 대화에서 불필요한 AI 호출 방지 |
| 4 | 다크모드 배지 색상 대응 | 긍정적: `dark:bg-*-900 dark:text-*-200` 클래스 추가 |
| 5 | Suspense fallback 로딩 텍스트 | 긍정적: Phase 7 loading.tsx 전까지 임시 로딩 상태 제공 |
| 6 | 삭제 확인 AlertDialog | 긍정적: 실수 방지 UX |

스코프 크리프 없음. 추가 구현 모두 기존 패턴의 자연스러운 확장.

## 8. PR 리뷰 피드백 반영 확인 (최종 점검)

| # | 피드백 내용 | 반영 상태 | 검증 |
|---|------------|-----------|------|
| 1 | `extractInsights` — 삭제를 AI 호출 성공 후 `$transaction`으로 이동 (데이터 손실 방지) | ✅ 반영 | `service.ts:56-63` AI `generateObject` 호출 후 `service.ts:66-79` `$transaction([deleteMany, ...create])` 원자적 처리. AI 실패 시 기존 인사이트 보존됨 |
| 2 | `ConversationNotFoundError` 추가 (에러 메시지 정확성) | ✅ 반영 | `service.ts:17-21` 에러 클래스 정의. `service.ts:43-44` conversation null 시 throw. `extract/route.ts:49-51` 404 매핑 |
| 3 | `extract/route.ts` — `ConversationNotFoundError` 매핑 | ✅ 반영 | `extract/route.ts:8` import + `extract/route.ts:49-51` instanceof 체크 → 404 응답 |
| 4 | `cover-letter-chat.tsx` — 체크박스 htmlFor/id 패턴 적용 | ✅ 반영 | `cover-letter-chat.tsx:171` `Checkbox id="doc-{id}"` + `cover-letter-chat.tsx:176` `label htmlFor="doc-{id}"` |

### 기존 동작 영향 분석

- **`$transaction` 이동**: 기존 동작과 결과적으로 동일 (삭제 후 생성). 차이점은 AI 호출 실패 시 기존 인사이트가 보존된다는 점으로, 이는 개선 사항. 기존 동작을 깨뜨리지 않음.
- **`ConversationNotFoundError`**: 기존에는 conversation 미발견 시 일반 에러로 500 응답이 나갈 수 있었으나, 이제 명확한 404 응답. 클라이언트 측 에러 핸들링(`handleExtractInsights`)은 `res.ok` 체크 + `data.error` 표시 패턴으로 HTTP 상태 코드와 무관하게 동작하므로 호환성 유지.
- **htmlFor/id 패턴**: 접근성 개선. 기능 동작 변경 없음.

## 결론

Phase 5 인사이트 추출 기능은 **5개 완료 기준을 모두 충족**하며, PR 리뷰 피드백 4건 모두 정확히 반영됨. 디자인 스펙에서 명시한 파일 11개(신규 8 + 수정 3) 전부 구현 확인. decisions.md의 5개 코딩 패턴(Zod safeParse, JSON 파싱 분리, updateMany 소유권, label-input 연결, conversationId 소유권 검증) 모두 준수. 의도적 스펙 차이 3건은 `spec-deviations.md`에 기록됨. Phase 6-7에 대한 부정적 영향 없음. **차단 이슈 없이 PR 머지 가능.**
