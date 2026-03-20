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
- **실제**: `lib/documents/service.ts`, `lib/settings/service.ts`로 분리
- **이유**: 관심사 분리, 테스트 용이성

## 에러 응답 형식

- **스펙**: `{ error: { code, message } }` 구조화된 에러 객체
- **실제**: `{ error: string }` 단순 문자열
- **이유**: 기존 API 패턴 일관성 유지

## ChatContext 타입 삭제

- **스펙**: `ChatContext` 인터페이스 정의
- **실제**: `BuildContextOptions`로 대체
- **이유**: 실제 `buildContext()` 함수 시그니처와 일치시킴

## UIMessage 타임스탬프

- **스펙**: 채팅 메시지에 HH:mm 타임스탬프 표시
- **실제**: 타임스탬프 미표시
- **이유**: AI SDK v6의 `UIMessage` 타입에 `createdAt` 필드가 존재하지 않음

## Anthropic 모델 ID

- **스펙**: `claude-sonnet-4-6`
- **실제**: `claude-sonnet-4-20250514`
- **이유**: AI SDK에서 사용하는 정식 모델 ID (날짜 기반 버전 형식)

## shadcn/ui 컴포넌트 수정

아래 shadcn/ui 생성 파일에 프로젝트 요구사항에 맞는 커스터마이징 적용:

### `components/ui/button.tsx`

- `transition-all` → `transition-[color,background-color,border-color,box-shadow,opacity,transform]` (성능 개선)
- default variant `[a]:hover:bg-primary/80` → `hover:bg-primary/80` (일반 hover로 수정)

### `components/ui/dialog.tsx`

- sr-only "Close" → "닫기" (한국어 서비스)
- Footer close 버튼 텍스트 "Close" → "닫기"

### `components/ui/sidebar.tsx`

- "Toggle Sidebar" → "사이드바 토글" (한국어 서비스)

---

## Phase 4: AI 모의면접

### `@/components/ui/label` 미사용

- **스펙**: Label 컴포넌트 사용 암시
- **실제**: 네이티브 `<label>` 요소 직접 사용
- **이유**: 프로젝트에 `components/ui/label.tsx`가 존재하지 않음

### `date-fns` 미사용

- **스펙**: 날짜 포매팅에 date-fns 사용 암시
- **실제**: `toLocaleDateString("ko-KR", ...)` 네이티브 API 사용
- **이유**: date-fns 패키지가 프로젝트에 설치되지 않음

### 파일명 변경: `interview-setup.tsx` → `interview-form.tsx`

- **스펙**: `interview-setup.tsx`
- **실제**: `interview-form.tsx`
- **이유**: 컴포넌트 역할이 "설정"보다 "폼 입력"에 가까워 더 명확한 명칭으로 변경

### `sendMessage` API

- **스펙**: `sendMessage({ role, content })` 형태 암시
- **실제**: `sendMessage({ text })` 사용
- **이유**: AI SDK v6 `useChat` hook의 실제 sendMessage 시그니처

---

## Phase 5: 인사이트 추출

### `app/api/insights/route.ts` 생략

- **스펙**: `app/api/insights/route.ts` 신규 생성 (목록 조회 API)
- **실제**: API route 미생성, Server Component에서 `listInsights()` 직접 호출
- **이유**: 기존 코드베이스 패턴 (interviews, cover-letters 목록 모두 SC 직접 호출)

### 인사이트 추출 확인 다이얼로그 항상 표시

- **스펙**: 기존 인사이트 존재 시에만 "다시 추출하시겠습니까?" 확인 다이얼로그
- **실제**: 추출 버튼 클릭 시 항상 확인 다이얼로그 표시
- **이유**: AI API 호출 비용이 발생하므로 항상 확인하는 것이 더 나은 UX

### `insight-edit-dialog.tsx` 신규 추가

- **스펙**: `insight-card.tsx`에서 "인라인 편집 또는 다이얼로그"
- **실제**: 별도 `insight-edit-dialog.tsx` 컴포넌트로 분리
- **이유**: 다이얼로그 방식 선택 + 컴포넌트 관심사 분리

---

## Phase 6: 이력서 빌더

### API 구조: 전체 PUT → 섹션별 PUT

- **스펙**: `PUT /api/resumes/[id]`로 전체 업데이트
- **실제**: 메타(title/template)만 `PUT /api/resumes/[id]`, 섹션별 독립 API (`PUT /api/resumes/[id]/educations` 등)
- **이유**: 자동 저장 시 변경 섹션만 전송 + 향후 블록 조합 기능 확장 대비

### 한국어 폰트: Noto Sans KR → Pretendard

- **스펙**: Noto Sans KR
- **실제**: Pretendard Regular/Bold
- **이유**: 사용자 선호

### 컴포넌트 이름: `resume-form.tsx` → `resume-editor.tsx`

- **스펙**: `components/resumes/resume-form.tsx`
- **실제**: `components/resumes/resume-editor.tsx`
- **이유**: 폼 입력보다 편집기 역할에 가까움

### 목록 API route 미생성

- **스펙**: `GET /api/resumes` route 포함
- **실제**: SC에서 `listResumes()` 직접 호출
- **이유**: 기존 패턴 (cover-letters, interviews, insights 동일)

### 날짜 입력: `type="month"` → MonthPicker

- **스펙**: HTML native `<input type="month">`
- **실제**: shadcn 기반 MonthPicker + Popover
- **이유**: 브라우저 간 일관된 UI + `Intl.DateTimeFormat` 로케일 자동 감지

---

## Phase 7: 마무리

### 대시보드 통계 카드 4개 → 5개

- **스펙**: 문서/자소서/면접/인사이트 4개
- **실제**: + 이력서 카드 추가 (5개)
- **이유**: Phase 6 이력서 빌더 완료로 이력서 통계도 포함하는 것이 자연스러움

### `app/(dashboard)/error.tsx` 신규 생성 → 기존 파일 활용

- **스펙**: Phase 7에서 에러 바운더리 신규 생성
- **실제**: 이전 Phase에서 이미 구현되어 있어 스킵
- **이유**: 이미 동작하는 에러 바운더리가 존재

### 이력서 자동 저장 성공 토스트 미적용

- **스펙**: 모든 사용자 액션에 토스트 알림
- **실제**: 자동 저장 성공 시 토스트 미표시 (실패 시에만 표시)
- **이유**: 빈번한 자동 저장마다 토스트는 UX 방해
