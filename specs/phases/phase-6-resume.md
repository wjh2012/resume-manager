# Phase 6: 이력서 빌더 & PDF 내보내기

## 목표

구조화된 이력서를 CRUD로 관리하고, 3종의 템플릿으로 웹 미리보기 + PDF 다운로드를 제공한다.

## 완료 기준

- [ ] 이력서 CRUD API (섹션별 데이터 포함)
- [ ] 섹션별 에디터 (개인정보, 학력, 경력, 기술, 프로젝트, 자격증)
- [ ] 웹 미리보기 템플릿 3종 (classic, modern, minimal)
- [ ] PDF 템플릿 3종 + PDF 생성 API
- [ ] 한국어 PDF 렌더링 (Noto Sans KR)
- [ ] 목록/생성/편집/미리보기 페이지

## 의존성

- Phase 0 완료 (기반 인프라)
- PDF 생성은 다른 phase와 독립적이므로 Phase 1~5와 병렬 가능

## 설치할 패키지

```bash
npm install @react-pdf/renderer
```

## 생성/수정할 파일

```
신규:
  app/api/resumes/route.ts
  app/api/resumes/[id]/route.ts
  app/api/resumes/[id]/pdf/route.ts
  app/(dashboard)/resumes/page.tsx
  app/(dashboard)/resumes/new/page.tsx
  app/(dashboard)/resumes/[id]/page.tsx
  app/(dashboard)/resumes/[id]/preview/page.tsx
  components/resumes/resume-form.tsx
  components/resumes/section-editors/personal-info-editor.tsx
  components/resumes/section-editors/education-editor.tsx
  components/resumes/section-editors/experience-editor.tsx
  components/resumes/section-editors/skill-editor.tsx
  components/resumes/section-editors/project-editor.tsx
  components/resumes/section-editors/certification-editor.tsx
  components/resumes/templates/classic-template.tsx
  components/resumes/templates/modern-template.tsx
  components/resumes/templates/minimal-template.tsx
  components/resumes/pdf/classic-pdf.tsx
  components/resumes/pdf/modern-pdf.tsx
  components/resumes/pdf/minimal-pdf.tsx
  components/resumes/pdf/font-register.ts
  lib/validations/resume.ts

수정:
  없음
```

## 상세 구현 단계

### 1. 유효성 검증 스키마

#### `lib/validations/resume.ts`

```typescript
import { z } from "zod"

export const personalInfoSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  bio: z.string().optional(),
})

export const educationSchema = z.object({
  id: z.string().uuid().optional(), // 기존 항목 수정 시
  school: z.string().min(1),
  degree: z.string().optional(),
  field: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  sortOrder: z.number().default(0),
})

export const experienceSchema = z.object({
  id: z.string().uuid().optional(),
  company: z.string().min(1),
  position: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().default(false),
  description: z.string().optional(),
  sortOrder: z.number().default(0),
})

export const skillSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  level: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
  category: z.enum(["language", "framework", "tool", "other"]).optional(),
  sortOrder: z.number().default(0),
})

export const projectSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  role: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  url: z.string().url().optional().or(z.literal("")),
  sortOrder: z.number().default(0),
})

export const certificationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  issuer: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  sortOrder: z.number().default(0),
})

export const createResumeSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  template: z.enum(["classic", "modern", "minimal"]).default("classic"),
})

export const updateResumeSchema = z.object({
  title: z.string().min(1).optional(),
  template: z.enum(["classic", "modern", "minimal"]).optional(),
  personalInfo: personalInfoSchema.optional(),
  educations: z.array(educationSchema).optional(),
  experiences: z.array(experienceSchema).optional(),
  skills: z.array(skillSchema).optional(),
  projects: z.array(projectSchema).optional(),
  certifications: z.array(certificationSchema).optional(),
})
```

### 2. 이력서 CRUD API

#### `POST /api/resumes`

- 빈 이력서 생성 (제목 + 템플릿)

#### `GET /api/resumes`

- 사용자의 이력서 목록

#### `GET /api/resumes/[id]`

- 이력서 상세 (모든 하위 섹션 include)

#### `PUT /api/resumes/[id]`

- 트랜잭션으로 전체 업데이트:
  1. 이력서 메타 (title, template) 업데이트
  2. personalInfo: upsert
  3. educations, experiences, skills, projects, certifications:
     - 기존 항목 중 요청에 없는 것 삭제
     - id가 있으면 update, 없으면 create

```typescript
await prisma.$transaction(async (tx) => {
  // 이력서 메타 업데이트
  await tx.resume.update({ where: { id }, data: { title, template } })

  // personalInfo upsert
  if (personalInfo) {
    await tx.personalInfo.upsert({
      where: { resumeId: id },
      create: { resumeId: id, ...personalInfo },
      update: personalInfo,
    })
  }

  // 배열 섹션: deleteMany + createMany (단순화)
  // 또는 diff 기반 upsert
  if (educations) {
    await tx.education.deleteMany({ where: { resumeId: id } })
    await tx.education.createMany({
      data: educations.map(e => ({ ...e, id: undefined, resumeId: id })),
    })
  }
  // ... 나머지 섹션 동일
})
```

#### `DELETE /api/resumes/[id]`

- Cascade 삭제

### 3. 섹션별 에디터

각 에디터는 `"use client"` 컴포넌트.

#### `personal-info-editor.tsx`

- 이름, 이메일, 전화번호, 주소, 자기소개 입력 필드
- 폼 상태 관리 (controlled)

#### `education-editor.tsx`

- 학력 항목 리스트 (동적 추가/삭제)
- 각 항목: 학교명, 학위, 전공, 기간
- 드래그앤드롭 정렬 (선택, sortOrder 기반)
- "학력 추가" 버튼

#### `experience-editor.tsx`

- 경력 항목 리스트
- 각 항목: 회사명, 직위, 기간, 재직 중 체크박스, 설명
- "경력 추가" 버튼

#### `skill-editor.tsx`

- 기술 항목 리스트
- 각 항목: 기술명, 숙련도 (Select), 카테고리 (Select)
- "기술 추가" 버튼

#### `project-editor.tsx`

- 프로젝트 항목 리스트
- 각 항목: 프로젝트명, 역할, 기간, 설명, URL
- "프로젝트 추가" 버튼

#### `certification-editor.tsx`

- 자격증 항목 리스트
- 각 항목: 자격증명, 발급기관, 취득일, 만료일
- "자격증 추가" 버튼

### 4. 이력서 편집 페이지

#### `app/(dashboard)/resumes/[id]/page.tsx`

탭 기반 레이아웃:

| 탭 | 내용 |
|----|------|
| 개인정보 | PersonalInfoEditor |
| 학력 | EducationEditor |
| 경력 | ExperienceEditor |
| 기술 | SkillEditor |
| 프로젝트 | ProjectEditor |
| 자격증 | CertificationEditor |

- 상단: 이력서 제목 (인라인 수정) + 템플릿 선택 (Select) + 저장 버튼 + 미리보기 링크
- 하단: 저장 버튼 (전체 데이터 PUT)

### 5. 웹 미리보기 템플릿

A4 비율의 웹 미리보기. 실제 인쇄/PDF와 유사한 레이아웃.

#### `classic-template.tsx`

- 전통적인 이력서 레이아웃
- 단일 컬럼
- 명확한 섹션 구분 (하단 선)
- 보수적인 스타일

#### `modern-template.tsx`

- 2컬럼 레이아웃 (좌: 개인정보/기술, 우: 경력/학력/프로젝트)
- 컬러 포인트
- 진행 바 형태 기술 숙련도

#### `minimal-template.tsx`

- 최소한의 장식
- 넓은 여백
- 깔끔한 타이포그래피 중심

#### `app/(dashboard)/resumes/[id]/preview/page.tsx`

- 템플릿 전환 Select
- A4 비율 미리보기 영역
- PDF 다운로드 버튼

### 6. PDF 생성

#### `components/resumes/pdf/font-register.ts`

```typescript
import { Font } from "@react-pdf/renderer"

Font.register({
  family: "NotoSansKR",
  fonts: [
    { src: "/fonts/NotoSansKR-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/NotoSansKR-Bold.ttf", fontWeight: 700 },
  ],
})
```

> `public/fonts/`에 Noto Sans KR ttf 파일을 배치한다.

#### PDF 템플릿 (`classic-pdf.tsx`, `modern-pdf.tsx`, `minimal-pdf.tsx`)

`@react-pdf/renderer`의 `Document`, `Page`, `View`, `Text` 등을 사용하여 웹 템플릿과 동일한 레이아웃을 구현한다.

```typescript
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer"

export function ClassicPdfTemplate({ resume }: { resume: ResumeData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 개인정보 섹션 */}
        {/* 학력 섹션 */}
        {/* 경력 섹션 */}
        {/* ... */}
      </Page>
    </Document>
  )
}
```

#### `GET /api/resumes/[id]/pdf`

```typescript
import { renderToBuffer } from "@react-pdf/renderer"

export async function GET(req, { params }) {
  // 1. 이력서 데이터 로드
  // 2. 템플릿 선택
  // 3. PDF 렌더링
  const buffer = await renderToBuffer(<ClassicPdfTemplate resume={resume} />)

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${resume.title}.pdf"`,
    },
  })
}
```

### 7. 목록/생성 페이지

#### `app/(dashboard)/resumes/page.tsx`

- 상단: "새 이력서" 버튼 → `/resumes/new`
- 카드 그리드: 제목 + 템플릿 배지 + 수정일
- 빈 상태

#### `app/(dashboard)/resumes/new/page.tsx`

- 제목 입력 + 템플릿 선택 (3종 미리보기 카드)
- 생성 → `/resumes/[id]`로 리다이렉트

## 검증 방법

1. 새 이력서 생성 → 각 탭에서 데이터 입력 → 저장
2. 미리보기에서 3종 템플릿 전환 확인
3. PDF 다운로드 → 한국어 정상 렌더링 확인
4. PDF 내용이 웹 미리보기와 일치하는지 확인
5. 이력서 목록 → 수정 → 삭제 동작 확인
6. 섹션 추가/삭제/정렬 동작 확인
