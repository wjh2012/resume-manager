# Changelog

주요 변경사항을 날짜별로 기록한다. Breaking change는 ⚠️ 표시.

---

## 2026-03-23 — 파이프라인 분기

> Branch: `feat/chat-pipeline-branching`

### Added
- provider 기반 파이프라인 선택 (`selectPipeline`): OpenAI → multi-step, 그 외 → classification
- classification 파이프라인: LLM 분류 → 서버 데이터 수집 → 대화 압축 → 응답 생성
- 분류 스키마: 자소서용 (`coverLetterClassificationSchema`), 면접용 (`interviewClassificationSchema`)
- 대화 압축 (`compressMessages`): 최근 4턴 유지, 이전 대화 LLM 요약
- `lib/ai/pipeline/` 모듈 (`index`, `types`, `schema`, `classify`, `compress`, `classification`, `multi-step`)

### Changed
- 자소서/면접 채팅 route: `streamText` 직접 호출 → 파이프라인 핸들러로 위임
- `maxDuration`: 60 → 120 (classification 파이프라인의 다단계 처리 대응)

---

## 2026-03-23 — 채팅 컨텍스트 최적화

> Branch: `feature/chat-context-optimization`

### Added
- 문서 업로드 시 LLM 요약 자동 생성 (`Document.summary`)
- 커리어노트 요약 필드 (`CareerNote.summary`)
- 채팅 도구: `readDocument`, `readCareerNote`, `saveCareerNote` (AI SDK Tool Use)
- 문서 요약 재생성 API (`POST /api/documents/[id]/summary`)
- 커리어노트 수정 시 요약 자동 재생성
- 채팅 중 도구 실행 로딩 UI
- `UsageFeature.DOCUMENT_SUMMARY` enum 값

### Changed
- `buildContext()` — RAG(벡터 검색) → 요약 기반으로 전환
- `buildContext()` 반환 타입: `string` → `{ context: string, careerNoteCount: number }`
- 자소서 채팅: 선택 문서 전문 매턴 전송 → 요약만 전송 + Tool Use로 필요시 전문 읽기
- 면접 채팅: `limitToDocumentIds` → `selectedDocumentIds` + `readDocument` 도구
- 커리어노트 컨텍스트: 최근 10개 전문 → 전체 확정 노트 요약
- 문서 UI: 청크 수 표시 → 요약 상태 표시

### Removed
- ⚠️ `DocumentChunk` 모델 + 테이블 (임베딩 데이터 소실)
- ⚠️ `UsageFeature.EMBEDDING` enum 값 + 관련 사용량 기록 삭제
- ⚠️ pgvector 확장 (`extensions = [vector]`)
- `lib/ai/embedding.ts` (splitIntoChunks, generateEmbeddings, getEmbeddingModel)
- `generateQueryEmbedding`, `searchSimilarChunks` (lib/ai/context.ts)
- `BuildContextOptions`의 `query`, `limitToDocumentIds`, `includeInsights`, `maxChunks` 필드
- `UploadResult`의 `chunkCount`, `embeddingSkipped` 필드
- 채팅 컨텍스트에서 인사이트 주입 (`includeInsights`)
