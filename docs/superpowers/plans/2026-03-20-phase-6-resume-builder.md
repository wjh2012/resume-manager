# Phase 6: 이력서 빌더 & PDF 내보내기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 구조화된 이력서를 섹션별 API로 CRUD 관리하고, 3종 템플릿으로 웹 미리보기 + Pretendard 폰트 PDF 다운로드를 제공한다.

**Architecture:** 섹션별 독립 API (`/api/resumes/[id]/<section>`) + 서비스 레이어 (`lib/resumes/service.ts`) + 클라이언트 에디터 (탭 기반, `@dnd-kit` 정렬, debounce 자동 저장) + 웹/PDF 템플릿 3종. Server Component에서 데이터 fetch, Client Component에서 편집.

**Tech Stack:** Next.js App Router, Prisma, Zod, `@react-pdf/renderer`, `@dnd-kit/core` + `@dnd-kit/sortable`, Pretendard font, shadcn/ui (Tabs, Card, Select, Input, Textarea, Checkbox, Button, AlertDialog, Badge)

**Design Spec:** `docs/superpowers/specs/2026-03-20-phase-6-resume-builder-design.md`

---

## File Structure

```
신규:
  lib/validations/resume.ts                         — Zod 스키마 (섹션별 + 이력서 메타)
  lib/resumes/service.ts                            — 서비스 레이어 (CRUD + 섹션 교체)
  app/api/resumes/route.ts                          — POST (이력서 생성)
  app/api/resumes/[id]/route.ts                     — GET, PUT, DELETE (이력서 CRUD)
  app/api/resumes/[id]/personal-info/route.ts       — PUT (개인정보 upsert)
  app/api/resumes/[id]/educations/route.ts          — PUT (학력 교체)
  app/api/resumes/[id]/experiences/route.ts         — PUT (경력 교체)
  app/api/resumes/[id]/skills/route.ts              — PUT (기술 교체)
  app/api/resumes/[id]/projects/route.ts            — PUT (프로젝트 교체)
  app/api/resumes/[id]/certifications/route.ts      — PUT (자격증 교체)
  app/api/resumes/[id]/pdf/route.ts                 — GET (PDF 다운로드)
  app/(dashboard)/resumes/page.tsx                  — 목록 페이지 (SC)
  app/(dashboard)/resumes/new/page.tsx              — 생성 페이지
  app/(dashboard)/resumes/[id]/page.tsx             — 편집 페이지 (SC → ResumeEditor)
  app/(dashboard)/resumes/[id]/preview/page.tsx     — 전체 미리보기 페이지
  components/resumes/types.ts                       — ResumeData 공유 타입 (웹/PDF 템플릿, 에디터, 미리보기 공용)
  components/resumes/resume-list.tsx                — 이력서 목록 CC
  components/resumes/resume-card.tsx                — 이력서 카드
  components/resumes/resume-create-form.tsx          — 생성 폼
  components/resumes/resume-editor.tsx              — 편집기 메인 (탭 + 저장 로직)
  components/resumes/resume-preview-panel.tsx        — 사이드 미리보기 패널
  components/resumes/sortable-section.tsx            — dnd-kit 드래그 정렬 래퍼
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

---

## Task 1: 패키지 설치 & 폰트 준비

**Files:**
- Modify: `package.json`
- Create: `public/fonts/Pretendard-Regular.ttf`
- Create: `public/fonts/Pretendard-Bold.ttf`

- [ ] **Step 1: npm 패키지 설치**

```bash
npm install @react-pdf/renderer @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Pretendard 폰트 다운로드**

GitHub Releases(https://github.com/orioncactus/pretendard/releases)에서 Pretendard-Regular.ttf, Pretendard-Bold.ttf를 다운로드하여 `public/fonts/`에 배치한다. 파일이 너무 크면 CDN URL 사용 방식으로 전환 (font-register.ts에서 URL 지정).

```bash
ls public/fonts/
# Pretendard-Regular.ttf  Pretendard-Bold.ttf
```

- [ ] **Step 3: 커밋**

```bash
git add package.json package-lock.json public/fonts/
git commit -m "chore: add @react-pdf/renderer, @dnd-kit, Pretendard fonts for phase-6"
```

---

## Task 2: Zod 유효성 검증 스키마

**Files:**
- Create: `lib/validations/resume.ts`

- [ ] **Step 1: 유효성 검증 스키마 작성**

```typescript
import { z } from "zod"

// 날짜 필드: 빈 문자열/undefined → null, 유효한 날짜 → Date, 잘못된 값 → 에러
const optionalDate = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (!v || v.trim() === "") return null
    const d = new Date(v)
    if (isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "올바른 날짜 형식이 아닙니다." })
      return z.NEVER
    }
    return d
  })

export const personalInfoSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요."),
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
  phone: z.string().optional(),
  address: z.string().optional(),
  bio: z.string().optional(),
})

export const educationSchema = z.object({
  school: z.string().min(1, "학교명을 입력해주세요."),
  degree: z.string().optional(),
  field: z.string().optional(),
  startDate: optionalDate,
  endDate: optionalDate,
  description: z.string().optional(),
})

export const experienceSchema = z.object({
  company: z.string().min(1, "회사명을 입력해주세요."),
  position: z.string().min(1, "직위를 입력해주세요."),
  startDate: optionalDate,
  endDate: optionalDate,
  isCurrent: z.boolean().default(false),
  description: z.string().optional(),
})

export const skillSchema = z.object({
  name: z.string().min(1, "기술명을 입력해주세요."),
  level: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
  category: z.enum(["language", "framework", "tool", "other"]).optional(),
})

export const projectSchema = z.object({
  name: z.string().min(1, "프로젝트명을 입력해주세요."),
  role: z.string().optional(),
  startDate: optionalDate,
  endDate: optionalDate,
  description: z.string().optional(),
  url: z.string().url("올바른 URL 형식이 아닙니다.").optional().or(z.literal("")),
})

export const certificationSchema = z.object({
  name: z.string().min(1, "자격증명을 입력해주세요."),
  issuer: z.string().optional(),
  issueDate: optionalDate,
  expiryDate: optionalDate,
})

export const createResumeSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요.").max(100, "제목은 100자 이하로 입력해주세요."),
  template: z.enum(["classic", "modern", "minimal"]).default("classic"),
})

export const updateResumeSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요.").max(100).optional(),
  template: z.enum(["classic", "modern", "minimal"]).optional(),
})

// 배열 섹션용 래퍼
export const educationsSchema = z.object({ items: z.array(educationSchema) })
export const experiencesSchema = z.object({ items: z.array(experienceSchema) })
export const skillsSchema = z.object({ items: z.array(skillSchema) })
export const projectsSchema = z.object({ items: z.array(projectSchema) })
export const certificationsSchema = z.object({ items: z.array(certificationSchema) })
```

- [ ] **Step 2: typecheck 확인**

```bash
npm run typecheck
```

- [ ] **Step 3: 커밋**

```bash
git add lib/validations/resume.ts
git commit -m "feat(resume): add Zod validation schemas"
```

---

## Task 3: 서비스 레이어

**Files:**
- Create: `lib/resumes/service.ts`

- [ ] **Step 1: 서비스 레이어 작성**

```typescript
import { prisma } from "@/lib/prisma"
import type { z } from "zod"
import type {
  personalInfoSchema,
  educationSchema,
  experienceSchema,
  skillSchema,
  projectSchema,
  certificationSchema,
} from "@/lib/validations/resume"

export class ResumeNotFoundError extends Error {
  constructor() {
    super("이력서를 찾을 수 없습니다.")
  }
}

export class ResumeForbiddenError extends Error {
  constructor() {
    super("이 이력서에 대한 권한이 없습니다.")
  }
}

// 소유권 검증 헬퍼 (트랜잭션 내에서도 사용 가능하도록 tx 선택적 인자)
async function verifyOwnership(
  resumeId: string,
  userId: string,
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0] = prisma,
) {
  const resume = await tx.resume.findUnique({
    where: { id: resumeId },
    select: { userId: true },
  })
  if (!resume) throw new ResumeNotFoundError()
  if (resume.userId !== userId) throw new ResumeForbiddenError()
}

// --- 이력서 CRUD ---

interface CreateResumeData {
  title: string
  template?: string
}

export async function createResume(userId: string, data: CreateResumeData) {
  return prisma.resume.create({
    data: {
      userId,
      title: data.title,
      template: data.template ?? "classic",
    },
    select: { id: true },
  })
}

// GET: 404/403 모두 null 반환 (cover-letter 패턴과 동일, API route에서 404 처리)
export async function getResume(id: string, userId: string) {
  const resume = await prisma.resume.findUnique({
    where: { id },
    include: {
      personalInfo: true,
      educations: { orderBy: { sortOrder: "asc" } },
      experiences: { orderBy: { sortOrder: "asc" } },
      skills: { orderBy: { sortOrder: "asc" } },
      projects: { orderBy: { sortOrder: "asc" } },
      certifications: { orderBy: { sortOrder: "asc" } },
    },
  })
  if (!resume) return null
  if (resume.userId !== userId) return null
  return resume
}

export async function listResumes(userId: string) {
  return prisma.resume.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      template: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  })
}

interface UpdateResumeData {
  title?: string
  template?: string
}

export async function updateResume(id: string, userId: string, data: UpdateResumeData) {
  return prisma.$transaction(async (tx) => {
    await verifyOwnership(id, userId, tx)
    return tx.resume.update({
      where: { id },
      data,
      select: { id: true, title: true, template: true, updatedAt: true },
    })
  })
}

export async function deleteResume(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    await verifyOwnership(id, userId, tx)
    await tx.resume.delete({ where: { id } })
  })
}

// --- 섹션별 교체 ---

type PersonalInfoInput = z.infer<typeof personalInfoSchema>

export async function upsertPersonalInfo(resumeId: string, userId: string, data: PersonalInfoInput) {
  return prisma.$transaction(async (tx) => {
    await verifyOwnership(resumeId, userId, tx)
    return tx.personalInfo.upsert({
      where: { resumeId },
      create: { resumeId, ...data },
      update: data,
    })
  })
}

type EducationInput = z.infer<typeof educationSchema>

export async function replaceEducations(resumeId: string, userId: string, items: EducationInput[]) {
  return prisma.$transaction(async (tx) => {
    await verifyOwnership(resumeId, userId, tx)
    await tx.education.deleteMany({ where: { resumeId } })
    if (items.length > 0) {
      await tx.education.createMany({
        data: items.map((item, index) => ({ ...item, resumeId, sortOrder: index })),
      })
    }
    return tx.education.findMany({ where: { resumeId }, orderBy: { sortOrder: "asc" } })
  })
}

type ExperienceInput = z.infer<typeof experienceSchema>

export async function replaceExperiences(resumeId: string, userId: string, items: ExperienceInput[]) {
  return prisma.$transaction(async (tx) => {
    await verifyOwnership(resumeId, userId, tx)
    await tx.experience.deleteMany({ where: { resumeId } })
    if (items.length > 0) {
      await tx.experience.createMany({
        data: items.map((item, index) => ({ ...item, resumeId, sortOrder: index })),
      })
    }
    return tx.experience.findMany({ where: { resumeId }, orderBy: { sortOrder: "asc" } })
  })
}

type SkillInput = z.infer<typeof skillSchema>

export async function replaceSkills(resumeId: string, userId: string, items: SkillInput[]) {
  return prisma.$transaction(async (tx) => {
    await verifyOwnership(resumeId, userId, tx)
    await tx.skill.deleteMany({ where: { resumeId } })
    if (items.length > 0) {
      await tx.skill.createMany({
        data: items.map((item, index) => ({ ...item, resumeId, sortOrder: index })),
      })
    }
    return tx.skill.findMany({ where: { resumeId }, orderBy: { sortOrder: "asc" } })
  })
}

type ProjectInput = z.infer<typeof projectSchema>

export async function replaceProjects(resumeId: string, userId: string, items: ProjectInput[]) {
  return prisma.$transaction(async (tx) => {
    await verifyOwnership(resumeId, userId, tx)
    await tx.project.deleteMany({ where: { resumeId } })
    if (items.length > 0) {
      await tx.project.createMany({
        data: items.map((item, index) => ({
          ...item,
          url: item.url || null,
          resumeId,
          sortOrder: index,
        })),
      })
    }
    return tx.project.findMany({ where: { resumeId }, orderBy: { sortOrder: "asc" } })
  })
}

type CertificationInput = z.infer<typeof certificationSchema>

export async function replaceCertifications(resumeId: string, userId: string, items: CertificationInput[]) {
  return prisma.$transaction(async (tx) => {
    await verifyOwnership(resumeId, userId, tx)
    await tx.certification.deleteMany({ where: { resumeId } })
    if (items.length > 0) {
      await tx.certification.createMany({
        data: items.map((item, index) => ({ ...item, resumeId, sortOrder: index })),
      })
    }
    return tx.certification.findMany({ where: { resumeId }, orderBy: { sortOrder: "asc" } })
  })
}
```

- [ ] **Step 2: typecheck 확인**

```bash
npm run typecheck
```

- [ ] **Step 3: 커밋**

```bash
git add lib/resumes/service.ts
git commit -m "feat(resume): add service layer with CRUD and section replacement"
```

---

## Task 4: API 라우트 — 이력서 CRUD

**Files:**
- Create: `app/api/resumes/route.ts`
- Create: `app/api/resumes/[id]/route.ts`

- [ ] **Step 1: POST /api/resumes 작성**

`app/api/resumes/route.ts` — 기존 `cover-letters/route.ts` 패턴 동일:
- `createClient()` → auth 확인 → body 파싱 → `createResumeSchema.safeParse()` → `createResume()` 호출 → 201 응답

- [ ] **Step 2: GET/PUT/DELETE /api/resumes/[id] 작성**

`app/api/resumes/[id]/route.ts` — 기존 `cover-letters/[id]/route.ts` 패턴 동일:
- UUID 검증 → auth → 서비스 호출 → 에러 핸들링
- GET: `getResume()` → null이면 404 (not found와 forbidden 모두 null 반환, cover-letter 패턴 동일)
- PUT/DELETE: ResumeNotFoundError → 404, ResumeForbiddenError → 403

- [ ] **Step 3: typecheck + lint**

```bash
npm run typecheck && npm run lint
```

- [ ] **Step 4: 커밋**

```bash
git add app/api/resumes/
git commit -m "feat(resume): add resume CRUD API routes"
```

---

## Task 5: API 라우트 — 섹션별 PUT

**Files:**
- Create: `app/api/resumes/[id]/personal-info/route.ts`
- Create: `app/api/resumes/[id]/educations/route.ts`
- Create: `app/api/resumes/[id]/experiences/route.ts`
- Create: `app/api/resumes/[id]/skills/route.ts`
- Create: `app/api/resumes/[id]/projects/route.ts`
- Create: `app/api/resumes/[id]/certifications/route.ts`

- [ ] **Step 1: 개인정보 PUT 작성**

`app/api/resumes/[id]/personal-info/route.ts`:
- auth → UUID 검증 → `personalInfoSchema.safeParse()` → `upsertPersonalInfo()` → 응답

- [ ] **Step 2: 배열 섹션 PUT 5개 작성**

각 route 패턴 동일:
- auth → UUID 검증 → `{section}sSchema.safeParse()` → `replace{Section}s(resumeId, userId, parsed.data.items)` → 응답

educations, experiences, skills, projects, certifications 각각.

- [ ] **Step 3: typecheck + lint**

```bash
npm run typecheck && npm run lint
```

- [ ] **Step 4: 커밋**

```bash
git add app/api/resumes/[id]/
git commit -m "feat(resume): add section-level PUT API routes"
```

---

## Task 6: 목록 & 생성 페이지

**Files:**
- Create: `app/(dashboard)/resumes/page.tsx`
- Create: `components/resumes/resume-list.tsx`
- Create: `components/resumes/resume-card.tsx`
- Create: `app/(dashboard)/resumes/new/page.tsx`
- Create: `components/resumes/resume-create-form.tsx`

- [ ] **Step 1: 이력서 카드 컴포넌트 작성**

`components/resumes/resume-card.tsx` — `cover-letter-card.tsx` 패턴:

```typescript
interface ResumeCardProps {
  resume: {
    id: string
    title: string
    template: string
    createdAt: string
    updatedAt: string
  }
  onDelete: (id: string) => void
  isDeleting?: boolean
}
```

- Card + Link 래핑, title + template Badge (classic/modern/minimal) + updatedAt 표시
- 삭제 버튼 + AlertDialog 확인

- [ ] **Step 2: 이력서 목록 컴포넌트 작성**

`components/resumes/resume-list.tsx` — `cover-letter-list.tsx` 패턴:

```typescript
interface ResumeListProps {
  resumes: {
    id: string
    title: string
    template: string
    createdAt: string
    updatedAt: string
  }[]
}
```

- `useOptimistic` + `useTransition`으로 낙관적 삭제
- 빈 상태: FileCheck 아이콘 + 안내 메시지
- 그리드 레이아웃 (1/2/3 cols)

- [ ] **Step 3: 목록 페이지 작성**

`app/(dashboard)/resumes/page.tsx` — `cover-letters/page.tsx` 패턴:
- SC에서 `getAuthUser()` → `listResumes()` → 날짜 serialization → Suspense + ResumeList
- Suspense fallback: 로딩 텍스트 (insights 페이지 패턴)

- [ ] **Step 4: 생성 폼 컴포넌트 작성**

`components/resumes/resume-create-form.tsx`:
- 제목 Input + 템플릿 선택 (3종 카드) + 생성 버튼
- `fetch POST /api/resumes` → `router.push(/resumes/${id})`

- [ ] **Step 5: 생성 페이지 작성**

`app/(dashboard)/resumes/new/page.tsx`:
- SC, `getAuthUser()` 확인 → `ResumeCreateForm` 렌더링

- [ ] **Step 6: typecheck + lint + 커밋**

```bash
npm run typecheck && npm run lint
git add app/\(dashboard\)/resumes/ components/resumes/resume-list.tsx components/resumes/resume-card.tsx components/resumes/resume-create-form.tsx
git commit -m "feat(resume): add list and create pages with components"
```

---

## Task 7: 섹션 에디터 — 개인정보 & 드래그 정렬 래퍼

**Files:**
- Create: `components/resumes/section-editors/personal-info-editor.tsx`
- Create: `components/resumes/sortable-section.tsx`

- [ ] **Step 1: 개인정보 에디터 작성**

`components/resumes/section-editors/personal-info-editor.tsx`:
- `"use client"`, `useState`로 name/email/phone/address/bio 관리
- `onChange(data)` 콜백으로 상위에 변경 알림
- Input/Textarea 사용, 기존 `cover-letter-form.tsx` 스타일 준수

- [ ] **Step 2: 드래그 정렬 래퍼 작성**

`components/resumes/sortable-section.tsx`:
- `@dnd-kit/core` DndContext + `@dnd-kit/sortable` SortableContext
- `useSortable` 훅으로 각 항목 래핑
- 드래그 핸들 (GripVertical 아이콘) + 삭제 버튼 (Trash2)
- "항목 추가" 버튼
- `onReorder(items)` 콜백
- Props: `items`, `onReorder`, `onAdd`, `onRemove`, `renderItem`

- [ ] **Step 3: typecheck + 커밋**

```bash
npm run typecheck && npm run lint
git add components/resumes/section-editors/personal-info-editor.tsx components/resumes/sortable-section.tsx
git commit -m "feat(resume): add personal-info editor and sortable section wrapper"
```

---

## Task 8: 섹션 에디터 — 학력, 경력, 기술

**Files:**
- Create: `components/resumes/section-editors/education-editor.tsx`
- Create: `components/resumes/section-editors/experience-editor.tsx`
- Create: `components/resumes/section-editors/skill-editor.tsx`

- [ ] **Step 1: 학력 에디터 작성**

`education-editor.tsx`:
- SortableSection 래퍼 사용
- 각 항목: school(필수), degree, field, startDate, endDate, description
- Input + date input (type="month" 또는 type="text" with YYYY-MM)

- [ ] **Step 2: 경력 에디터 작성**

`experience-editor.tsx`:
- SortableSection 래퍼 사용
- 각 항목: company(필수), position(필수), startDate, endDate, isCurrent(Checkbox), description
- isCurrent 체크 시 endDate 비활성화

- [ ] **Step 3: 기술 에디터 작성**

`skill-editor.tsx`:
- SortableSection 래퍼 사용
- 각 항목: name(필수), level(Select: beginner/intermediate/advanced/expert), category(Select: language/framework/tool/other)

- [ ] **Step 4: typecheck + 커밋**

```bash
npm run typecheck && npm run lint
git add components/resumes/section-editors/education-editor.tsx components/resumes/section-editors/experience-editor.tsx components/resumes/section-editors/skill-editor.tsx
git commit -m "feat(resume): add education, experience, skill editors"
```

---

## Task 9: 섹션 에디터 — 프로젝트, 자격증

**Files:**
- Create: `components/resumes/section-editors/project-editor.tsx`
- Create: `components/resumes/section-editors/certification-editor.tsx`

- [ ] **Step 1: 프로젝트 에디터 작성**

`project-editor.tsx`:
- SortableSection 래퍼 사용
- 각 항목: name(필수), role, startDate, endDate, description(Textarea), url

- [ ] **Step 2: 자격증 에디터 작성**

`certification-editor.tsx`:
- SortableSection 래퍼 사용
- 각 항목: name(필수), issuer, issueDate, expiryDate

- [ ] **Step 3: typecheck + 커밋**

```bash
npm run typecheck && npm run lint
git add components/resumes/section-editors/project-editor.tsx components/resumes/section-editors/certification-editor.tsx
git commit -m "feat(resume): add project and certification editors"
```

---

## Task 10: 웹 템플릿 3종

**Files:**
- Create: `components/resumes/templates/classic-template.tsx`
- Create: `components/resumes/templates/modern-template.tsx`
- Create: `components/resumes/templates/minimal-template.tsx`

- [ ] **Step 1: 이력서 데이터 타입 정의**

`components/resumes/types.ts`에 `ResumeData` 타입을 정의한다. 웹 템플릿 3종, PDF 템플릿 3종, `resume-editor.tsx`, `resume-preview-panel.tsx` 등 8개+ 파일에서 import하여 사용.

```typescript
// Prisma 모델 기반, 날짜는 클라이언트에서 string으로 직렬화된 상태
export interface ResumeData {
  id: string
  title: string
  template: string
  personalInfo: { name: string; email: string; phone?: string | null; address?: string | null; bio?: string | null } | null
  educations: { id: string; school: string; degree?: string | null; field?: string | null; startDate?: string | null; endDate?: string | null; description?: string | null; sortOrder: number }[]
  experiences: { id: string; company: string; position: string; startDate?: string | null; endDate?: string | null; isCurrent: boolean; description?: string | null; sortOrder: number }[]
  skills: { id: string; name: string; level?: string | null; category?: string | null; sortOrder: number }[]
  projects: { id: string; name: string; role?: string | null; startDate?: string | null; endDate?: string | null; description?: string | null; url?: string | null; sortOrder: number }[]
  certifications: { id: string; name: string; issuer?: string | null; issueDate?: string | null; expiryDate?: string | null; sortOrder: number }[]
}
```

참고: `level`/`category`는 Prisma에서 `String?`이나, 앱 레벨에서 Zod enum으로 제한 (beginner/intermediate/advanced/expert, language/framework/tool/other).

- [ ] **Step 2: Classic 템플릿 작성**

`classic-template.tsx`:
- 단일 컬럼, 상단 중앙 이름+연락처, 섹션 구분선
- A4 비율 (`aspect-[210/297]`)
- Tailwind CSS 스타일링

- [ ] **Step 3: Modern 템플릿 작성**

`modern-template.tsx`:
- 2컬럼 (좌 38%: 개인정보/기술/자격증, 우 62%: 경력/학력/프로젝트)
- 좌측 어두운 배경(slate-800), 컬러 포인트(blue-500)
- 기술 숙련도 진행 바

- [ ] **Step 4: Minimal 템플릿 작성**

`minimal-template.tsx`:
- 단일 컬럼, 넓은 여백
- 가벼운 font-weight, uppercase 섹션 라벨
- 최소 장식

- [ ] **Step 5: typecheck + 커밋**

```bash
npm run typecheck && npm run lint
git add components/resumes/templates/
git commit -m "feat(resume): add classic, modern, minimal web templates"
```

---

## Task 11: 이력서 편집기 (ResumeEditor) + 미리보기 패널

**Files:**
- Create: `components/resumes/resume-editor.tsx`
- Create: `components/resumes/resume-preview-panel.tsx`
- Create: `app/(dashboard)/resumes/[id]/page.tsx`

- [ ] **Step 1: 미리보기 패널 작성**

`resume-preview-panel.tsx`:
- 템플릿 Select (classic/modern/minimal)
- A4 비율 축소 컨테이너 (`scale` transform)
- 선택된 템플릿 컴포넌트 렌더링
- Props: `data` (현재 에디터 상태), `template`

- [ ] **Step 2: ResumeEditor 메인 컴포넌트 작성**

`resume-editor.tsx` — 핵심 컴포넌트:
- 상단 헤더: 제목 인라인 수정 (Input) + 템플릿 Select + 저장 상태 인디케이터 + 미리보기 토글 + 전체 미리보기 Link
- Tabs: 개인정보/학력/경력/기술/프로젝트/자격증
- 각 탭에 해당 에디터 렌더링
- 우측 사이드 패널: ResumePreviewPanel (토글)
- 하단: 수동 저장 버튼

**저장 로직:**
- `useRef`로 dirty 상태 + 현재 탭 데이터 추적
- `useEffect` + `setTimeout` (1초 debounce)로 자동 저장
- 탭 전환 시 `onTabChange`에서 dirty면 즉시 저장
- 저장 함수: 현재 활성 섹션의 API PUT 호출
- 저장 상태: `idle` | `saving` | `saved` | `error`

- [ ] **Step 3: 편집 페이지 SC 작성**

`app/(dashboard)/resumes/[id]/page.tsx`:
- `getAuthUser()` → `getResume(id, userId)` → notFound() 처리
- 날짜 serialization → `ResumeEditor` 에 props 전달

- [ ] **Step 4: typecheck + lint + 커밋**

```bash
npm run typecheck && npm run lint
git add components/resumes/resume-editor.tsx components/resumes/resume-preview-panel.tsx app/\(dashboard\)/resumes/\[id\]/page.tsx
git commit -m "feat(resume): add resume editor with auto-save and preview panel"
```

---

## Task 12: 전체 화면 미리보기 페이지

**Files:**
- Create: `app/(dashboard)/resumes/[id]/preview/page.tsx`

- [ ] **Step 1: 미리보기 페이지 작성**

`app/(dashboard)/resumes/[id]/preview/page.tsx`:
- SC에서 `getResume()` → 데이터 fetch
- 클라이언트 래퍼: 템플릿 전환 Select + PDF 다운로드 버튼
- PDF 다운로드: `<a href="/api/resumes/${id}/pdf?template=${template}" download>` 또는 `fetch` + blob
- A4 비율 렌더링 (전체 화면)

- [ ] **Step 2: typecheck + 커밋**

```bash
npm run typecheck && npm run lint
git add app/\(dashboard\)/resumes/\[id\]/preview/
git commit -m "feat(resume): add full-screen preview page"
```

---

## Task 13: PDF 생성 — 폰트 등록 & 템플릿

**Files:**
- Create: `components/resumes/pdf/font-register.ts`
- Create: `components/resumes/pdf/classic-pdf.tsx`
- Create: `components/resumes/pdf/modern-pdf.tsx`
- Create: `components/resumes/pdf/minimal-pdf.tsx`

- [ ] **Step 1: 폰트 등록 모듈 작성**

`components/resumes/pdf/font-register.ts`:
```typescript
import path from "path"
import { Font } from "@react-pdf/renderer"

// PDF API route는 Node.js runtime에서 실행 — 파일 시스템 절대 경로 사용
const fontsDir = path.join(process.cwd(), "public", "fonts")

Font.register({
  family: "Pretendard",
  fonts: [
    { src: path.join(fontsDir, "Pretendard-Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontsDir, "Pretendard-Bold.ttf"), fontWeight: 700 },
  ],
})
```

- [ ] **Step 2: Classic PDF 템플릿 작성**

`classic-pdf.tsx`:
- `@react-pdf/renderer`의 Document, Page, View, Text, StyleSheet
- 웹 classic-template과 동일 레이아웃
- Pretendard 폰트 사용
- A4 size

- [ ] **Step 3: Modern PDF 템플릿 작성**

`modern-pdf.tsx`:
- 2컬럼 레이아웃을 react-pdf View flexDirection row로 구현
- 좌측 배경색, 우측 본문

- [ ] **Step 4: Minimal PDF 템플릿 작성**

`minimal-pdf.tsx`:
- 넓은 마진, 가벼운 font-weight

- [ ] **Step 5: typecheck + 커밋**

```bash
npm run typecheck && npm run lint
git add components/resumes/pdf/
git commit -m "feat(resume): add PDF templates with Pretendard font"
```

---

## Task 14: PDF 다운로드 API

**Files:**
- Create: `app/api/resumes/[id]/pdf/route.ts`

- [ ] **Step 1: PDF API 라우트 작성**

`app/api/resumes/[id]/pdf/route.ts`:
```typescript
export const runtime = "nodejs"

// auth → UUID 검증 → getResume() → template 쿼리 파라미터 →
// font-register import (side effect) →
// 템플릿 컴포넌트 선택 → renderToBuffer() →
// Response with Content-Type: application/pdf + Content-Disposition (UTF-8 인코딩)
```

에러 핸들링:
- 이력서 없음 → 404
- 권한 없음 → 403
- renderToBuffer 실패 → 500

- [ ] **Step 2: typecheck + 커밋**

```bash
npm run typecheck && npm run lint
git add app/api/resumes/[id]/pdf/
git commit -m "feat(resume): add PDF download API route"
```

---

## Task 15: 통합 점검 & 정리

- [ ] **Step 1: 전체 typecheck + lint**

```bash
npm run typecheck && npm run lint
```

- [ ] **Step 2: dev 서버에서 수동 검증**

```bash
npm run dev
```

확인 사항:
1. `/resumes` 목록 페이지 → 빈 상태 표시
2. "새 이력서" → 제목 입력 + 템플릿 선택 → 생성 → 편집 페이지로 이동
3. 편집 페이지: 각 탭 이동 + 데이터 입력 + 자동 저장 동작
4. 미리보기 사이드 패널 토글 + 템플릿 전환
5. 전체 미리보기 페이지 접근
6. PDF 다운로드 + 한국어 정상 렌더링
7. 이력서 삭제

- [ ] **Step 3: 코드 품질 점검 (`/simplify` 스킬)**

- [ ] **Step 4: 최종 커밋**

```bash
git add -A
git commit -m "feat(resume): complete phase-6 resume builder integration"
```

---

## Task 16: 테스트 작성

- [ ] **Step 1: `[test-writer]` 에이전트로 테스트 작성**

대상:
- `lib/validations/resume.ts` — 스키마 유효성 검증 (필수 필드 누락, 날짜 변환, 잘못된 email 등)
- `lib/resumes/service.ts` — 서비스 함수 단위 테스트 (mock prisma)

- [ ] **Step 2: 테스트 실행 + 커밋**

```bash
npm test
git add __tests__/
git commit -m "test(resume): add validation and service layer tests"
```
