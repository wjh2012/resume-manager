# 채팅 컨텍스트 최적화 설계

## 배경

현재 자소서/면접 채팅 시 선택된 문서의 전체 텍스트가 매 메시지마다 시스템 프롬프트에 포함된다.
문서 3개(각 5,000자) 선택 시 10턴 대화에서 약 150,000자의 중복 입력 토큰이 발생한다.

Claude Code의 subagent 패턴처럼 "요약으로 판단 → 필요시 전문 읽기" 방식으로 전환하여 토큰 비용을 절감한다.

## 변경 범위

### 1. 문서 업로드 — 요약 생성

- 텍스트 추출 후 사용자 설정 LLM으로 1~4줄 핵심 요약 생성
- `Document` 모델에 `summary` 필드 추가 (nullable String)
- 요약 생성 시 토큰 사용량 기록 (feature: `DOCUMENT_SUMMARY`)

#### 제거 대상

- 청크 분할 (`splitIntoChunks`) 제거
- 임베딩 생성 (`generateEmbeddings`, `generateQueryEmbedding`) 제거
- `DocumentChunk` 모델 + 테이블 제거 (마이그레이션으로 drop)

### 2. 채팅 컨텍스트 변경 (자소서 + 면접 공통)

#### 시스템 프롬프트 구성

```
[문서 요약: 포트폴리오.pdf]
3년차 백엔드 개발자. Spring Boot, AWS 기반 결제 시스템 구축 경험...

[문서 요약: 경력기술서.docx]
팀 리드 경험. MSA 전환 프로젝트 주도, 성능 40% 개선...

[커리어노트: ...]
(최근 확정 노트 10개, 현행 유지)
```

- 선택 문서 전문 포함 → 요약만 포함
- 벡터 검색(RAG) 제거 — 미선택 문서 참조 안 함
- 인사이트 제거 (향후 deprecated 예정)
- 커리어노트 유지 (최근 확정 10개)

#### Tool Use 도입

AI SDK의 `streamText` + `tools` + `stopWhen: stepCountIs(3)` 사용.

**`readDocument` 도구**

- 목적: LLM이 요약만으로 부족할 때 문서 전문을 읽음
- 입력: `documentId: string`
- 동작: 소유권 확인 → `extractedText` 반환
- 접근 범위: 해당 자소서/면접에 선택된 문서만 허용

**`saveCareerNote` 도구**

- 목적: 대화 중 LLM이 기록할 만한 내용을 발견하면 커리어노트로 저장
- 흐름:
  1. LLM이 텍스트로 제안: "이 경험을 커리어노트로 저장할까요? 제목: ..."
  2. 사용자가 채팅으로 승인: "응" / "아니"
  3. 승인 시 LLM이 `saveCareerNote` 도구 호출
- 입력: `title: string`, `content: string`, `metadata?: { role?, result?, feeling? }`
- 동작: CareerNote 생성 (status: CONFIRMED) + CareerNoteSource 연결

### 3. buildContext 리팩토링

현재 `buildContext(userId, opts)` 함수를 단순화한다.

```
변경 전 파라미터:
  - query (벡터 검색용) → 제거
  - selectedDocumentIds (전문 조회) → 요약 조회로 변경
  - limitToDocumentIds (벡터 검색 범위) → 제거
  - includeInsights → 제거
  - includeCareerNotes → 유지
  - maxChunks → 제거

변경 후 파라미터:
  - selectedDocumentIds (요약 조회)
  - includeCareerNotes
```

### 4. 제거 대상 전체 목록

| 대상 | 위치 |
|------|------|
| `DocumentChunk` 모델 | `prisma/schema.prisma` |
| `splitIntoChunks` | `lib/ai/embedding.ts` |
| `generateEmbeddings` | `lib/ai/embedding.ts` |
| `generateQueryEmbedding` | `lib/ai/context.ts` |
| `searchSimilarChunks` | `lib/ai/context.ts` |
| 업로드 시 청크/임베딩 로직 | `lib/documents/service.ts` |
| `buildContext`의 query, includeInsights, RAG 로직 | `lib/ai/context.ts` |
| `includeInsights` 호출 | `app/api/chat/cover-letter/route.ts`, `app/api/chat/interview/route.ts` |

### 5. DB 마이그레이션

- `Document` 테이블에 `summary` 컬럼 추가 (nullable String)
- `DocumentChunk` 테이블 drop
- 기존 문서에 대한 요약은 마이그레이션에서 생성하지 않음 (별도 스크립트 또는 수동)

## 데이터 흐름

### 문서 업로드

```
파일 → 텍스트 추출 → LLM 요약 생성 (1~4줄) → Document 저장 (extractedText + summary)
```

### 채팅 (자소서/면접 공통)

```
사용자 메시지 전송
  → 선택 문서 요약 + 커리어노트 → 시스템 프롬프트
  → streamText({ tools: { readDocument, saveCareerNote }, stopWhen: stepCountIs(3) })
  → LLM 응답 스트리밍
     → 필요시 readDocument 도구 호출 → 전문 읽고 이어서 응답
     → 기록할 만한 내용 발견 시 텍스트로 제안 → 사용자 승인 → saveCareerNote 호출
```

## 클라이언트 영향

- `useChat` 훅 변경 없음 — AI SDK가 tool 호출/결과를 자동 처리
- `toUIMessageStreamResponse()`가 스트리밍 중 tool 실행을 투명하게 처리
- 도구 실행 중 응답 지연에 대한 로딩 표시 UI 추가 고려 (선택적)
