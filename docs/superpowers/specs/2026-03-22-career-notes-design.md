# Career Notes (커리어노트) Design Spec

## Overview

AI 대화(자소서 작성, 모의면접)에서 사용자의 경험, 역량, 성과 등을 구조화하여 축적하는 시스템. 기존 인사이트(Insight) 시스템의 상위 개념으로, 여러 대화에 걸쳐 점진적으로 팩트를 수집하고 병합한다.

### 기존 인사이트와의 관계

- 커리어노트는 인사이트의 상위 개념이며, 인사이트는 커리어노트에서 파생 가능
- 이번 구현에서는 커리어노트 시스템을 신규 구축하고, 기존 인사이트와 일시적으로 공존
- 인사이트 마이그레이션 및 제거는 별도 후속 작업으로 진행

### 장기 목표

향후 GraphRAG 도입 예정 — 엔티티-관계 그래프 구조로 확장하여 관련성 기반 탐색 및 시각화 지원. 현재 데이터 모델은 이 확장을 고려하여 설계.

---

## Data Model

### CareerNote

| Field     | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| id        | UUID     | PK                                                |
| userId    | UUID     | FK → User                                         |
| title     | String   | 노트 제목 (예: "A프로젝트에서 팀 리드로 성과 개선")     |
| content   | Text     | 자유 서술 텍스트 (최대 5000자)                        |
| metadata  | JSON     | 선택적 반정형 필드 (who, what, where, result)         |
| status    | CareerNoteStatus | Prisma enum: CONFIRMED \| PENDING              |
| createdAt | DateTime | 생성 시각                                           |
| updatedAt | DateTime | 수정 시각                                           |

- `metadata` JSON 필드의 허용 키: `who`(역할), `what`(행동), `where`(프로젝트/회사), `result`(성과/결과) — 이 4개만 허용, 추가 키는 Zod `.strip()`으로 제거
- 모든 키는 선택적이며, 비어 있어도 유효
- `status`: CONFIRMED는 사용자가 확인한 노트, PENDING은 병합 제안 대기 중인 노트
- `content` 최대 5000자 제한 — AI 추출 프롬프트에도 이 제한 명시

### CareerNoteSource (다대다)

| Field        | Type | Description         |
| ------------ | ---- | ------------------- |
| careerNoteId | UUID | FK → CareerNote     |
| conversationId | UUID | FK → Conversation |

- 하나의 커리어노트가 여러 대화에서 유래 가능
- 복합 PK: (careerNoteId, conversationId)

### CareerNoteMergeProposal

| Field            | Type     | Description                              |
| ---------------- | -------- | ---------------------------------------- |
| id               | UUID     | PK                                       |
| sourceNoteId     | UUID     | FK → CareerNote (새로 추출된 pending 노트)   |
| targetNoteId     | UUID     | FK → CareerNote (기존 confirmed 노트)       |
| suggestedTitle   | String   | AI가 제안하는 병합 후 제목                    |
| suggestedContent | Text     | AI가 제안하는 병합 후 내용                    |
| suggestedMetadata| JSON     | AI가 제안하는 병합 후 metadata               |
| status           | MergeProposalStatus | Prisma enum: PENDING \| ACCEPTED \| REJECTED |
| createdAt        | DateTime | 생성 시각                                  |
| updatedAt        | DateTime | 수정 시각 (해결 시점 기록)                    |

---

## Extraction Flow

### 자동 추출 (대화 종료 시)

1. 자소서/면접 대화 종료 시 자동 트리거
2. 대화 메시지 전체를 AI에 전달하여 커리어노트 후보 추출
3. 추출된 각 후보를 기존 confirmed 노트와 비교:
   - **관련 기존 노트 없음** → `status: CONFIRMED`로 바로 저장, 출처(CareerNoteSource) 기록
   - **관련 기존 노트 있음** → `status: PENDING`으로 저장 + CareerNoteMergeProposal 생성
4. 사용자에게 토스트 알림: "커리어노트 N개 추출, 병합 제안 M개"

### 중복 추출 방지

동일 대화에서 재추출 시:
- 해당 대화를 출처로 가진 기존 커리어노트 중, PENDING 상태이고 아직 처리되지 않은 MergeProposal이 있는 노트는 삭제 후 재생성
- CONFIRMED 상태의 노트는 유지 (사용자가 확인한 데이터 보존)
- 이 과정은 단일 트랜잭션으로 처리

### 토큰 사용량 추적

- `UsageFeature` enum에 `CAREER_NOTE` 값 추가
- 추출 및 병합 비교 AI 호출 시 `feature: "CAREER_NOTE"`로 토큰 사용량 기록
- 기존 `recordUsage()` 패턴 준수

### 수동 추출

- 자소서/면접 채팅 UI에서 추출 버튼 클릭 시 동일한 플로우 실행

### 병합 제안 처리

사용자가 병합 제안 UI에서 결정:

- **승인**: 단일 트랜잭션으로 — (1) sourceNote의 출처를 targetNote로 이전 (2) targetNote에 suggestedContent/suggestedTitle/suggestedMetadata 반영 (3) sourceNote 삭제 (4) proposal status → ACCEPTED
- **편집 후 승인**: suggestedContent를 수정한 뒤 승인과 동일 처리
- **거부**: sourceNote를 `status: CONFIRMED`로 전환 (독립 노트), proposal status → REJECTED

모든 병합 처리는 `prisma.$transaction`으로 원자적 실행.

### AI 비교/병합 로직

- 추출 시 기존 confirmed 노트 목록을 AI 컨텍스트에 포함 (최대 50개, 최신순)
- AI가 새로 추출된 각 노트에 대해 관련 기존 노트 ID를 지정하거나 null 반환
- 관련 노트가 있는 경우, AI가 병합 제안(suggestedTitle, suggestedContent, suggestedMetadata)도 함께 생성
- AI가 생성한 suggestedTitle(최대 200자), suggestedContent(최대 5000자)도 proposal 저장 시 동일한 제약으로 검증
- 노트 생성 및 제안 생성은 단일 `prisma.$transaction`으로 원자적 처리

---

## AI Context Injection

### 자소서 작성

- `buildContext()`에 `includeCareerNotes: true` 옵션 추가 (기존 `includeInsights`와 공존, 두 시스템 병존 기간 동안 둘 다 true일 수 있으나 중복 주입은 방지)
- `status: CONFIRMED` 노트만 사용
- 포맷:
  ```
  [커리어노트: {title}]
  {content}
  역할: {metadata.who} | 성과: {metadata.result}
  ```

### 모의면접

- 커리어노트 **주입하지 않음**
- 면접관은 지원자가 공개하지 않은 정보를 모르는 것이 의도된 설계

---

## API Endpoints

### POST /api/career-notes/extract

커리어노트 추출 요청.

- Request: `{ conversationId: string }`
- Response: `{ notes: CareerNote[], proposals: CareerNoteMergeProposal[] }`
- 에러: 401, 400, 404, 403(quota), 500

### GET /api/career-notes

커리어노트 목록 조회. (Server Component에서 직접 서비스 호출도 가능하나, 클라이언트 필터링/정렬을 위해 API 제공)

- Query: `?status=confirmed&cursor={id}&limit=20` (기본값: confirmed, limit 기본 20, 최대 50)
- Response: `{ notes: CareerNote[], nextCursor: string | null }` (출처 정보 포함, 커서 기반 페이지네이션)

### PUT /api/career-notes/[id]

커리어노트 수정.

- Request: `{ title?, content?, metadata? }` (status는 PUT으로 변경 불가 — 병합 플로우를 통해서만 전환)
- Response: `{ success: true }`

### DELETE /api/career-notes/[id]

커리어노트 삭제.

- Response: 204

### POST /api/career-notes/merge-proposals/[id]/resolve

병합 제안 처리.

- Request: `{ action: "accept" | "reject", editedTitle?, editedContent?, editedMetadata? }`
- Response: `{ success: true }`

---

## UI

### /career-notes 페이지

1. **커리어노트 목록**
   - 카드 형태: 제목, 내용 요약, metadata 태그(역할, 성과 등), 출처 대화 링크
   - 필터/정렬 기능
   - 수정/삭제 지원

2. **병합 제안 알림 영역**
   - 상단에 "N개의 병합 제안" 배너/배지
   - 각 제안: 기존 노트 vs 새 노트 비교 뷰 + AI 병합 제안 미리보기
   - 승인 / 편집 후 승인 / 거부 버튼

### 대화 채팅 UI

- 자소서/면접 채팅에서 기존 인사이트 추출 버튼 → 커리어노트 추출 버튼으로 교체
- 대화 종료 시 자동 추출 후 토스트 알림: "커리어노트 N개 추출, 병합 제안 M개"

---

## Validation

### extractCareerNotesSchema

```
{ conversationId: z.string().uuid() }
```

### updateCareerNoteSchema

```
{
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  metadata: z.object({
    who: z.string().optional(),
    what: z.string().optional(),
    where: z.string().optional(),
    result: z.string().optional(),
  }).strip().optional(),
}
```

### resolveMergeProposalSchema

```
{
  action: z.enum(["accept", "reject"]),
  editedTitle: z.string().min(1).max(200).optional(),
  editedContent: z.string().min(1).max(5000).optional(),
  editedMetadata: z.object({
    who: z.string().optional(),
    what: z.string().optional(),
    where: z.string().optional(),
    result: z.string().optional(),
  }).strip().optional(),
}
```

---

## Migration Strategy

이번 스코프에 **포함하지 않음**. 별도 후속 작업:

1. CareerNote 시스템 안정화 후
2. 기존 Insight 데이터 → CareerNote로 변환 마이그레이션
3. 기존 인사이트 관련 코드 제거 (페이지, API, 서비스, 컴포넌트)
4. Insight Prisma 모델 삭제

---

## Scope Summary

### 이번 구현 범위

- CareerNote, CareerNoteSource, CareerNoteMergeProposal 데이터 모델
- AI 추출 서비스 (자동 + 수동 트리거)
- AI 병합 비교/제안 로직
- 병합 제안 처리 API
- /career-notes 대시보드 UI (목록, 필터, 수정/삭제, 병합 제안 처리)
- 자소서 AI 컨텍스트에 커리어노트 주입
- 대화 채팅 UI에 커리어노트 추출 버튼 추가

### 이번 구현에서 제외

- 기존 인사이트 마이그레이션/제거
- GraphRAG 그래프 구조 (백로그)
- 이력서 생성 등 다른 기능에서의 활용 (향후 확장)
