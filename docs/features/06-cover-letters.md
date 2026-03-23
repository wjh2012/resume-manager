# AI 자기소개서 작성 (Cover Letters)

> Phase 3 — AI와 대화하며 자기소개서 작성

## 개요

사용자가 기업 정보를 입력하고, AI와 채팅하며 자기소개서를 작성할 수 있는 기능이다. 2-패널 작업공간(에디터 + AI 채팅)에서 실시간으로 자기소개서를 작성하고 편집한다.

## 핵심 흐름

1. **생성** — 기업명, 직무, 채용공고(선택), 참고 문서(선택) 입력
2. **작업공간 진입** — 좌: 에디터, 우: AI 채팅 (리사이즈 가능)
3. **AI 대화** — 자기소개서 작성 관련 질문, 초안 요청
4. **에디터 반영** — AI 응답의 "에디터에 반영" 버튼으로 에디터에 텍스트 추가
5. **자동 저장** — 에디터 내용 변경 시 1.5초 debounce 후 자동 저장

## 데이터 구조

### CoverLetter

| 필드 | 설명 |
|------|------|
| title | 자기소개서 제목 |
| companyName | 기업명 |
| position | 직무 |
| jobPostingText | 채용공고 텍스트 (선택) |
| content | 자기소개서 본문 |
| status | DRAFT / COMPLETED |

### 관련 모델

- **Conversation** (`type: COVER_LETTER`) — 자기소개서 생성 시 함께 생성
- **Message** — 대화 메시지 (USER / ASSISTANT)
- **CoverLetterDocument** — 참고 문서 다대다 관계

## API

→ [`docs/specs/api-reference.md`](../specs/api-reference.md) 참조

## 작업공간 구조

```
CoverLetterWorkspace (상태 소유: content)
├── [데스크톱] ResizablePanelGroup (좌우 2분할, 리사이즈 가능)
├── [모바일 < 768px] Tabs ("에디터" / "AI 채팅" 상단 탭 전환)
├── CoverLetterEditor
│   ├── content + onContentChange
│   ├── debounce 자동 저장 (1.5s)
│   ├── 저장 상태 표시 (저장 중 / 저장됨 / 저장 실패)
│   ├── 글자 수 카운트
│   └── 실패 시 3초 후 자동 재시도 1회
└── CoverLetterChat
    ├── useChat (AI SDK v6, DefaultChatTransport)
    ├── 참고 문서 선택 Popover (서버 동기화)
    ├── "에디터에 반영" 버튼
    └── 맥락 맞춤 빈 상태 안내
```

## AI 채팅

- **AI SDK v6** `useChat` + `DefaultChatTransport` 사용
- 서버: `streamText()` + `tools` + `stopWhen` → `toUIMessageStreamResponse()`
- `convertToModelMessages()`로 UIMessage → ModelMessage 변환
- **컨텍스트**: 선택 문서 요약 + 커리어노트 요약 (시스템 프롬프트에 포함)
- **Tool Use**: LLM이 필요시 `readDocument` / `readCareerNote`로 전문 읽기, `saveCareerNote`로 커리어노트 생성/갱신
- `onFinish` 콜백에서 assistant 메시지 DB 저장
- 동적 stepCount: `min(문서 수 + 커리어노트 수 + 2, 15)`

## 참고 문서 선택

- Popover + Checkbox 목록
- 선택 변경 시 서버 PUT 성공 후 UI 반영 (optimistic update 미사용)
- `useChat`의 body에 selectedDocumentIds 자동 반영 (ref 사용)

## 서비스 레이어

`lib/cover-letters/service.ts`:

- `createCoverLetter()` — 트랜잭션으로 CoverLetter + Conversation + CoverLetterDocument 생성
- `getCoverLetter()` — 상세 조회 (conversation, messages, selectedDocs 포함)
- `listCoverLetters()` — 목록 조회 (updatedAt 내림차순)
- `updateCoverLetter()` — 내용/상태 업데이트 (소유권 검증)
- `deleteCoverLetter()` — 삭제 (소유권 검증, cascade)
- `updateSelectedDocuments()` — 참고 문서 선택 변경
- `getConversationMessages()` — 대화 메시지 조회

## 검증 스키마

`lib/validations/cover-letter.ts`:

- `createCoverLetterSchema` — title, companyName, position (필수), jobPostingText, selectedDocumentIds (선택)
- `updateCoverLetterSchema` — title, content, status (모두 선택)
- `updateSelectedDocumentsSchema` — documentIds 배열

## 파일 구조

```
lib/cover-letters/service.ts          — 서비스 레이어
lib/validations/cover-letter.ts       — Zod 검증 스키마
app/api/cover-letters/route.ts        — POST
app/api/cover-letters/[id]/route.ts            — GET, PUT, DELETE
app/api/cover-letters/[id]/documents/route.ts  — PATCH (참고 문서 변경)
app/api/chat/cover-letter/route.ts    — 스트리밍 채팅
app/(dashboard)/cover-letters/
  page.tsx                            — 목록 페이지
  new/page.tsx                        — 생성 페이지
  [id]/page.tsx                       — 작업공간 페이지
components/cover-letters/
  cover-letter-list.tsx               — 카드 그리드 + 빈 상태
  cover-letter-card.tsx               — 카드 (기업명, 직무, 상태)
  cover-letter-list-skeleton.tsx      — 목록 스켈레톤
  cover-letter-form.tsx               — 생성 폼
  cover-letter-workspace.tsx          — 2-패널 레이아웃
  cover-letter-editor.tsx             — 에디터 (자동 저장)
  cover-letter-chat.tsx               — AI 채팅 패널
```
