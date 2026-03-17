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
