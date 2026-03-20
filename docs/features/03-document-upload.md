# 문서 업로드 (Document Upload)

> Phase 1 — 문서 업로드 & 참고자료 관리

## 개요

PDF, DOCX, TXT 파일을 업로드하면 텍스트를 자동 추출하고, 청크 분할 + 임베딩 생성까지 파이프라인으로 처리한다.

## 지원 파일 형식

| 형식 | MIME 타입 | 파서 |
|------|----------|------|
| PDF | `application/pdf` | unpdf (pdf.js 기반) |
| DOCX | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | mammoth |
| TXT | `text/plain` | TextDecoder (UTF-8) |

## 업로드 파이프라인

1. **파일 검증** — 크기 (최대 10MB), 타입 (MIME + 확장자 이중 검증)
2. **파싱 + Storage 업로드** — 동시 실행 (`Promise.all`)
3. **청크 분할** — 1000자 단위, 200자 오버랩, 문장 경계 고려
4. **DB 저장** — 트랜잭션으로 문서 + 청크 일괄 저장
5. **임베딩 생성** — OpenAI `text-embedding-3-small`, 실패해도 문서는 유지

## Storage

- Supabase Storage `documents` 버킷 사용
- 경로: `{userId}/{timestamp}-{uuid}.{ext}` (한글 파일명 대응)
- RLS 정책으로 사용자별 폴더 격리

## API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/documents` | 파일 업로드 (multipart/form-data) |
| `GET` | `/api/documents` | 문서 목록 조회 |
| `GET` | `/api/documents/[id]` | 문서 상세 조회 |
| `DELETE` | `/api/documents/[id]` | 문서 삭제 (Storage + DB) |

## 주요 파일

| 파일 | 역할 |
|------|------|
| `lib/files/parser.ts` | PDF/DOCX/TXT 텍스트 추출 |
| `lib/ai/embedding.ts` | 청크 분할 + 임베딩 생성 |
| `lib/storage.ts` | Supabase Storage 업로드/삭제 |
| `lib/documents/service.ts` | 문서 CRUD 비즈니스 로직 |
| `lib/validations/document.ts` | 파일 타입/크기 검증 |
| `app/api/documents/route.ts` | POST, GET 엔드포인트 |
| `app/api/documents/[id]/route.ts` | GET, DELETE 엔드포인트 |
