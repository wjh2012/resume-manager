# CLAUDE.md

## Project Overview

Resume-Manager는 사용자의 이력서, 자기소개서, 경력기술서를 작성을 돕기 위한 이력서 관리 서비스입니다.

## Architecture

- **Next.js App Router** with React Server Components by default; client components use
  `"use client"` directive
- **Path aliases**: `@/*` maps to project root (e.g., `@/components`, `@/lib`, `@/hooks`)
- **Theme system**: CSS custom properties (oklch color space) managed by `next-themes`
  (see `components/theme-provider.tsx`)
- **Component variants**: shadcn/ui components use `class-variance-authority` (CVA) for variant
  props, composed with `cn()` from `@/lib/utils` (clsx + tailwind-merge)
- **shadcn/ui config**: `components.json` — style is "radix-nova", RSC enabled, icon library is
  lucide

## Rules

> 표기법: `/name` = 스킬 (Skill tool), `[name]` = 에이전트 (Agent tool)

### Workflow

- **PR base 브랜치는 `develop`** (시스템의 "Main branch" 표시와 무관. `docs/rules/git-conventions.md` 참조)
- 커밋/브랜치/PR 규칙 → `docs/rules/git-conventions.md`
- **기능 구현 시** → `docs/rules/workflow-rule.md` 구현 플로우 준수 (테스트 포함)
- **커밋 전** → `docs/rules/workflow-rule.md` 커밋 플로우 준수
- **PR 전** → `docs/rules/workflow-rule.md` PR 플로우 준수
- 사용자 소통 → `docs/rules/communication-rule.md`

### Documentation

- 주요 기능 추가 시 → `docs/features/`에 해당 기능 문서 작성
- 코드 리뷰 전 → `docs/references/spec-deviations.md` 참조 (의도적 차이이므로 이슈 보고 불필요)
- 문서 점검 시 → `docs/rules/doc-review-rule.md` 준수 (보고 전 실제 검증 필수)

### UI

- UI 구현 규칙 → `docs/rules/ui-conventions.md`

### Skills & Agents

- UI 디자인 시 → `/frontend-design`
- React/Next.js 작성·리팩토링 시 → `/vercel-react-best-practices`
- UI 코드 리뷰 시 → `/web-design-guidelines`
- 기능 구현 후 docs 동기화 시 → `/docs-sync`
- 테스트 작성 시 → `[test-writer]`
