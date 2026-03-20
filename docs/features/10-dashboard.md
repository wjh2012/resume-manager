# 대시보드 홈 (Dashboard)

> Phase 7 — 전체 서비스 현황 조회 및 빠른 접근

## 개요

로그인 후 첫 화면으로, 전체 서비스 사용 현황(통계), 주요 기능 빠른 접근, 최근 활동을 한눈에 보여준다.

## 동작 방식

1. **통계 카드** — 5개 모델(문서, 자소서, 면접, 인사이트, 이력서) 건수를 표시. 클릭 시 해당 목록 페이지로 이동.
2. **빠른 시작** — "새 자기소개서 작성", "모의면접 시작", "이력서 작성" 3개 카드. 클릭 시 생성 페이지로 이동.
3. **최근 활동** — 최근 자소서 3개, 면접 3개, 인사이트 5개를 수정일 기준 내림차순으로 표시. 데이터 없으면 빈 상태 안내.

## 주요 컴포넌트

```
app/(dashboard)/page.tsx (Server Component)
├── StatCard × 5           — 통계 카드 (아이콘 + 숫자 + 라벨 + Link)
├── QuickActionCard × 3    — 빠른 접근 (아이콘 + 제목 + 설명 + Link)
└── RecentActivitySection  — 최근 활동 3컬럼 (자소서 / 면접 / 인사이트)
```

| 파일 | 역할 |
|------|------|
| `lib/dashboard/service.ts` | `getDashboardStats()` (5개 count), `getRecentActivity()` (3개 findMany) |
| `components/dashboard/stat-card.tsx` | 통계 카드 |
| `components/dashboard/quick-action-card.tsx` | 빠른 접근 카드 |
| `components/dashboard/recent-activity.tsx` | 최근 활동 섹션 |
| `app/(dashboard)/loading.tsx` | 대시보드 로딩 Skeleton |

## 데이터 흐름

1. `getAuthUser()` → 인증 확인
2. `Promise.all([getDashboardStats(userId), getRecentActivity(userId)])` → 병렬 조회
3. `getDashboardStats` → Prisma `count()` × 5 (`Promise.all` 병렬)
4. `getRecentActivity` → Prisma `findMany()` × 3 (`Promise.all` 병렬, `orderBy: updatedAt desc`, `take: 3/3/5`)
5. Server Component에서 직접 렌더링 (클라이언트 전송 없음)
