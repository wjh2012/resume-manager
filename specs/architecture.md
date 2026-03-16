# 아키텍처

## 기술 스택

| 영역 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | **Next.js 16 (App Router)** | RSC 기본, 서버/클라이언트 컴포넌트 분리 |
| UI | **shadcn/ui (radix-nova)** + **Tailwind CSS v4** | CVA 기반 variant, oklch 컬러 시스템 |
| DB | **Supabase PostgreSQL + Prisma** | 호스팅/인증/스토리지 + 타입 안전한 DB 접근 |
| 인증 | **Supabase Auth** (`@supabase/ssr`) | 카카오/Google/GitHub OAuth 내장 |
| 파일저장 | **Supabase Storage** | `documents/{userId}/{id}.ext` 경로로 원본 보관 |
| AI | **Vercel AI SDK** (`ai`) | Claude/OpenAI/Gemini 통합 + `useChat`/`streamText` |
| 벡터 검색 | **Supabase pgvector** | PostgreSQL 내장, 별도 서비스 불필요 |
| PDF 생성 | **@react-pdf/renderer** | React 컴포넌트 → PDF, 서버사이드 |
| 파일 파싱 | **pdf-parse** + **mammoth** | PDF/Word 텍스트 추출 |
| 유효성검증 | **Zod** | API/Server Action 입력 검증 |

## 프로젝트 구조

```
prisma/schema.prisma
middleware.ts                          # 인증 가드

app/
  (auth)/login/page.tsx, callback/route.ts
  (dashboard)/layout.tsx               # 사이드바 + 탑바
  (dashboard)/documents/, cover-letters/, interviews/, insights/, resumes/, settings/
  api/documents/, chat/, insights/, resumes/, cover-letters/, interviews/

components/
  layout/    app-sidebar.tsx, topbar.tsx, user-menu.tsx
  chat/      chat-container.tsx, chat-message.tsx, chat-input.tsx, chat-loading.tsx
  documents/ document-upload.tsx, document-list.tsx, document-card.tsx
  cover-letters/ cover-letter-form.tsx, cover-letter-editor.tsx, cover-letter-chat.tsx
  interviews/    interview-setup.tsx, interview-chat.tsx
  insights/      insight-list.tsx, insight-card.tsx
  resumes/       resume-form.tsx, section-editors/*, templates/*, pdf/*

lib/
  prisma.ts                            # Prisma 싱글턴
  supabase/ client.ts, server.ts, middleware.ts
  ai/       provider.ts, context.ts, embedding.ts,
            prompts/{cover-letter,interview,insight-extraction}.ts
  files/    parser.ts, parse-pdf.ts, parse-docx.ts, parse-txt.ts
  storage.ts                           # Supabase Storage 헬퍼
  validations/ document.ts, resume.ts, cover-letter.ts, interview.ts

hooks/  use-chat-scroll.ts, use-file-upload.ts
types/  database.ts, ai.ts
```

## 라우트 구조

```
/(auth)/login ................. 소셜 로그인 (카카오/Google/GitHub)
/(auth)/callback .............. OAuth 콜백 핸들러

/(dashboard) .................. 대시보드 홈 (최근 활동, 빠른 접근)
/(dashboard)/documents ........ 참고자료 목록 + 업로드
/(dashboard)/documents/[id] ... 문서 상세 (추출 텍스트 보기)
/(dashboard)/cover-letters .... 자기소개서 목록
/(dashboard)/cover-letters/new  새 자기소개서 (기업 정보 입력)
/(dashboard)/cover-letters/[id] 자기소개서 작업공간 (좌: 에디터, 우: AI 채팅)
/(dashboard)/interviews ....... 모의면접 목록
/(dashboard)/interviews/new ... 면접 설정 (문서 선택, 기업 정보)
/(dashboard)/interviews/[id] .. 면접 채팅 (전체화면)
/(dashboard)/insights ......... 인사이트 대시보드 (카테고리별 필터)
/(dashboard)/resumes .......... 이력서 목록
/(dashboard)/resumes/new ...... 새 이력서 (템플릿 선택)
/(dashboard)/resumes/[id] ..... 이력서 편집기 (탭 기반)
/(dashboard)/resumes/[id]/preview 미리보기 + PDF 다운로드
/(dashboard)/settings ......... AI 설정, 프로필
```

## AI 아키텍처

### 컨텍스트 전략: RAG + 사용자 선택 혼합

참고자료가 많아질 수 있으므로 벡터 검색 + 사용자 직접 선택을 결합한다.

- **Supabase pgvector** 확장으로 벡터 DB 구현 (별도 서비스 불필요)
- 문서 업로드 시 텍스트를 청크로 분할 → 임베딩 생성 → `document_chunks` 테이블에 저장
- 대화 시 질문/맥락으로 관련 청크를 벡터 검색하여 자동 포함
- 사용자가 특정 문서를 직접 선택하면 해당 문서는 전체 텍스트 우선 포함
- 임베딩 생성: Vercel AI SDK의 `embed` 함수 사용

### 컨텍스트 빌더

```typescript
buildContext(userId, {
  query,                // RAG 검색 쿼리
  selectedDocumentIds?, // 사용자가 직접 선택한 문서 (전체 포함)
  includeInsights?,     // 축적된 인사이트 포함 여부
  includeResumes?,      // 이력서 데이터 포함 여부
  maxTokens?            // 컨텍스트 크기 제한
}) → string
```

### AI 제공자 팩토리

Vercel AI SDK 기반, 사용자의 `AiSettings`에 따라 Claude/OpenAI/Gemini 전환.

```typescript
// lib/ai/provider.ts
getAIProvider(userId) → LanguageModel
```

### 면접관 문서 접근 제한

- `InterviewDocument` 조인 테이블에 등록된 문서만 벡터 검색 범위로 제한
- 시스템 프롬프트로 "이 문서만 보고 질문하라" 지시

### 인사이트 추출

- `generateObject` (Vercel AI SDK) + Zod 스키마로 구조화된 JSON 출력 → DB 저장

## 데이터 흐름

### 문서 업로드 플로우

```
파일 선택 → Supabase Storage 업로드 → 텍스트 추출 (pdf-parse/mammoth)
→ 청크 분할 → 임베딩 생성 → DocumentChunk 테이블 저장
```

### 자기소개서 작성 플로우

```
기업 정보 입력 → Conversation 생성 → AI 채팅 (RAG 컨텍스트 포함)
→ 에디터에 반영 → 인사이트 추출 (선택)
```

### 모의면접 플로우

```
면접 설정 (문서 선택, 기업 정보) → InterviewSession 생성
→ AI 채팅 (선택된 문서만 컨텍스트) → 인사이트 추출 (선택)
```

### 이력서 PDF 플로우

```
이력서 데이터 입력 → 템플릿 선택 → 웹 미리보기
→ @react-pdf/renderer로 PDF 생성 → 다운로드
```
