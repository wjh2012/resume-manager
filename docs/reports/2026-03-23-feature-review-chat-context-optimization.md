# 채팅 컨텍스트 최적화 점검 보고서

## 개요
- 점검 일시: 2026-03-23
- 대상: 채팅 컨텍스트 최적화 (`feature/chat-context-optimization` 브랜치)
- 스펙: `docs/superpowers/specs/2026-03-23-chat-context-optimization-design.md`
- 전체 달성률: **95%**

## 상세 점검 결과

### 1. DB 마이그레이션 (스펙 5절)

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 1 | Document 테이블에 `summary` 컬럼 추가 (nullable String) | ✅ 완료 | `prisma/schema.prisma` L116, migration SQL 확인 |
| 2 | CareerNote 테이블에 `summary` 컬럼 추가 (nullable String) | ✅ 완료 | `prisma/schema.prisma` L397, migration SQL 확인 |
| 3 | DocumentChunk 테이블 drop | ✅ 완료 | migration SQL에서 `DROP TABLE "document_chunks"` 확인 |
| 4 | UsageFeature enum에 `DOCUMENT_SUMMARY` 추가 | ✅ 완료 | `prisma/schema.prisma` L37 |
| 5 | UsageFeature enum에서 `EMBEDDING` 제거 | ✅ 완료 | enum에 EMBEDDING 없음 확인 |
| 6 | 기존 EMBEDDING 사용량 기록 삭제 후 enum 제거 | ⚠️ 부분 완료 | migration SQL에 `DELETE FROM token_usage_logs WHERE feature = 'EMBEDDING'` 누락. Prisma 경고 "If these variants are still used in the database, this will fail" 존재. DB에 EMBEDDING 레코드가 있으면 마이그레이션 실패 가능 |
| 7 | pgvector 확장 선언 제거 | ✅ 완료 | `extensions = []` (빈 배열)으로 변경됨 |

### 2. 문서 업로드 - 요약 생성 (스펙 1절)

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 1 | 텍스트 추출 후 LLM으로 1~4줄 요약 생성 | ✅ 완료 | `lib/documents/summary.ts` — 시스템 프롬프트에 "1~4줄" 명시 |
| 2 | 토큰 사용량 기록 (feature: DOCUMENT_SUMMARY) | ✅ 완료 | `lib/documents/summary.ts` L36-44 |
| 3 | 요약 실패 시 summary: null로 저장, 업로드 자체는 성공 | ✅ 완료 | `lib/documents/service.ts` L93-103 — 트랜잭션 외부에서 비동기 실행 |
| 4 | 문서 상세 페이지에 "요약 생성" 버튼 추가 | ✅ 완료 | `components/documents/summary-section.tsx` 별도 컴포넌트로 구현 |
| 5 | 요약 재생성 API | ✅ 완료 | `app/api/documents/[id]/summary/route.ts` |

### 3. 제거 대상 (스펙 4절)

| # | 제거 대상 | 상태 | 비고 |
|---|---------|------|------|
| 1 | `DocumentChunk` 모델 (schema) | ✅ 완료 | 스키마에서 완전 제거 |
| 2 | `extensions = [vector]` | ✅ 완료 | `extensions = []`로 변경 |
| 3 | `splitIntoChunks` | ✅ 완료 | grep 결과 없음 |
| 4 | `generateEmbeddings` | ✅ 완료 | grep 결과 없음 |
| 5 | `getEmbeddingModel` | ✅ 완료 | grep 결과 없음 |
| 6 | `generateQueryEmbedding` | ✅ 완료 | grep 결과 없음 |
| 7 | `searchSimilarChunks` | ✅ 완료 | grep 결과 없음 |
| 8 | 업로드 시 청크/임베딩 로직 | ✅ 완료 | `service.ts`에서 제거 확인 |
| 9 | `UploadResult`의 `chunkCount`, `embeddingSkipped` | ✅ 완료 | `UploadResult`에 id, title, type, fileSize만 존재 |
| 10 | `_count: { select: { chunks: true } }` | ✅ 완료 | grep 결과 없음 |
| 11 | 청크 수 표시 UI | ✅ 완료 | "청크" 문자열 grep 결과 없음 |
| 12 | `BuildContextOptions`에서 제거된 필드 | ✅ 완료 | `types/ai.ts`에 `selectedDocumentIds`, `includeCareerNotes`만 존재 |
| 13 | `buildContext`의 RAG 로직 | ✅ 완료 | 요약 기반으로 완전 재작성 |
| 14 | `includeInsights` 호출 | ✅ 완료 | grep 결과 없음 |
| 15 | `lib/ai/embedding.ts` 파일 | ✅ 완료 | 파일 삭제됨 |
| 16 | `tests/lib/ai/embedding.test.ts` 파일 | ✅ 완료 | 파일 삭제됨 |

### 4. buildContext 리팩토링 (스펙 3절)

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 1 | 파라미터: `selectedDocumentIds` + `includeCareerNotes`만 | ✅ 완료 | `types/ai.ts` 확인 |
| 2 | 선택 문서의 요약 + ID 표시 | ✅ 완료 | `[문서: title (ID: id)]` 형식 |
| 3 | summary null인 문서에 fallback 메시지 | ✅ 완료 | "요약 없음 -- readDocument 도구로 전문을 확인하세요" |
| 4 | 커리어노트: 전체 확정 노트의 요약 포함 | ✅ 완료 | `status: "CONFIRMED"` 조건으로 조회 |
| 5 | summary null인 커리어노트에 fallback 메시지 | ✅ 완료 | "요약 없음 -- readCareerNote 도구로 전문을 확인하세요" |
| 6 | 10개 제한 제거 | ✅ 완료 | 제한 없음 확인 |

### 5. Tool Use 도입 (스펙 2절)

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 1 | `readDocument` 도구 구현 | ✅ 완료 | `lib/ai/tools/read-document.ts` |
| 2 | `readDocument` — 소유권 + 선택 문서 범위 확인 | ✅ 완료 | `allowedDocumentIds.includes()` + `userId` 조건 |
| 3 | `readCareerNote` 도구 구현 | ✅ 완료 | `lib/ai/tools/read-career-note.ts` |
| 4 | `readCareerNote` — 소유권 + CONFIRMED 상태 확인 | ✅ 완료 | `userId` + `status: "CONFIRMED"` 조건 |
| 5 | `readCareerNote` — content + metadata 반환 | ✅ 완료 | title, content, metadata 조회 후 포맷팅 반환 |
| 6 | `saveCareerNote` 도구 구현 | ✅ 완료 | `lib/ai/tools/save-career-note.ts` |
| 7 | `saveCareerNote` — 생성 흐름 (status: CONFIRMED, summary 포함) | ✅ 완료 | L56-64 |
| 8 | `saveCareerNote` — 갱신 흐름 (title, content, summary, metadata 업데이트) | ✅ 완료 | L36-52 |
| 9 | `saveCareerNote` — CareerNoteSource 연결 | ✅ 완료 | 생성/갱신 모두 트랜잭션으로 처리 |
| 10 | `saveCareerNote` — 입력 스키마 (careerNoteId?, title, content, summary, metadata?) | ✅ 완료 | Zod 스키마 확인 |
| 11 | stepCount 동적 계산: `문서 수 + 커리어노트 수 + 2`, 상한선 15 | ✅ 완료 | `lib/ai/tools/index.ts` L13 |
| 12 | `stopWhen: stepCountIs(N)` 사용 | ✅ 완료 | 양쪽 라우트 모두 적용 |

### 6. 채팅 라우트 통합 (스펙 2절)

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 1 | 자소서: tools에 readDocument, readCareerNote, saveCareerNote 포함 | ✅ 완료 | `cover-letter/route.ts` L123-127 |
| 2 | 자소서: includeCareerNotes: true | ✅ 완료 | L98 |
| 3 | 면접: tools에 readDocument만 포함 | ✅ 완료 | `interview/route.ts` L129-131 |
| 4 | 면접: 커리어노트 미포함 | ✅ 완료 | `includeCareerNotes` 미전달 |
| 5 | 면접: DB에서 InterviewDocument 조회 → allowedDocIds | ✅ 완료 | L85-89 |
| 6 | 자소서 시스템 프롬프트에 도구 사용 안내 | ✅ 완료 | `lib/ai/prompts/cover-letter.ts` L21-22 |
| 7 | 면접 시스템 프롬프트에 도구 사용 안내 | ✅ 완료 | `lib/ai/prompts/interview.ts` L20 |

### 7. UI 변경 (스펙 클라이언트 영향)

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 1 | 문서 목록에서 청크 수 표시 제거 | ✅ 완료 | `document-card.tsx`에 "요약 완료"/"요약 없음" 표시 |
| 2 | 문서 상세에서 청크 수 제거, 요약 표시 | ✅ 완료 | `SummarySection` 컴포넌트로 구현 |
| 3 | 문서 선택 UI에서 summary null → "요약 없음" 표시 | ✅ 완료 | `cover-letter-form.tsx`, `interview-form.tsx` 모두 적용 |
| 4 | 도구 실행 중 로딩 표시 UI | ✅ 완료 | `components/chat/chat-message.tsx` — TOOL_LOADING_LABELS 사전 + isActiveToolPart 판별 |

### 8. 커리어노트 요약 (스펙 1절, 2절)

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 1 | 기존 커리어노트 수정 API에서 content 변경 시 summary 재생성 | ✅ 완료 | `lib/career-notes/service.ts` — updateCareerNote에 summary 재생성 로직 |
| 2 | 토큰 사용량 추적은 AI SDK onFinish에서 자동 합산 | ✅ 완료 | 양쪽 라우트의 onFinish에서 usage 기록 |

### 9. 테스트

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 1 | readDocument 도구 테스트 | ✅ 완료 | `tests/lib/ai/tools/read-document.test.ts` |
| 2 | readCareerNote 도구 테스트 | ✅ 완료 | `tests/lib/ai/tools/read-career-note.test.ts` |
| 3 | saveCareerNote 도구 테스트 | ✅ 완료 | `tests/lib/ai/tools/save-career-note.test.ts` |
| 4 | 문서 요약 생성 테스트 | ✅ 완료 | `tests/lib/documents/summary.test.ts` |

## 주요 발견사항

### 이슈

1. **마이그레이션에 EMBEDDING 레코드 삭제 누락** (중요도: 중)
   - 스펙: "EMBEDDING은 기존 사용량 기록 삭제 후 enum에서 제거"
   - 실제: migration SQL에 `DELETE FROM token_usage_logs WHERE feature = 'EMBEDDING'` 구문 없음
   - 영향: 프로덕션 DB에 EMBEDDING 레코드가 존재하면 `ALTER TYPE` 실행 시 마이그레이션이 실패함
   - 위치: `prisma/migrations/20260323020331_chat_context_optimization/migration.sql`

### 긍정적 사항

- 모든 제거 대상이 깔끔하게 제거됨 (grep 검증 완료)
- Tool Use 패턴이 스펙과 정확히 일치
- 자소서/면접 라우트의 도구 분리 (자소서: 3개 도구, 면접: readDocument만)가 스펙 준수
- buildContext가 요약 기반으로 단순화되어 토큰 절감 목적 달성
- 테스트가 스펙에서 요구하는 시나리오를 커버

## 권장 조치사항

1. **[필수] 마이그레이션 SQL에 EMBEDDING 레코드 삭제 추가**
   - `prisma/migrations/20260323020331_chat_context_optimization/migration.sql`의 `-- AlterEnum` 블록 앞에 다음 추가:
   ```sql
   -- EMBEDDING 사용량 기록 삭제 (enum 값 제거 전 필수)
   DELETE FROM "token_usage_logs" WHERE "feature" = 'EMBEDDING';
   ```
   - 또는 프로덕션 DB에 EMBEDDING 레코드가 없음이 확실하다면 스펙 일탈 기록으로 대체 가능
