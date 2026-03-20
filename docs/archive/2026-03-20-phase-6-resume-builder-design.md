# Phase 6: 이력서 빌더 & PDF 내보내기 — 디자인 스펙

## 개요

구조화된 이력서를 CRUD로 관리하고, 3종 템플릿으로 웹 미리보기 + PDF 다운로드를 제공한다. 섹션별 독립 API로 설계하여 향후 블록 조합 기능 확장에 대비한다.

## 스펙 대비 변경 사항

| 항목 | 원본 스펙 | 변경 | 이유 |
|------|----------|------|------|
| API 구조 | 전체 PUT 1개 | 섹션별 개별 PUT | 블록 조합 확장성, 자동 저장 효율 |
| 저장 방식 | 수동 저장 | 실시간 자동 저장 + 탭 전환 저장 + 수동 저장 | UX 개선 |
| 미리보기 | 별도 페이지만 | 사이드 패널 토글 + 별도 페이지 | 편집 중 실시간 확인 |
| 정렬 | sortOrder 기반 (구현 미지정) | @dnd-kit 드래그 앤 드롭 | 직관적 UX |
| 한국어 폰트 | Noto Sans KR | Pretendard | 사용자 선호 |
| 컴포넌트 이름 | `resume-form.tsx` | `resume-editor.tsx` | 폼 입력보다 편집기 역할에 가까움 |
| 목록 API | `GET /api/resumes` route 포함 | SC 직접 호출 (route 미생성) | 기존 패턴 (cover-letters, interviews, insights 동일) |

## 설치 패키지

```bash
npm install @react-pdf/renderer @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## 1. API 설계

### 이력서 CRUD

| 엔드포인트 | 메서드 | 설명 |
|---|---|---|
| `/api/resumes` | POST | 이력서 생성 (title + template) |
| `/api/resumes/[id]` | GET | 이력서 전체 조회 (모든 섹션 include) |
| `/api/resumes/[id]` | PUT | 메타 수정 (title, template) |
| `/api/resumes/[id]` | DELETE | 이력서 삭제 (cascade) |

### 섹션별 API

| 엔드포인트 | 메서드 | 설명 |
|---|---|---|
| `/api/resumes/[id]/personal-info` | PUT | 개인정보 upsert |
| `/api/resumes/[id]/educations` | PUT | 학력 전체 교체 |
| `/api/resumes/[id]/experiences` | PUT | 경력 전체 교체 |
| `/api/resumes/[id]/skills` | PUT | 기술 전체 교체 |
| `/api/resumes/[id]/projects` | PUT | 프로젝트 전체 교체 |
| `/api/resumes/[id]/certifications` | PUT | 자격증 전체 교체 |
| `/api/resumes/[id]/pdf` | GET | PDF 다운로드 (?template= 쿼리) |

### 공통 규칙

- 목록 조회: Server Component에서 `prisma.resume.findMany()` 직접 호출 (API route 불필요)
- 배열 섹션 교체: 트랜잭션으로 `deleteMany` + `createMany`
- 모든 API에 소유권 검증 (userId 비교)
- 에러 형식: `{ error: string }` (기존 패턴)

## 2. 서비스 레이어

### `lib/resumes/service.ts`

**함수:**
- `createResume(userId, data)` — 빈 이력서 생성
- `getResume(id, userId)` — 전체 섹션 include 조회
- `listResumes(userId)` — 목록 조회
- `updateResume(id, userId, data)` — 메타(title, template) 수정
- `deleteResume(id, userId)` — cascade 삭제
- `upsertPersonalInfo(resumeId, userId, data)` — 개인정보 upsert
- `replaceEducations(resumeId, userId, data)` — 학력 전체 교체
- `replaceExperiences(resumeId, userId, data)` — 경력 전체 교체
- `replaceSkills(resumeId, userId, data)` — 기술 전체 교체
- `replaceProjects(resumeId, userId, data)` — 프로젝트 전체 교체
- `replaceCertifications(resumeId, userId, data)` — 자격증 전체 교체

**커스텀 에러:**
- `ResumeNotFoundError`
- `ResumeForbiddenError`

**배열 섹션 교체 패턴:**
```typescript
async function replaceEducations(resumeId: string, userId: string, data: Education[]) {
  await verifyOwnership(resumeId, userId)
  return prisma.$transaction(async (tx) => {
    await tx.education.deleteMany({ where: { resumeId } })
    if (data.length > 0) {
      await tx.education.createMany({
        data: data.map((item, index) => ({
          ...item,
          resumeId,
          sortOrder: index,
        })),
      })
    }
    return tx.education.findMany({ where: { resumeId }, orderBy: { sortOrder: "asc" } })
  })
}
```

**섹션 API 응답:** 갱신된 섹션 데이터를 반환한다 (자동 저장 확인 및 클라이언트 상태 동기화용).
```

## 3. 유효성 검증

### `lib/validations/resume.ts`

원본 스펙의 Zod 스키마를 기반으로 하되, 다음 조정 적용:

- `id`, `sortOrder` 필드는 클라이언트 입력에서 **제외** (서버에서 관리: 배열 교체 전략 + 인덱스 기반 순서)
- 날짜 필드(`startDate`, `endDate` 등)는 `z.string().transform(v => new Date(v))` 또는 빈 문자열 시 `null` 변환 적용 (Prisma `DateTime?` 타입과 매칭)
- `personalInfoSchema`의 `email`은 `z.string().email()` **필수** (Prisma 스키마 `String` 타입과 일치)

**스키마 목록:**
- `personalInfoSchema` — name(필수), email(필수, email 형식), phone, address, bio
- `educationSchema` — school(필수), degree, field, startDate, endDate, description
- `experienceSchema` — company(필수), position(필수), startDate, endDate, isCurrent, description
- `skillSchema` — name(필수), level(enum), category(enum)
- `projectSchema` — name(필수), role, startDate, endDate, description, url
- `certificationSchema` — name(필수), issuer, issueDate, expiryDate
- `createResumeSchema` — title(필수), template(enum, default "classic")
- `updateResumeSchema` — title(optional), template(optional)

## 4. 페이지 구조

### `app/(dashboard)/resumes/page.tsx` — 목록

- Server Component
- 카드 그리드: 제목 + 템플릿 배지 + 수정일
- 상단: "새 이력서" 버튼 → `/resumes/new`
- 빈 상태 처리

### `app/(dashboard)/resumes/new/page.tsx` — 생성

- 제목 입력 + 템플릿 선택 카드 3종 (미리보기 썸네일)
- 생성 → `/resumes/[id]`로 리다이렉트

### `app/(dashboard)/resumes/[id]/page.tsx` — 편집

- Server Component에서 전체 데이터 fetch → `ResumeEditor` 클라이언트 컴포넌트에 전달

### `app/(dashboard)/resumes/[id]/preview/page.tsx` — 전체 화면 미리보기

- Server Component에서 DB 데이터 fetch
- 템플릿 전환 Select + PDF 다운로드 버튼
- A4 비율 렌더링

## 5. 편집 페이지 (ResumeEditor)

### 레이아웃

- 상단: 제목 인라인 수정 + 템플릿 Select + 저장 상태 인디케이터 + 미리보기 토글 + 전체 미리보기 링크
- 본문: 좌측 탭 에디터 + 우측 사이드 패널 미리보기 (토글)
- 하단: 수동 저장 버튼

### 탭 구성

| 탭 | 에디터 컴포넌트 |
|----|----------------|
| 개인정보 | `PersonalInfoEditor` |
| 학력 | `EducationEditor` |
| 경력 | `ExperienceEditor` |
| 기술 | `SkillEditor` |
| 프로젝트 | `ProjectEditor` |
| 자격증 | `CertificationEditor` |

### 저장 로직 (3단 구조)

1. **실시간 자동 저장**: 입력 변경 시 debounce(1초) 후 해당 섹션 API PUT
2. **탭 전환 시**: 현재 탭에 미저장 변경이 있으면 즉시 저장
3. **수동 저장 버튼**: 현재 탭 즉시 저장 + toast 알림

### 저장 상태 인디케이터

- "저장 중..." / "저장됨" / "저장 실패" 표시 (상단 헤더)

## 6. 섹션 에디터 컴포넌트

### 공통

- `"use client"` 컴포넌트
- `onChange(data)` 콜백으로 상위에 변경 알림
- 기존 프로젝트 패턴: useState 직접 관리 (react-hook-form 미사용)

### 배열 섹션 공통 (`sortable-section.tsx`)

- `@dnd-kit/sortable` 기반 드래그 앤 드롭 래퍼
- 각 항목에 드래그 핸들 + 삭제 버튼
- "항목 추가" 버튼 → 빈 항목 append
- sortOrder는 배열 인덱스 기반 자동 계산

### 에디터별 필드

| 에디터 | 필드 |
|---|---|
| `personal-info-editor.tsx` | 이름, 이메일, 전화번호, 주소, 자기소개(Textarea) |
| `education-editor.tsx` | 학교명, 학위, 전공, 시작일, 종료일, 설명 |
| `experience-editor.tsx` | 회사명, 직위, 시작일, 종료일, 재직중(Checkbox), 설명 |
| `skill-editor.tsx` | 기술명, 숙련도(Select: beginner~expert), 카테고리(Select: language/framework/tool/other) |
| `project-editor.tsx` | 프로젝트명, 역할, 시작일, 종료일, 설명, URL |
| `certification-editor.tsx` | 자격증명, 발급기관, 취득일, 만료일 |

## 7. 미리보기 & 웹 템플릿

### 사이드 패널 (`resume-preview-panel.tsx`)

- 편집 페이지 우측에 토글 표시
- 클라이언트 상태를 직접 사용하여 실시간 반영
- 템플릿 전환 Select
- A4 비율 축소 렌더링

### 웹 템플릿 3종

#### `classic-template.tsx`

- 단일 컬럼
- 상단 중앙 정렬 이름 + 연락처
- 섹션별 하단 구분선
- 보수적 스타일

#### `modern-template.tsx`

- 2컬럼 (좌: 개인정보/기술/자격증, 우: 경력/학력/프로젝트)
- 좌측 어두운 배경 + 컬러 포인트 (#3b82f6)
- 기술 숙련도 진행 바
- 타임라인 스타일 경력 표시

#### `minimal-template.tsx`

- 단일 컬럼
- 넓은 여백, 가벼운 font-weight
- uppercase 소형 섹션 라벨
- 최소 장식, 타이포그래피 중심

## 8. PDF 생성

### 폰트

- **Pretendard** Regular (400) + Bold (700)
- `public/fonts/Pretendard-Regular.ttf`, `public/fonts/Pretendard-Bold.ttf`
- `components/resumes/pdf/font-register.ts`에서 `Font.register()` 호출

### PDF 템플릿

- `classic-pdf.tsx`, `modern-pdf.tsx`, `minimal-pdf.tsx`
- `@react-pdf/renderer`의 `Document`, `Page`, `View`, `Text`, `StyleSheet` 사용
- 웹 템플릿과 동일한 레이아웃을 PDF 컴포넌트로 재구현

### PDF API

`GET /api/resumes/[id]/pdf?template=classic`

- `export const runtime = "nodejs"` (react-pdf는 Edge runtime 미지원)
- Pretendard 폰트 파일: [GitHub Releases](https://github.com/orioncactus/pretendard/releases)에서 ttf 다운로드 → `public/fonts/` 배치 (OFL 라이선스)

```typescript
import { renderToBuffer } from "@react-pdf/renderer"

const buffer = await renderToBuffer(<TemplatePdf resume={resume} />)
const encodedFilename = encodeURIComponent(resume.title)
return new Response(buffer, {
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="resume.pdf"; filename*=UTF-8''${encodedFilename}.pdf`,
  },
})
```

## 9. 파일 구조

```
신규:
  lib/validations/resume.ts
  lib/resumes/service.ts
  app/api/resumes/route.ts                          # POST
  app/api/resumes/[id]/route.ts                     # GET, PUT, DELETE
  app/api/resumes/[id]/personal-info/route.ts       # PUT
  app/api/resumes/[id]/educations/route.ts          # PUT
  app/api/resumes/[id]/experiences/route.ts         # PUT
  app/api/resumes/[id]/skills/route.ts              # PUT
  app/api/resumes/[id]/projects/route.ts            # PUT
  app/api/resumes/[id]/certifications/route.ts      # PUT
  app/api/resumes/[id]/pdf/route.ts                 # GET
  app/(dashboard)/resumes/page.tsx
  app/(dashboard)/resumes/new/page.tsx
  app/(dashboard)/resumes/[id]/page.tsx
  app/(dashboard)/resumes/[id]/preview/page.tsx
  components/resumes/resume-editor.tsx
  components/resumes/resume-preview-panel.tsx
  components/resumes/sortable-section.tsx
  components/resumes/section-editors/personal-info-editor.tsx
  components/resumes/section-editors/education-editor.tsx
  components/resumes/section-editors/experience-editor.tsx
  components/resumes/section-editors/skill-editor.tsx
  components/resumes/section-editors/project-editor.tsx
  components/resumes/section-editors/certification-editor.tsx
  components/resumes/templates/classic-template.tsx
  components/resumes/templates/modern-template.tsx
  components/resumes/templates/minimal-template.tsx
  components/resumes/pdf/font-register.ts
  components/resumes/pdf/classic-pdf.tsx
  components/resumes/pdf/modern-pdf.tsx
  components/resumes/pdf/minimal-pdf.tsx

수정:
  없음 (네비게이션에 /resumes 이미 등록됨)
```
