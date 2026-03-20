# Phase 7: 마무리 — 디자인 스펙

## 개요

전체 서비스의 완성도를 높인다. 대시보드 홈 리뉴얼, 반응형 디자인, 로딩 상태, 토스트 알림 보강을 수행한다. 빈 상태와 에러 상태는 이미 구현 완료되어 스킵한다.

## 스펙 대비 변경 사항

| 항목 | 원본 스펙 | 변경 | 이유 |
|------|----------|------|------|
| 통계 카드 | 4개 (문서/자소서/면접/인사이트) | 5개 (+이력서) | Phase 6 완료로 이력서 기능 추가됨 |
| 빈 상태 | 신규 구현 | 스킵 | 5개 목록 모두 이미 구현 완료 |
| 에러 상태 | 신규 구현 | 스킵 | 글로벌 + 대시보드 에러 바운더리 이미 존재 |
| 이력서 자동 저장 토스트 | 모든 액션에 토스트 | 실패 시에만 | 자동 저장마다 토스트는 UX 방해 |

## 작업 순서

1. 대시보드 홈 (서비스 + 페이지 + 컴포넌트 + loading.tsx)
2. 로딩 Skeleton 4개 페이지 추가
3. 반응형 디자인 (자소서 작업공간 탭 전환 + 이력서 편집기 + 그리드 보정)
4. 토스트 보강
5. 최종 검증 (build + typecheck)

---

## 1. 대시보드 홈

### 데이터 레이어

**`lib/dashboard/service.ts`** 신규 생성:

```ts
getDashboardStats(userId: string): Promise<DashboardStats>
```

- Prisma `count()`로 5개 모델 집계: Document, CoverLetter, InterviewSession, Insight, Resume
- `Promise.all`로 병렬 호출

```ts
getRecentActivity(userId: string): Promise<RecentActivity>
```

- 최근 자소서 3개: `orderBy: { updatedAt: 'desc' }`, `take: 3`
- 최근 면접 3개: `orderBy: { updatedAt: 'desc' }`, `take: 3`
- 최근 인사이트 5개: `orderBy: { updatedAt: 'desc' }`, `take: 5`
- `Promise.all`로 병렬 호출

### 타입 정의

```ts
interface DashboardStats {
  documents: number
  coverLetters: number
  interviews: number
  insights: number
  resumes: number
}

interface RecentActivity {
  coverLetters: { id: string; title: string; updatedAt: Date }[]
  interviews: { id: string; title: string; status: string; updatedAt: Date }[]
  insights: { id: string; category: string; content: string; updatedAt: Date }[]
}
```

### 페이지 구성 (`app/(dashboard)/page.tsx`)

Server Component 유지. 3개 섹션 수직 배치:

#### 통계 카드 (상단)

- 5열 반응형 그리드: `grid-cols-2 md:grid-cols-3 lg:grid-cols-5`
- 각 카드: lucide 아이콘 + 숫자(큰 텍스트) + 라벨
- 카드 클릭 시 해당 목록 페이지로 이동 (Link 래핑)
- 카드 구성:
  - FileText 아이콘 | 문서 수 | "업로드한 문서"
  - PenTool 아이콘 | 자소서 수 | "자기소개서"
  - MessageSquare 아이콘 | 면접 수 | "모의면접"
  - Lightbulb 아이콘 | 인사이트 수 | "인사이트"
  - FileCheck 아이콘 | 이력서 수 | "이력서"

#### 빠른 접근 (중단)

- 3열 반응형 그리드: `grid-cols-1 md:grid-cols-3`
- 각 카드: 아이콘 + 제목 + 설명 + Link
  - "새 자기소개서 작성" → `/cover-letters/new`
  - "모의면접 시작" → `/interviews/new`
  - "이력서 작성" → `/resumes/new`

#### 최근 활동 (하단)

- 3열 반응형 그리드: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- 3개 컬럼 각각 섹션 제목 + 항목 리스트:
  - 최근 자기소개서 (3개): 제목 + 수정일, 클릭 시 `/cover-letters/[id]`
  - 최근 모의면접 (3개): 제목 + 상태 뱃지 + 수정일, 클릭 시 `/interviews/[id]`
  - 최근 인사이트 (5개): 카테고리 뱃지 + 내용 요약(1줄) + 수정일
- 데이터 없을 시 "아직 활동이 없습니다" 표시

### 컴포넌트 분리

```
신규:
  lib/dashboard/service.ts
  components/dashboard/stat-card.tsx
  components/dashboard/quick-action-card.tsx
  components/dashboard/recent-activity.tsx
  app/(dashboard)/loading.tsx

수정:
  app/(dashboard)/page.tsx
```

- `stat-card.tsx` — props: `{ icon: LucideIcon, value: number, label: string, href: string }`
- `quick-action-card.tsx` — props: `{ icon: LucideIcon, title: string, description: string, href: string }`
- `recent-activity.tsx` — props: `{ coverLetters, interviews, insights }`, 3컬럼 렌더링

### 대시보드 loading.tsx

통계 카드 5개 Skeleton + 빠른 접근 3개 Skeleton + 최근 활동 영역 Skeleton

---

## 2. 로딩 상태 (Skeleton)

4개 페이지에 맞춤 `loading.tsx` 추가. 각 페이지의 실제 목록 카드 형태를 반영한다.

### 자소서 (`app/(dashboard)/cover-letters/loading.tsx`)

- 제목 Skeleton (`h-8 w-48`)
- 3열 카드 그리드: 카드 6개 (카드 내부: 제목줄 `h-5 w-3/4` + 본문 2줄 `h-4 w-full` + 날짜 `h-4 w-24`)

### 면접 (`app/(dashboard)/interviews/loading.tsx`)

- 제목 Skeleton
- 3열 카드 그리드: 카드 6개 (카드 내부: 제목줄 + 상태 뱃지 `h-5 w-16 rounded-full` + 날짜)

### 인사이트 (`app/(dashboard)/insights/loading.tsx`)

- 제목 Skeleton
- 카테고리 필터 바 Skeleton (`h-9 w-full` 또는 버튼 여러 개)
- 2열 카드 그리드: 카드 6개 (카드 내부: 카테고리 뱃지 + 내용 2줄 + 날짜)

### 이력서 (`app/(dashboard)/resumes/loading.tsx`)

- 제목 Skeleton
- 3열 카드 그리드: 카드 6개 (카드 내부: 제목줄 + 템플릿명 `h-4 w-20` + 날짜)

---

## 3. 반응형 디자인

### 브레이크포인트 전략

| 화면 | 너비 | 레이아웃 |
|------|------|----------|
| 모바일 | < 768px | 사이드바 숨김 (Sheet 토글), 단일 컬럼 |
| 태블릿 | 768~1024px | 사이드바 축소, 2컬럼 |
| 데스크톱 | > 1024px | 사이드바 전체, 3컬럼 |

### 사이드바

shadcn/ui Sidebar가 이미 모바일 Sheet 전환 지원. 추가 작업 불필요.

### 카드 그리드

기존 목록 페이지의 그리드 클래스를 점검하여 `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` 패턴 누락 시 보정.

### 자소서 작업공간 (핵심 변경)

**현재**: 좌우 2분할 (에디터 + 채팅)이 항상 표시

**변경**:
- 태블릿 이상 (`md:` ~): 기존 2분할 유지
- 모바일 (`< md`): shadcn/ui `Tabs` 컴포넌트로 전환
  - 탭 1: "에디터" — 자소서 편집 영역
  - 탭 2: "AI 채팅" — 채팅 영역
  - 상단 탭 바 배치 (Topbar 바로 아래)
- `useIsMobile()` 훅으로 분기 렌더링

**수정 파일**: `app/(dashboard)/cover-letters/[id]/page.tsx` 또는 해당 작업공간 컴포넌트

### 이력서 편집기

**현재**: 편집 패널 + 사이드 미리보기 패널 (토글)

**변경**:
- 모바일 (`< md`): 미리보기 사이드 패널 숨기고 "미리보기" 버튼 클릭 시 전체화면 미리보기 페이지 (`/resumes/[id]/preview`)로 이동
- 태블릿 이상: 기존 사이드 패널 토글 유지

---

## 4. 토스트 보강

sonner는 이미 설치·통합 완료. 누락된 액션에 토스트를 추가한다.

### 추가 대상

| 액션 | 위치 | 메시지 |
|------|------|--------|
| 문서 업로드 성공 | `components/documents/upload-dialog.tsx` | `toast.success("문서가 업로드되었습니다")` |
| 문서 업로드 실패 | 동일 | `toast.error("업로드에 실패했습니다")` |
| 자소서 생성 | `components/cover-letters/` 생성 관련 | `toast.success("자기소개서가 생성되었습니다")` |
| 면접 종료 | `components/interviews/` 종료 관련 | `toast.success("면접이 종료되었습니다")` |
| 인사이트 추출 성공 | `components/insights/` 추출 관련 | `toast.success("N개의 인사이트가 추출되었습니다")` |
| 인사이트 편집 | `components/insights/insight-edit-dialog.tsx` | `toast.success("인사이트가 수정되었습니다")` |
| 이력서 생성 | `components/resumes/` 생성 관련 | `toast.success("이력서가 생성되었습니다")` |
| 이력서 자동 저장 실패 | `components/resumes/resume-editor.tsx` | `toast.error("저장에 실패했습니다")` |
| AI 설정 저장 | `components/settings/` 설정 저장 관련 | `toast.success("설정이 저장되었습니다")` |
| API 에러 공통 | 각 fetch 실패 지점 | `toast.error(에러 메시지)` |

### 제외 대상

- 이력서 자동 저장 성공: 빈번한 자동 저장마다 토스트는 UX 방해

---

## 5. 최종 검증

```bash
npm run typecheck   # 타입 에러 없음
npm run build       # 빌드 성공
npm run lint        # 린트 경고 최소화
```

---

## 생성/수정 파일 목록

```
신규:
  lib/dashboard/service.ts
  components/dashboard/stat-card.tsx
  components/dashboard/quick-action-card.tsx
  components/dashboard/recent-activity.tsx
  app/(dashboard)/loading.tsx
  app/(dashboard)/cover-letters/loading.tsx
  app/(dashboard)/interviews/loading.tsx
  app/(dashboard)/insights/loading.tsx
  app/(dashboard)/resumes/loading.tsx

수정:
  app/(dashboard)/page.tsx                           — 대시보드 홈 리뉴얼
  app/(dashboard)/cover-letters/[id]/page.tsx        — 모바일 탭 전환
  components/resumes/resume-editor.tsx               — 모바일 미리보기 분기
  components/documents/upload-dialog.tsx             — 업로드 토스트
  components/cover-letters/ (생성 관련)               — 생성 토스트
  components/interviews/ (종료 관련)                  — 종료 토스트
  components/insights/ (추출/편집 관련)               — 추출/편집 토스트
  components/resumes/ (생성 관련)                     — 생성 토스트, 자동 저장 실패 토스트
  components/settings/ (설정 저장 관련)               — 설정 저장 토스트
  전체 목록 페이지 그리드                              — 반응형 클래스 보정 (필요 시)
```

## 검증 방법

1. 대시보드 홈에 통계 5개 + 빠른 접근 3개 + 최근 활동 표시
2. 모바일 화면에서 사이드바 토글 + 반응형 레이아웃
3. 자소서 작업공간 모바일에서 상단 탭 전환 동작
4. 네트워크 스로틀링에서 각 페이지 Skeleton 표시
5. 각 사용자 액션 후 토스트 알림
6. `npm run build` + `npm run typecheck` 에러 없음
