# Decisions

리뷰·구현 과정에서 도출된 결정사항을 기록한다. 추후 개발자가 동일한 판단을 반복하지 않도록 근거와 출처를 함께 남긴다.

---

## API Route 입력 검증: Zod safeParse 통일

- **결정**: 모든 API route에서 요청 body 검증은 Zod `safeParse`를 사용한다.
- **근거**: `body as { ... }` type assertion은 런타임 검증이 아니며, route마다 검증 패턴이 다르면 유지보수 시 혼란을 초래한다.
- **예시**: `app/api/settings/ai/route.ts` (PUT)와 `app/api/settings/ai/validate/route.ts` (POST)가 동일한 패턴 사용.
- **출처**: [PR #7 @claude 리뷰](https://github.com/wjh2012/resume-manager/pull/7#issuecomment-4079330558) — validate route의 type assertion 지적

## API Route JSON 파싱: 별도 try-catch

- **결정**: `request.json()`은 비즈니스 로직 try-catch와 분리하여 별도 처리한다.
- **근거**: JSON 파싱 실패는 클라이언트 오류(400)이지만, 비즈니스 로직 catch에 섞이면 500으로 잘못 응답된다.
- **패턴**:
  ```ts
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 })
  }
  ```
- **출처**: [PR #7 @claude 1차 리뷰](https://github.com/wjh2012/resume-manager/pull/7#issuecomment-4079164110) — JSON 파싱 실패 시 500 반환 지적

## API 키 전달: URL 쿼리 금지, 헤더 사용

- **결정**: 외부 API에 API 키를 전달할 때 URL 쿼리 파라미터가 아닌 헤더를 사용한다.
- **근거**: URL에 포함된 키는 서버 access log, 프록시 로그, HTTP Referer 헤더 등에 평문으로 기록된다.
- **예시**: Google API는 `x-goog-api-key` 헤더 사용.
- **출처**: [PR #7 @claude 1차 리뷰](https://github.com/wjh2012/resume-manager/pull/7#issuecomment-4079164110) — Google API 키 URL 노출 (Critical)

## 폼 에러 표시: 인라인 우선, toast 보조

- **결정**: 입력 필드 관련 에러는 해당 필드 아래 인라인으로 표시한다. toast는 성공 알림이나 폼과 무관한 시스템 에러에만 사용한다.
- **근거**: 사용자 시선이 입력 필드에 있으므로 인라인이 직관적이며, toast와 인라인이 다른 메시지를 보여주면 혼란스럽다.
- **출처**: [PR #7 @claude 1차 리뷰](https://github.com/wjh2012/resume-manager/pull/7#issuecomment-4079164110) — 인라인 에러 메시지 고정값 지적

## 소유권 검증: updateMany/deleteMany 원자적 처리

- **결정**: 소유권 확인 후 수정/삭제하는 패턴은 `findUnique` + `update/delete` 2-쿼리 대신 `updateMany/deleteMany`에 `userId` 조건을 포함하여 단일 쿼리로 처리한다.
- **근거**: `findUnique` 후 `update/delete` 사이의 시간 창에서 TOCTOU 경쟁 조건이 이론적으로 존재. 단일 쿼리로 원자성 보장.
- **패턴**:
  ```ts
  const result = await prisma.coverLetter.updateMany({ where: { id, userId }, data })
  if (result.count === 0) {
    const exists = await prisma.coverLetter.findUnique({ where: { id }, select: { id: true } })
    if (!exists) throw new NotFoundError()
    throw new ForbiddenError()
  }
  ```
- **출처**: [PR #17 @claude 리뷰](https://github.com/wjh2012/resume-manager/pull/17)

## conversationId 소유권 검증 필수

- **결정**: 채팅 API에서 `coverLetterId` 검증 외에 `conversationId`도 별도로 소유권 및 연결 관계를 검증한다.
- **근거**: `conversationId`를 검증하지 않으면 다른 사용자의 대화에 메시지를 삽입할 수 있는 보안 취약점이 존재.
- **패턴**: `conversation.userId === user.id && conversation.coverLetterId === coverLetterId` 동시 검증.
- **출처**: [PR #17 @claude 리뷰](https://github.com/wjh2012/resume-manager/pull/17)

## classification 파이프라인: includeCareerNotes 파라미터 강제 적용

- **결정**: classification 파이프라인에서 `includeCareerNotes` 파라미터를 LLM 분류 결과(`compareCareerNotes`)와 AND 조건으로 결합하여 강제한다.
- **근거**: LLM 분류 결과만으로 커리어노트 접근을 결정하면, 면접 라우트(`includeCareerNotes: false`)에서도 스키마 변경 시 의도치 않게 커리어노트가 조회될 수 있다.
- **패턴**: `const compareNotes = params.includeCareerNotes && (result.compareCareerNotes ?? false)`
- **출처**: [PR #82 @claude 1차 리뷰](https://github.com/wjh2012/resume-manager/pull/82) — 이슈 1

## 접근성: label-input 연결 필수

- **결정**: `<label>`에는 `htmlFor`, 대응하는 입력 요소에는 `id`를 반드시 부여한다.
- **근거**: 스크린 리더에서 label과 input이 연결되지 않으면 접근성 저하.
- **출처**: [PR #7 @claude 1차 리뷰](https://github.com/wjh2012/resume-manager/pull/7#issuecomment-4079164110) — label htmlFor 누락 지적
