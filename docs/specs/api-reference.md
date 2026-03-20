# API 레퍼런스

## 인증

모든 `(dashboard)` 하위 라우트 및 `/api/*` 라우트는 Supabase Auth 세션이 필요하다.
`proxy.ts`에서 세션 검증 후, 미인증 시 `/login`으로 리다이렉트한다.

## 목록 조회 전략

목록 페이지(문서, 자기소개서, 면접, 이력서, 인사이트)는 **Server Component에서 직접 Prisma를 호출**하여 데이터를 조회한다.
별도 API route를 거치지 않으므로 아래 API 목록에 `GET /api/xxx` (목록) 엔드포인트는 없다.

## 에러 응답 형식

모든 API 에러 응답은 아래 형식을 따른다:

```json
{
  "error": "구체적인 에러 메시지"
}
```

주요 HTTP 상태 코드:
- `400`: 입력 검증 실패
- `401`: 인증 실패
- `403`: 권한 없음 (소유자가 아닌 경우)
- `404`: 리소스 없음
- `413`: 파일 크기 초과

---

## 문서 (Documents)

### `POST /api/documents`

파일 업로드 + 텍스트 추출 + 임베딩 생성.

- **Content-Type**: `multipart/form-data`
- **Body**: `file` (File), `title` (string, optional)
- **처리 흐름**:
  1. Supabase Storage에 파일 업로드 (`documents/{userId}/{id}.ext`)
  2. 파일 타입별 텍스트 추출 (unpdf / mammoth / 직접 읽기)
  3. 텍스트 청크 분할
  4. 각 청크에 대해 임베딩 생성
  5. `Document` + `DocumentChunk[]` DB 저장
- **Response**: `201 Created`
  ```json
  {
    "id": "uuid",
    "title": "파일명.pdf",
    "type": "pdf",
    "fileSize": 102400,
    "createdAt": "2026-03-16T00:00:00Z"
  }
  ```
- **에러**: `400` (지원하지 않는 파일 형식), `413` (파일 크기 초과 10MB)

### `GET /api/documents/[id]`

문서 상세 조회 (추출된 텍스트 포함).

- **Response**: `200 OK`
  ```json
  {
    "id": "uuid",
    "title": "파일명.pdf",
    "type": "pdf",
    "originalUrl": "documents/userId/id.pdf",
    "extractedText": "추출된 전체 텍스트...",
    "fileSize": 102400,
    "createdAt": "2026-03-16T00:00:00Z"
  }
  ```

### `DELETE /api/documents/[id]`

문서 삭제 (Storage 파일 + DB 레코드 + 청크/임베딩 모두 삭제).

- **Response**: `204 No Content`

---

## AI 채팅 (Chat)

### `POST /api/chat/cover-letter`

자기소개서 AI 채팅 (스트리밍 응답).

- **Body**:
  ```json
  {
    "conversationId": "uuid",
    "coverLetterId": "uuid",
    "messages": [
      { "role": "user", "content": "..." }
    ],
    "selectedDocumentIds": ["uuid", "uuid"]
  }
  ```
- **처리 흐름**:
  1. `coverLetterId`로 기업 정보/채용공고 로드
  2. `selectedDocumentIds` 문서 전체 텍스트 포함
  3. RAG로 관련 문서 청크 검색
  4. 사용자 인사이트 포함 (선택)
  5. 시스템 프롬프트 + 컨텍스트 조합
  6. `streamText`로 스트리밍 응답
- **Response**: `text/event-stream` (Vercel AI SDK 스트리밍 프로토콜)

### `POST /api/chat/interview`

모의면접 AI 채팅 (스트리밍 응답).

- **Body**:
  ```json
  {
    "conversationId": "uuid",
    "interviewSessionId": "uuid",
    "messages": [
      { "role": "user", "content": "..." }
    ]
  }
  ```
- **처리 흐름**:
  1. `interviewSessionId`로 연결된 문서만 조회 (`InterviewDocument` 조인)
  2. 해당 문서 범위 내에서만 RAG 검색
  3. 면접관 시스템 프롬프트 + 컨텍스트 조합
  4. `streamText`로 스트리밍 응답
- **Response**: `text/event-stream`
- **문서 격리**: `InterviewDocument`에 등록되지 않은 문서는 절대 컨텍스트에 포함하지 않음

---

## 인사이트 (Insights)

### `POST /api/insights/extract`

대화에서 인사이트를 추출한다.

- **Body**:
  ```json
  {
    "conversationId": "uuid"
  }
  ```
- **처리 흐름**:
  1. `conversationId`의 전체 메시지 로드
  2. `generateObject` + Zod 스키마로 구조화된 인사이트 추출
  3. 추출된 인사이트를 `Insight` 테이블에 저장
- **Response**: `200 OK`
  ```json
  {
    "insights": [
      {
        "id": "uuid",
        "category": "strength",
        "title": "문제 해결 능력",
        "content": "복잡한 시스템 장애 상황에서..."
      }
    ]
  }
  ```
- **Zod 스키마** (추출 형식):
  ```typescript
  z.object({
    insights: z.array(z.object({
      category: z.enum(["strength", "experience", "motivation", "skill", "other"]),
      title: z.string(),
      content: z.string(),
    }))
  })
  ```

### `PUT /api/insights/[id]`

인사이트 수정 (제목, 내용, 카테고리).

- **Body**:
  ```json
  {
    "title": "수정된 제목",
    "content": "수정된 내용",
    "category": "strength"
  }
  ```
- **Response**: `200 OK` — 수정된 인사이트

### `DELETE /api/insights/[id]`

인사이트 삭제.

- **Response**: `204 No Content`

---

## 이력서 (Resumes)

### `POST /api/resumes`

새 이력서 생성.

- **Body**:
  ```json
  {
    "title": "2026 상반기 이력서",
    "template": "classic"
  }
  ```
- **Response**: `201 Created` — `{ "id": "uuid" }`

### `GET /api/resumes/[id]`

이력서 상세 조회 (모든 하위 섹션 포함).

- **Response**: `200 OK`
  ```json
  {
    "id": "uuid",
    "title": "...",
    "template": "classic",
    "personalInfo": { ... },
    "educations": [ ... ],
    "experiences": [ ... ],
    "skills": [ ... ],
    "projects": [ ... ],
    "certifications": [ ... ]
  }
  ```

### `PUT /api/resumes/[id]`

이력서 메타 정보 수정 (제목, 템플릿).

- **Body**: `{ "title": "...", "template": "modern" }` (모두 optional)
- **Response**: `200 OK`

### `DELETE /api/resumes/[id]`

이력서 삭제 (모든 하위 섹션 Cascade).

- **Response**: `200 OK` — `{ "success": true }`

### 섹션별 API

각 섹션은 독립 API로 개별 저장한다 (자동 저장 시 변경된 섹션만 전송).

#### `PUT /api/resumes/[id]/personal-info`

개인정보 upsert.

- **Body**: `{ "name": "...", "email": "...", "phone": "...", "address": "...", "bio": "..." }`
- **Response**: `200 OK` — 갱신된 개인정보

#### `PUT /api/resumes/[id]/educations`

학력 전체 교체 (deleteMany + createMany).

- **Body**: `{ "items": [{ "school": "...", "degree": "...", ... }] }`
- **Response**: `200 OK` — 갱신된 학력 배열

#### `PUT /api/resumes/[id]/experiences`

경력 전체 교체.

- **Body**: `{ "items": [{ "company": "...", "position": "...", ... }] }`

#### `PUT /api/resumes/[id]/skills`

기술 전체 교체.

- **Body**: `{ "items": [{ "name": "...", "level": "...", "category": "..." }] }`

#### `PUT /api/resumes/[id]/projects`

프로젝트 전체 교체.

- **Body**: `{ "items": [{ "name": "...", "role": "...", ... }] }`

#### `PUT /api/resumes/[id]/certifications`

자격증 전체 교체.

- **Body**: `{ "items": [{ "name": "...", "issuer": "...", ... }] }`

### `GET /api/resumes/[id]/pdf`

이력서 PDF 생성 및 다운로드.

- **Query**: `template` (optional, classic/modern/minimal)
- **처리**: `@react-pdf/renderer`로 서버사이드 PDF 생성 (Node.js runtime)
- **Response**: `application/pdf` 스트림
- **폰트**: Pretendard Regular/Bold (한국어 렌더링)

---

## 자기소개서 (Cover Letters)

### `POST /api/cover-letters`

새 자기소개서 생성.

- **Body**:
  ```json
  {
    "title": "네이버 백엔드 자기소개서",
    "companyName": "네이버",
    "position": "백엔드 개발자",
    "jobPostingText": "채용공고 전문..."
  }
  ```
- **Response**: `201 Created`

### `GET /api/cover-letters/[id]`

자기소개서 상세 조회.

### `PUT /api/cover-letters/[id]`

자기소개서 업데이트 (내용, 상태 등).

### `DELETE /api/cover-letters/[id]`

자기소개서 삭제.

### `PATCH /api/cover-letters/[id]/documents`

자기소개서에 연결된 참고 문서 목록 업데이트.

- **Body**:
  ```json
  {
    "documentIds": ["uuid", "uuid"]
  }
  ```
- **Response**: `200 OK`

---

## 모의면접 (Interviews)

### `POST /api/interviews`

새 면접 세션 생성.

- **Body**:
  ```json
  {
    "title": "네이버 백엔드 면접 연습",
    "companyName": "네이버",
    "position": "백엔드 개발자",
    "documentIds": ["uuid", "uuid"]
  }
  ```
- **처리**: `InterviewSession` 생성 + `InterviewDocument` 조인 레코드 생성
- **Response**: `201 Created`

### `GET /api/interviews/[id]`

면접 세션 상세 (연결된 문서 목록 포함).

### `PUT /api/interviews/[id]`

면접 세션 업데이트 (상태 변경 등).

### `DELETE /api/interviews/[id]`

면접 세션 삭제.

---

## 설정 (Settings)

### `GET /api/settings/ai`

사용자 AI 설정 조회.

### `PUT /api/settings/ai`

AI 설정 업데이트.

- **Body**:
  ```json
  {
    "provider": "anthropic",
    "model": "claude-sonnet-4-6",
    "apiKey": "sk-..."
  }
  ```
- **주의**: API 키는 서버사이드에서만 접근. 클라이언트에는 마스킹된 값만 반환.
