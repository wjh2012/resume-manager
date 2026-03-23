# 문서 업로드 (Document Upload)

> Phase 1 — 문서 업로드 & 참고자료 관리

## 개요

PDF, DOCX, TXT 파일을 업로드하면 텍스트를 자동 추출하고, 사용자의 AI 설정으로 1~4줄 핵심 요약을 생성한다.

## 지원 파일 형식

| 형식 | MIME 타입 | 파서 |
|------|----------|------|
| PDF | `application/pdf` | unpdf (pdf.js 기반) |
| DOCX | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | mammoth |
| TXT | `text/plain` | TextDecoder (UTF-8) |

## 업로드 파이프라인

1. **파일 검증** — 크기 (최대 10MB), 타입 (MIME + 확장자 이중 검증)
2. **파싱 + Storage 업로드** — 동시 실행 (`Promise.all`)
3. **DB 저장** — 문서 레코드 생성 (extractedText 포함)
4. **요약 생성** — 사용자 설정 LLM으로 1~4줄 요약 생성 (실패해도 업로드 성공)

### 요약 생성

- 사용자의 AI 설정 (provider/model/apiKey)을 사용
- 쿼터 초과, AI 미설정, API 오류 시 `summary: null`로 저장
- 토큰 사용량은 `DOCUMENT_SUMMARY` feature로 기록
- 문서 상세 페이지에서 수동 재생성 가능 (`POST /api/documents/[id]/summary`)

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
| `POST` | `/api/documents/[id]/summary` | 요약 재생성 |

## 주요 파일

| 파일 | 역할 |
|------|------|
| `lib/files/parser.ts` | PDF/DOCX/TXT 텍스트 추출 |
| `lib/documents/summary.ts` | LLM 요약 생성 |
| `lib/storage.ts` | Supabase Storage 업로드/삭제 |
| `lib/documents/service.ts` | 문서 CRUD 비즈니스 로직 |
| `lib/validations/document.ts` | 파일 타입/크기 검증 |
| `app/api/documents/route.ts` | POST, GET 엔드포인트 |
| `app/api/documents/[id]/route.ts` | GET, DELETE 엔드포인트 |
| `app/api/documents/[id]/summary/route.ts` | 요약 재생성 엔드포인트 |
