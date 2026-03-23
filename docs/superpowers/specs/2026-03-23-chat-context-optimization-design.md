# 채팅 컨텍스트 최적화 설계

## 배경

현재 자소서/면접 채팅 시 선택된 문서의 전체 텍스트가 매 메시지마다 시스템 프롬프트에 포함된다.
문서 3개(각 5,000자) 선택 시 10턴 대화에서 약 150,000자의 중복 입력 토큰이 발생한다.

Claude Code의 subagent 패턴처럼 "요약으로 판단 → 필요시 전문 읽기" 방식으로 전환하여 토큰 비용을 절감한다.

## 변경 범위

### 1. 문서 업로드 — 요약 생성

- 텍스트 추출 후 사용자 설정 LLM으로 1~4줄 핵심 요약 생성
- `Document` 모델에 `summary` 필드 추가 (nullable String)
- 요약 생성 시 토큰 사용량 기록 (feature: `DOCUMENT_SUMMARY`)
- 요약 생성 실패 시 (API 오류, 쿼터 초과, AI 미설정) 문서는 `summary: null`로 저장. 업로드 자체는 실패하지 않음
- 문서 상세 페이지에 "요약 생성" 버튼 추가. summary가 null이거나 재생성하고 싶을 때 사용. 사용자 설정 LLM으로 생성

#### 제거 대상

- 청크 분할 (`splitIntoChunks`) 제거
- 임베딩 생성 (`generateEmbeddings`, `generateQueryEmbedding`) 제거
- `DocumentChunk` 모델 + 테이블 제거 (마이그레이션으로 drop)
- `UploadResult` 인터페이스에서 `chunkCount`, `embeddingSkipped` 필드 제거
- Prisma 스키마에서 `pgvector` 확장 선언 제거 (더 이상 vector 타입 사용 안 함)

### 2. 채팅 컨텍스트 변경 (자소서 + 면접 공통)

#### 라우트별 문서 ID 조회 방식

- **자소서**: 클라이언트가 `selectedDocumentIds`를 요청 body로 전송 (현행 유지)
- **면접**: DB에서 `InterviewDocument` 조회하여 `allowedDocIds`를 얻음 → 이를 `selectedDocumentIds`로 사용

두 라우트 모두 최종적으로 `selectedDocumentIds`를 `buildContext()`에 전달하는 것은 동일.

#### 시스템 프롬프트 구성

```
[문서: 포트폴리오.pdf (ID: abc-123)]
3년차 백엔드 개발자. Spring Boot, AWS 기반 결제 시스템 구축 경험...

[문서: 경력기술서.docx (ID: def-456)]
팀 리드 경험. MSA 전환 프로젝트 주도, 성능 40% 개선...

[커리어노트: MSA 전환 경험 (ID: ghi-789)]
팀 리드로 모놀리스→MSA 전환 주도. 성능 40% 개선...

[커리어노트: 결제 시스템 구축 (ID: jkl-012)]
Spring Boot 기반 PG 연동. 일 10만건 처리...
(전체 확정 커리어노트)
```

- 선택 문서 전문 포함 → 요약만 포함 (요약에 문서 ID 명시하여 `readDocument` 도구 호출 시 사용)
- `summary`가 null인 문서는 `[문서: 파일명 (ID: xxx)] 요약 없음 — readDocument 도구로 전문을 확인하세요` 표시
- 벡터 검색(RAG) 제거 — 미선택 문서 참조 안 함
- 인사이트 제거 (향후 deprecated 예정)
- 커리어노트: 자소서에서만 전체 확정(CONFIRMED) 노트의 요약 포함 (10개 제한 제거). ID 명시하여 `readCareerNote` 도구 호출 시 사용
- `summary`가 null인 커리어노트는 `[커리어노트: 제목 (ID: xxx)] 요약 없음 — readCareerNote 도구로 전문을 확인하세요` 표시
- 면접은 커리어노트 미포함 (선택된 문서만 참조). 도구는 `readDocument`만 제공. 커리어노트 관련 기능은 추후 면접 코치 에이전트에서 처리

#### Tool Use 도입

AI SDK의 `streamText` + `tools` + `stopWhen: stepCountIs(5)` 사용.

step 수 동적 계산: `선택 문서 수 + 커리어노트 수 + 2` (saveCareerNote + 여유). 상한선 15로 제한하여 과도한 도구 호출 방지.

**`readDocument` 도구**

- 목적: LLM이 요약만으로 부족할 때 문서 전문을 읽음
- 입력: `documentId: string`
- 동작: 소유권 확인 + 선택 문서 범위 확인 → `extractedText` 반환
- 접근 범위: 해당 자소서/면접에 선택된 문서만 허용. 범위 외 ID 요청 시 에러 메시지 반환

**`readCareerNote` 도구**

- 목적: LLM이 커리어노트 요약만으로 부족할 때 전문을 읽음
- 입력: `careerNoteId: string`
- 동작: 소유권 확인 → `content` + `metadata` 반환
- 접근 범위: 해당 사용자의 확정(CONFIRMED) 커리어노트만 허용

**`saveCareerNote` 도구**

- 목적: 대화 중 LLM이 기록할 만한 내용을 발견하면 커리어노트를 생성하거나, 기존 노트에 반영할 내용이 있으면 갱신
- 생성 흐름:
  1. LLM이 텍스트로 제안: "이 경험을 커리어노트로 저장할까요? 제목: ..."
  2. 사용자가 채팅으로 승인: "응" / "아니"
  3. 승인 시 LLM이 `saveCareerNote` 도구 호출
- 갱신 흐름 (새 내용 보강 또는 기존 내용 정정):
  1. LLM이 시스템 프롬프트의 커리어노트 요약을 보고 관련 노트 발견
  2. `readCareerNote`로 기존 전문 읽기
  3. 텍스트로 수정 내용 제안 (변경 이유 + 구체적 변경 내용 설명). 예:
     - 보강: "기존 노트에 이번 대화에서 나온 장애 대응 경험을 추가하면 좋겠습니다. 수정할까요?"
     - 정정: "기존 노트에 성능 개선이 40%로 기록되어 있는데, 대화 내용에 따르면 60%입니다. 수정할까요?"
  4. 사용자 승인 시 기존 내용을 적절히 편집하여 `saveCareerNote(careerNoteId: xxx, ...)` 호출
- 입력 (LLM이 제공): `careerNoteId?: string` (없으면 생성, 있으면 갱신), `title: string`, `content: string`, `summary: string` (1~2줄 요약), `metadata?: { role?, result?, feeling? }`
- 암묵적 컨텍스트 (route handler closure에서 주입, LLM 입력 아님): `userId`, `conversationId`
- 생성 동작: CareerNote 생성 (status: CONFIRMED, summary 포함) + CareerNoteSource 연결 (conversationId)
- 갱신 동작: 기존 CareerNote의 title, content, summary, metadata 업데이트 + CareerNoteSource 연결 (conversationId)
- 기존 커리어노트 수정 API(`PUT /api/career-notes/[id]`)로 content가 변경될 때도 LLM으로 summary 재생성

#### 토큰 사용량 추적

- `readDocument`, `saveCareerNote` 도구 호출로 인한 추가 토큰은 AI SDK의 `onFinish` 콜백에서 `usage`에 자동 합산됨 (tool call 입출력 포함)
- 별도 추적 불필요, 현행 `recordUsage` 로직 그대로 사용

### 3. buildContext 리팩토링

현재 `buildContext(userId, opts)` 함수를 단순화한다.

```
변경 전 파라미터:
  - query (벡터 검색용) → 제거
  - selectedDocumentIds (전문 조회) → 요약 조회로 변경
  - limitToDocumentIds (벡터 검색 범위) → 제거
  - includeInsights → 제거
  - includeCareerNotes → 유지
  - maxChunks → 제거

변경 후 파라미터:
  - selectedDocumentIds (문서 요약 + ID 조회)
  - includeCareerNotes (커리어노트 요약 + ID 조회, 전체 확정 노트)
```

### 4. 제거 대상 전체 목록

| 대상 | 위치 |
|------|------|
| `DocumentChunk` 모델 | `prisma/schema.prisma` |
| `extensions = [vector]` | `prisma/schema.prisma` |
| `splitIntoChunks` | `lib/ai/embedding.ts` |
| `generateEmbeddings` | `lib/ai/embedding.ts` |
| `getEmbeddingModel` | `lib/ai/embedding.ts` (벡터 검색 전용이었으므로) |
| `generateQueryEmbedding` | `lib/ai/context.ts` |
| `searchSimilarChunks` | `lib/ai/context.ts` |
| 업로드 시 청크/임베딩 로직 | `lib/documents/service.ts` |
| `UploadResult`의 `chunkCount`, `embeddingSkipped` | `lib/documents/service.ts` |
| `_count: { select: { chunks: true } }` | `lib/documents/service.ts` (listDocuments, getDocument 등) |
| 청크 수 표시 UI | `components/documents/` 관련 컴포넌트, `app/(dashboard)/documents/[id]/page.tsx` |
| `BuildContextOptions` 타입에서 제거된 필드 | `types/ai.ts` (query, limitToDocumentIds, includeInsights, maxChunks 제거) |
| `buildContext`의 query, includeInsights, RAG 로직 | `lib/ai/context.ts` |
| `includeInsights` 호출 | `app/api/chat/cover-letter/route.ts`, `app/api/chat/interview/route.ts` |

### 5. DB 마이그레이션

- `Document` 테이블에 `summary` 컬럼 추가 (nullable String)
- `CareerNote` 테이블에 `summary` 컬럼 추가 (nullable String)
- `DocumentChunk` 테이블 drop
- `UsageFeature` enum에 `DOCUMENT_SUMMARY` 추가. `EMBEDDING`은 기존 사용량 기록 삭제 후 enum에서 제거
- 기존 문서/커리어노트에 대한 요약은 마이그레이션에서 생성하지 않음 (별도 스크립트 또는 수동)

## 데이터 흐름

### 문서 업로드

```
파일 → 텍스트 추출 → LLM 요약 생성 (1~4줄, 실패 시 summary: null)
     → Document 저장 (extractedText + summary)
```

### 채팅 (자소서/면접 공통)

```
사용자 메시지 전송
  → 문서 ID 확보 (자소서: body에서, 면접: DB InterviewDocument에서)
  → 선택 문서 요약 + 커리어노트 요약 → 시스템 프롬프트
  → streamText({ tools: { readDocument, readCareerNote, saveCareerNote }, stopWhen: stepCountIs(5) })
  → LLM 응답 스트리밍
     → 필요시 readDocument / readCareerNote 도구 호출 → 전문 읽고 이어서 응답
     → 기록할 만한 내용 발견 시 텍스트로 제안 → 사용자 승인 → saveCareerNote 호출
```

## 클라이언트 영향

- `useChat` 훅 변경 없음 — AI SDK가 tool 호출/결과를 자동 처리
- `toUIMessageStreamResponse()`가 스트리밍 중 tool 실행을 투명하게 처리
- 문서 목록/상세에서 청크 수 표시 제거 (UI 업데이트 필요)
- 문서 선택 UI에서 summary가 null인 문서에 "요약 없음" 표시 (선택은 허용)
- 도구 실행 중 로딩 표시 UI 추가 (예: "문서를 읽고 있습니다...", "커리어노트를 저장하고 있습니다...")
