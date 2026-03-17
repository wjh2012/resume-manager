# 인증 (Authentication)

> Phase 0 — 기반 설정

## 개요

Supabase Auth 기반 소셜 로그인을 통해 사용자를 인증하고, 미들웨어로 미인증 접근을 차단한다.

## 지원 소셜 로그인

- 카카오
- Google
- GitHub

## 동작 흐름

1. `/login` 페이지에서 소셜 로그인 버튼 클릭
2. Supabase OAuth → 외부 제공자 인증
3. `/callback` 라우트에서 code를 세션으로 교환
4. `users` 테이블에 사용자 정보 upsert (이름, 이메일, 아바타)
5. 대시보드(`/`)로 리다이렉트

## 미들웨어 (proxy.ts)

- `/login`, `/callback` 경로는 인증 없이 통과
- 그 외 모든 경로는 `supabase.auth.getUser()`로 인증 확인
- 미인증 시 `/login`으로 리다이렉트

## 주요 파일

| 파일 | 역할 |
|------|------|
| `lib/supabase/server.ts` | 서버 컴포넌트용 Supabase 클라이언트 |
| `lib/supabase/client.ts` | 브라우저용 Supabase 클라이언트 |
| `lib/supabase/middleware.ts` | 세션 갱신 + 미인증 리다이렉트 |
| `lib/supabase/user.ts` | 사용자 메타데이터 추출 (extractUserInfo) |
| `app/(auth)/login/page.tsx` | 로그인 페이지 |
| `app/(auth)/callback/route.ts` | OAuth 콜백 핸들러 |
| `proxy.ts` | Next.js 미들웨어 진입점 |
