# DB 마이그레이션 가이드

## 개요

- **로컬**: `prisma migrate dev`로 migration 파일 생성 + 로컬 Docker DB에 적용
- **prod**: Vercel 빌드 시 `prisma migrate deploy`가 자동 실행
- **`prisma db push` 사용 금지** — 모든 스키마 변경은 migration 파일로 관리

## 로컬에서 스키마 변경

`schema.prisma`를 수정하면 Prisma가 diff를 계산하여 migration SQL을 자동 생성한다. 직접 SQL을 작성할 필요 없음.

```bash
# 1. schema.prisma 수정 후
npx prisma migrate dev --name {변경_설명}
# → prisma/migrations/{timestamp}_{변경_설명}/migration.sql 자동 생성
# → 로컬 Docker DB에 즉시 적용

# 2. 생성된 migration 파일 커밋
git add prisma/migrations/
git commit -m "feat: add {변경_설명} migration"
```

디렉토리 구조:
```
prisma/migrations/
├── 0_init/                              ← baseline
│   └── migration.sql
├── 20260322120000_add_career_notes/     ← 이후 자동 생성
│   └── migration.sql
└── ...
```

## prod 배포 (자동)

`master`에 merge → Vercel 빌드 → `prisma migrate deploy` 자동 실행 → prod DB에 migration 적용.

migration 파일이 없으면 no-op이므로 안전.

## prod DB에 직접 명령 실행

`.env.local`의 `DATABASE_URL`은 로컬 Docker DB를 가리키므로, prod DB에 Prisma CLI 명령을 실행하려면 inline으로 `DATABASE_URL`을 덮어씌운다:

```bash
DATABASE_URL="prod Session Pooler URL" npx prisma {명령}
```

> 반드시 **한 줄로** 실행할 것. 줄바꿈되면 `DATABASE_URL`이 적용되지 않는다.
> 모든 명령은 bash 셸에서 실행 (Git Bash 등). Windows cmd/PowerShell에서는 inline `DATABASE_URL=...` 구문이 작동하지 않음.

### baseline migration (최초 1회)

`prisma db push`에서 `prisma migrate`로 전환할 때, prod DB에 이미 테이블이 존재하는 상태에서 baseline migration을 생성한다. 이 migration을 prod에 "이미 적용됨"으로 표시해야 `prisma migrate deploy`가 재실행하지 않는다:

```bash
# 1. baseline SQL 생성 (로컬)
mkdir -p prisma/migrations/0_init
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql

# 2. prod DB에 "이미 적용됨"으로 표시 (SQL 실행 안 함, 기록만)
DATABASE_URL="prod Session Pooler URL" npx prisma migrate resolve --applied 0_init

# 3. 로컬 Docker DB에는 실제 적용
npx prisma migrate deploy
```

> `migrate resolve --applied`는 `_prisma_migrations` 테이블에 기록만 추가한다. 실제 SQL은 실행하지 않는다.
> 잘못 실행한 경우 prod DB의 `_prisma_migrations` 테이블에서 해당 행을 DELETE하면 된다.

### Supabase 연결 방식

| 방식 | 용도 | 비고 |
|---|---|---|
| Direct Connection | - | IPv4 미지원으로 연결 불가할 수 있음 |
| Session Pooler (port 5432) | Migration, CLI 명령 | IPv4 대안, prepared statement 지원 |
| Transaction Pooler (port 6543) | 런타임 쿼리 | Migration에는 부적합 (prepared statement 미지원) |

Supabase Dashboard → Connect → Session Pooler에서 URL 확인.

## 환경별 연결 구조

```
prisma.config.ts:  DIRECT_URL || DATABASE_URL  → Prisma CLI (migration)
lib/prisma.ts:     DATABASE_URL                → adapter-pg (런타임 쿼리)
```

- **로컬**: `DATABASE_URL`만 설정 (Docker DB). `DIRECT_URL` 불필요
- **Vercel prod**: `DATABASE_URL` = Session Pooler. `DIRECT_URL`은 동일 값이면 불필요, Transaction Pooler 사용 시에만 별도 설정
