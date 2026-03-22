# DB 환경 분리 설계

## 배경

- Vercel prod(master)와 feature 브랜치가 동일한 Supabase DB를 공유
- feature에서 스키마 변경 시 prod 배포가 깨짐
- 에이전트 병렬 작업 시 서로 다른 스키마 변경이 충돌

## 목표

- prod DB와 로컬 개발 DB를 완전 분리
- 에이전트 병렬 작업 시 DB 격리
- 안전한 마이그레이션 배포 파이프라인 구축

## 아키텍처

```
Docker PostgreSQL (localhost:5432)        Supabase Cloud
┌─────────────────────────────┐        ┌──────────────┐
│ resume_manager (기본 개발)    │        │ prod 프로젝트 │
│ resume_manager_auth (agent A)│        │              │
│ resume_manager_quota (agentB)│        │ master 배포   │
└─────────────────────────────┘        └──────────────┘
  feature/* (로컬 개발)                    master (Vercel Prod)
```

### 2-tier 구조

| 환경 | DB | 용도 | 트리거 |
|---|---|---|---|
| 로컬 | Docker PostgreSQL + pgvector | 개발, 스키마 변경 | `docker compose up` |
| prod | Supabase 클라우드 | 배포 | master merge → Vercel 빌드 |

## 상세 설계

### 1. Docker PostgreSQL 구성

`docker-compose.yml` (프로젝트 루트):

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

`docker/init.sql`:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

- pgvector 확장을 init 스크립트로 자동 활성화
- healthcheck로 DB 준비 상태 확인 후 명령 실행 가능
- 포트 충돌 시 `"5433:5432"`로 변경 가능 (로컬 PostgreSQL이 이미 있는 경우)

### 2. Prisma 연결 구조

현재 프로젝트는 `@prisma/adapter-pg` 패턴을 사용 중 (의도적 선택, `spec-deviations.md` 참조):

- **런타임**: `lib/prisma.ts`에서 `PrismaPg({ connectionString: DATABASE_URL })`로 직접 연결
- **CLI (migration)**: `prisma.config.ts`에서 `datasource.url`로 `DATABASE_URL` 제공
- **`schema.prisma`에는 `url` 필드 없음** — 이 패턴 유지

`schema.prisma`는 변경하지 않음. `prisma.config.ts`의 `datasource.url`을 수정:

**변경 전:**
```typescript
datasource: {
  url: process.env.DATABASE_URL,
  shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL || undefined,
},
```

**변경 후:**
```typescript
datasource: {
  url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL || undefined,
},
```

> Prisma v7의 `defineConfig` 타입에 `directUrl` 필드가 없으므로, `datasource.url` 자체를 `DIRECT_URL` 우선으로 설정한다. Prisma CLI(migration)는 이 URL을 사용하고, 런타임은 `lib/prisma.ts`에서 adapter-pg가 `DATABASE_URL`을 직접 사용하므로 충돌 없음.

- `DATABASE_URL`: 런타임 쿼리 (adapter-pg) + CLI 기본 연결 (DIRECT_URL 없을 때 fallback)
- `DIRECT_URL`: Prisma CLI 전용 (direct connection, pooler 불가). prod Vercel에서만 설정
- 로컬 Docker에서는 `DIRECT_URL` 불필요 (pooler 없음, `DATABASE_URL`만 사용)

### 3. 에이전트 병렬 작업 시 DB 격리

하나의 PostgreSQL 인스턴스에서 DB 이름으로 격리:

```
PostgreSQL (localhost:5432)
├── resume_manager              ← 기본 로컬 개발
├── resume_manager_{feature명}  ← 에이전트별 독립 DB
```

**에이전트 워크플로우:**

> 모든 명령은 bash 셸에서 실행 (Git Bash 등). Windows cmd/PowerShell에서는 inline `DATABASE_URL=...` 구문이 작동하지 않음.

시작 시:
```bash
# 1. feature용 DB 생성 (docker compose exec — 로컬 psql 설치 불필요)
docker compose exec db psql -U postgres -c "CREATE DATABASE resume_manager_auth;"

# 2. 기존 migration + seed 적용
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/resume_manager_auth \
  npx prisma migrate deploy && \
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/resume_manager_auth \
  npx prisma db seed

# 3. 스키마 변경 작업
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/resume_manager_auth \
  npx prisma migrate dev --name add_auth_fields
```

완료 후:
```bash
docker compose exec db psql -U postgres -c "DROP DATABASE resume_manager_auth;"
```

### 4. 마이그레이션 전략 전환

**현재**: `prisma db push` (migration 파일 없음, prod 직접 적용)
**변경**: `prisma migrate dev` → `prisma migrate deploy`

> **규칙: `prisma db push`는 사용 금지.** 모든 스키마 변경은 `prisma migrate dev`로 migration 파일을 생성하고 커밋한다.

| 단계 | 명령어 | 대상 DB | 결과 |
|---|---|---|---|
| 로컬 개발 | `prisma migrate dev` | Docker DB | migration 파일 생성 + 적용 |
| prod 배포 | `prisma migrate deploy` | Supabase prod | 커밋된 migration 순서대로 적용 |

**기존 prod DB 정합성 확보 (baseline migration):**

최초 1회 정확한 절차:
```bash
# 1. 현재 schema.prisma 기준으로 baseline SQL 생성
mkdir -p prisma/migrations/0_init
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/0_init/migration.sql

# 2. prod DB에 이미 적용된 것으로 표시 (실제 SQL 실행 안 함)
DATABASE_URL="prod DB URL" npx prisma migrate resolve --applied 0_init

# 3. 로컬 Docker DB에는 실제 적용
DATABASE_URL="로컬 DB URL" npx prisma migrate deploy
```

**에이전트 병렬 작업 시 migration 파일 충돌:**

두 에이전트가 각각 migration 파일을 생성하면 git merge 시 충돌 가능. 대응 방법:
- 스키마 변경이 있는 feature는 **순차적으로 develop에 merge**
- merge 후 다음 에이전트는 최신 develop을 rebase한 뒤 `prisma migrate dev` 재실행
- 동시에 스키마를 변경하는 feature는 드물어야 함 (DB 격리는 개발 편의, merge는 순차)

### 5. 환경변수 구조

**현재**: `.env.local` 하나로 로컬 + Vercel 공용
**변경**: 로컬은 `.env.local`, Vercel은 대시보드 환경변수로 분리

`.env.local` (로컬 전용):
```env
# 로컬 Docker DB (DIRECT_URL 불필요 — pooler 없음)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/resume_manager

# Supabase Auth/Storage (클라우드)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# OpenAI
OPENAI_API_KEY=sk-...
```

Vercel 대시보드 환경변수 (Production):
```
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.xxx:password@db.xxx.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
OPENAI_API_KEY=sk-...
```

- `DATABASE_URL`: Session Pooler (port 6543, `pooler.supabase.com`) — 런타임 쿼리용
- `DIRECT_URL`: Direct Connection (port 5432, `db.xxx.supabase.co`) — migration 전용. Supabase 대시보드 > Database Settings > Connection String > Direct에서 확인

### 6. 배포 시 자동 마이그레이션

`package.json` build 스크립트 수정:

```json
"build": "prisma migrate deploy && next build"
```

배포 플로우:
```
master에 merge
  → Vercel 빌드 트리거
  → prisma migrate deploy (directUrl로 prod DB에 migration 적용)
  → next build (앱 빌드)
  → 배포 완료
```

migration 파일이 없으면 `migrate deploy`는 no-op이므로 안전.

## 변경 범위

| 파일 | 변경 내용 |
|---|---|
| `docker-compose.yml` | 신규 생성 - PostgreSQL + pgvector + healthcheck |
| `docker/init.sql` | 신규 생성 - pgvector 확장 활성화 |
| `prisma.config.ts` | datasource.url을 `DIRECT_URL || DATABASE_URL`로 변경 |
| `prisma/migrations/0_init/` | baseline migration 생성 |
| `package.json` | build 스크립트에 `prisma migrate deploy` 추가 |
| `.env.local.example` | 로컬 Docker DB URL로 업데이트, `DIRECT_URL` 설명 추가 |
| `.env.local` | 로컬 전용으로 변경 (Docker DB URL) |
| Vercel 대시보드 | 환경변수에 prod 값 설정 + `DIRECT_URL` 추가 (수동) |
| `docs/guides/local-setup.md` | Docker 셋업 가이드 추가 |
| CLAUDE.md 또는 워크플로우 문서 | 에이전트 DB 격리 규칙, `db push` 금지 규칙 추가 |

## 알려진 제한 사항

- **로컬 Auth 의존성**: 로컬에서도 Supabase Auth는 클라우드 사용 → 인터넷 필요. Free 플랜 자동 정지 시 Auth 관련 로컬 개발 불가
- **migration 파일 merge 충돌**: 에이전트 병렬 스키마 변경 시 git merge는 순차 처리 필요
- **`Unsupported("vector(1536)")` 타입**: migration 생성 시 edge case 가능 → 초기 검증 필요

## 제외 사항

- Vercel Preview 배포용 staging Supabase (불필요 — 현재 혼자 개발)
- Supabase CLI 로컬 셋업 (Auth/Storage는 클라우드로 충분)
- CI/CD에서 자동 테스트 (현재 수동 체크리스트 유지)
