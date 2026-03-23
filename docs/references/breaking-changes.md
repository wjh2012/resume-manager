# Breaking Changes

하위 호환성이 깨지는 변경사항을 기록한다. 각 항목에 영향 범위, 마이그레이션 방법을 포함한다.

---

## 2026-03-23 — DocumentChunk 제거 및 RAG → Tool Use 전환

### DB 변경

| 변경 | 영향 | 마이그레이션 |
|------|------|-------------|
| `document_chunks` 테이블 삭제 | 기존 임베딩 데이터 영구 소실 | `prisma migrate deploy` 자동 처리 |
| `UsageFeature.EMBEDDING` 제거 | 기존 EMBEDDING 사용량 기록 삭제 | 마이그레이션 SQL에서 DELETE 후 enum 변경 |
| `documents.summary` 컬럼 추가 | 기존 문서는 `summary: null` | 배포 후 일괄 요약 생성 스크립트 실행 필요 |
| `career_notes.summary` 컬럼 추가 | 기존 노트는 `summary: null` | 배포 후 일괄 요약 생성 스크립트 실행 필요 |

### 배포 후 필요 작업

기존 문서/커리어노트에 요약이 없으면 채팅 시 컨텍스트가 비어있다. LLM이 `readDocument`/`readCareerNote` 도구로 전문을 읽을 수 있지만, 요약이 있는 것이 바람직하다.

```
배포 후 일괄 요약 생성 스크립트 실행 (별도 작성 필요)
```

### API 변경

| 변경 | 영향 |
|------|------|
| `buildContext()` 반환 타입 `string` → `{ context, careerNoteCount }` | `buildContext`를 호출하는 모든 코드 수정 필요 |
| `BuildContextOptions`에서 `query`, `limitToDocumentIds`, `includeInsights`, `maxChunks` 제거 | 해당 필드를 사용하는 호출부 수정 필요 |
| `UploadResult`에서 `chunkCount`, `embeddingSkipped` 제거 | 해당 필드를 참조하는 UI/코드 수정 필요 |
| `listDocuments`/`getDocument` 반환에서 `_count.chunks` → `summary` | 문서 목록/상세 UI 수정 필요 |

### 제거된 모듈

| 모듈 | 대체 |
|------|------|
| `lib/ai/embedding.ts` | `lib/documents/summary.ts` (요약 생성) |
| `generateQueryEmbedding` | 제거 (벡터 검색 미사용) |
| `searchSimilarChunks` | `readDocument` 도구 (Tool Use) |
| `DocumentChunk` Prisma 모델 | 제거 (청크 불필요) |
