# Phase 5: 인사이트 추출

## 목표

자기소개서/면접 대화에서 사용자의 강점, 경험, 동기 등 비정형 정보를 자동으로 추출하여 관리하고, 이후 자기소개서/면접에 자동으로 반영한다.

## 완료 기준

- [ ] 인사이트 추출 API (`generateObject` + Zod 스키마)
- [ ] 자기소개서/면접 UI에 "인사이트 추출" 버튼
- [ ] 인사이트 대시보드 (카테고리별 필터)
- [ ] 인사이트 CRUD (수정, 삭제)
- [ ] 컨텍스트 빌더에 인사이트 자동 통합

## 의존성

- Phase 2 완료 (AI 인프라)
- Phase 3 완료 (자기소개서 — 추출 버튼 추가 대상)
- Phase 4 완료 (모의면접 — 추출 버튼 추가 대상)

## 생성/수정할 파일

```
신규:
  app/api/insights/route.ts
  app/api/insights/[id]/route.ts
  app/api/insights/extract/route.ts
  app/(dashboard)/insights/page.tsx
  components/insights/insight-list.tsx
  components/insights/insight-card.tsx

수정:
  components/cover-letters/cover-letter-chat.tsx  — 인사이트 추출 버튼 추가
  components/interviews/interview-chat.tsx        — 인사이트 추출 버튼 추가
  lib/ai/context.ts                               — 인사이트 자동 포함 로직 (이미 구현)
```

## 상세 구현 단계

### 1. 인사이트 추출 API

#### `POST /api/insights/extract`

```typescript
import { generateObject } from "ai"
import { z } from "zod"
import { getLanguageModel } from "@/lib/ai/provider"
import { insightExtractionPrompt } from "@/lib/ai/prompts/insight-extraction"

const insightSchema = z.object({
  insights: z.array(z.object({
    category: z.enum(["strength", "experience", "motivation", "skill", "other"]),
    title: z.string().describe("인사이트 제목 (간결하게)"),
    content: z.string().describe("구체적인 내용"),
  })),
})

export async function POST(req: Request) {
  const { conversationId } = await req.json()

  // 1. 인증 확인
  // 2. 대화 메시지 전체 로드
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  })

  // 3. generateObject로 구조화된 인사이트 추출
  const model = await getLanguageModel(userId)
  const { object } = await generateObject({
    model,
    schema: insightSchema,
    system: insightExtractionPrompt,
    prompt: messages.map(m => `${m.role}: ${m.content}`).join("\n"),
  })

  // 4. 추출된 인사이트 DB 저장
  const created = await prisma.$transaction(
    object.insights.map(insight =>
      prisma.insight.create({
        data: {
          userId,
          conversationId,
          category: insight.category,
          title: insight.title,
          content: insight.content,
        },
      })
    )
  )

  return Response.json({ insights: created })
}
```

### 2. 인사이트 CRUD API

#### `GET /api/insights`

- Query: `category` (선택, 필터)
- 사용자의 인사이트 목록 (최신순)
- 출처 대화 정보 포함 (conversation.type, 관련 자기소개서/면접 제목)

#### `PUT /api/insights/[id]`

- 인사이트 수정 (title, content, category)

#### `DELETE /api/insights/[id]`

- 인사이트 삭제

### 3. 추출 버튼 추가

#### 자기소개서 채팅 (`cover-letter-chat.tsx`)

채팅 영역 상단이나 하단에 "인사이트 추출" 버튼 추가:
- 클릭 시 `POST /api/insights/extract` 호출
- 추출 결과를 토스트로 알림 ("3개의 인사이트가 추출되었습니다")
- 로딩 상태 표시

#### 면접 채팅 (`interview-chat.tsx`)

면접 종료 후 또는 채팅 중에 "인사이트 추출" 버튼:
- 동일한 API 호출
- 면접이 completed 상태일 때 특히 추출 유도 ("면접이 끝났습니다. 인사이트를 추출하시겠습니까?")

### 4. 인사이트 대시보드

#### `app/(dashboard)/insights/page.tsx`

- 상단: 카테고리 필터 탭 (전체 / 강점 / 경험 / 동기 / 기술 / 기타)
  - 각 탭에 해당 카테고리 개수 표시
- 본문: 인사이트 카드 목록

#### `components/insights/insight-list.tsx`

- 카테고리별 그룹핑 또는 시간순 정렬 (토글)
- 빈 상태: "아직 추출된 인사이트가 없습니다. 자기소개서나 면접 대화에서 추출해보세요."

#### `components/insights/insight-card.tsx`

- 카테고리 배지 (색상 구분)
  - strength: 초록
  - experience: 파랑
  - motivation: 보라
  - skill: 주황
  - other: 회색
- 제목 + 내용
- 출처 링크 (해당 자기소개서/면접으로 이동)
- 수정/삭제 버튼
- 수정 시 인라인 편집 또는 다이얼로그

### 5. 컨텍스트 자동 통합

`lib/ai/context.ts`의 `buildContext`에는 이미 `includeInsights` 옵션이 있다. Phase 3의 자기소개서 채팅에서 `includeInsights: true`를 전달하면 축적된 인사이트가 자동으로 AI 컨텍스트에 포함된다.

이 단계에서 확인할 것:
- 인사이트가 쌓인 후 새 자기소개서 작성 시 AI가 인사이트를 활용하는지
- 인사이트가 시스템 프롬프트에 올바르게 포맷되는지

## 검증 방법

1. 자기소개서 대화 후 "인사이트 추출" → 구조화된 인사이트 생성 확인
2. 면접 대화 후 "인사이트 추출" → 구조화된 인사이트 생성 확인
3. 인사이트 대시보드에서 카테고리별 필터 동작
4. 인사이트 수정/삭제 동작
5. **인사이트가 축적된 후 새 자기소개서 AI 채팅에서 인사이트 반영 확인** (핵심)
6. 출처 링크로 원래 대화 이동 확인
