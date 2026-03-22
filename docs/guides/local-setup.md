# 로컬 개발 환경 설정 가이드

## 1. 사전 요구사항

- Node.js 20+
- Docker Desktop (https://www.docker.com/products/docker-desktop/)
- Supabase 프로젝트 (https://supabase.com) — Auth/Storage용

## 2. 로컬 DB 시작

```bash
docker compose up -d
```

PostgreSQL 16 + pgvector가 `localhost:5432`에서 실행된다.

> 포트 충돌 시 `docker-compose.yml`에서 `"5433:5432"`로 변경.

## 3. 환경 변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local`을 편집하여 Supabase Auth/Storage 값과 OpenAI 키를 입력:

| 변수 | 위치 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → Data API → API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API Keys → `anon` `public` |
| `OPENAI_API_KEY` | OpenAI Dashboard → API Keys |

> `DATABASE_URL`은 기본값이 로컬 Docker DB를 가리킨다. 변경 불필요.

## 4. DB 스키마 반영

```bash
npx prisma migrate deploy
```

> **`prisma db push` 사용 금지.** 모든 스키마 변경은 `prisma migrate dev`로 migration 파일을 생성하고 커밋한다.

## 5. 시드 데이터

```bash
npx prisma db seed
```

## 6. OAuth 프로바이더 설정

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

## 7. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 접속 → 로그인 페이지 표시 확인

## 8. 에이전트 병렬 작업 시 DB 격리

스키마 변경이 필요한 feature를 병렬로 작업할 때, feature별 독립 DB를 사용한다:

```bash
# DB 생성
docker compose exec db psql -U postgres -c "CREATE DATABASE resume_manager_{feature명};"

# migration + seed 적용
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/resume_manager_{feature명} \
  npx prisma migrate deploy && \
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/resume_manager_{feature명} \
  npx prisma db seed

# 스키마 변경 작업
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/resume_manager_{feature명} \
  npx prisma migrate dev --name {변경_설명}
```

작업 완료 후:
```bash
docker compose exec db psql -U postgres -c "DROP DATABASE resume_manager_{feature명};"
```

> 모든 명령은 bash 셸에서 실행 (Git Bash 등). Windows cmd/PowerShell에서는 inline `DATABASE_URL=...` 구문이 작동하지 않음.
