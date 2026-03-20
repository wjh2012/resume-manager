# 이력서 빌더 & PDF 내보내기 (Resumes)

> Phase 6 — 구조화된 이력서 CRUD + 웹 미리보기 + PDF 다운로드

## 개요

사용자가 섹션별(개인정보, 학력, 경력, 기술, 프로젝트, 자격증)로 이력서를 작성하고, 3종 템플릿(클래식/모던/미니멀)으로 웹 미리보기 및 PDF 다운로드를 할 수 있는 기능이다.

## 핵심 흐름

1. **생성** — 제목 + 템플릿 선택 → 빈 이력서 생성
2. **편집** — 탭 기반 섹션 에디터에서 데이터 입력, `@dnd-kit` 드래그 앤 드롭으로 항목 정렬
3. **자동 저장** — 입력 변경 시 1초 debounce 후 해당 섹션만 API PUT, 탭 전환 시 즉시 저장
4. **미리보기** — 사이드 패널 토글 (실시간 반영) + 전체 화면 미리보기 페이지
5. **PDF 다운로드** — 미리보기 페이지에서 Pretendard 폰트 PDF 생성 및 다운로드

## 데이터 구조

### Resume

| 필드 | 설명 |
|------|------|
| title | 이력서 제목 |
| template | 템플릿 (classic / modern / minimal) |

### 하위 섹션 (1:N 또는 1:1)

- **PersonalInfo** (1:1) — 이름, 이메일, 전화번호, 주소, 자기소개
- **Education** (1:N) — 학교, 학위, 전공, 기간, 설명
- **Experience** (1:N) — 회사, 직위, 기간, 재직 중 여부, 설명
- **Skill** (1:N) — 기술명, 숙련도, 카테고리
- **Project** (1:N) — 프로젝트명, 역할, 기간, 설명, URL
- **Certification** (1:N) — 자격증명, 발급기관, 취득일, 만료일

## API

→ [`docs/specs/api-reference.md`](../specs/api-reference.md) 참조

### 설계 특징: 섹션별 독립 API

스펙의 전체 PUT 1개 방식 대신, 섹션별 개별 PUT API로 구현했다.

- 자동 저장 시 변경된 섹션만 전송 (효율)
- 향후 블록 조합 기능 확장 대비 (다른 이력서의 섹션 재사용)

배열 섹션 교체는 트랜잭션으로 `deleteMany` + `createMany` + `findMany` (갱신 데이터 반환).

## 주요 컴포넌트

| 파일 | 역할 |
|------|------|
| `components/resumes/resume-editor.tsx` | 편집기 메인 (탭 + 자동 저장 + 미리보기 토글) |
| `components/resumes/sortable-section.tsx` | `@dnd-kit` 기반 드래그 정렬 래퍼 |
| `components/resumes/section-editors/*.tsx` | 6종 섹션 에디터 |
| `components/resumes/templates/*.tsx` | 웹 미리보기 템플릿 3종 |
| `components/resumes/pdf/*.tsx` | PDF 템플릿 3종 + 폰트 등록 |
| `components/resumes/resume-preview-panel.tsx` | 사이드 미리보기 패널 |
| `components/ui/monthpicker.tsx` | 로케일 기반 년-월 선택기 |
| `lib/resumes/service.ts` | 서비스 레이어 (CRUD + 섹션 교체) |

## 템플릿

| 템플릿 | 특징 |
|--------|------|
| Classic | 단일 컬럼, 구분선, 전통적 스타일 |
| Modern | 2컬럼 (사이드바+본문), 컬러 포인트, 기술 진행 바 |
| Minimal | 단일 컬럼, 넓은 여백, 가벼운 타이포그래피 |

## PDF 생성

- `@react-pdf/renderer` 사용 (Node.js runtime)
- Pretendard Regular/Bold ttf 폰트 (`public/fonts/`)
- Content-Disposition에 UTF-8 인코딩 파일명 포함
