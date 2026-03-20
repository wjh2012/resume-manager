# Phase 5: 인사이트 추출 — 구현 디자인

## 개요

자기소개서/면접 대화에서 사용자의 강점, 경험, 동기 등 비정형 정보를 자동으로 추출하여 관리하고, 이후 AI 컨텍스트에 자동 반영한다.

## 결정 사항

| 항목 | 결정 | 이유 |
|------|------|------|
| 추출 버튼 위치 | 채팅 헤더 영역 고정 | 항상 접근 가능, 일관된 위치 |
| 편집 방식 | 다이얼로그(모달) | 기존 프로젝트 패턴(자기소개서/면접)과 일관 |
| 면접 종료 시 유도 | 종료 다이얼로그에 자동 추출 체크박스 | 자연스러운 플로우, 별도 조작 불필요 |
| 대시보드 정렬 | 카테고리 탭 필터 + 시간순/카테고리 그룹핑 토글 | 스펙 그대로 |
| 구현 순서 | API → 버튼 → 대시보드 (A안) | Phase 1-4 검증된 패턴, 서비스 레이어 일괄 작성 |
| 목록 API route 생략 | Server Component 직접 호출 | phase spec의 `app/api/insights/route.ts` 대체 — 기존 코드베이스 패턴 (interviews, cover-letters 목록 모두 SC 직접 호출) |
| 추출 응답 코드 | 200 | 기존 코드베이스의 생성 응답과 일관 (interviews POST도 200) |
| 편집 다이얼로그 분리 | `insight-edit-dialog.tsx` 신규 | phase spec의 "인라인 또는 다이얼로그" 중 다이얼로그 선택, 별도 컴포넌트로 분리 |

## 기존 인프라 (이미 구현됨)

- **Prisma Insight 모델**: `prisma/schema.prisma` — User/Conversation 관계 포함
- **AI 컨텍스트 통합**: `lib/ai/context.ts` — `includeInsights` 옵션으로 최근 10개 인사이트 포함
- **네비게이션**: `lib/config/navigation.ts` — `Lightbulb` 아이콘, `/insights` 경로
- **추출 프롬프트**: `lib/ai/prompts/insight-extraction.ts` — 카테고리 5종 + 시스템 프롬프트
- **자기소개서 연동**: `app/api/chat/cover-letter/route.ts` — `includeInsights: true` 전달 중

## 신규 구현

### 1. Validation 스키마 (`lib/validations/insight.ts`)

```typescript
// 추출 요청
extractInsightsSchema: { conversationId: z.string().uuid() }

// 수정 요청
updateInsightSchema: {
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  category: z.enum(["strength", "experience", "motivation", "skill", "other"])
}
```

### 2. 서비스 레이어 (`lib/insights/service.ts`)

| 함수 | 역할 |
|------|------|
| `extractInsights(userId, conversationId)` | 대화 메시지 로드 → 기존 인사이트 삭제 → `generateObject` 호출 → DB 저장 → 반환 |
| `listInsights(userId, category?)` | 카테고리 필터, `createdAt desc`, conversation 관계 포함 |
| `getInsight(userId, id)` | 단일 조회 + 소유권 검증 |
| `updateInsight(userId, id, data)` | `updateMany` 소유권 패턴 |
| `deleteInsight(userId, id)` | `deleteMany` 소유권 패턴 |
| `countByCategory(userId)` | `groupBy`로 카테고리별 개수 집계 |

`extractInsights` 내부에서:
1. conversationId로 대화 조회 + `userId` 소유권 검증 (`findFirst({ where: { id, userId } })`)
   - **`updateMany` 패턴 미사용 이유**: 대화 메시지를 로드해야 하므로 레코드 데이터가 필요 → `findFirst` + 소유권 조건으로 검증
   - conversationId만 받으므로 부모 엔티티(coverLetter/interview) 관계 검증 불필요 — `userId` 일치만으로 충분
2. 해당 대화의 메시지 전체 로드
3. 기존 인사이트 있으면 삭제 (재추출 — 사용자가 편집한 인사이트도 삭제됨, UI에서 확인 다이얼로그로 안내)
4. `generateObject` + `insightExtractionPrompt` + Zod 스키마로 구조화 추출
5. `$transaction`으로 인사이트 일괄 생성

**에러 처리**:
- `AiSettingsNotFoundError` → 400 ("AI 설정이 필요합니다")
- AI 모델 에러 (rate limit, invalid response) → 500 ("인사이트 추출에 실패했습니다")

### 3. API Routes

#### `POST /api/insights/extract`
- Body: `{ conversationId }`
- 인증 → `extractInsightsSchema.safeParse` → `extractInsights()` 호출
- 에러: `AiSettingsNotFoundError` → 400, AI 모델 에러 → 500
- 응답: `{ insights: Insight[] }`, 200

#### `PUT /api/insights/[id]`
- Body: `{ title, content, category }`
- 인증 → UUID 형식 검증 → `updateInsightSchema.safeParse` → `updateInsight()`
- `updateMany` 소유권 패턴, 200 또는 404

#### `DELETE /api/insights/[id]`
- 인증 → UUID 형식 검증 → `deleteInsight()`
- `deleteMany` 소유권 패턴, 204 또는 404

**목록 조회는 Server Component에서 직접 호출** (API route 불필요).

### 4. 채팅 UI 추출 버튼

#### 자기소개서 채팅 (`cover-letter-chat.tsx`)
- 헤더 우측에 `Lightbulb` 아이콘 버튼 추가
- 클릭 → `POST /api/insights/extract` 호출
- 기존 인사이트 존재 시 "다시 추출하시겠습니까?" 확인 다이얼로그
- 로딩 스피너 + 성공 토스트 ("N개의 인사이트가 추출되었습니다")

#### 면접 채팅 (`interview-chat.tsx`)
- 헤더 우측에 동일한 `Lightbulb` 아이콘 버튼
- **종료 다이얼로그에 "인사이트 자동 추출" 체크박스 추가** (기본 체크)
  - 체크 시: 종료 API 성공 후 자동으로 추출 API 호출
  - 미체크 시: 종료만 수행

### 5. 인사이트 대시보드

#### 페이지 (`app/(dashboard)/insights/page.tsx`) — Server Component
- `listInsights(userId, category)` + `countByCategory(userId)` 호출
- searchParams로 `category` 필터, `sort` (time/category) 전달
- `InsightList`에 데이터 전달

#### 목록 (`components/insights/insight-list.tsx`) — Client Component
- **상단 필터**: 카테고리 탭 (전체/강점/경험/동기/기술/기타) + 각 탭에 개수 배지
- **정렬 토글**: 시간순 / 카테고리별 그룹핑
- **빈 상태**: "아직 추출된 인사이트가 없습니다. 자기소개서나 면접 대화에서 추출해보세요."
- **낙관적 삭제**: interviews 패턴과 동일

#### 카드 (`components/insights/insight-card.tsx`)
- 카테고리 배지 (색상 구분):
  - strength: 초록, experience: 파랑, motivation: 보라, skill: 주황, other: 회색
- 제목 + 내용
- 출처 링크 (해당 자기소개서/면접으로 이동)
- 수정/삭제 버튼

#### 편집 다이얼로그 (`components/insights/insight-edit-dialog.tsx`)
- title, content, category 편집 폼
- `PUT /api/insights/[id]` 호출
- 성공 시 목록 갱신 (router.refresh 또는 낙관적 업데이트)

### 6. 컨텍스트 자동 통합

- 이미 `lib/ai/context.ts`에 구현 완료
- 면접 채팅 API에도 `includeInsights: true` 추가 (`app/api/chat/interview/route.ts`의 `buildContext` 호출에 옵션 추가)
- 검증: 인사이트 축적 후 새 자기소개서/면접에서 AI가 활용하는지 확인

## 생성/수정할 파일

```
신규:
  lib/validations/insight.ts
  lib/insights/service.ts
  app/api/insights/extract/route.ts
  app/api/insights/[id]/route.ts
  app/(dashboard)/insights/page.tsx
  components/insights/insight-list.tsx
  components/insights/insight-card.tsx
  components/insights/insight-edit-dialog.tsx

수정:
  components/cover-letters/cover-letter-chat.tsx  — 헤더에 인사이트 추출 버튼
  components/interviews/interview-chat.tsx        — 헤더에 추출 버튼 + 종료 다이얼로그 체크박스
  app/api/chat/interview/route.ts                 — includeInsights: true 추가
```

## 검증 방법

1. 자기소개서 대화 후 "인사이트 추출" → 구조화된 인사이트 생성 확인
2. 면접 종료 시 자동 추출 체크 → 인사이트 생성 확인
3. 인사이트 대시보드에서 카테고리별 필터 + 정렬 토글 동작
4. 인사이트 수정(다이얼로그)/삭제 동작
5. 인사이트 축적 후 새 자기소개서 AI 채팅에서 인사이트 반영 확인 (핵심)
6. 출처 링크로 원래 대화 이동 확인
