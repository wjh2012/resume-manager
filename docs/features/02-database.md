# 데이터베이스 (Database)

> Phase 0 — 기반 설정

## 개요

Supabase PostgreSQL + Prisma ORM으로 데이터를 관리한다. pgvector 확장으로 임베딩 벡터 검색을 지원한다.

## 기술 스택

- **Prisma** v7 — ORM, 마이그레이션, 타입 생성
- **@prisma/adapter-pg** — PostgreSQL 어댑터
- **pgvector** — 벡터 임베딩 저장 및 유사도 검색

## 싱글턴 클라이언트

`lib/prisma.ts`에서 `globalThis`에 캐싱하여 개발 환경 핫 리로드 시 커넥션 풀 고갈을 방지한다.

## postinstall

`npm install` 시 자동으로 `prisma generate`가 실행되어 클라이언트가 항상 최신 상태를 유지한다.

## 주요 파일

| 파일 | 역할 |
|------|------|
| `prisma/schema.prisma` | 스키마 정의 |
| `prisma.config.ts` | Prisma 설정 |
| `lib/prisma.ts` | 싱글턴 PrismaClient |
