# DB 환경 분리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로컬 Docker PostgreSQL과 prod Supabase를 분리하여 feature 브랜치 스키마 변경이 prod에 영향을 주지 않도록 한다.

**Architecture:** Docker PostgreSQL(pgvector)을 로컬 개발 DB로 사용하고, `prisma migrate dev/deploy`로 마이그레이션을 관리한다. `prisma.config.ts`에 `directUrl`을 추가하여 prod에서 pooler와 direct connection을 분리한다.

**Tech Stack:** Docker, PostgreSQL 16, pgvector, Prisma 7 (migrate), dotenv

**Spec:** `docs/superpowers/specs/2026-03-22-db-environment-separation-design.md`

---

## File Structure

| 파일 | 변경 | 역할 |
|---|---|---|
| `docker-compose.yml` | 신규 생성 | PostgreSQL + pgvector 로컬 DB |
| `docker/init.sql` | 신규 생성 | pgvector 확장 자동 활성화 |
| `prisma.config.ts` | 수정 | `directUrl` 추가 |
| `prisma/migrations/0_init/migration.sql` | 신규 생성 | baseline migration |
| `package.json` | 수정 | build 스크립트에 `prisma migrate deploy` 추가 |
| `.env.local.example` | 수정 | 로컬 Docker DB URL + DIRECT_URL 설명 |
| `.gitignore` | 수정 (필요 시) | Docker 볼륨 등 제외 확인 |
| `docs/guides/local-setup.md` | 수정 | Docker 기반 로컬 셋업으로 업데이트 |
| `docs/rules/workflow-rule.md` | 수정 | 에이전트 DB 격리 규칙, `db push` 금지 추가 |

---

### Task 1: Docker PostgreSQL 구성

**Files:**
- Create: `docker-compose.yml`
- Create: `docker/init.sql`

- [ ] **Step 1: `docker/init.sql` 생성**

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

- [ ] **Step 2: `docker-compose.yml` 생성**

```yaml
services:
  db:
    image: pgvector/pgvector:pg16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: resume_manager
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docker/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

- [ ] **Step 3: Docker DB 시작 및 확인**

Run: `docker compose up -d && docker compose exec db pg_isready -U postgres`
Expected: `/var/run/postgresql:5432 - accepting connections`

- [ ] **Step 4: pgvector 확장 확인**

Run: `docker compose exec db psql -U postgres -d resume_manager -c "SELECT extname FROM pg_extension WHERE extname = 'vector';"`
Expected: `vector` 행 출력

- [ ] **Step 5: 커밋**

```bash
git add docker-compose.yml docker/init.sql
git commit -m "chore: add Docker PostgreSQL with pgvector for local development"
```

---

### Task 2: Prisma 설정 수정

**Files:**
- Modify: `prisma.config.ts`
- Modify: `.env.local.example`

- [ ] **Step 1: `prisma.config.ts`에 `directUrl` 추가**

`prisma.config.ts` 파일의 `datasource` 객체를 수정:

```typescript
datasource: {
  url: process.env.DATABASE_URL,
  directUrl: process.env.DIRECT_URL || undefined,
  shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL || undefined,
},
```

- [ ] **Step 2: `.env.local.example` 업데이트**

전체 내용 교체:

```env
# Database (로컬: Docker PostgreSQL / prod: Supabase)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/resume_manager

# Direct DB connection (prod 전용 — migration에 사용, pooler 불가)
# 로컬 Docker에서는 불필요
# DIRECT_URL=postgresql://postgres.xxx:password@db.xxx.supabase.co:5432/postgres

# Supabase (Auth/Storage)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# OpenAI (임베딩 전용 - 사용자 AI 설정과 별도)
OPENAI_API_KEY=
```

- [ ] **Step 3: Prisma가 로컬 Docker DB에 연결 가능한지 확인**

`.env.local`의 `DATABASE_URL`을 로컬 Docker URL로 변경한 후:

Run: `npx prisma db push --accept-data-loss`
Expected: `Your database is now in sync with your Prisma schema.`

> 이 시점에서는 아직 migrate로 전환 전이므로 `db push`로 확인. 다음 Task에서 baseline migration을 생성한 후부터는 `db push` 사용 금지.
> `--accept-data-loss`는 빈 Docker DB에서만 안전. 데이터가 있는 DB에서는 사용 금지.

- [ ] **Step 4: 커밋**

```bash
git add prisma.config.ts .env.local.example
git commit -m "chore: add directUrl to prisma config for prod migration support"
```

---

### Task 3: Baseline Migration 생성

**Files:**
- Create: `prisma/migrations/0_init/migration.sql`

이 Task는 **가장 중요한 단계**. prod DB와 로컬 DB 모두에서 migration 히스토리를 정합시킨다.

- [ ] **Step 1: baseline migration SQL 생성**

```bash
mkdir -p prisma/migrations/0_init
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
```

- [ ] **Step 2: 생성된 SQL 내용 확인**

Run: `head -50 prisma/migrations/0_init/migration.sql`
Expected: `CREATE TABLE`, `CREATE EXTENSION`, enum 생성 등의 SQL문. `Unsupported("vector(1536)")` 타입이 올바르게 `vector(1536)`으로 변환되었는지 확인.

- [ ] **Step 3: 로컬 Docker DB 초기화 (기존 데이터 제거)**

기존에 `db push`로 만든 테이블을 제거하고 migration으로 재생성:

```bash
docker compose exec db psql -U postgres -c "DROP DATABASE resume_manager;"
docker compose exec db psql -U postgres -c "CREATE DATABASE resume_manager;"
docker compose exec db psql -U postgres -d resume_manager -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

- [ ] **Step 4: 로컬 DB에 baseline migration 적용**

Run: `npx prisma migrate deploy`
Expected: `1 migration applied` 또는 유사한 성공 메시지.

- [ ] **Step 5: Prisma client 생성 확인**

Run: `npx prisma generate`
Expected: 에러 없이 완료

- [ ] **Step 6: prod DB에 baseline을 '이미 적용됨'으로 표시**

> **주의**: 이 단계는 사용자가 직접 실행해야 함 (prod DB 접근 필요).
> `DATABASE_URL`을 일시적으로 prod Supabase의 **direct connection** URL로 변경한 후 실행:

```bash
DATABASE_URL="prod direct connection URL" npx prisma migrate resolve --applied 0_init
```

Expected: `Migration 0_init marked as applied.`

> bash 셸에서 실행 (Git Bash 등). Windows cmd/PowerShell에서는 inline `DATABASE_URL=` 구문이 작동하지 않음.
> 실행 후 `.env.local`의 `DATABASE_URL`을 로컬 Docker URL로 되돌릴 것.
> **롤백**: 잘못 실행한 경우, prod DB의 `_prisma_migrations` 테이블에서 해당 행을 DELETE하면 된다.

- [ ] **Step 7: 커밋**

```bash
git add prisma/migrations/
git commit -m "chore: create baseline migration from current schema"
```

---

### Task 4: Build 스크립트 수정

**Files:**
- Modify: `package.json`

- [ ] **Step 1: build 스크립트에 `prisma migrate deploy` 추가**

`package.json`의 `scripts.build` 수정:

변경 전:
```json
"build": "next build"
```

변경 후:
```json
"build": "prisma migrate deploy && next build"
```

- [ ] **Step 2: 로컬에서 build 스크립트 테스트**

Run: `npm run build`
Expected: `No pending migrations to apply.` 후 Next.js 빌드 성공. migration이 이미 적용되어 있으므로 no-op.

- [ ] **Step 3: 커밋**

```bash
git add package.json
git commit -m "chore: run prisma migrate deploy on build for automated prod migration"
```

---

### Task 5: 문서 업데이트

**Files:**
- Modify: `docs/guides/local-setup.md`
- Modify: `docs/rules/workflow-rule.md` (에이전트 DB 격리 규칙 추가 위치 — 파일이 없으면 적절한 위치에)

- [ ] **Step 1: `docs/guides/local-setup.md` 업데이트**

전체 내용을 Docker 기반 로컬 셋업으로 교체:

```markdown
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
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/resume_manager_{feature명} \
  npx prisma migrate deploy && \
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/resume_manager_{feature명} \
  npx prisma db seed

# 스키마 변경 작업
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/resume_manager_{feature명} \
  npx prisma migrate dev --name {변경_설명}
```

작업 완료 후:
```bash
docker compose exec db psql -U postgres -c "DROP DATABASE resume_manager_{feature명};"
```

> 모든 명령은 bash 셸에서 실행 (Git Bash 등). Windows cmd/PowerShell에서는 inline `DATABASE_URL=...` 구문이 작동하지 않음.
```

- [ ] **Step 2: 워크플로우 문서에 DB 규칙 추가**

`docs/rules/workflow-rule.md`에 다음 섹션 추가 (기존 내용 끝에):

```markdown
## DB 마이그레이션 규칙

- **`prisma db push` 사용 금지.** 모든 스키마 변경은 `prisma migrate dev`로 migration 파일을 생성하고 커밋한다.
- 스키마 변경이 있는 feature는 **순차적으로 develop에 merge**한다.
- merge 후 다음 에이전트는 최신 develop을 rebase한 뒤 `prisma migrate dev`를 재실행한다.
- 에이전트 병렬 작업 시 **feature별 독립 DB**를 사용한다 (로컬 셋업 가이드 참조).
```

- [ ] **Step 3: 커밋**

```bash
git add docs/guides/local-setup.md docs/rules/workflow-rule.md
git commit -m "docs: update local setup guide for Docker DB and add migration rules"
```

---

### Task 6: 검증 및 정리

- [ ] **Step 1: 전체 플로우 E2E 검증**

Docker DB가 실행 중인 상태에서:

```bash
# 1. migration 상태 확인
npx prisma migrate status

# 2. Prisma client 생성
npx prisma generate

# 3. 빌드 테스트
npm run build

# 4. 타입체크
npm run typecheck

# 5. 린트
npm run lint
```

모든 명령이 에러 없이 통과해야 함.

- [ ] **Step 2: 에이전트 DB 격리 플로우 검증**

```bash
# feature DB 생성
docker compose exec db psql -U postgres -c "CREATE DATABASE resume_manager_test_isolation;"

# migration 적용
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/resume_manager_test_isolation \
  npx prisma migrate deploy

# 테이블 존재 확인
docker compose exec db psql -U postgres -d resume_manager_test_isolation -c "\dt"

# 정리
docker compose exec db psql -U postgres -c "DROP DATABASE resume_manager_test_isolation;"
```

Expected: migration 적용 성공, 모든 테이블 생성 확인, DB 삭제 성공.

- [ ] **Step 3: `.gitignore` 확인**

Docker 볼륨 데이터는 Docker가 관리하므로 `.gitignore` 변경 불필요 확인.

- [ ] **Step 4: Vercel 대시보드 환경변수 설정 안내**

사용자에게 수동 설정 안내:
1. Vercel > Project > Settings > Environment Variables
2. Production 환경에 다음 추가:
   - `DATABASE_URL`: Supabase Session Pooler URL (port 6543)
   - `DIRECT_URL`: Supabase Direct Connection URL (port 5432, `db.xxx.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_URL`: 기존 값
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 기존 값
   - `OPENAI_API_KEY`: 기존 값
