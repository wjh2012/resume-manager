# DB 마이그레이션 가이드

## 개요

- **로컬**: `prisma migrate dev`로 migration 파일 생성 + 로컬 Docker DB에 적용
- **prod**: Vercel 빌드 시 `prisma migrate deploy`가 자동 실행
- **`prisma db push` 사용 금지** — 모든 스키마 변경은 migration 파일로 관리

## 로컬에서 스키마 변경

```bash
# 1. schema.prisma 수정 후
npx prisma migrate dev --name {변경_설명}

# 2. 생성된 migration 파일 커밋
git add prisma/migrations/
git commit -m "feat: add {변경_설명} migration"
```

## prod 배포 (자동)

`master`에 merge → Vercel 빌드 → `prisma migrate deploy` 자동 실행 → prod DB에 migration 적용.

migration 파일이 없으면 no-op이므로 안전.

## prod DB에 직접 명령 실행

`.env.local`의 `DATABASE_URL`은 로컬 Docker DB를 가리키므로, prod DB에 Prisma CLI 명령을 실행하려면 inline으로 덮어씌운다:

```bash
DATABASE_URL="prod Session Pooler URL" npx prisma migrate resolve --applied {migration명}
```

> 모든 명령은 bash 셸에서 실행 (Git Bash 등). Windows cmd/PowerShell에서는 inline `DATABASE_URL=...` 구문이 작동하지 않음.

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
