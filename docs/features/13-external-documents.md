# 외부 문서 (External Documents)

> 채용공고, JD 등 외부 텍스트/파일을 독립 관리하고 자소서·면접에 연결

## 개요

기존 `CoverLetter.jobPostingText` 컬럼에 인라인 저장하던 채용공고 텍스트를 독립 엔티티(`ExternalDocument`)로 분리한다. 텍스트 직접 입력 또는 파일 업로드(PDF, DOCX, TXT)로 생성하며, 자기소개서·면접 세션에 다대다로 연결하여 AI 컨텍스트에 활용한다.

## 핵심 흐름

1. **생성** — 외부 문서 페이지에서 텍스트 입력 또는 파일 업로드
2. **자동 요약** — 생성 시 LLM으로 요약 비동기 생성 (실패해도 생성 성공)
3. **연결** — 자기소개서/면접 생성 시 체크박스로 외부 문서 선택
4. **AI 활용** — 채팅 시 연결된 외부 문서의 요약이 컨텍스트에 포함, 필요시 전문 읽기

## 데이터 모델

### ExternalDocument

| 필드 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| userId | UUID | 소유자 (FK → User) |
| title | String | 문서 제목 (1~200자) |
| category | String | 카테고리 (기본값 `""`, 최대 100자) |
| sourceType | String | `"text"` 또는 `"file"` |
| fileType | String? | 파일 타입 (pdf, docx, txt) — 파일 업로드 시만 |
| originalUrl | String? | Storage 경로 — 파일 업로드 시만 |
| fileSize | Int? | 파일 크기 (바이트) — 파일 업로드 시만 |
| content | Text | 본문 (텍스트 입력 또는 파일에서 추출) |
| summary | String? | LLM 자동 생성 요약 |
| createdAt | DateTime | 생성일 |
| updatedAt | DateTime | 수정일 |

### 조인 테이블

- **CoverLetterExternalDoc** — 복합 PK: (`coverLetterId`, `externalDocumentId`). 자기소개서와 다대다 연결
- **InterviewExternalDoc** — 복합 PK: (`interviewSessionId`, `externalDocumentId`). 면접 세션과 다대다 연결

## 서비스 레이어 (`lib/external-documents/service.ts`)

- `createExternalDocumentFromText()` — 텍스트 입력으로 생성, 비동기 요약 생성
- `createExternalDocumentFromFile()` — 파일 업로드로 생성 (크기·타입·매직바이트 검증 → 파싱 + Storage 업로드 병렬 → DB 저장 → 비동기 요약)
- `getExternalDocument()` — 단건 조회 (소유권 불일치 시 null 반환 — 존재 여부 비노출)
- `listExternalDocuments()` — 목록 조회 (`createdAt` 내림차순)
- `countExternalDocuments()` — 문서 수 조회
- `updateExternalDocument()` — 수정 (소유권 검증, 파일 문서의 content 수정 차단)
- `deleteExternalDocument()` — 삭제 (소유권 검증, Storage 파일 정리 + DB 삭제)

### 에러 클래스

- `ExternalDocumentNotFoundError` — 문서 없음 (소유권 불일치도 포함, 403/404 통합)
- `ExternalDocumentValidationError` — 검증 실패 (파일 크기, 타입, 매직바이트, 텍스트 추출 실패)

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/external-documents` | 생성 (텍스트 입력 또는 파일 업로드) |
| GET | `/api/external-documents/[id]` | 단건 조회 |
| PATCH | `/api/external-documents/[id]` | 수정 |
| DELETE | `/api/external-documents/[id]` | 삭제 |

자기소개서·면접의 외부 문서 선택 변경은 각 도메인의 API에서 처리:
- `PATCH /api/cover-letters/[id]/external-documents` — 외부 문서 선택 변경
- 면접은 생성 시 선택, 이후 변경 불가

## UI 페이지 / 컴포넌트

### 페이지

```
app/(dashboard)/external-documents/
  ├── page.tsx       — 목록 페이지 (RSC)
  └── [id]/page.tsx  — 상세 페이지 (RSC)
```

### 컴포넌트

| 컴포넌트 | 파일 | 설명 |
|---------|------|------|
| `ExternalDocumentList` | `components/external-documents/external-document-list.tsx` | 카드 그리드 + 빈 상태 |
| `ExternalDocumentCard` | `components/external-documents/external-document-card.tsx` | 카드 (제목, 카테고리, sourceType) |
| `UploadDialog` | `components/external-documents/upload-dialog.tsx` | 텍스트 입력 / 파일 업로드 다이얼로그 |
| `DeleteButton` | `components/external-documents/delete-button.tsx` | 삭제 확인 다이얼로그 |

### 자소서·면접 폼 통합

자기소개서·면접 생성 폼에 외부 문서 선택 체크박스 목록이 추가된다. 공통 타입은 `lib/external-documents/types.ts`의 `ExternalDocumentItem`을 사용.

## AI 통합

### 컨텍스트 빌더 (`lib/ai/context.ts`)

`buildContext()`에서 연결된 외부 문서의 요약을 시스템 프롬프트에 포함:
- 제목 + ID + 요약 (1~4줄)
- 요약 미생성 시 fallback 메시지 표시

### readExternalDocument 도구 (`lib/ai/tools/read-external-document.ts`)

multi-step 파이프라인(OpenAI)에서 LLM이 외부 문서 전문을 읽을 때 사용:
- `allowedExternalDocumentIds` 범위만 접근 허용
- 소유권(`userId`) 추가 확인

### classification 파이프라인

Anthropic/Google 등의 classification 파이프라인에서는 분류 스키마의 `externalDocumentsToRead`로 읽을 외부 문서 ID를 결정하고, `selectedExternalDocumentIds` 범위로 필터링 후 서버에서 직접 DB 조회하여 시스템 프롬프트에 주입.

## 검증 스키마 (`lib/validations/external-document.ts`)

- `createExternalDocumentSchema` — title (1~200), category (최대 100, 기본 `""`), content (1~50000)
- `externalDocumentUploadSchema` — title (1~200), category (최대 100, 기본 `""`)
- `updateExternalDocumentSchema` — title, category, content 모두 선택. 최소 1개 필드 필요

## 데이터 마이그레이션

기존 `cover_letters.job_posting_text` 데이터를 `external_documents`로 마이그레이션:
- `job_posting_text`가 있는 자기소개서마다 ExternalDocument 레코드 생성 (title: `"{회사명} 채용공고"`)
- `cover_letter_external_docs` 조인 레코드로 연결
- 마이그레이션 후 `job_posting_text` 컬럼 삭제

## 파일 구조

```
lib/external-documents/
  service.ts                           — 서비스 레이어 (CRUD)
  types.ts                             — 공통 타입 (ExternalDocumentItem)
lib/validations/external-document.ts   — Zod 검증 스키마
lib/ai/tools/read-external-document.ts — readExternalDocument 도구
app/api/external-documents/
  route.ts                             — POST (생성)
  [id]/route.ts                        — GET, PATCH, DELETE
app/(dashboard)/external-documents/
  page.tsx                             — 목록 페이지
  [id]/page.tsx                        — 상세 페이지
components/external-documents/
  external-document-list.tsx           — 카드 그리드
  external-document-card.tsx           — 카드
  upload-dialog.tsx                    — 업로드 다이얼로그
  delete-button.tsx                    — 삭제 버튼
```
