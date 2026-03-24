# 외부 문서(ExternalDocument) 분리 설계

## 배경

현재 모든 참고자료가 `Document` 테이블 하나에 저장되며, 채용공고는 `CoverLetter.jobPostingText`에 텍스트로 직접 입력하는 구조다. 사용자 개인 자료(이력서, 경력기술서)와 외부 문서(채용공고, 헤드헌터JD, 회사기술블로그, 직무기술서 등)의 용도·생명주기·기능이 다르므로 별도 모델로 분리한다.

## 요구사항

- 외부 문서를 독립 관리 (CRUD — 수정 포함)
- 입력 방식: 텍스트 붙여넣기 + 파일 업로드
- `category` 필드로 용도 구분 (자유 입력 String)
- 자소서·면접과 N:N 관계
- AI 요약 생성 지원 + readExternalDocument 도구
- 기존 `CoverLetter.jobPostingText` 데이터를 자동 마이그레이션 후 컬럼 제거

## 변경 범위 제외

- `benchmarks/` 하위 코드 — 별도 리팩토링 예정

## 설계 결정 사항

- 조인 테이블은 복합 PK(`@@id`) 사용 — 기존 `CoverLetterDocument`/`InterviewDocument`는 별도 UUID id + unique constraint 패턴이지만, 새 테이블은 복합 PK가 더 적합하므로 의도적으로 다른 패턴 채택
- 요약 생성은 기존 Document와 동일한 비동기 패턴 (생성 직후 호출, `DOCUMENT_SUMMARY` feature로 토큰 기록)
- 텍스트 입력 문서도 제목·내용·카테고리 수정 가능 (파일 문서는 제목·카테고리만 수정 가능)

---

## 1. 데이터 모델

### 1.1 새 모델

```prisma
model ExternalDocument {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @map("user_id") @db.Uuid
  title         String
  category      String   @default("")             // 자유 입력: "채용공고", "헤드헌터JD", "회사기술블로그" 등
  sourceType    String   @map("source_type")      // "file" | "text"
  fileType      String?  @map("file_type")        // "pdf" | "docx" | "txt" (파일일 때만)
  originalUrl   String?  @map("original_url")     // Storage 경로 (파일일 때만)
  fileSize      Int?     @map("file_size")        // 파일일 때만
  content       String   @db.Text                 // 텍스트 입력 or 파일 추출 텍스트
  summary       String?
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  user                      User                       @relation(fields: [userId], references: [id], onDelete: Cascade)
  coverLetterExternalDocs   CoverLetterExternalDoc[]
  interviewExternalDocs     InterviewExternalDoc[]

  @@map("external_documents")
}

model CoverLetterExternalDoc {
  coverLetterId      String @map("cover_letter_id") @db.Uuid
  externalDocumentId String @map("external_document_id") @db.Uuid

  coverLetter      CoverLetter      @relation(fields: [coverLetterId], references: [id], onDelete: Cascade)
  externalDocument ExternalDocument  @relation(fields: [externalDocumentId], references: [id], onDelete: Cascade)

  @@id([coverLetterId, externalDocumentId])
  @@map("cover_letter_external_docs")
}

model InterviewExternalDoc {
  interviewSessionId String @map("interview_session_id") @db.Uuid
  externalDocumentId String @map("external_document_id") @db.Uuid

  interviewSession InterviewSession @relation(fields: [interviewSessionId], references: [id], onDelete: Cascade)
  externalDocument ExternalDocument  @relation(fields: [externalDocumentId], references: [id], onDelete: Cascade)

  @@id([interviewSessionId, externalDocumentId])
  @@map("interview_external_docs")
}
```

### 1.2 기존 모델 변경

- `CoverLetter`: `jobPostingText` 컬럼 제거
- `User`: `externalDocuments ExternalDocument[]` 관계 추가
- `CoverLetter`: `coverLetterExternalDocs CoverLetterExternalDoc[]` 관계 추가
- `InterviewSession`: `interviewExternalDocs InterviewExternalDoc[]` 관계 추가

---

## 2. 마이그레이션 전략

Prisma migration SQL 내에서 데이터 이전 처리:

1. `external_documents`, `cover_letter_external_docs`, `interview_external_docs` 테이블 생성
2. `jobPostingText`가 있는 CoverLetter마다:
   - `cover_letters.user_id`를 JOIN하여 `external_documents`에 INSERT
   - `source_type: 'text'`, `content: job_posting_text`
   - `title: COALESCE(NULLIF(company_name, ''), '(미지정)') || ' 채용공고'`
   - `category: '채용공고'`
   - `created_at`, `updated_at` 모두 `NOW()` 설정 (Prisma `@updatedAt`은 SQL INSERT에서 미작동)
   - `cover_letter_external_docs`에 조인 레코드 INSERT
3. `cover_letters` 테이블에서 `job_posting_text` 컬럼 DROP

---

## 3. API / 서비스 레이어

### 3.1 새 서비스: `lib/external-documents/service.ts`

| 함수 | 역할 |
|------|------|
| `createExternalDocument(userId, data)` | 텍스트 입력 or 파일 업로드 → 파싱 → DB 저장 → 요약 생성 (비동기) |
| `updateExternalDocument(id, userId, data)` | 제목·카테고리 수정 (텍스트 문서는 내용도 수정 가능) |
| `getExternalDocument(id, userId)` | 단건 조회 (소유권 검증) |
| `listExternalDocuments(userId)` | 목록 조회 |
| `deleteExternalDocument(id, userId)` | 삭제 (Storage + DB) |
| `countExternalDocuments(userId)` | 문서 수 조회 |

### 3.2 새 API 라우트

- `POST /api/external-documents` — 생성
- `GET /api/external-documents` — 목록
- `GET /api/external-documents/[id]` — 단건
- `PATCH /api/external-documents/[id]` — 수정
- `DELETE /api/external-documents/[id]` — 삭제

### 3.3 기존 서비스 변경

- `lib/cover-letters/service.ts`:
  - `createCoverLetter`: `jobPostingText` 파라미터 제거, `selectedExternalDocumentIds` 추가 (소유권 검증: count 비교)
  - `getCoverLetter`: `coverLetterExternalDocs` include 추가
  - `updateSelectedDocuments` 또는 별도 `updateSelectedExternalDocuments` 추가
- `lib/interviews/service.ts`:
  - `createInterview`: `selectedExternalDocumentIds` 추가 (소유권 검증: count 비교)
  - `getInterview`: `interviewExternalDocs` include 추가
- 파일 파싱·검증: 기존 `lib/files/parser.ts`와 `lib/validations/document.ts`의 유틸(`resolveDocumentType`, `verifyMagicBytes`, `MAX_FILE_SIZE`)을 그대로 재사용. `uploadDocument`의 검증-파싱-업로드 흐름은 각 서비스에서 개별 구현 (공통 추출은 과도)

---

## 4. UI 변경

### 4.1 새 페이지/컴포넌트

- `/external-documents` — 외부 문서 목록 페이지
- `/external-documents/[id]` — 상세 페이지
- `components/external-documents/` — list, card, upload-dialog, delete-button
- 업로드 다이얼로그: 탭 전환 ("텍스트 입력" / "파일 업로드"), 카테고리 입력 (추천 목록 + 자유 입력)

### 4.2 기존 변경

- `CoverLetterForm` — `jobPostingText` 텍스트 영역 제거 → 외부 문서 선택 체크박스 추가
- `InterviewForm` — 외부 문서 선택 체크박스 추가 (선택 사항)
- 사이드바 네비게이션에 "외부 문서" 메뉴 추가

---

## 5. AI 컨텍스트 통합

### 5.1 컨텍스트 빌드 (`lib/ai/context.ts`)

`BuildContextOptions`에 `selectedExternalDocumentIds` 추가. 개인 문서와 외부 문서를 구분하여 포함:

```
## 참고자료 (개인 문서)
[문서: 이력서.pdf] 요약 내용...

## 참고자료 (외부 문서)
[외부: 네이버 채용공고] 요약 내용...
```

### 5.2 AI 도구 추가

`lib/ai/tools/read-external-document.ts`:
- `readExternalDocument(externalDocumentId)` — 외부 문서 전문 텍스트 반환
- `allowedExternalDocumentIds`로 접근 제한

`lib/ai/tools/index.ts`:
- `createReadExternalDocumentTool` export 추가
- `calculateMaxSteps`에 외부 문서 도구 수 반영

### 5.3 프롬프트 변경

- `cover-letter.ts` — `jobPostingText` 직접 삽입 → 외부 문서 요약 섹션으로 대체, `readExternalDocument` 도구 안내
- `interview.ts` — 외부 문서 요약 섹션 추가, `readExternalDocument` 도구 안내

### 5.4 채팅 라우트 변경

- `app/api/chat/cover-letter/route.ts` — `jobPostingText` 조회/전달 제거, `coverLetterExternalDocs`에서 허용 ID 조회 → `readExternalDocument` 도구 생성
- `app/api/chat/interview/route.ts` — `interviewExternalDocs`에서 허용 ID 조회 → `readExternalDocument` 도구 생성

---

## 6. 영향받는 파일 목록

### 스키마/마이그레이션
- `prisma/schema.prisma`

### 서비스/비즈니스 로직
- `lib/external-documents/service.ts` (신규)
- `lib/cover-letters/service.ts`
- `lib/interviews/service.ts`
- `lib/ai/context.ts`
- `lib/ai/tools/read-external-document.ts` (신규)
- `lib/ai/tools/index.ts`
- `lib/ai/prompts/cover-letter.ts`
- `lib/ai/prompts/interview.ts`
- `types/ai.ts` (`BuildContextOptions`)

### Validation
- `lib/validations/cover-letter.ts` — `jobPostingText` 제거, `selectedExternalDocumentIds` 추가
- `lib/validations/external-document.ts` (신규)

### API 라우트
- `app/api/external-documents/route.ts` (신규)
- `app/api/external-documents/[id]/route.ts` (신규)
- `app/api/cover-letters/route.ts`
- `app/api/cover-letters/[id]/documents/route.ts` — 외부 문서 선택 변경 지원
- `app/api/chat/cover-letter/route.ts`
- `app/api/chat/interview/route.ts`

### UI 컴포넌트/페이지
- `components/external-documents/*` (신규)
- `app/(dashboard)/external-documents/*` (신규)
- `components/cover-letters/cover-letter-form.tsx`
- `components/interviews/interview-form.tsx`
- `app/(dashboard)/cover-letters/[id]/page.tsx` — 외부 문서 목록도 로드
- 사이드바 네비게이션 컴포넌트

### 테스트
- `tests/lib/validations/cover-letter.test.ts`
- `tests/lib/ai/prompts/cover-letter.test.ts`
- `tests/app/api/cover-letters/route.test.ts`
- `tests/app/api/chat/cover-letter/route.test.ts`
- 외부 문서 관련 신규 테스트

### 문서
- `docs/specs/database-schema.md`
- `docs/specs/api-reference.md`
- `docs/features/06-cover-letters.md`
- `docs/features/05-ai-infra.md`
