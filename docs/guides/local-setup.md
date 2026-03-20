# 로컬 개발 환경 설정 가이드

## 1. 사전 요구사항

- Node.js 20+
- Supabase 프로젝트 (https://supabase.com)

## 2. 환경 변수 설정

```bash
cp .env.local.example .env.local
```

### 값 찾기

| 변수 | 위치 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → Data API → API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API Keys → `anon` `public` |
| `DATABASE_URL` | Supabase Dashboard → Connect → Session Pooler (5432) |

> **주의**: Direct connection은 IPv4를 지원하지 않을 수 있다. **Session Pooler** 방식을 사용할 것.

### 예시

```env
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
DATABASE_URL=postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres
```

## 3. pgvector 확장 활성화

Supabase Dashboard → Database → Extensions → `vector` 검색 → **Enable**

## 4. DB 스키마 반영

```bash
npx prisma db push
```

> `prisma migrate dev`는 Supabase 기본 확장(pg_graphql, pgcrypto 등)과 drift가 발생할 수 있다.
> 개발 단계에서는 `db push`가 간편하다.

## 5. OAuth 프로바이더 설정

### GitHub

1. https://github.com/settings/developers → New OAuth App
2. Homepage URL: `http://localhost:3000`
3. Authorization callback URL: `https://[project-ref].supabase.co/auth/v1/callback`
4. Client ID/Secret → Supabase Dashboard → Authentication → Providers → GitHub에 입력

### Google

1. https://console.cloud.google.com → OAuth 2.0 Client
2. Authorized redirect URIs: `https://[project-ref].supabase.co/auth/v1/callback`
3. Client ID/Secret → Supabase Dashboard → Authentication → Providers → Google에 입력

### Kakao

1. https://developers.kakao.com → 애플리케이션 추가
2. 카카오 로그인 활성화 → Redirect URI: `https://[project-ref].supabase.co/auth/v1/callback`
3. REST API 키/Secret → Supabase Dashboard → Authentication → Providers → Kakao에 입력

## 6. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 접속 → 로그인 페이지 표시 확인
