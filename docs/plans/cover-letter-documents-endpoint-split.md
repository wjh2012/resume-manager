# 계획서: 참고 문서 업데이트 엔드포인트 분리

## 문제

`PUT /api/cover-letters/[id]` 핸들러가 두 스키마를 순차적으로 판별하는 구조.
`{ content: "hello", documentIds: ["..."] }` 같은 body가 `updateSelectedDocumentsSchema`에 먼저 매칭되어 내용 저장 요청이 문서 업데이트로 오처리될 수 있음.

## 해결 방향

`PATCH /api/cover-letters/[id]/documents` 신규 엔드포인트 분리

| 변경 전 | 변경 후 |
|---------|---------|
| `PUT /api/cover-letters/[id]` (title/content/status + documentIds 혼용) | `PUT /api/cover-letters/[id]` (title/content/status 전용) |
| — | `PATCH /api/cover-letters/[id]/documents` (참고 문서 전용) |

## 변경 파일

| 파일 | 변경 |
|------|------|
| `app/api/cover-letters/[id]/route.ts` | PUT에서 `updateSelectedDocumentsSchema` 분기 제거 |
| `app/api/cover-letters/[id]/documents/route.ts` | 신규: PATCH 핸들러 |
| `components/cover-letters/cover-letter-chat.tsx` | `handleDocToggle` fetch URL/method 변경 |
| `tests/app/api/cover-letters/[id]/documents/route.test.ts` | 신규 테스트 |

## 구현 단계

### Step 1: `[id]/route.ts` — PUT 정리
- `updateSelectedDocumentsSchema` import 및 분기 블록 제거
- `updateSelectedDocuments` service import 제거

### Step 2: `[id]/documents/route.ts` — PATCH 신규 생성
- 기존 route 인증/UUID 검증 패턴 동일하게 적용
- `updateSelectedDocumentsSchema` + `updateSelectedDocuments` 호출
- 에러 처리: NotFound → 404, Forbidden → 403
- 성공: `{ success: true }` 반환

### Step 3: `cover-letter-chat.tsx` — handleDocToggle 수정
```ts
// 변경 전
fetch(`/api/cover-letters/${coverLetterId}`, { method: "PUT", body: JSON.stringify({ documentIds: newIds }) })

// 변경 후
fetch(`/api/cover-letters/${coverLetterId}/documents`, { method: "PATCH", body: JSON.stringify({ documentIds: newIds }) })
```

### Step 4: 테스트
- PATCH 핸들러 단위 테스트 (인증, UUID 검증, 정상/에러 케이스)
