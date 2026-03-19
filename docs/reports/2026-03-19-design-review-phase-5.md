# Phase 5 디자인 스펙 리뷰 보고서

## 개요
- 점검 일시: 2026-03-19
- 대상: `docs/superpowers/specs/2026-03-19-phase-5-insights-design.md`
- 원본 스펙: `docs/specs/phases/phase-5-insights.md`
- 리뷰 유형: 구현 디자인 스펙의 원본 스펙 대비 완전성 검증

## 1. 원본 Phase 5 완료 기준 대비 충족 여부

| # | 완료 기준 | 디자인 스펙 커버 여부 | 비고 |
|---|----------|---------------------|------|
| 1 | 인사이트 추출 API (`generateObject` + Zod 스키마) | ✅ 충족 | 섹션 3 "API Routes" + 섹션 2 서비스 레이어의 `extractInsights`에서 `generateObject` + Zod 스키마 명시 |
| 2 | 자기소개서/면접 UI에 "인사이트 추출" 버튼 | ✅ 충족 | 섹션 4에서 cover-letter-chat, interview-chat 양쪽 모두 버튼 추가 설계. 면접은 종료 다이얼로그 체크박스까지 설계 |
| 3 | 인사이트 대시보드 (카테고리별 필터) | ✅ 충족 | 섹션 5에서 카테고리 탭 필터, 개수 배지, 정렬 토글 설계 |
| 4 | 인사이트 CRUD (수정, 삭제) | ✅ 충족 | PUT/DELETE API + 편집 다이얼로그 + 낙관적 삭제 설계 |
| 5 | 컨텍스트 빌더에 인사이트 자동 통합 | ✅ 충족 | 섹션 6에서 기존 구현 확인 + 면접 채팅 API `includeInsights: true` 추가 명시 |

**결론: 원본 스펙의 5개 완료 기준 모두 디자인 스펙에서 커버됨.**

## 2. 원본 스펙 상세 요구사항 대비 점검

| # | 원본 스펙 요구사항 | 디자인 스펙 반영 | 상태 |
|---|-------------------|-----------------|------|
| 1 | `app/api/insights/route.ts` (목록 API) | SC 직접 호출로 대체, 결정사항 테이블에 근거 명시 | ✅ 의도적 변경 |
| 2 | `app/api/insights/extract/route.ts` | 동일 경로로 설계 | ✅ |
| 3 | `app/api/insights/[id]/route.ts` (PUT/DELETE) | 동일 경로로 설계 | ✅ |
| 4 | `app/(dashboard)/insights/page.tsx` | SC로 설계 | ✅ |
| 5 | `components/insights/insight-list.tsx` | 동일 | ✅ |
| 6 | `components/insights/insight-card.tsx` | 동일 | ✅ |
| 7 | 면접 종료 시 인사이트 추출 유도 | 종료 다이얼로그 체크박스로 구체화 (기본 체크) | ✅ 구체화 |
| 8 | 인라인 편집 또는 다이얼로그 | 다이얼로그 선택, `insight-edit-dialog.tsx` 신규 | ✅ 결정 |
| 9 | 카테고리 배지 색상 (5종) | 동일하게 반영 | ✅ |
| 10 | 출처 링크 (자기소개서/면접 이동) | insight-card에 포함 | ✅ |
| 11 | 빈 상태 메시지 | 동일 문구 | ✅ |
| 12 | 중복 추출 방지 (확인 다이얼로그) | cover-letter-chat에서 확인 다이얼로그 후 호출 | ✅ |
| 13 | `lib/ai/context.ts` 수정 | 이미 구현 완료, 추가 수정 불필요 확인 | ✅ |
| 14 | 면접 채팅에서 인사이트 반영 | `app/api/chat/interview/route.ts`에 `includeInsights: true` 추가 명시 | ✅ |

## 3. 디자인 스펙의 추가 사항 (원본 스펙 대비)

| # | 추가 항목 | 평가 |
|---|----------|------|
| 1 | `lib/validations/insight.ts` — Zod 스키마 분리 | 긍정적: decisions.md의 "Zod safeParse 통일" 패턴 준수 |
| 2 | `lib/insights/service.ts` — 서비스 레이어 분리 | 긍정적: spec-deviations.md의 서비스 레이어 분리 패턴 일관 |
| 3 | `countByCategory` 함수 | 긍정적: 카테고리 탭 개수 배지 구현에 필요 |
| 4 | `insight-edit-dialog.tsx` 별도 컴포넌트 | 긍정적: 관심사 분리 |
| 5 | 에러 처리 구체화 (`AiSettingsNotFoundError` 등) | 긍정적: 기존 패턴과 일관 |
| 6 | 응답 코드 200 결정 + 근거 | 긍정적: interviews POST 200 패턴과 일관 |

## 4. decisions.md / spec-deviations.md 충돌 점검

| decisions.md 항목 | 디자인 스펙 준수 여부 |
|------------------|---------------------|
| Zod safeParse 통일 | ✅ `extractInsightsSchema.safeParse`, `updateInsightSchema.safeParse` 명시 |
| JSON 파싱 별도 try-catch | ⚠️ 명시되지 않음 (구현 시 적용 필요) |
| 소유권 검증 updateMany/deleteMany | ✅ PUT/DELETE에 `updateMany`, `deleteMany` 소유권 패턴 명시 |
| conversationId 소유권 검증 | ✅ `extractInsights`에서 `findFirst({ where: { id, userId } })` + 근거 설명 |
| 접근성 label-input 연결 | 해당 없음 (편집 다이얼로그 구현 시 적용 필요) |

**spec-deviations.md와의 충돌: 없음.**
목록 API route 생략은 기존 패턴(interviews, cover-letters)과 일관되며, 디자인 스펙 결정사항 테이블에 근거가 명시되어 있다.

## 5. Phase 6-7 영향 분석

### Phase 6 (이력서 빌더)

Phase 5 디자인 스펙은 Phase 6과 직접적 의존성이 없다. Phase 6은 이력서 CRUD + PDF 생성이며, 인사이트와 무관한 독립 기능이다. **영향 없음.**

### Phase 7 (마무리)

| Phase 7 요구사항 | Phase 5 디자인 스펙 영향 |
|-----------------|----------------------|
| `app/(dashboard)/insights/loading.tsx` | Phase 5에서 insights 페이지가 생성되므로 Phase 7에서 loading.tsx 추가 유효 |
| 대시보드 홈 "추출한 인사이트 수" 통계 | `countByCategory`가 서비스 레이어에 있으므로 활용 가능 |
| 대시보드 홈 "최근 추출한 인사이트 (5개)" | `listInsights` 서비스 함수 활용 가능 |
| 인사이트 빈 상태 메시지 | 디자인 스펙에서 이미 정의됨 (Phase 7 부분 선행 충족) |
| 토스트 알림 "N개의 인사이트가 추출되었습니다" | 디자인 스펙에서 이미 정의됨 (Phase 7 부분 선행 충족) |

**결론: Phase 6-7 스펙 수정 필요 없음.** Phase 5 디자인이 기존 스펙 구조를 변경하지 않으며, 후속 Phase가 활용할 수 있는 서비스 함수를 적절히 제공한다.

## 6. 기존 인프라 정합성 검증

| 기존 인프라 | 디자인 스펙 설명 | 실제 코드 확인 |
|-----------|-----------------|--------------|
| Prisma Insight 모델 | User/Conversation 관계 포함 | ✅ `prisma/schema.prisma` 308행: `conversation Conversation? @relation` |
| AI 컨텍스트 통합 | `includeInsights` 옵션으로 최근 10개 | ✅ `lib/ai/context.ts` 128-142행 확인 |
| 네비게이션 설정 | `Lightbulb` 아이콘, `/insights` 경로 | 코드에서 직접 미확인 (구현 시 검증) |
| 추출 프롬프트 | 카테고리 5종 + 시스템 프롬프트 | ✅ `lib/ai/prompts/insight-extraction.ts` 확인 |
| 자기소개서 연동 | `includeInsights: true` 전달 중 | ✅ `app/api/chat/cover-letter/route.ts` 88행 확인 |
| 면접 채팅 미연동 | `includeInsights` 미전달 | ✅ `app/api/chat/interview/route.ts`에서 `includeInsights` 미사용 확인 |

## 7. 리스크 및 개선 제안

### 리스크

| # | 항목 | 심각도 | 설명 |
|---|------|--------|------|
| 1 | 재추출 시 편집된 인사이트 손실 | 낮음 | 디자인 스펙에서 인지하고 있으며 UI 확인 다이얼로그로 안내 예정. 다만 사용자가 수동 편집한 인사이트가 삭제되는 점은 안내 문구에 명시 필요 |
| 2 | 대화 메시지 전체 로드 | 낮음 | 긴 면접 대화의 경우 메시지가 많을 수 있음. generateObject의 토큰 한계를 고려한 트렁케이션이 필요할 수 있으나, MVP 단계에서는 수용 가능 |

### 개선 제안 (비차단)

| # | 제안 | 이유 |
|---|------|------|
| 1 | JSON 파싱 별도 try-catch 패턴 명시 | decisions.md 항목이나 디자인 스펙에서 구현 시 적용될 것으로 기대되지만, 명시적으로 언급하면 누락 방지 |
| 2 | 재추출 확인 다이얼로그 문구에 "수동 편집한 인사이트도 삭제됩니다" 명시 | 사용자 기대와 실제 동작 일치 |
| 3 | `insight-extraction.ts` 프롬프트의 마지막 줄 "JSON 배열로 응답하세요" | `generateObject` + Zod 스키마 사용 시 이 지시문은 불필요 (generateObject가 자동으로 구조화). 혼란 방지를 위해 제거 권장. 단 이는 기존 코드 변경이므로 구현 시 판단 |

## 결론

Phase 5 디자인 스펙은 원본 스펙의 모든 완료 기준을 충족하며, 프로젝트의 기존 패턴(서비스 레이어 분리, Zod safeParse, updateMany/deleteMany 소유권 검증)과 일관된 설계를 보여준다. Phase 6-7에 대한 부정적 영향이 없고, 기존 인프라(Prisma 모델, context.ts, 추출 프롬프트)를 정확히 파악하여 반영하고 있다. 차단 이슈 없이 구현을 진행할 수 있다.
