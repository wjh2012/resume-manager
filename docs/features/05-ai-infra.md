# AI 인프라 & 설정 (AI Infrastructure)

> Phase 2 — AI 공통 인프라 구축

## 개요

Phase 3~5(자기소개서, 면접, 인사이트)에서 재사용할 AI 공통 인프라를 구축한다. AI 제공자 팩토리, 요약 기반 컨텍스트 빌더, 채팅 도구, 프롬프트 템플릿, 공용 채팅 UI, 설정 페이지가 포함된다.

## AI 제공자 팩토리

사용자가 선택한 AI 제공자/모델에 따라 적절한 SDK 클라이언트를 생성한다.

| 제공자 | 모델 | SDK |
|--------|------|-----|
| OpenAI | gpt-4o, gpt-4o-mini | `@ai-sdk/openai` |
| Anthropic | claude-sonnet-4-20250514, claude-haiku-4-5-20251001 | `@ai-sdk/anthropic` |
| Google | gemini-2.0-flash, gemini-2.5-pro | `@ai-sdk/google` |

- `createLanguageModel()`: 순수 함수, provider/model/apiKey → `LanguageModel` 반환
- `getLanguageModel()`: DB에서 사용자 설정 조회 후 `{ model, isServerKey, provider, modelId }` 반환 (토큰 사용량 추적용 메타정보 포함)

## 컨텍스트 빌더

채팅 시 선택 문서와 커리어노트의 요약을 조합한다. LLM이 필요시 도구로 전문을 읽는 방식.

1. **선택 문서 요약** — 문서 제목 + ID + 요약 (1~4줄) 포함. 요약이 없으면 fallback 메시지 표시
2. **커리어노트 요약** — 전체 확정(CONFIRMED) 노트의 제목 + ID + 요약 (자소서 전용)

- `buildContext()` 반환: `{ context: string, careerNoteCount: number }`
- 커리어노트 count는 동적 stepCount 계산에 사용

## 채팅 도구 (Tool Use)

AI SDK의 `streamText` + `tools` + `stopWhen`으로 LLM이 필요시 도구를 호출한다.

| 도구 | 용도 | 사용 라우트 |
|------|------|------------|
| `readDocument` | 문서 전문 읽기 (요약으로 부족할 때) | 자소서, 면접 |
| `readCareerNote` | 커리어노트 전문 읽기 | 자소서 |
| `saveCareerNote` | 커리어노트 생성/갱신 (사용자 채팅 승인 후) | 자소서 |

- `readDocument`: 선택된 문서 범위만 접근 허용 + 소유권 확인
- `readCareerNote`: CONFIRMED 상태 + 소유권 확인
- `saveCareerNote`: `careerNoteId` 유무로 생성/갱신 구분, CareerNoteSource 연결
- 동적 stepCount: `min(문서 수 + 커리어노트 수 + 2, 15)`
- 도구 실행 중 로딩 UI 표시 ("문서를 읽고 있습니다..." 등)

## 프롬프트 템플릿

| 템플릿 | 용도 | 주요 파라미터 |
|--------|------|--------------|
| `buildCoverLetterSystemPrompt` | 자기소개서 작성 | companyName, position, jobPostingText?, context |
| `buildInterviewSystemPrompt` | 모의면접 진행 | companyName?, position?, context |
| `insightExtractionPrompt` | 인사이트 추출 | (고정 프롬프트) |

프롬프트에 도구 사용 안내 포함 (readDocument, readCareerNote, saveCareerNote 사용법).

## 채팅 UI 컴포넌트

AI SDK v6의 `UIMessage` (parts 배열 기반) 구조에 맞춘 재사용 가능한 채팅 UI.

| 컴포넌트 | 역할 |
|----------|------|
| `ChatContainer` | 메시지 목록 + 자동 스크롤 + 하단 입력 영역 |
| `ChatMessage` | role별 스타일, 어시스턴트는 마크다운 렌더링, 도구 실행 로딩 표시 |
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
| `lib/ai/context.ts` | 요약 기반 컨텍스트 빌더 |
| `lib/ai/tools/*.ts` | 채팅 도구 (readDocument, readCareerNote, saveCareerNote) |
| `lib/ai/prompts/*.ts` | 프롬프트 템플릿 (cover-letter, interview, insight-extraction) |
| `lib/settings/service.ts` | 설정 CRUD 서비스 레이어 |
| `app/api/settings/ai/route.ts` | GET, PUT 엔드포인트 |
| `app/(dashboard)/settings/page.tsx` | 설정 페이지 (RSC) |
| `components/settings/ai-settings-form.tsx` | 설정 폼 (클라이언트) |
| `components/chat/*.tsx` | 공용 채팅 UI 컴포넌트 |
| `hooks/use-chat-scroll.ts` | 채팅 스크롤 훅 |
