# 스펙 대비 구현 차이 (Spec Deviations)

스펙 문서와 실제 구현이 의도적으로 다른 부분을 기록한다. 프레임워크 버전 변경, 라이브러리 교체, 구조 개선 등으로 인한 차이를 추적하여 점검 시 오탐을 방지한다.

---

## Next.js 16: middleware.ts → proxy.ts

- **스펙**: `middleware.ts` + `export function middleware`
- **실제**: `proxy.ts` + `export function proxy`
- **이유**: Next.js 16에서 미들웨어 파일/함수명이 `proxy`로 변경됨 (v16.0 릴리즈 노트 참조)

## PDF 파서: pdf-parse → unpdf

- **스펙**: `pdf-parse` 라이브러리
- **실제**: `unpdf` 라이브러리
- **이유**: Edge runtime 호환성 및 pdf.js v5 기반으로 더 안정적

## 파서 파일 구조: 분리 → 통합

- **스펙**: `parse-pdf.ts`, `parse-docx.ts`, `parse-txt.ts` 3개 파일 분리
- **실제**: `lib/files/parser.ts` 1개 파일에 통합
- **이유**: 각 파서가 5줄 내외로 짧아 분리 시 오버헤드만 증가

## Buffer 타입: Node Buffer → ArrayBuffer

- **스펙**: `Buffer` 사용
- **실제**: `ArrayBuffer` 사용
- **이유**: Web API 호환, Edge runtime 대응

## 임베딩 API: 단건 → 배치

- **스펙**: `embed` (단건 처리)
- **실제**: `embedMany` (배치 처리)
- **이유**: 청크 수만큼 API 호출 반복 대신 한번에 처리하여 효율적

## Prisma 연결: datasource url → adapter-pg

- **스펙**: `datasource db { url, directUrl }` 방식
- **실제**: `@prisma/adapter-pg`를 통한 직접 connectionString 전달
- **이유**: Prisma v7 + Supabase 환경에서 어댑터 방식이 권장됨

## 서비스 레이어 분리

- **스펙**: API route에 비즈니스 로직 직접 구현
- **실제**: `lib/documents/service.ts`로 분리
- **이유**: 관심사 분리, 테스트 용이성
