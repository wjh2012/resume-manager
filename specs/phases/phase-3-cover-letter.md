# Phase 3: AI 자기소개서 작성

## 목표

사용자가 기업 정보를 입력하고, AI와 대화하며 자기소개서를 작성할 수 있는 기능을 구현한다.

## 완료 기준

- [ ] 자기소개서 CRUD (생성, 조회, 수정, 삭제)
- [ ] 기업 정보 입력 폼 (직접 입력 + 채용공고 붙여넣기)
- [ ] AI 채팅으로 자기소개서 내용 생성 (스트리밍)
- [ ] 자기소개서 에디터 + AI 채팅 사이드패널
- [ ] 참고 문서 선택 기능 (채팅 컨텍스트에 포함)
- [ ] 목록/생성/작업공간 페이지

## 의존성

- Phase 0 완료 (기반 인프라)
- Phase 1 완료 (문서 업로드 + 임베딩)
- Phase 2 완료 (AI 인프라, 채팅 컴포넌트)

## 생성/수정할 파일

```
신규:
  app/api/cover-letters/route.ts
  app/api/cover-letters/[id]/route.ts
  app/api/chat/cover-letter/route.ts
  app/(dashboard)/cover-letters/page.tsx
  app/(dashboard)/cover-letters/new/page.tsx
  app/(dashboard)/cover-letters/[id]/page.tsx
  components/cover-letters/cover-letter-form.tsx
  components/cover-letters/cover-letter-editor.tsx
  components/cover-letters/cover-letter-chat.tsx
  lib/validations/cover-letter.ts

수정:
  없음
```

## 상세 구현 단계

### 1. 유효성 검증 스키마

#### `lib/validations/cover-letter.ts`

```typescript
import { z } from "zod"

export const createCoverLetterSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  companyName: z.string().min(1, "기업명을 입력해주세요"),
  position: z.string().min(1, "직무를 입력해주세요"),
  jobPostingText: z.string().optional(),
})

export const updateCoverLetterSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  status: z.enum(["draft", "completed"]).optional(),
})
```

### 2. 자기소개서 CRUD API

#### `POST /api/cover-letters`

- 유효성 검증
- `CoverLetter` 생성 + 초기 `Conversation` (type: "cover_letter") 생성
- 응답: 생성된 자기소개서 (conversationId 포함)

#### `GET /api/cover-letters`

- 사용자의 자기소개서 목록 (최신순)

#### `GET /api/cover-letters/[id]`

- 자기소개서 상세 (conversation 포함)

#### `PUT /api/cover-letters/[id]`

- 소유자 확인 + 업데이트

#### `DELETE /api/cover-letters/[id]`

- 소유자 확인 + 삭제 (Cascade로 conversation, messages 삭제)

### 3. 스트리밍 채팅 API

#### `POST /api/chat/cover-letter`

```typescript
import { streamText } from "ai"
import { getLanguageModel } from "@/lib/ai/provider"
import { buildContext } from "@/lib/ai/context"
import { buildCoverLetterSystemPrompt } from "@/lib/ai/prompts/cover-letter"

export async function POST(req: Request) {
  const { conversationId, coverLetterId, messages, selectedDocumentIds } = await req.json()

  // 1. 사용자 인증 확인
  // 2. CoverLetter 로드 (기업 정보)
  // 3. 컨텍스트 빌드 (RAG + 선택 문서 + 인사이트)
  // 4. 시스템 프롬프트 조합
  // 5. streamText로 응답

  const model = await getLanguageModel(userId)
  const context = await buildContext(userId, {
    query: messages.at(-1).content,
    selectedDocumentIds,
    includeInsights: true,
  })

  const systemPrompt = buildCoverLetterSystemPrompt({
    companyName: coverLetter.companyName,
    position: coverLetter.position,
    jobPostingText: coverLetter.jobPostingText,
    context,
  })

  const result = streamText({
    model,
    system: systemPrompt,
    messages,
    onFinish: async ({ text }) => {
      // assistant 메시지 DB 저장
      await prisma.message.create({
        data: { conversationId, role: "assistant", content: text },
      })
    },
  })

  return result.toDataStreamResponse()
}
```

### 4. 기업 정보 입력 폼

#### `components/cover-letters/cover-letter-form.tsx`

- 제목 (Input)
- 기업명 (Input)
- 직무 (Input)
- 채용공고 (Textarea, 선택사항) — "채용공고를 붙여넣으면 더 정확한 자기소개서를 작성할 수 있습니다"
- 생성 버튼

#### `app/(dashboard)/cover-letters/new/page.tsx`

- `CoverLetterForm` 렌더링
- 생성 성공 시 `/cover-letters/[id]`로 리다이렉트

### 5. 자기소개서 작업공간

#### `app/(dashboard)/cover-letters/[id]/page.tsx`

좌우 2분할 레이아웃:
- **좌측**: 자기소개서 에디터 (`CoverLetterEditor`)
- **우측**: AI 채팅 사이드패널 (`CoverLetterChat`)

리사이즈 가능한 분할 패널 (드래그 핸들).

#### `components/cover-letters/cover-letter-editor.tsx`

- 자기소개서 내용 편집 (Textarea)
- 자동 저장 (debounce)
- 상태 표시 (draft / completed)
- 완료 버튼 (status → "completed")

#### `components/cover-letters/cover-letter-chat.tsx`

Phase 2의 공용 채팅 컴포넌트를 래핑:
- `useChat` 훅 연동 (`/api/chat/cover-letter`)
- 상단: 참고 문서 선택 드롭다운 (체크박스 목록)
- 채팅 영역
- "에디터에 반영" 버튼 — AI 응답 중 자기소개서 내용을 에디터에 복사

### 6. 자기소개서 목록 페이지

#### `app/(dashboard)/cover-letters/page.tsx`

- 상단: "새 자기소개서" 버튼 → `/cover-letters/new`
- 카드 그리드:
  - 기업명 + 직무
  - 상태 배지 (draft: 회색, completed: 초록)
  - 수정일
  - 클릭 → `/cover-letters/[id]`
- 빈 상태: "아직 작성한 자기소개서가 없습니다"

## 검증 방법

1. 새 자기소개서 생성 → 기업 정보 입력 → 작업공간 진입
2. AI 채팅으로 자기소개서 초안 요청 → 스트리밍 응답 확인
3. 참고 문서 선택 → 채팅에서 문서 내용 기반 응답 확인
4. AI 응답을 에디터에 반영 → 내용 업데이트
5. 자동 저장 동작 확인
6. 목록에서 자기소개서 확인 + 삭제
