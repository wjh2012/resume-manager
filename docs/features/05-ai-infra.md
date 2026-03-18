# AI 인프라 & 설정 (AI Infrastructure)

> Phase 2 — AI 공통 인프라 구축

## 개요

Phase 3~5(자기소개서, 면접, 인사이트)에서 재사용할 AI 공통 인프라를 구축한다. AI 제공자 팩토리, RAG 컨텍스트 빌더, 프롬프트 템플릿, 공용 채팅 UI, 설정 페이지가 포함된다.

## AI 제공자 팩토리

사용자가 선택한 AI 제공자/모델에 따라 적절한 SDK 클라이언트를 생성한다.

| 제공자 | 모델 | SDK |
|--------|------|-----|
| OpenAI | gpt-4o, gpt-4o-mini | `@ai-sdk/openai` |
| Anthropic | claude-sonnet-4-20250514, claude-haiku-4-5-20251001 | `@ai-sdk/anthropic` |
| Google | gemini-2.0-flash, gemini-2.5-pro | `@ai-sdk/google` |

- `createLanguageModel()`: 순수 함수, provider/model/apiKey → `LanguageModel` 반환
- `getLanguageModel()`: DB에서 사용자 설정 조회 후 모델 생성
- 임베딩은 항상 OpenAI `text-embedding-3-small` 사용 (사용자 설정과 무관)

## RAG 컨텍스트 빌더

채팅 시 관련 문서 컨텍스트를 자동으로 조합한다.

1. **선택 문서** — 사용자가 직접 선택한 문서의 전체 텍스트 포함
2. **벡터 검색** — pgvector 코사인 거리 기반으로 관련 청크 검색 (기본 5개)
3. **인사이트** — 축적된 인사이트 포함 (옵션, Phase 5에서 활성화)

- `limitToDocumentIds`: 면접용 문서 격리 지원
- 선택 문서 조회와 임베딩 생성을 `Promise.all`로 병렬 실행

## 프롬프트 템플릿

| 템플릿 | 용도 | 주요 파라미터 |
|--------|------|--------------|
| `buildCoverLetterSystemPrompt` | 자기소개서 작성 | companyName, position, jobPostingText?, context |
| `buildInterviewSystemPrompt` | 모의면접 진행 | companyName?, position?, context |
| `insightExtractionPrompt` | 인사이트 추출 | (고정 프롬프트) |

인사이트 카테고리: `strength`, `experience`, `motivation`, `skill`, `other`

## 채팅 UI 컴포넌트

AI SDK v6의 `UIMessage` (parts 배열 기반) 구조에 맞춘 재사용 가능한 채팅 UI.

| 컴포넌트 | 역할 |
|----------|------|
| `ChatContainer` | 메시지 목록 + 자동 스크롤 + 하단 입력 영역 |
| `ChatMessage` | role별 스타일, 어시스턴트는 마크다운 렌더링 (`React.memo`) |
| `ChatInput` | Enter 전송, Shift+Enter 줄바꿈, 로딩 시 비활성화 |
| `ChatLoading` | 타이핑 인디케이터 (3 animated dots) |
| `useChatScroll` | 새 메시지 시 자동 스크롤, 위로 스크롤하면 비활성화 |

## 설정 페이지

`/settings`에서 AI 제공자, 모델, API 키를 관리한다.

- 제공자 변경 시 모델 목록 자동 갱신
- API 키는 password 타입으로 입력, 마스킹하여 응답
- API 키 미입력 시 기존 키 유지 (빈 문자열로 삭제 불가)
- API 키 평문 저장 (프로덕션 배포 전 암호화 적용 예정)

## API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/settings/ai` | AI 설정 조회 (API 키 마스킹) |
| `PUT` | `/api/settings/ai` | AI 설정 저장/업데이트 (upsert) |
| `POST` | `/api/settings/ai/validate` | API 키 유효성 검증 (제공자별 연결 테스트) |

## 주요 파일

| 파일 | 역할 |
|------|------|
| `types/ai.ts` | AIProvider, PROVIDER_MODELS, BuildContextOptions 타입 |
| `lib/validations/ai-settings.ts` | Zod 스키마 + provider-model 교차 검증 + maskApiKey |
| `lib/ai/provider.ts` | AI 제공자 팩토리 (createLanguageModel, getLanguageModel) |
| `lib/ai/context.ts` | RAG 컨텍스트 빌더 (벡터 검색 + 문서 조합) |
| `lib/ai/prompts/*.ts` | 프롬프트 템플릿 (cover-letter, interview, insight-extraction) |
| `lib/settings/service.ts` | 설정 CRUD 서비스 레이어 |
| `app/api/settings/ai/route.ts` | GET, PUT 엔드포인트 |
| `app/(dashboard)/settings/page.tsx` | 설정 페이지 (RSC) |
| `components/settings/ai-settings-form.tsx` | 설정 폼 (클라이언트) |
| `components/chat/*.tsx` | 공용 채팅 UI 컴포넌트 |
| `hooks/use-chat-scroll.ts` | 채팅 스크롤 훅 |
