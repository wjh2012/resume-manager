# AI 모의면접 기능

## 개요

사용자가 업로드한 문서(이력서, 자기소개서 등)를 기반으로 AI 면접관과 모의면접을 진행할 수 있는 기능이다.

## 주요 기능

- **면접 세션 생성**: 제목, 기업명(선택), 직무(선택), 참고 문서 선택 후 면접 시작
- **실시간 스트리밍 대화**: AI 면접관이 선택된 문서 내용을 기반으로 질문·피드백 제공
- **면접 종료**: 진행 중인 면접을 명시적으로 종료하여 COMPLETED 상태로 변경
- **면접 목록**: 진행중/종료된 면접 세션 목록 확인 및 이력 조회
- **면접 삭제**: 낙관적 업데이트(Optimistic UI)로 즉각적인 삭제 반영

## 아키텍처

### 데이터 모델

```
InterviewSession (면접 세션)
  ├── id, userId, title, companyName, position, status (IN_PROGRESS|COMPLETED)
  ├── InterviewDocument[] (참고 문서 연결)
  └── Conversation (1:1 대화 기록)
        └── Message[] (채팅 메시지)
```

### API 엔드포인트

→ [`docs/specs/api-reference.md`](../specs/api-reference.md) 참조

### 문서 격리 (RAG)

면접 채팅 시 `buildContext()`에 `limitToDocumentIds`를 전달하여 해당 면접에서 선택한 문서만 참조하도록 제한한다.

```typescript
const allowedDocIds = allowedDocs.map((d) => d.documentId)
const context = await buildContext(userId, { query, limitToDocumentIds: allowedDocIds })
```

### 서비스 레이어 (`lib/interviews/service.ts`)

- `createInterview`: `$transaction`으로 Session + InterviewDocuments + Conversation 원자적 생성
- `getInterview`: 소유권 검증 포함 세션 조회
- `listInterviews`: 사용자 세션 목록 (문서 수 포함)
- `completeInterview`: `updateMany` (소유권 검증) + `findUniqueOrThrow` (결과 반환)
- `deleteInterview`: `deleteMany` (소유권 검증)
- `getConversationMessages`: 대화 소유권 검증 후 메시지 목록 반환

### 에러 클래스

- `InterviewNotFoundError`: 세션이 존재하지 않을 때
- `InterviewForbiddenError`: 소유권이 없을 때

## 페이지 구조

```
app/(dashboard)/interviews/
  ├── page.tsx          — 면접 목록 (RSC, Suspense)
  ├── new/page.tsx      — 새 면접 생성 폼 (RSC)
  └── [id]/page.tsx     — 면접 채팅 (RSC, full-height layout)
```

## 컴포넌트

| 컴포넌트 | 설명 |
|---------|------|
| `InterviewCard` | 면접 세션 카드 (상태 뱃지, 삭제 다이얼로그) |
| `InterviewList` | 목록 + 낙관적 삭제 (`useOptimistic`) |
| `InterviewListSkeleton` | 로딩 스켈레톤 |
| `InterviewForm` | 면접 생성 폼 (문서 체크박스 선택) |
| `InterviewChat` | 실시간 채팅 UI (헤더 + 스크롤 + 입력) |

## 초기 메시지 자동 전송

기존 메시지가 없고 완료되지 않은 세션에서 진입하면, `"면접을 시작합니다."` 메시지를 자동으로 전송하여 AI 면접관의 첫 질문을 유도한다.

```typescript
useEffect(() => {
  if (hasSentInitialRef.current) return
  if (initialMessages.length > 0) return
  if (completed) return
  hasSentInitialRef.current = true
  sendMessage({ text: "면접을 시작합니다." })
}, [])
```
