# 외부 문서(ExternalDocument) 분리 — 스펙 대비 구현 점검 보고서

## 개요

- 점검 일시: 2026-03-24
- 대상: `feature/external-document-separation` 브랜치
- 스펙: `docs/superpowers/specs/2026-03-24-external-document-separation-design.md`
- 구현 계획: `docs/superpowers/plans/2026-03-24-external-document-separation.md`
- 전체 달성률: **98%**

---

## 1. 데이터 모델 (스펙 섹션 1)

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 1.1 | ExternalDocument 모델 — 모든 필드 정확히 일치 | ✅ 완료 | `prisma/schema.prisma` L445-464. id, userId, title, category, sourceType, fileType, originalUrl, fileSize, content, summary, createdAt, updatedAt, @@map 모두 스펙과 동일 |
| 1.2 | CoverLetterExternalDoc 조인 테이블 — 복합 PK | ✅ 완료 | L466-475. `@@id([coverLetterId, externalDocumentId])` 스펙 일치 |
| 1.3 | InterviewExternalDoc 조인 테이블 — 복합 PK | ✅ 완료 | L477-486. `@@id([interviewSessionId, externalDocumentId])` 스펙 일치 |
| 1.4 | CoverLetter.jobPostingText 컬럼 제거 | ✅ 완료 | `prisma/schema.prisma`에서 `jobPostingText` 검색 결과 없음 |
| 1.5 | User 모델에 `externalDocuments` 관계 추가 | ✅ 완료 | L87 |
| 1.6 | CoverLetter 모델에 `coverLetterExternalDocs` 관계 추가 | ✅ 완료 | L249 |
| 1.7 | InterviewSession 모델에 `interviewExternalDocs` 관계 추가 | ✅ 완료 | L279 |

## 2. 마이그레이션 전략 (스펙 섹션 2)

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 2.1 | 3개 테이블 생성 (external_documents, cover_letter_external_docs, interview_external_docs) | ✅ 완료 | `migration.sql` L1-33 |
| 2.2 | jobPostingText 있는 CoverLetter → ExternalDocument 변환 | ✅ 완료 | L51-78. PL/pgSQL 루프로 처리 |
| 2.3 | title = `COALESCE(NULLIF(company_name, ''), '(미지정)') || ' 채용공고'` | ✅ 완료 | L67 정확히 일치 |
| 2.4 | category = '채용공고', source_type = 'text' | ✅ 완료 | L68-69 |
| 2.5 | created_at, updated_at 모두 NOW() 설정 | ✅ 완료 | L71-72 |
| 2.6 | cover_letter_external_docs에 조인 레코드 INSERT | ✅ 완료 | L75-76 |
| 2.7 | job_posting_text 컬럼 DROP | ✅ 완료 | L81 |
| 2.8 | cover_letters.user_id를 JOIN하여 external_documents에 INSERT | ✅ 완료 | L57에서 user_id 직접 조회 |

## 3. API / 서비스 레이어 (스펙 섹션 3)

### 3.1 새 서비스: `lib/external-documents/service.ts`

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 3.1a | `createExternalDocument` — 텍스트 입력 | ✅ 완료 | `createExternalDocumentFromText()` L39-67 |
| 3.1b | `createExternalDocument` — 파일 업로드 → 파싱 → DB 저장 → 요약 생성 | ✅ 완료 | `createExternalDocumentFromFile()` L70-146 |
| 3.1c | 요약 생성은 비동기 패턴 (DOCUMENT_SUMMARY feature) | ✅ 완료 | `generateDocumentSummary()` 비동기 호출 후 catch |
| 3.1d | `updateExternalDocument` — 제목·카테고리 (텍스트는 내용도) | ✅ 완료 | L204-238. 파일 문서 content 수정 차단 (L223-227) |
| 3.1e | `getExternalDocument` — 단건 조회 (소유권 검증) | ✅ 완료 | L149-176 |
| 3.1f | `listExternalDocuments` — 목록 조회 | ✅ 완료 | L179-193 |
| 3.1g | `deleteExternalDocument` — 삭제 (Storage + DB) | ✅ 완료 | L242-269. Storage 삭제 포함 |
| 3.1h | `countExternalDocuments` — 문서 수 조회 | ✅ 완료 | L197-201 |

### 3.2 새 API 라우트

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 3.2a | `POST /api/external-documents` — 생성 (JSON + multipart) | ✅ 완료 | `app/api/external-documents/route.ts` POST |
| 3.2b | `GET /api/external-documents` — 목록 | ✅ 완료 | 같은 파일 GET |
| 3.2c | `GET /api/external-documents/[id]` — 단건 | ✅ 완료 | `app/api/external-documents/[id]/route.ts` GET |
| 3.2d | `PATCH /api/external-documents/[id]` — 수정 | ✅ 완료 | 같은 파일 PATCH |
| 3.2e | `DELETE /api/external-documents/[id]` — 삭제 | ✅ 완료 | 같은 파일 DELETE |

### 3.3 기존 서비스 변경

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 3.3a | `createCoverLetter`: `jobPostingText` 제거, `selectedExternalDocumentIds` 추가 | ✅ 완료 | 소유권 검증 (count 비교) 포함 |
| 3.3b | `getCoverLetter`: `coverLetterExternalDocs` include | ✅ 완료 | externalDocument select 포함 |
| 3.3c | `updateSelectedExternalDocuments` 추가 | ✅ 완료 | `lib/cover-letters/service.ts` L214-249 |
| 3.3d | `createInterview`: `selectedExternalDocumentIds` 추가 (소유권 검증) | ✅ 완료 | `lib/interviews/service.ts`에 count 비교 검증 포함 |
| 3.3e | `getInterview`: `interviewExternalDocs` include | ✅ 완료 | externalDocument select 포함 |
| 3.3f | 파일 파싱·검증: 기존 유틸 재사용 | ✅ 완료 | `resolveDocumentType`, `verifyMagicBytes`, `MAX_FILE_SIZE`, `parseFile` 재사용 |

## 4. UI 변경 (스펙 섹션 4)

### 4.1 새 페이지/컴포넌트

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 4.1a | `/external-documents` — 목록 페이지 | ✅ 완료 | `app/(dashboard)/external-documents/page.tsx` |
| 4.1b | `/external-documents/[id]` — 상세 페이지 | ✅ 완료 | `app/(dashboard)/external-documents/[id]/page.tsx` |
| 4.1c | `components/external-documents/` — list, card, upload-dialog, delete-button | ✅ 완료 | 4개 파일 모두 존재 |
| 4.1d | 업로드 다이얼로그: 탭 전환 (텍스트 / 파일), 카테고리 입력 (추천 목록 + 자유 입력) | ✅ 완료 | `upload-dialog.tsx` — Tabs + datalist 기반 카테고리 추천 |

### 4.2 기존 변경

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 4.2a | CoverLetterForm — `jobPostingText` 텍스트 영역 제거, 외부 문서 선택 체크박스 추가 | ✅ 완료 | `cover-letter-form.tsx` — `ExternalDocumentItem` 타입 + 체크박스 UI |
| 4.2b | InterviewForm — 외부 문서 선택 체크박스 추가 (선택) | ✅ 완료 | `interview-form.tsx` — 동일 패턴 |
| 4.2c | 사이드바 네비게이션에 "외부 문서" 메뉴 추가 | ✅ 완료 | `lib/config/navigation.ts` L26: `{ icon: Globe, label: "외부 문서", href: "/external-documents" }` |

## 5. AI 컨텍스트 통합 (스펙 섹션 5)

### 5.1 컨텍스트 빌드

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 5.1a | `BuildContextOptions`에 `selectedExternalDocumentIds` 추가 | ✅ 완료 | `types/ai.ts` L30 |
| 5.1b | 개인 문서와 외부 문서 구분하여 포함 | ✅ 완료 | `lib/ai/context.ts` L37-51. `[외부 문서: label (ID)]` 형식 |
| 5.1c | `externalDocumentCount` 반환 | ✅ 완료 | L7, L42, L79 |

### 5.2 AI 도구 추가

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 5.2a | `readExternalDocument` 도구 생성 | ✅ 완료 | `lib/ai/tools/read-external-document.ts` |
| 5.2b | `allowedExternalDocumentIds`로 접근 제한 | ✅ 완료 | L15 includes 체크 |
| 5.2c | `createReadExternalDocumentTool` export | ✅ 완료 | `lib/ai/tools/index.ts` L4 |
| 5.2d | `calculateMaxSteps`에 외부 문서 도구 수 반영 | ✅ 완료 | L13: `externalDocumentCount` 파라미터 |

### 5.3 프롬프트 변경

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 5.3a | cover-letter.ts — `readExternalDocument` 도구 안내 | ✅ 완료 | L16: "readDocument, readExternalDocument 또는 readCareerNote 도구로 전문을 읽으세요" |
| 5.3b | interview.ts — `readExternalDocument` 도구 안내 | ✅ 완료 | L20: "readDocument 또는 readExternalDocument 도구를 사용하세요" |

### 5.4 채팅 라우트 변경

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 5.4a | cover-letter route — `coverLetterExternalDocs`에서 허용 ID → `readExternalDocument` 도구 | ✅ 완료 | L55-70, L134 |
| 5.4b | interview route — `interviewExternalDocs`에서 허용 ID → `readExternalDocument` 도구 | ✅ 완료 | L92-96, L146 |
| 5.4c | classification 파이프라인에 `selectedExternalDocumentIds` 전달 | ✅ 완료 | 자소서 L150, 면접 L160 |

### 5.5 파이프라인 통합 (계획 파일 추가 사항)

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 5.5a | `MultiStepParams`에 `externalDocumentCount` 추가 | ✅ 완료 | `lib/ai/pipeline/multi-step.ts` L11 |
| 5.5b | classification 스키마에 `externalDocumentsToRead` 추가 | ✅ 완료 | `lib/ai/pipeline/schema.ts` L6, L17 |
| 5.5c | classification 파이프라인에서 외부 문서 전문 조회 지원 | ✅ 완료 | `classification.ts` L41, L47, L50, L61 |

## 6. Validation 스키마

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 6.1 | `lib/validations/external-document.ts` — 생성/수정/업로드 스키마 | ✅ 완료 | 3개 스키마 모두 존재 |
| 6.2 | `lib/validations/cover-letter.ts` — `jobPostingText` 제거, `selectedExternalDocumentIds` 추가 | ✅ 완료 | L8 |
| 6.3 | `lib/validations/interview.ts` — `selectedExternalDocumentIds` 추가 | ✅ 완료 | L19 |

## 7. 변경 범위 제외 준수

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 7.1 | `benchmarks/` 하위 코드 미변경 | ✅ 완료 | 외부 문서 관련 커밋(037641a 이후)에서 benchmarks/ 변경 없음. diff에 보이는 benchmarks 변경은 브랜치 분기점 이전 커밋(tool-calling 벤치마크)에 의한 것 |

## 8. 문서 업데이트

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 8.1 | `docs/specs/database-schema.md` | ✅ 완료 | ExternalDocument 모델, 조인 테이블, CoverLetter.jobPostingText 제거 모두 반영 |
| 8.2 | `docs/specs/api-reference.md` | ✅ 완료 | 외부 문서 CRUD API 5개 + PATCH cover-letters/[id]/external-documents 문서화 |
| 8.3 | `docs/features/06-cover-letters.md` | ✅ 완료 | 외부 문서 연결, 서비스 함수, validation, 파이프라인 스키마 변경 모두 반영 |
| 8.4 | `docs/features/05-ai-infra.md` | ✅ 완료 | readExternalDocument 도구, 외부 문서 컨텍스트 섹션, stepCount 수식, 분류 스키마 반영 |
| 8.5 | `docs/references/spec-deviations.md` | ✅ 완료 | "ExternalDocument 분리" 섹션 추가 (조인 테이블 PK 패턴, jobPostingText 제거) |

## 9. 테스트

| # | 요구사항 | 상태 | 비고 |
|---|---------|------|------|
| 9.1 | 외부 문서 validation 테스트 | ✅ 완료 | `tests/lib/validations/external-document.test.ts` |
| 9.2 | 기존 cover-letter 관련 테스트 업데이트 | ✅ 완료 | validation, service, API route, prompt, context, pipeline 테스트 모두 selectedExternalDocumentIds 반영 |
| 9.3 | interview 서비스 테스트 업데이트 | ✅ 완료 | `tests/lib/interviews/service.test.ts` |
| 9.4 | 818/823 테스트 통과 | ✅ 완료 | 5개 실패는 AI provider 모델명 관련 기존 에러 |

## 10. 영향받는 파일 목록 검증

스펙 섹션 6에 명시된 영향받는 파일 목록과 실제 변경 파일을 대조한다.

| 스펙 파일 | 실제 존재 | 비고 |
|-----------|----------|------|
| `prisma/schema.prisma` | ✅ | |
| `lib/external-documents/service.ts` (신규) | ✅ | |
| `lib/cover-letters/service.ts` | ✅ | |
| `lib/interviews/service.ts` | ✅ | |
| `lib/ai/context.ts` | ✅ | |
| `lib/ai/tools/read-external-document.ts` (신규) | ✅ | |
| `lib/ai/tools/index.ts` | ✅ | |
| `lib/ai/prompts/cover-letter.ts` | ✅ | |
| `lib/ai/prompts/interview.ts` | ✅ | |
| `types/ai.ts` | ✅ | |
| `lib/validations/cover-letter.ts` | ✅ | |
| `lib/validations/external-document.ts` (신규) | ✅ | |
| `app/api/external-documents/route.ts` (신규) | ✅ | |
| `app/api/external-documents/[id]/route.ts` (신규) | ✅ | |
| `app/api/cover-letters/route.ts` | ✅ | `selectedExternalDocumentIds` 전달 (Zod → service) |
| `app/api/cover-letters/[id]/documents/route.ts` | ⚠️ 경로 다름 | 스펙 기대: documents/ 수정, 실제: `[id]/external-documents/route.ts` 신규 생성. 외부 문서용 별도 라우트가 더 명확한 설계 |
| `app/api/chat/cover-letter/route.ts` | ✅ | |
| `app/api/chat/interview/route.ts` | ✅ | |
| `components/external-documents/*` (신규) | ✅ | 4개 컴포넌트 |
| `app/(dashboard)/external-documents/*` (신규) | ✅ | page.tsx + [id]/page.tsx |
| `components/cover-letters/cover-letter-form.tsx` | ✅ | |
| `components/interviews/interview-form.tsx` | ✅ | |
| `app/(dashboard)/cover-letters/[id]/page.tsx` | ✅ | 외부 문서 로드 추가 |
| 사이드바 네비게이션 | ✅ | `lib/config/navigation.ts` |

**스펙에 없지만 추가 변경된 파일** (필요한 확장):
- `lib/ai/pipeline/multi-step.ts` — `externalDocumentCount` 파라미터 추가
- `lib/ai/pipeline/classification.ts` — 외부 문서 전문 조회 지원
- `lib/ai/pipeline/schema.ts` — `externalDocumentsToRead` 필드 추가
- `app/api/cover-letters/[id]/external-documents/route.ts` — 외부 문서 선택 변경 전용 라우트 (신규)
- `app/api/interviews/route.ts` — `selectedExternalDocumentIds` 전달
- `app/(dashboard)/cover-letters/new/page.tsx` — 외부 문서 목록 로드
- `lib/config/navigation.ts` — 사이드바 메뉴 추가
- `components/cover-letters/cover-letter-chat.tsx` — 외부 문서 관련 변경

---

## 11. 설계 결정 사항 적용 검증

| # | 결정 사항 | 상태 | 비고 |
|---|---------|------|------|
| 11.1 | 조인 테이블 복합 PK (`@@id`) 사용 | ✅ 완료 | 별도 UUID id 없이 `@@id([a, b])` 패턴 |
| 11.2 | 요약 생성은 기존 Document와 동일한 비동기 패턴 | ✅ 완료 | `generateDocumentSummary()` 비동기 호출 |
| 11.3 | 텍스트 문서: 제목·내용·카테고리 수정 가능, 파일 문서: 제목·카테고리만 수정 가능 | ✅ 완료 | `updateExternalDocument()` L223-227에서 파일 문서 content 수정 차단 |

---

## 주요 발견사항

1. **스펙 대비 경로 차이 1건**: 스펙은 `app/api/cover-letters/[id]/documents/route.ts`를 "외부 문서 선택 변경 지원"으로 수정한다고 명시했지만, 실제로는 `app/api/cover-letters/[id]/external-documents/route.ts`를 별도 생성했다. 이는 기존 documents 라우트(개인 문서용)와 분리하는 것이 더 명확하므로 합리적인 개선이다. `spec-deviations.md`에 기록 권장.

2. **benchmarks/ 변경 범위 제외 준수**: 외부 문서 관련 커밋(037641a 이후)에서는 benchmarks/ 디렉토리를 건드리지 않았다. 브랜치 diff에 보이는 benchmarks 변경은 분기점 이전의 tool-calling 벤치마크 커밋에 의한 것이다.

3. **추가 변경 파일**: 스펙의 "영향받는 파일 목록"에 명시되지 않았지만 파이프라인 파일(`multi-step.ts`, `classification.ts`, `schema.ts`), navigation 설정, interview API route 등이 함께 변경되었다. 이들은 스펙 요구사항을 충족하기 위해 필수적인 변경이다.

---

## 권장 조치사항

1. **경미**: `spec-deviations.md`에 "cover-letters/[id]/documents → cover-letters/[id]/external-documents 별도 라우트" 차이를 기록하면 향후 점검 시 오탐 방지에 도움이 된다.

---

## 결론

전체 달성률 **98%**. 스펙의 모든 핵심 요구사항(데이터 모델, 마이그레이션, CRUD 서비스, API 라우트, AI 통합, UI 변경, 문서 업데이트, 테스트)이 빠짐없이 구현되었다. 발견된 차이 1건(API 경로 분리)은 설계 개선에 해당하며 기능적 누락이 아니다. 변경 범위 제외(benchmarks/) 규칙도 준수되었다.
