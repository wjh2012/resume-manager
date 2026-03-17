# 스펙 검토 결과 반영 (2026-03-17)

전체 스펙 문서(공통 3개 + Phase 8개)를 검토하여 발견된 이슈를 스펙에 반영하였다.

## 확정된 결정사항

### 1. 임베딩 전략 → 서버 환경변수로 고정 [A-1, P1-1, P2-1]

- 임베딩은 항상 OpenAI `text-embedding-3-small` (1536차원) 사용
- `OPENAI_API_KEY` 환경변수로 관리 (사용자 AI 설정과 분리)
- phase-2의 `getEmbeddingModel(userId)`는 제거, phase-1의 `lib/ai/embedding.ts`에서 환경변수 기반으로 변경

**수정 파일**: architecture.md, phase-0, phase-1, phase-2

### 2. CoverLetter-Document 연결 → CoverLetterDocument 조인 테이블 추가 [D-4]

- `InterviewDocument`와 동일 패턴으로 `CoverLetterDocument` 모델 추가
- 자기소개서 생성 시 선택한 문서를 조인 테이블에 저장
- 작업공간 재진입 시 이전 선택 복원

**수정 파일**: database-schema.md, phase-3

### 3. 목록 조회 → Server Component에서 직접 Prisma 호출 [API-1]

- 목록 페이지는 RSC에서 직접 `prisma.xxx.findMany()` 호출
- 목록 API route 불필요, mutation만 API route 사용

**수정 파일**: architecture.md, api-reference.md, phase-3, phase-4, phase-5, phase-6

## 스펙 수정 상세

| 파일 | 수정 내용 |
|------|-----------|
| architecture.md | 임베딩 전략 명시, 목록 조회 RSC 방식 명시, react-markdown/resizable 기술 스택 추가, types/database.ts 삭제 |
| database-schema.md | CoverLetterDocument 모델 추가, Document/CoverLetter 관계 업데이트, DocumentChunk에 documentId 인덱스 추가 |
| api-reference.md | 목록 조회 전략 명시, 에러 응답 형식 정의, PUT /api/insights/[id] 추가 |
| phase-0 | .env.local.example에 OPENAI_API_KEY 추가, callback upsert 코드 구체화, resizable 컴포넌트 추가 |
| phase-1 | embedding.ts에서 서버 환경변수 기반 임베딩 사용으로 변경 |
| phase-2 | getEmbeddingModel() 제거, react-markdown + remark-gfm 패키지 추가 |
| phase-3 | CoverLetterDocument 관련 로직, ResizablePanelGroup 지정, user 메시지 저장, 에디터 반영 UX 명확화 |
| phase-4 | user 메시지 저장 타이밍 명시, 면접 시작 AI 첫 메시지 트리거 방법 명확화, 목록 RSC 변경 |
| phase-5 | 중복 인사이트 방지 로직 추가, 목록 RSC 변경 |
| phase-6 | 목록 RSC 변경 |

## 구현 중 반영 권장 (스펙에 미반영)

- [P1-3] 대용량 파일 임베딩 비동기 처리 — Document에 status 필드 추가 검토
- [D-5] API 키 암호화 — MVP에서는 Supabase RLS로 접근 제한, 추후 AES-256-GCM
- [D-3] 토큰 사용량 추적 — MVP 이후 선택적 추가
- [P1-2] 청크 분할 전략 고도화 — 문장/단락 단위 분할 검토
- [P5-2] 인사이트 컨텍스트 최적화 — 관련성 기반 선별 검토
