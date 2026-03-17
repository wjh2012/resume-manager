# Phase 2: AI 인프라 & 설정

## 목표

AI 채팅의 공통 인프라를 구축한다. 제공자 팩토리, 컨텍스트 빌더, 프롬프트 템플릿, 공용 채팅 UI 컴포넌트를 만들어 Phase 3~5에서 재사용한다.

## 완료 기준

- [ ] AI 제공자 팩토리 (Claude/OpenAI/Gemini 전환)
- [ ] 컨텍스트 빌더 (RAG 검색 + 사용자 선택 문서 + 인사이트)
- [ ] 프롬프트 템플릿 (자기소개서, 면접, 인사이트 추출)
- [ ] 공용 채팅 컴포넌트 (container, message, input, loading)
- [ ] 설정 페이지 (AI 제공자/모델/API 키)

## 의존성

- Phase 0 완료 (Prisma, Supabase, 인증)
- Phase 1 완료 (Document, DocumentChunk 테이블 + 임베딩)

## 설치할 패키지

```bash
npm install ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google react-markdown remark-gfm
```

## 생성/수정할 파일

```
신규:
  lib/ai/provider.ts
  lib/ai/context.ts
  lib/ai/prompts/cover-letter.ts
  lib/ai/prompts/interview.ts
  lib/ai/prompts/insight-extraction.ts
  components/chat/chat-container.tsx
  components/chat/chat-message.tsx
  components/chat/chat-input.tsx
  components/chat/chat-loading.tsx
  app/(dashboard)/settings/page.tsx
  app/api/settings/ai/route.ts
  lib/validations/ai-settings.ts
  hooks/use-chat-scroll.ts
  types/ai.ts

수정:
  없음
```

## 상세 구현 단계

### 1. 타입 정의

#### `types/ai.ts`

```typescript
export type AIProvider = "openai" | "anthropic" | "google"

export interface AIConfig {
  provider: AIProvider
  model: string
  apiKey: string
}

export interface ChatContext {
  query: string
  selectedDocumentIds?: string[]
  includeInsights?: boolean
  includeResumes?: boolean
  maxTokens?: number
}
```

### 2. AI 제공자 팩토리

#### `lib/ai/provider.ts`

사용자의 `AiSettings`에서 제공자/모델/API 키를 읽어 적절한 `LanguageModel`을 반환한다.

```typescript
import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { prisma } from "@/lib/prisma"

export async function getLanguageModel(userId: string) {
  const settings = await prisma.aiSettings.findUnique({ where: { userId } })
  if (!settings?.apiKey) throw new Error("AI 설정을 먼저 완료해주세요")

  switch (settings.provider) {
    case "openai":
      return createOpenAI({ apiKey: settings.apiKey })(settings.model)
    case "anthropic":
      return createAnthropic({ apiKey: settings.apiKey })(settings.model)
    case "google":
      return createGoogleGenerativeAI({ apiKey: settings.apiKey })(settings.model)
    default:
      throw new Error(`지원하지 않는 AI 제공자: ${settings.provider}`)
  }
}

// 임베딩 모델은 lib/ai/embedding.ts의 getEmbeddingModel()을 사용한다.
// 서버 환경변수 OPENAI_API_KEY 기반으로 항상 OpenAI text-embedding-3-small을 사용하며,
// 사용자의 AI 제공자 설정과 무관하게 동작한다.
```

### 3. 컨텍스트 빌더

#### `lib/ai/context.ts`

RAG 벡터 검색 + 사용자 직접 선택 문서 + 인사이트를 조합하여 시스템 프롬프트에 주입할 컨텍스트 문자열을 생성한다.

```typescript
export async function buildContext(userId: string, options: {
  query: string
  selectedDocumentIds?: string[]
  limitToDocumentIds?: string[]  // 면접용: 이 문서들만 검색
  includeInsights?: boolean
  maxChunks?: number
}): Promise<string> {
  const parts: string[] = []

  // 1. 사용자가 직접 선택한 문서는 전체 텍스트 포함
  if (options.selectedDocumentIds?.length) {
    const docs = await prisma.document.findMany({
      where: { id: { in: options.selectedDocumentIds }, userId },
      select: { title: true, extractedText: true },
    })
    for (const doc of docs) {
      parts.push(`=== 참고 문서: ${doc.title} ===\n${doc.extractedText}`)
    }
  }

  // 2. RAG 벡터 검색으로 관련 청크 추가
  const embedding = await generateQueryEmbedding(query)
  const chunks = await searchSimilarChunks(embedding, {
    userId,
    limitToDocumentIds: options.limitToDocumentIds,
    maxResults: options.maxChunks ?? 5,
  })
  for (const chunk of chunks) {
    parts.push(`=== 관련 내용 ===\n${chunk.content}`)
  }

  // 3. 인사이트 포함
  if (options.includeInsights) {
    const insights = await prisma.insight.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    })
    if (insights.length) {
      const insightText = insights
        .map(i => `[${i.category}] ${i.title}: ${i.content}`)
        .join("\n")
      parts.push(`=== 사용자 인사이트 ===\n${insightText}`)
    }
  }

  return parts.join("\n\n")
}
```

벡터 검색은 `$queryRaw`로 pgvector 쿼리:

```sql
SELECT dc.id, dc.content, dc.document_id,
       dc.embedding <=> $1::vector AS distance
FROM document_chunks dc
JOIN documents d ON dc.document_id = d.id
WHERE d.user_id = $2
  AND ($3::uuid[] IS NULL OR d.id = ANY($3))
ORDER BY distance
LIMIT $4
```

### 4. 프롬프트 템플릿

#### `lib/ai/prompts/cover-letter.ts`

```typescript
export function buildCoverLetterSystemPrompt(params: {
  companyName: string
  position: string
  jobPostingText?: string
  context: string
}) {
  return `당신은 한국 취업 시장에 정통한 자기소개서 작성 도우미입니다.

## 기업 정보
- 회사: ${params.companyName}
- 직무: ${params.position}
${params.jobPostingText ? `- 채용공고:\n${params.jobPostingText}` : ""}

## 참고 자료
${params.context}

## 지침
- 사용자의 경험과 강점을 기업/직무에 맞게 연결하세요.
- 구체적인 수치와 사례를 활용하세요.
- 한국어 비즈니스 문체로 작성하세요.
- 사용자가 요청하면 자기소개서 초안을 작성하거나 수정하세요.
- 참고 자료에 없는 내용을 지어내지 마세요.`
}
```

#### `lib/ai/prompts/interview.ts`

```typescript
export function buildInterviewSystemPrompt(params: {
  companyName?: string
  position?: string
  context: string
}) {
  return `당신은 ${params.companyName ?? "기업"}의 ${params.position ?? ""} 면접관입니다.

## 면접 대상자 참고 자료
${params.context}

## 지침
- 위 참고 자료에 기반하여 질문하세요.
- 참고 자료에 없는 내용에 대해서는 질문하지 마세요.
- 기술 면접, 인성 면접, 상황 면접을 적절히 섞어 진행하세요.
- 한 번에 하나의 질문만 하세요.
- 답변이 불충분하면 꼬리 질문으로 깊이를 확인하세요.
- 실제 면접처럼 자연스럽게 진행하세요.
- 한국어로 대화하세요.`
}
```

#### `lib/ai/prompts/insight-extraction.ts`

```typescript
export const insightExtractionPrompt = `대화 내용을 분석하여 취업 준비에 유용한 인사이트를 추출하세요.

각 인사이트를 다음 카테고리 중 하나로 분류하세요:
- strength: 강점, 장점
- experience: 경험, 경력, 성과
- motivation: 동기, 가치관, 목표
- skill: 기술, 역량
- other: 기타

구체적이고 재활용 가능한 정보만 추출하세요. 일반적인 내용은 제외하세요.`
```

### 5. 공용 채팅 컴포넌트

#### `components/chat/chat-container.tsx`

- 메시지 목록 영역 (스크롤)
- 하단 입력 영역
- Vercel AI SDK의 `useChat` 훅과 연동

#### `components/chat/chat-message.tsx`

- `role`에 따른 스타일 분기 (user: 오른쪽, assistant: 왼쪽)
- 마크다운 렌더링 (`react-markdown` + `remark-gfm`)
- 타임스탬프

#### `components/chat/chat-input.tsx`

- 텍스트 입력 (textarea, auto-resize)
- 전송 버튼
- Enter로 전송, Shift+Enter로 줄바꿈
- 전송 중 로딩 상태

#### `components/chat/chat-loading.tsx`

- AI 응답 대기 중 표시 (타이핑 인디케이터)

#### `hooks/use-chat-scroll.ts`

- 새 메시지 시 자동 스크롤
- 사용자가 위로 스크롤하면 자동 스크롤 비활성화
- 다시 최하단으로 스크롤하면 자동 스크롤 재활성화

### 6. 설정 페이지

#### `app/(dashboard)/settings/page.tsx`

- AI 제공자 선택 (Select: OpenAI / Anthropic / Google)
- 모델 선택 (제공자에 따른 모델 목록)
  - OpenAI: gpt-4o, gpt-4o-mini
  - Anthropic: claude-sonnet-4-6, claude-haiku-4-5-20251001
  - Google: gemini-2.0-flash, gemini-2.5-pro
- API 키 입력 (password 타입, 마스킹 표시)
- 저장 버튼

#### `app/api/settings/ai/route.ts`

- `GET`: 현재 설정 조회 (API 키는 마스킹)
- `PUT`: 설정 업데이트 (upsert)

#### `lib/validations/ai-settings.ts`

```typescript
import { z } from "zod"

export const aiSettingsSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google"]),
  model: z.string().min(1),
  apiKey: z.string().min(1, "API 키를 입력해주세요"),
})
```

## 검증 방법

1. 설정 페이지에서 AI 제공자/모델/API 키 저장 성공
2. 설정 조회 시 API 키 마스킹 확인
3. 제공자 변경 시 모델 목록 변경 확인
4. (Phase 3에서) 채팅 컴포넌트 렌더링 + 메시지 표시 확인
5. (Phase 3에서) 컨텍스트 빌더로 관련 문서 청크 검색 확인
