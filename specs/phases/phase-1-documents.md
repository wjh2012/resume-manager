# Phase 1: 문서 업로드 & 참고자료 관리

## 목표

사용자가 PDF/Word/텍스트 파일을 업로드하고, 텍스트를 자동 추출하며, RAG를 위한 청크 분할 + 임베딩 파이프라인을 구축한다.

## 완료 기준

- [ ] PDF, DOCX, TXT 파일 업로드 및 텍스트 추출
- [ ] 추출된 텍스트의 청크 분할 + 임베딩 생성 + DB 저장
- [ ] Supabase Storage에 원본 파일 저장
- [ ] 드래그앤드롭 업로드 UI
- [ ] 문서 목록/상세 페이지
- [ ] 문서 삭제 (Storage + DB + 청크 모두)

## 의존성

- Phase 0 완료 (Prisma, Supabase, 인증, 레이아웃)
- Supabase에서 `pgvector` 확장 활성화
- Supabase Storage 버킷 `documents` 생성

## 설치할 패키지

```bash
npm install pdf-parse mammoth
npm install @types/pdf-parse --save-dev
```

## 생성/수정할 파일

```
신규:
  lib/files/parser.ts
  lib/files/parse-pdf.ts
  lib/files/parse-docx.ts
  lib/files/parse-txt.ts
  lib/ai/embedding.ts
  lib/storage.ts
  lib/validations/document.ts
  app/api/documents/route.ts
  app/api/documents/[id]/route.ts
  app/(dashboard)/documents/page.tsx
  app/(dashboard)/documents/[id]/page.tsx
  components/documents/document-upload.tsx
  components/documents/document-list.tsx
  components/documents/document-card.tsx
  hooks/use-file-upload.ts

수정:
  없음
```

## 상세 구현 단계

### 1. Supabase Storage 설정

Supabase 대시보드에서:
- `documents` 버킷 생성 (private)
- RLS 정책: 인증된 사용자가 자신의 `documents/{userId}/` 경로만 접근 가능

### 2. pgvector 확장 활성화

Supabase SQL Editor에서:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. 파일 파서 구현

#### `lib/files/parse-pdf.ts`

```typescript
import pdfParse from "pdf-parse"

export async function parsePdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer)
  return data.text
}
```

#### `lib/files/parse-docx.ts`

```typescript
import mammoth from "mammoth"

export async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}
```

#### `lib/files/parse-txt.ts`

```typescript
export async function parseTxt(buffer: Buffer): Promise<string> {
  return buffer.toString("utf-8")
}
```

#### `lib/files/parser.ts`

통합 파서. 파일 확장자에 따라 적절한 파서를 선택한다.

```typescript
import { parsePdf } from "./parse-pdf"
import { parseDocx } from "./parse-docx"
import { parseTxt } from "./parse-txt"

export async function parseFile(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase()

  switch (ext) {
    case "pdf": return parsePdf(buffer)
    case "docx": return parseDocx(buffer)
    case "txt": return parseTxt(buffer)
    default: throw new Error(`지원하지 않는 파일 형식: ${ext}`)
  }
}
```

### 4. 텍스트 청크 분할 + 임베딩

#### `lib/ai/embedding.ts`

임베딩은 항상 OpenAI `text-embedding-3-small` (1536차원)을 사용한다. 서버 환경변수 `OPENAI_API_KEY`로 관리하며, 사용자의 AI 설정(제공자/모델)과 무관하게 동작한다.

```typescript
import { embed } from "ai"
import { createOpenAI } from "@ai-sdk/openai"

// 임베딩 전용 모델 (서버 환경변수 기반, 사용자 설정과 분리)
export function getEmbeddingModel() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY 환경변수가 설정되지 않았습니다")
  return createOpenAI({ apiKey }).embedding("text-embedding-3-small")
}

// 텍스트를 청크로 분할
export function splitIntoChunks(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.slice(start, end))
    start += chunkSize - overlap
  }
  return chunks
}

// 청크에 대한 임베딩 생성
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = getEmbeddingModel()
  const { embedding } = await embed({ model, value: text })
  return embedding
}
```

### 5. Supabase Storage 헬퍼

#### `lib/storage.ts`

```typescript
// 파일 업로드
export async function uploadFile(supabase, userId: string, fileId: string, file: File) {
  const ext = file.name.split(".").pop()
  const path = `${userId}/${fileId}.${ext}`
  const { error } = await supabase.storage.from("documents").upload(path, file)
  if (error) throw error
  return path
}

// 파일 삭제
export async function deleteFile(supabase, path: string) {
  const { error } = await supabase.storage.from("documents").remove([path])
  if (error) throw error
}
```

### 6. 유효성 검증 스키마

#### `lib/validations/document.ts`

```typescript
import { z } from "zod"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]

export const uploadDocumentSchema = z.object({
  file: z.instanceof(File)
    .refine(f => f.size <= MAX_FILE_SIZE, "파일 크기는 10MB 이하여야 합니다")
    .refine(f => ALLOWED_TYPES.includes(f.type), "PDF, DOCX, TXT 파일만 업로드 가능합니다"),
  title: z.string().optional(),
})
```

### 7. API 라우트

#### `POST /api/documents` — 업로드 + 파싱 + 임베딩

처리 흐름:
1. multipart/form-data에서 파일 추출
2. 유효성 검증 (크기, 타입)
3. Supabase Storage에 원본 업로드
4. 파일 파서로 텍스트 추출
5. 텍스트 청크 분할
6. 각 청크에 대해 임베딩 생성
7. `Document` + `DocumentChunk[]` 트랜잭션으로 DB 저장
8. 응답 반환

#### `GET /api/documents/[id]` — 문서 상세 조회

#### `DELETE /api/documents/[id]` — 문서 삭제

1. DB에서 문서 조회 (소유자 확인)
2. Supabase Storage에서 원본 삭제
3. DB에서 삭제 (Cascade로 청크도 삭제)

### 8. 드래그앤드롭 업로드 UI

#### `hooks/use-file-upload.ts`

- 드래그 상태 관리 (`isDragging`)
- 파일 유효성 검증 (클라이언트)
- 업로드 진행률 추적
- API 호출 + 에러 처리

#### `components/documents/document-upload.tsx`

- 드래그앤드롭 영역 (점선 테두리, 아이콘)
- 또는 클릭하여 파일 선택
- 업로드 중 프로그레스 바
- 허용 파일 형식 안내 텍스트

### 9. 문서 목록/상세 페이지

#### `app/(dashboard)/documents/page.tsx`

- 상단: 업로드 버튼 (Dialog로 `DocumentUpload` 표시)
- 본문: `DocumentList` (카드 그리드)
- 빈 상태: "아직 업로드한 문서가 없습니다" + 업로드 유도

#### `components/documents/document-list.tsx`

- 문서 카드 그리드 (반응형: 1~3열)
- 각 카드: 파일 아이콘 + 제목 + 파일 타입 배지 + 날짜 + 삭제 버튼

#### `components/documents/document-card.tsx`

- 파일 타입별 아이콘 (PDF 빨강, DOCX 파랑, TXT 회색)
- 제목 (클릭 시 상세 페이지)
- 파일 크기
- 업로드 날짜

#### `app/(dashboard)/documents/[id]/page.tsx`

- 문서 메타 정보 (제목, 타입, 크기, 날짜)
- 추출된 텍스트 전문 표시 (스크롤 영역)
- 삭제 버튼

## 검증 방법

1. PDF 파일 드래그앤드롭 → 업로드 성공 → 목록에 표시
2. DOCX 파일 업로드 → 텍스트 추출 확인
3. TXT 파일 업로드 → 텍스트 추출 확인
4. 문서 상세 페이지에서 추출된 텍스트 확인
5. 10MB 초과 파일 → 에러 메시지
6. 지원하지 않는 형식 → 에러 메시지
7. 문서 삭제 → 목록에서 제거 + Storage에서 삭제 확인
8. DB에 `DocumentChunk` 레코드 생성 확인
