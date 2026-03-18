# 계획서: 스트리밍 중 에러 발생 시 메시지 히스토리 불일치 해결

## 문제

USER 메시지는 `Promise.all`에서 즉시 저장, ASSISTANT 메시지는 `onFinish`에서 저장.
스트리밍 중 에러 발생 시 USER만 저장되고 ASSISTANT는 누락 → 히스토리 불일치.

## 권장 해결안: USER 메시지 저장을 `onFinish`로 이동 (방안 B)

두 메시지를 `$transaction`으로 원자적 저장.

**선택 이유**: 원자성 보장, 변경 범위 최소(route.ts 단일 파일), 성능 중립(Promise.all 병렬화 유지).

## 변경 파일

| 파일 | 변경 |
|------|------|
| `app/api/chat/cover-letter/route.ts` | Promise.all에서 USER 메시지 저장 제거, onFinish를 트랜잭션으로 교체 |
| `tests/app/api/chat/cover-letter/route.test.ts` | 신규 테스트 |

## 구현 단계

### Step 1: `route.ts` 수정

```ts
// 변경 전
const [context, model] = await Promise.all([
  buildContext(...),
  getLanguageModel(user.id),
  lastMessage.role === "user" && lastMessageContent
    ? prisma.message.create({ data: { conversationId, role: "USER", content: lastMessageContent } })
    : Promise.resolve(),
])

onFinish: async ({ text }) => {
  await prisma.message.create({ data: { conversationId, role: "ASSISTANT", content: text } })
}

// 변경 후
const [context, model] = await Promise.all([
  buildContext(...),
  getLanguageModel(user.id),
])

onFinish: async ({ text }) => {
  await prisma.$transaction([
    ...(lastMessage.role === "user" && lastMessageContent
      ? [prisma.message.create({ data: { conversationId, role: "USER", content: lastMessageContent } })]
      : []),
    ...(text
      ? [prisma.message.create({ data: { conversationId, role: "ASSISTANT", content: text } })]
      : []),
  ])
}
```

### Step 2: 테스트
- onFinish 정상 호출 시 USER + ASSISTANT가 트랜잭션으로 함께 저장되는지 검증
- text 빈 문자열 시 ASSISTANT 미저장 확인
- lastMessage.role이 assistant인 경우 USER 미저장 확인

## 주의사항

- `onFinish`는 클라이언트 연결 단절과 무관하게 서버 사이드에서 호출됨 (Vercel Streaming)
- `$transaction` 실패 시 에러 로깅 추가 권장
