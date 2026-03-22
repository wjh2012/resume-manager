# Phase 7: 마무리

## 목표

전체 서비스의 완성도를 높인다. 대시보드 홈, 반응형 디자인, 로딩/에러/빈 상태 처리, 토스트 알림을 추가한다.

## 완료 기준

- [ ] 대시보드 홈 (활동 피드, 통계, 빠른 접근)
- [ ] 전체 페이지 반응형 디자인 (모바일/태블릿/데스크톱)
- [ ] 모든 페이지에 로딩 상태 (Skeleton)
- [ ] 모든 페이지에 에러 상태 (에러 메시지 + 재시도)
- [ ] 모든 목록에 빈 상태 (안내 메시지 + CTA)
- [ ] 모든 사용자 액션에 토스트 알림 (성공/실패)
- [ ] `npm run build` + `npm run typecheck` 에러 없음

## 의존성

- Phase 0~6 모두 완료

## 생성/수정할 파일

```
신규:
  app/(dashboard)/loading.tsx
  app/(dashboard)/error.tsx
  app/(dashboard)/documents/loading.tsx
  app/(dashboard)/cover-letters/loading.tsx
  app/(dashboard)/interviews/loading.tsx
  app/(dashboard)/insights/loading.tsx
  app/(dashboard)/resumes/loading.tsx

수정:
  app/(dashboard)/page.tsx              — 대시보드 홈 구현
  components/layout/app-sidebar.tsx     — 모바일 반응형
  전체 페이지/컴포넌트                   — 반응형 + 상태 처리
```

## 상세 구현 단계

### 1. 대시보드 홈

#### `app/(dashboard)/page.tsx`

**통계 카드** (상단):
- 업로드한 문서 수
- 작성한 자기소개서 수
- 진행한 모의면접 수
- 추출한 인사이트 수

**빠른 접근** (중단):
- "새 자기소개서 작성" 카드
- "모의면접 시작" 카드
- "이력서 작성" 카드

**최근 활동** (하단):
- 최근 수정한 자기소개서 (3개)
- 최근 면접 세션 (3개)
- 최근 추출한 인사이트 (5개)

### 2. 반응형 디자인

#### 브레이크포인트 전략

| 화면 | 너비 | 레이아웃 |
|------|------|----------|
| 모바일 | < 768px | 사이드바 숨김 (Sheet로 토글), 단일 컬럼 |
| 태블릿 | 768~1024px | 사이드바 축소, 2컬럼 그리드 |
| 데스크톱 | > 1024px | 사이드바 전체, 3컬럼 그리드 |

#### 주요 반응형 포인트

- **사이드바**: shadcn/ui Sidebar는 모바일에서 자동 Sheet 전환 지원
- **자기소개서 작업공간**: 모바일에서 에디터/채팅 탭 전환 (2분할 → 단일)
- **문서/이력서 카드 그리드**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- **면접 채팅**: 모바일에서도 전체 화면 유지

### 3. 로딩 상태 (Skeleton)

각 라우트에 `loading.tsx`를 추가하여 서버 컴포넌트 로딩 시 Skeleton을 표시한다.

```tsx
// app/(dashboard)/documents/loading.tsx
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" /> {/* 제목 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
```

### 4. 에러 상태

`error.tsx`로 런타임 에러를 graceful하게 처리한다.

```tsx
// app/(dashboard)/error.tsx
"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <h2>문제가 발생했습니다</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>다시 시도</Button>
    </div>
  )
}
```

### 5. 빈 상태

모든 목록 컴포넌트에 데이터가 없을 때 표시할 빈 상태:

| 페이지 | 메시지 | CTA |
|--------|--------|-----|
| 문서 | "아직 업로드한 문서가 없습니다" | "문서 업로드" 버튼 |
| 자기소개서 | "아직 작성한 자기소개서가 없습니다" | "새 자기소개서" 버튼 |
| 모의면접 | "아직 진행한 모의면접이 없습니다" | "새 모의면접" 버튼 |
| 인사이트 | "아직 추출된 인사이트가 없습니다" | 안내 텍스트 |
| 이력서 | "아직 작성한 이력서가 없습니다" | "새 이력서" 버튼 |

### 6. 토스트 알림

`sonner`를 사용한 토스트. `app/layout.tsx`에 `<Toaster />` 추가.

적용 시점:
- 문서 업로드 성공/실패
- 자기소개서 저장 성공
- 면접 종료
- 인사이트 추출 성공 ("N개의 인사이트가 추출되었습니다")
- 이력서 저장 성공
- AI 설정 저장 성공
- 삭제 완료
- API 에러 (네트워크, 인증 만료 등)

### 7. 최종 검증

```bash
npm run typecheck   # 타입 에러 없음
npm run build       # 빌드 성공
npm run lint        # 린트 경고 최소화
```

## 검증 방법

1. 대시보드 홈에 통계 + 최근 활동 표시
2. 모바일 화면에서 사이드바 토글 + 반응형 레이아웃
3. 네트워크 스로틀링에서 Skeleton 로딩 표시
4. 의도적 에러 발생 → 에러 페이지 + 재시도 버튼
5. 빈 데이터 상태에서 적절한 안내 표시
6. 각 사용자 액션 후 토스트 알림
7. `npm run build` + `npm run typecheck` 에러 없음
