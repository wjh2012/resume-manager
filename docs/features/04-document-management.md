# 문서 관리 (Document Management)

> Phase 1 — 문서 업로드 & 참고자료 관리

## 개요

업로드된 문서의 목록 조회, 상세 보기, 삭제 기능을 제공한다.

## 기능

### 문서 목록

- 사용자의 문서를 최신순으로 표시
- 제목, 파일 타입, 크기, 청크 수, 생성일 표시

### 문서 상세

- 추출된 텍스트 전문 확인
- 원본 파일 정보 (타입, 크기, 청크 수)

### 문서 삭제

- 소유권 검증 후 삭제
- Storage 파일 + DB 레코드 (cascade로 청크 포함) 동시 삭제
- Storage 삭제 실패 시에도 DB 삭제는 진행 (고아 파일 허용)

## 권한

- 모든 조회/삭제에 `userId` 소유권 검증 포함
- 타인의 문서 접근·삭제 시 404 반환 (존재 여부 노출 방지, 403/404 통합)

## 커스텀 에러

| 에러 클래스 | 메시지 | HTTP 상태 |
|------------|--------|----------|
| `DocumentNotFoundError` | 문서를 찾을 수 없습니다. | 404 |

## 주요 파일

| 파일 | 역할 |
|------|------|
| `lib/documents/service.ts` | listDocuments, getDocument, deleteDocument |
| `app/api/documents/route.ts` | GET (목록) |
| `app/api/documents/[id]/route.ts` | GET (상세), DELETE |
| `app/(dashboard)/documents/page.tsx` | 문서 목록 페이지 |
