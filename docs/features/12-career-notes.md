# 커리어노트

> AI 대화에서 사용자의 커리어 경험을 구조화하여 축적하는 시스템

## 개요

자기소개서/면접 대화에서 사용자의 경험, 역량, 감정, 깨달음 등을 AI가 구조화된 노트로 추출하고, 여러 대화에 걸쳐 점진적으로 축적한다. 기존 인사이트와 달리 주관적 경험(감정, 동기, 깨달음)까지 포착하는 커리어코치 상담 노트 컨셉.

## 핵심 흐름

1. **추출** — 자기소개서/면접 채팅의 BookOpen 버튼 클릭 → AI가 대화에서 커리어노트 후보 추출
2. **자동 추출** — 면접 종료 시 "커리어노트 자동 추출" 체크박스(기본 체크)로 종료와 동시에 추출
3. **병합 비교** — 추출된 노트를 기존 confirmed 노트(최대 50개)와 AI가 비교:
   - 관련 기존 노트 없음 → CONFIRMED로 바로 저장
   - 관련 기존 노트 있음 → PENDING으로 저장 + 병합 제안(MergeProposal) 생성
4. **병합 제안 처리** — 대시보드에서 기존 노트 vs 새 노트 비교 뷰 확인 → 승인 / 편집 후 승인 / 거부
5. **관리** — 커리어노트 대시보드에서 목록 조회, 수정, 삭제
6. **활용** — 자소서 AI 채팅 컨텍스트에 confirmed 노트 자동 주입 (면접에는 주입하지 않음)

## 데이터 구조

### CareerNote

```
CareerNote
  ├── id, userId, title, content, summary (nullable)
  ├── metadata (JSON, 선택적 반정형)
  │   ├── where: 프로젝트/회사/환경
  │   ├── role: 역할
  │   ├── what: 행동/상황
  │   ├── result: 성과/결과
  │   ├── challenge: 어려웠던 점
  │   ├── motivation: 동기
  │   ├── feeling: 느낀 점/감정
  │   └── lesson: 배운 점/깨달음
  ├── status: CONFIRMED | PENDING
  └── createdAt, updatedAt
```

### CareerNoteSource (다대다)

하나의 노트가 여러 대화에서 유래 가능. 복합 PK: (careerNoteId, conversationId).

### CareerNoteMergeProposal

```
CareerNoteMergeProposal
  ├── id, sourceNoteId(nullable), targetNoteId
  ├── suggestedTitle, suggestedContent, suggestedMetadata
  ├── status: PENDING | ACCEPTED | REJECTED
  └── createdAt, updatedAt
```

## 서비스 레이어 (`lib/career-notes/service.ts`)

- `extractCareerNotes`: 대화 소유권 검증 → quota 체크 → 기존 confirmed 노트 조회 → `generateObject`로 추출 + 비교 → 토큰 기록 → 트랜잭션(중복 정리 + 노트 생성 + 병합 제안)
- `listCareerNotes`: 커서 기반 페이지네이션, status 필터
- `updateCareerNote` / `deleteCareerNote`: `updateMany`/`deleteMany` 소유권 패턴
- `resolveMergeProposal`: accept(출처 이전 → 제안 승인 → 타겟 업데이트 → 소스 삭제) / reject(소스를 CONFIRMED로 전환)
- `countCareerNotes`, `getConfirmedNotes`, `countPendingProposals`, `listPendingProposals`

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/career-notes/extract` | 대화에서 커리어노트 추출 |
| GET | `/api/career-notes` | 목록 조회 (커서 페이지네이션) |
| PUT | `/api/career-notes/[id]` | 커리어노트 수정 |
| DELETE | `/api/career-notes/[id]` | 커리어노트 삭제 |
| GET | `/api/career-notes/merge-proposals` | 미처리 병합 제안 목록 |
| POST | `/api/career-notes/merge-proposals/[id]/resolve` | 병합 제안 처리 (accept/reject) |

## 페이지 구조

```
app/(dashboard)/career-notes/
  ├── page.tsx — 커리어노트 대시보드 (RSC, Suspense)
  └── loading.tsx — 로딩 상태
```

## 컴포넌트

| 컴포넌트 | 설명 |
|---------|------|
| `CareerNoteCard` | metadata 뱃지, 출처 링크, 수정/삭제 버튼 |
| `CareerNoteList` | 클라이언트 정렬 + 낙관적 삭제 (`useOptimistic`) |
| `CareerNoteEditDialog` | 제목/내용 + 8개 metadata 필드 편집 |
| `MergeProposalBanner` | 미처리 병합 제안 수 알림 |
| `MergeProposalDialog` | 기존 vs 새 노트 비교 + AI 제안 미리보기 + 승인/거부 |

## AI 추출 방식

`generateObject` + Zod 스키마로 구조화된 커리어노트 추출. 프롬프트는 `lib/ai/prompts/career-note-extraction.ts`에 정의.

- 커리어코치 상담 노트 관점: 객관적 사실 + 주관적 경험(감정, 동기, 깨달음) 포착
- 기존 confirmed 노트와 비교하여 관련 노트 ID + 병합 제안 함께 생성
- 토큰 사용량: `UsageFeature.CAREER_NOTE`로 기록

## 컨텍스트 주입

`buildContext()`에 `includeCareerNotes: true` 전달 시 전체 확정(CONFIRMED) 노트의 요약이 AI 컨텍스트에 포함. LLM이 필요시 `readCareerNote` 도구로 전문을 읽는다.

- **자소서 채팅**: 주입 O (요약 + readCareerNote/saveCareerNote 도구)
- **면접 채팅**: 주입 X (면접관은 지원자의 비공개 정보를 모르는 것이 의도된 설계)

### 채팅 중 자동 커리어노트 관리

자소서 채팅 시 LLM이 `saveCareerNote` 도구로 커리어노트를 생성/갱신할 수 있다:
- **생성**: 대화에서 기록할 만한 경험 발견 시 사용자에게 제안 → 승인 후 저장
- **갱신**: 기존 노트에 새 내용 보강 또는 잘못된 정보 정정 → 사용자 승인 후 저장
- `careerNoteId` 유무로 생성/갱신 구분, CareerNoteSource로 대화와 연결

### 수정 시 요약 재생성

커리어노트 content가 수정되면 (`PUT /api/career-notes/[id]`) LLM으로 summary를 자동 재생성한다. 실패해도 수정 자체는 성공으로 처리.

## 기존 인사이트와의 관계

커리어노트는 인사이트의 상위 개념. 현재 두 시스템이 공존하며, 인사이트 마이그레이션은 별도 후속 작업으로 진행 예정.
