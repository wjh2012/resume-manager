# Phase 4: AI 모의면접

## 목표

사용자가 지정한 문서만 접근 가능한 AI 면접관과 텍스트 채팅 면접을 할 수 있는 기능을 구현한다.

## 완료 기준

- [ ] 면접 세션 CRUD + 문서 연결 (InterviewDocument)
- [ ] 면접 설정 UI (문서 다중 선택, 기업/직무 정보)
- [ ] AI 면접관 채팅 (지정 문서만 컨텍스트, 스트리밍)
- [ ] 전체화면 채팅 인터페이스
- [ ] 면접 종료 기능 (status → "completed")
- [ ] 목록/설정/채팅 페이지

## 의존성

- Phase 0 완료 (기반 인프라)
- Phase 1 완료 (문서 업로드 + 임베딩)
- Phase 2 완료 (AI 인프라, 채팅 컴포넌트)

## 생성/수정할 파일

```
신규:
  app/api/interviews/route.ts
  app/api/interviews/[id]/route.ts
  app/api/chat/interview/route.ts
  app/(dashboard)/interviews/page.tsx
  app/(dashboard)/interviews/new/page.tsx
  app/(dashboard)/interviews/[id]/page.tsx
  components/interviews/interview-setup.tsx
  components/interviews/interview-chat.tsx
  lib/validations/interview.ts

수정:
  없음
```

## 상세 구현 단계

### 1. 유효성 검증 스키마

#### `lib/validations/interview.ts`

```typescript
import { z } from "zod"

export const createInterviewSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  companyName: z.string().optional(),
  position: z.string().optional(),
  documentIds: z.array(z.string().uuid()).min(1, "최소 1개의 문서를 선택해주세요"),
})
```

### 2. 면접 세션 CRUD API

#### `POST /api/interviews`

- 유효성 검증
- 트랜잭션:
  1. `InterviewSession` 생성
  2. `InterviewDocument` 레코드 생성 (선택된 문서들)
  3. 초기 `Conversation` (type: "interview") 생성
- 응답: 생성된 세션 (연결된 문서 목록 포함)

#### `GET /api/interviews`

- 사용자의 면접 세션 목록 (최신순)
- 각 세션에 연결된 문서 수 포함

#### `GET /api/interviews/[id]`

- 면접 세션 상세 (연결된 문서 목록 + conversation 포함)

#### `PUT /api/interviews/[id]`

- 상태 변경 (active → completed)

#### `DELETE /api/interviews/[id]`

- 소유자 확인 + 삭제

### 3. 스트리밍 채팅 API (문서 격리)

#### `POST /api/chat/interview`

```typescript
import { streamText } from "ai"
import { getLanguageModel } from "@/lib/ai/provider"
import { buildContext } from "@/lib/ai/context"
import { buildInterviewSystemPrompt } from "@/lib/ai/prompts/interview"

export async function POST(req: Request) {
  const { conversationId, interviewSessionId, messages } = await req.json()

  // 1. 사용자 인증 확인
  // 2. InterviewSession 로드
  // 3. InterviewDocument에서 허용된 문서 ID 목록 조회
  const allowedDocIds = await prisma.interviewDocument.findMany({
    where: { interviewSessionId },
    select: { documentId: true },
  }).then(rows => rows.map(r => r.documentId))

  // 4. 컨텍스트 빌드 — limitToDocumentIds로 허용된 문서만 검색
  const context = await buildContext(userId, {
    query: messages.at(-1).content,
    limitToDocumentIds: allowedDocIds,  // 핵심: 이 문서들만 검색
  })

  // 5. 시스템 프롬프트 조합
  const systemPrompt = buildInterviewSystemPrompt({
    companyName: session.companyName,
    position: session.position,
    context,
  })

  // 6. streamText
  const result = streamText({
    model: await getLanguageModel(userId),
    system: systemPrompt,
    messages,
    onFinish: async ({ text }) => {
      await prisma.message.create({
        data: { conversationId, role: "assistant", content: text },
      })
    },
  })

  return result.toDataStreamResponse()
}
```

**문서 격리 핵심**: `limitToDocumentIds`를 통해 `InterviewDocument`에 등록된 문서만 RAG 검색 범위에 포함한다. 시스템 프롬프트에서도 "제공된 참고 자료에만 기반하여 질문하라"고 지시한다.

### 4. 면접 설정 UI

#### `components/interviews/interview-setup.tsx`

- 제목 (Input)
- 기업명 (Input, 선택)
- 직무 (Input, 선택)
- **문서 다중 선택** (체크박스 목록)
  - 사용자의 문서 목록 표시 (타입 배지 포함)
  - 최소 1개 선택 필수
  - "면접관은 선택한 문서만 참고합니다" 안내 텍스트
- 시작 버튼

#### `app/(dashboard)/interviews/new/page.tsx`

- `InterviewSetup` 렌더링
- 생성 성공 시 `/interviews/[id]`로 리다이렉트

### 5. 전체화면 채팅 인터페이스

#### `app/(dashboard)/interviews/[id]/page.tsx`

사이드바를 제외한 전체 영역을 채팅으로 사용한다.

- 상단 헤더: 면접 제목 + 기업/직무 + 상태 + 종료 버튼
- 중앙: 채팅 영역 (Phase 2 공용 컴포넌트 활용)
- 하단: 입력 영역

#### `components/interviews/interview-chat.tsx`

- `useChat` 훅 연동 (`/api/chat/interview`)
- 면접 시작 시 AI가 먼저 인사 + 첫 질문 (초기 system 메시지로 트리거)
- 면접 종료 버튼 → 확인 다이얼로그 → status "completed"로 변경
- 종료된 면접은 읽기 전용 (입력 비활성화)

### 6. 면접 목록 페이지

#### `app/(dashboard)/interviews/page.tsx`

- 상단: "새 모의면접" 버튼 → `/interviews/new`
- 카드 그리드:
  - 제목 + 기업/직무
  - 상태 배지 (active: 파랑, completed: 회색)
  - 연결된 문서 수
  - 날짜
  - 클릭 → `/interviews/[id]`
- 빈 상태: "아직 진행한 모의면접이 없습니다"

## 검증 방법

1. 새 면접 생성 → 문서 2개 선택 → 채팅 시작
2. AI 면접관이 선택한 문서 기반으로 질문하는지 확인
3. **선택하지 않은 문서의 내용이 포함되지 않는지 확인** (핵심)
4. 면접 종료 → 상태 변경 + 읽기 전용 확인
5. 면접 목록에서 상태별 표시 확인
