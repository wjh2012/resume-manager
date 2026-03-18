# CLAUDE.md

## Project Overview

Resume-Manager는 사용자의 이력서, 자기소개서, 경력기술서를 작성을 돕기 위한 이력서 관리 서비스입니다.

## Architecture

- **Next.js App Router** with React Server Components by default; client components use
  `"use client"` directive
- **Path aliases**: `@/*` maps to project root (e.g., `@/components`, `@/lib`, `@/hooks`)
- **Theme system**: CSS custom properties (oklch color space) managed by `next-themes`; dark/light
  toggle via "d" key (see `components/theme-provider.tsx`)
- **Component variants**: shadcn/ui components use `class-variance-authority` (CVA) for variant
  props, composed with `cn()` from `@/lib/utils` (clsx + tailwind-merge)
- **shadcn/ui config**: `components.json` — style is "radix-nova", RSC enabled, icon library is
  lucide

## Rules

- 커밋/브랜치/PR 작업 시 → `docs/rules/git-conventions.md`
- **커밋 전** → `docs/workflow/workflow-rule.md`의 커밋 플로우 순서대로 실행 (구현 → `/simplify` → `test-writer` → typecheck+lint → `/git-commit`)
- 사용자 소통 시 → `docs/workflow/communication-rule.md`
- 주요 기능 추가 시 → `docs/features/`에 해당 기능 문서 작성
- 코드 리뷰 전 → `docs/references/spec-deviations.md` 참조. 여기 기록된 항목은 의도적 차이이므로 이슈로 보고하지 않는다
- 새 페이지/컴포넌트 UI 디자인 시 → `frontend-design` 스킬 사용
- React/Next.js 코드 작성·리팩토링 시 → `vercel-react-best-practices` 스킬 참고
- UI 코드 리뷰·감사 시 → `web-design-guidelines` 스킬 사용
