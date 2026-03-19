# Resume Manager

종합 취업 준비 플랫폼. 문서 업로드, AI 자기소개서 작성, AI 모의면접, 인사이트 추출, 이력서 빌더를 하나의 서비스에서 제공합니다.

## 기술 스택

Next.js 16 · shadcn/ui · Tailwind CSS v4 · Supabase (PostgreSQL + Auth + Storage) · Prisma · Vercel AI SDK · pgvector · @react-pdf/renderer

## 시작하기

```bash
npm install
cp .env.local.example .env.local  # 환경 변수 설정
npx prisma migrate dev
npm run dev
```

## 문서

- [docs/](./docs/) — 설계 명세, 구현 단계별 문서, 프로젝트 규칙 및 워크플로우
