# Resume Manager — 종합 취업 준비 플랫폼

## 개요

사용자가 기존 이력서/문서를 업로드하고, AI 도움으로 자기소개서를 작성하고, AI 면접관과 모의면접을 하고, 대화에서 추출된 인사이트를 축적하여 점점 더 완성도 높은 취업 준비를 할 수 있는 서비스.

## 핵심 기능

| # | 기능 | 설명 |
|---|------|------|
| 1 | 문서 업로드 & 참고자료 관리 | PDF/Word/텍스트 업로드, 텍스트 추출 후 AI 컨텍스트로 활용 |
| 2 | AI 자기소개서 작성 | 기업 정보 입력 → AI와 대화하며 자기소개서 작성 |
| 3 | AI 모의면접 | 지정한 문서만 접근 가능한 AI 면접관과 텍스트 채팅 면접 |
| 4 | 대화 인사이트 추출 | 자기소개서/면접 대화에서 비정형 정보를 추출하여 별도 관리 |
| 5 | 이력서 빌더 & PDF 내보내기 | 구조화된 이력서 CRUD + 템플릿 3종 + PDF 다운로드 |

## 문서 목차

- [architecture.md](./architecture.md) — 기술 스택, 전체 아키텍처, 데이터 흐름
- [database-schema.md](./database-schema.md) — Prisma 스키마 전체 + 모델 관계 설명
- [api-reference.md](./api-reference.md) — API 라우트 전체 스펙

### 구현 단계별 문서

| Phase | 문서 | 내용 |
|-------|------|------|
| 0 | [phase-0-foundation.md](./phases/phase-0-foundation.md) | 기반 설정 (Prisma, Supabase, 인증, 레이아웃) |
| 1 | [phase-1-documents.md](./phases/phase-1-documents.md) | 문서 업로드 & 참고자료 관리 + RAG 파이프라인 |
| 2 | [phase-2-ai-infra.md](./phases/phase-2-ai-infra.md) | AI 인프라 (제공자 팩토리, 프롬프트, 채팅 컴포넌트) |
| 3 | [phase-3-cover-letter.md](./phases/phase-3-cover-letter.md) | AI 자기소개서 작성 |
| 4 | [phase-4-interview.md](./phases/phase-4-interview.md) | AI 모의면접 |
| 5 | [phase-5-insights.md](./phases/phase-5-insights.md) | 인사이트 추출 |
| 6 | [phase-6-resume.md](./phases/phase-6-resume.md) | 이력서 빌더 & PDF 내보내기 |
| 7 | [phase-7-polish.md](./phases/phase-7-polish.md) | 마무리 (반응형, UX) |

## 구현 순서

Phase 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 순서로 진행한다. 각 phase는 이전 phase의 완료를 전제로 한다.
