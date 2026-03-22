# Phase 0: 기반 설정

## 목표

프로젝트의 핵심 인프라를 구축한다. DB 연결, 인증, 기본 레이아웃이 동작하여 이후 phase에서 기능 개발에만 집중할 수 있는 상태를 만든다.

## 완료 기준

- [x] Prisma 스키마 작성 완료 + 마이그레이션 성공
- [x] Supabase 클라이언트 (브라우저/서버) 설정 완료
- [x] `proxy.ts`로 미인증 사용자 → `/login` 리다이렉트
- [x] 카카오/Google/GitHub 소셜 로그인 동작
- [x] `(dashboard)` 레이아웃에 사이드바 네비게이션 표시
- [x] `<html lang="ko">` 적용
- [x] 필요한 shadcn/ui 컴포넌트 추가 완료

## 의존성

- 없음 (첫 번째 phase)
- **외부 작업**: Supabase 프로젝트 생성, OAuth 앱 등록 (카카오/Google/GitHub)

## 설치할 패키지

```bash
# DB & Auth
npm install @prisma/client @supabase/supabase-js @supabase/ssr
npm install prisma --save-dev

# 유틸리티
npm install zod sonner
```

## 생성/수정할 파일

```
신규:
  prisma/schema.prisma
  proxy.ts
  lib/prisma.ts
  lib/supabase/client.ts
  lib/supabase/server.ts
  lib/supabase/proxy.ts
  app/(auth)/login/page.tsx
  app/(auth)/callback/route.ts
  app/(dashboard)/layout.tsx
  app/(dashboard)/page.tsx
  components/layout/app-sidebar.tsx
  components/layout/topbar.tsx
  components/layout/user-menu.tsx
  .env.local.example

수정:
  app/layout.tsx          — lang="ko" 변경
  package.json            — 패키지 추가 반영
```

## 상세 구현 단계

### 1. 패키지 설치

```bash
npm install @prisma/client @supabase/supabase-js @supabase/ssr zod sonner
npm install prisma --save-dev
```

### 2. 환경 변수 설정

`.env.local.example` 생성:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database (Supabase PostgreSQL direct connection)
DATABASE_URL=
DIRECT_URL=

# OpenAI (임베딩 전용 - 사용자 AI 설정과 별도)
OPENAI_API_KEY=
```

### 3. Prisma 초기화 & 스키마 작성

```bash
npx prisma init
```

`prisma/schema.prisma`에 [database-schema.md](../database-schema.md)의 전체 스키마를 작성한다.

데이터소스 설정:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}
```

마이그레이션 실행:
```bash
npx prisma migrate dev --name init
```

### 4. Prisma 싱글턴 클라이언트

`lib/prisma.ts`:
- 개발 환경에서 핫 리로드 시 커넥션 풀 고갈 방지
- `globalThis`에 인스턴스 캐싱

```typescript
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

### 5. Supabase 클라이언트 설정

#### `lib/supabase/client.ts` (브라우저용)

```typescript
import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

#### `lib/supabase/server.ts` (서버 컴포넌트/Server Action용)

```typescript
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    },
  )
}
```

#### `lib/supabase/proxy.ts` (미들웨어용)

```typescript
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 미인증 사용자는 로그인 페이지로 리다이렉트
  if (!user && !request.nextUrl.pathname.startsWith("/login") &&
      !request.nextUrl.pathname.startsWith("/callback")) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

### 6. 미들웨어

`proxy.ts` (프로젝트 루트):

```typescript
import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
```

### 7. 인증 라우트

#### `app/(auth)/login/page.tsx`

소셜 로그인 버튼 3개 (카카오, Google, GitHub).
각 버튼 클릭 시 `supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })` 호출.

주요 요소:
- 서비스 로고 + 제목
- 소셜 로그인 버튼 (카카오: 노란색, Google: 흰색, GitHub: 검정)
- `redirectTo`는 `{origin}/callback`

#### `app/(auth)/callback/route.ts`

OAuth 콜백 핸들러. `code`를 세션으로 교환한 뒤 대시보드로 리다이렉트.

```typescript
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // 앱 레벨 upsert로 users 테이블 동기화 (DB 트리거 대신 앱에서 처리)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await prisma.user.upsert({
          where: { id: user.id },
          create: {
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.full_name ?? null,
            avatarUrl: user.user_metadata?.avatar_url ?? null,
          },
          update: {
            email: user.email!,
            name: user.user_metadata?.full_name ?? null,
            avatarUrl: user.user_metadata?.avatar_url ?? null,
          },
        })
      }
      return NextResponse.redirect(`${origin}/`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
```

### 8. `<html lang="ko">` 변경

`app/layout.tsx`에서 `lang="en"` → `lang="ko"` 변경.

### 9. shadcn/ui 컴포넌트 추가

```bash
npx shadcn@latest add card input textarea dialog sidebar tabs select badge separator skeleton sonner avatar dropdown-menu tooltip scroll-area sheet resizable
```

### 10. 대시보드 레이아웃

#### `components/layout/app-sidebar.tsx`

shadcn/ui `Sidebar` 컴포넌트 기반. 네비게이션 항목:

| 아이콘 | 라벨 | 경로 |
|--------|------|------|
| Home | 대시보드 | `/` |
| FileText | 참고자료 | `/documents` |
| PenTool | 자기소개서 | `/cover-letters` |
| MessageSquare | 모의면접 | `/interviews` |
| Lightbulb | 인사이트 | `/insights` |
| FileCheck | 이력서 | `/resumes` |
| Settings | 설정 | `/settings` |

하단에 `UserMenu` 컴포넌트 (아바타 + 이름 + 로그아웃).

#### `components/layout/topbar.tsx`

- 사이드바 토글 버튼 (모바일)
- 페이지 제목 (breadcrumb 또는 단순 텍스트)

#### `app/(dashboard)/layout.tsx`

```tsx
<SidebarProvider>
  <AppSidebar />
  <main>
    <Topbar />
    {children}
  </main>
</SidebarProvider>
```

#### `app/(dashboard)/page.tsx`

대시보드 홈 — Phase 7에서 채울 예정. 일단 빈 환영 메시지.

## 검증 방법

1. `npx prisma migrate dev` 성공
2. `/login` 페이지에 소셜 로그인 버튼 3개 표시
3. 소셜 로그인 → `/` 대시보드 리다이렉트
4. 미인증 상태로 `/` 접근 → `/login` 리다이렉트
5. 사이드바에 모든 네비게이션 항목 표시
6. `<html lang="ko">` 확인
7. 다크 모드 토글 (d 키) 동작
