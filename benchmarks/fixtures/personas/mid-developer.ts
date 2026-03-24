/**
 * 미들 개발자 페르소나 fixture 데이터 (5명)
 *
 * md-1: 백엔드 (Python/FastAPI, 3년차, 핀테크 스타트업)
 * md-2: 풀스택 (TypeScript/Next.js, 4년차, 이커머스)
 * md-3: iOS 개발 (Swift/UIKit, 3년차, 모바일 에이전시, 추천서 보유)
 * md-4: 데이터 엔지니어 (Python/Spark, 4년차, 개인 블로그 운영)
 * md-5: 백엔드 (Go/gRPC, 5년차, B2B SaaS)
 */

import type {
  MockPersona,
  MockDocument,
  MockExternalDocument,
  MockCareerNote,
  ConvMessage,
} from "../types"

// ---------------------------------------------------------------------------
// 페르소나
// ---------------------------------------------------------------------------

export const PERSONAS: MockPersona[] = [
  {
    id: "md-1",
    name: "박지훈",
    category: "mid-developer",
    label: "백엔드 3년차 · Python/FastAPI · 핀테크",
  },
  {
    id: "md-2",
    name: "이수연",
    category: "mid-developer",
    label: "풀스택 4년차 · TypeScript/Next.js · 이커머스",
  },
  {
    id: "md-3",
    name: "최윤호",
    category: "mid-developer",
    label: "iOS 3년차 · Swift/UIKit · 모바일 에이전시",
  },
  {
    id: "md-4",
    name: "김하늘",
    category: "mid-developer",
    label: "데이터 엔지니어 4년차 · Python/Spark · 블로그 운영",
  },
  {
    id: "md-5",
    name: "정우진",
    category: "mid-developer",
    label: "백엔드 5년차 · Go/gRPC · B2B SaaS",
  },
]

// ---------------------------------------------------------------------------
// 사용자 문서 (DOCUMENTS)
// ---------------------------------------------------------------------------

export const DOCUMENTS: MockDocument[] = [
  // ── md-1: 박지훈 (4건) ──────────────────────────────────────────────
  {
    id: "md-1-doc-1",
    personaId: "md-1",
    title: "이력서 — 박지훈",
    summary:
      "백엔드 개발자, 3년 경력. Python, FastAPI, PostgreSQL 중심. 핀테크 스타트업 경험.",
    extractedText: `박지훈 — 백엔드 개발자

경력사항:
1. (주)페이브릿지 (2022.07 ~ 현재) — 백엔드 개발자
   - Python + FastAPI 기반 결제 정산 시스템 개발
   - 일일 정산 트랜잭션 12만건 처리
   - 비동기 태스크 큐(Celery + Redis) 설계·운영
   - PCI-DSS 준수 보안 모듈 구현

2. (주)넥스트코드 (2021.03 ~ 2022.06) — 주니어 개발자
   - Django REST Framework 기반 API 서버 개발
   - 사내 어드민 백오피스 구축 (Django Admin 커스터마이징)
   - AWS Lambda + SQS를 활용한 알림 서비스 개발

학력:
- 한양대학교 컴퓨터소프트웨어학부 졸업 (2020)

기술 스택:
- Backend: Python, FastAPI, Django, Celery
- Database: PostgreSQL, Redis, DynamoDB
- Infra: AWS (EC2, RDS, Lambda, SQS, S3), Docker
- Others: Git, Pytest, Sentry, Datadog`,
  },
  {
    id: "md-1-doc-2",
    personaId: "md-1",
    title: "포트폴리오 — 사이드 프로젝트",
    summary:
      "개인 프로젝트 2개: 가계부 API 서버, 오픈소스 FastAPI 미들웨어.",
    extractedText: `프로젝트 포트폴리오

1. 가계부 REST API "머니로그" (2023)
   - FastAPI + SQLAlchemy + PostgreSQL
   - JWT 인증, OAuth2 소셜 로그인 (카카오, 구글)
   - 월별 지출 통계 API, CSV 내보내기
   - Swagger 문서 자동 생성
   - GitHub Stars 120+

2. FastAPI 로깅 미들웨어 "fastapi-request-logger" (2022)
   - 요청/응답 자동 구조화 로깅
   - 민감정보 마스킹 기능 (카드번호, 주민번호 등)
   - PyPI 배포, 주간 다운로드 800+
   - 기업 3곳에서 프로덕션 사용 확인`,
  },
  {
    id: "md-1-doc-3",
    personaId: "md-1",
    title: "경력기술서 — 페이브릿지",
    summary:
      "페이브릿지 재직 중 수행한 주요 프로젝트 2건. 정산 시스템, 이상거래 탐지.",
    extractedText: `경력기술서 — (주)페이브릿지 (2022.07 ~ 현재)

프로젝트 1: 실시간 정산 시스템 구축 (2023.01 ~ 2023.09)
  역할: 백엔드 개발
  - 기존 배치 정산(D+1)을 실시간 정산(T+0)으로 전환
  - FastAPI + Celery 기반 비동기 정산 파이프라인 설계
  - PostgreSQL 파티셔닝으로 정산 테이블 쿼리 성능 3배 개선
  - 일일 정산 트랜잭션 12만건 안정 처리
  - 결과: 가맹점 정산 지연 클레임 90% 감소

프로젝트 2: 이상거래 탐지 시스템 (FDS) (2022.09 ~ 2022.12)
  역할: 백엔드 개발
  - 규칙 기반 이상거래 탐지 엔진 개발 (Python)
  - Redis Streams를 활용한 실시간 거래 모니터링
  - 탐지 규칙 30개+ 관리 (JSON DSL 기반 규칙 엔진)
  - Slack 알림 연동, 의심 거래 대시보드 구축
  - 결과: 부정 거래 탐지율 기존 대비 2.5배 향상`,
  },
  {
    id: "md-1-doc-4",
    personaId: "md-1",
    title: "자기소개서 초안 — 토스",
    summary:
      "토스 서버 개발자 지원 자소서 초안. 핀테크 경험, 대용량 트랜잭션 처리 강조.",
    extractedText: `자기소개서 — 토스 Server Developer 지원

[지원 동기]
핀테크 도메인에서 실시간 정산 시스템과 이상거래 탐지 시스템을 직접 구축한 경험을 바탕으로,
토스의 금융 인프라 고도화에 기여하고 싶어 지원합니다.
페이브릿지에서 일일 12만건 정산 트랜잭션을 처리하며 느낀 것은
'금융 시스템에서 신뢰성이란 곧 사용자 경험'이라는 점입니다.

[핵심 역량]
1. 금융 시스템 개발: PCI-DSS 준수 결제 모듈, 실시간 정산 파이프라인
2. 비동기 처리: Celery + Redis 기반 대용량 태스크 큐 설계
3. 보안: 이상거래 탐지 엔진, 민감정보 암호화 처리

[성장 과정]
넥스트코드에서 Django로 웹 개발 기초를 다진 후,
페이브릿지에서 금융 도메인 특화 백엔드 엔지니어로 성장했습니다.
특히 D+1 배치 정산을 T+0 실시간 정산으로 전환하는 과정에서
시스템 설계와 성능 최적화 역량을 크게 키울 수 있었습니다.`,
  },

  // ── md-2: 이수연 (3건) ──────────────────────────────────────────────
  {
    id: "md-2-doc-1",
    personaId: "md-2",
    title: "이력서 — 이수연",
    summary:
      "풀스택 개발자, 4년 경력. TypeScript, Next.js, NestJS 중심. 이커머스 플랫폼 경험.",
    extractedText: `이수연 — 풀스택 개발자

경력사항:
1. (주)커머스랩 (2022.01 ~ 현재) — 프론트엔드 리드
   - Next.js + TypeScript 기반 이커머스 플랫폼 프론트엔드 개발
   - 상품 검색·필터링 UX 개선 (전환율 18% 향상)
   - NestJS 기반 BFF(Backend For Frontend) 설계·운영
   - Storybook 기반 디자인 시스템 구축
   - 월 거래액 15억원 규모 서비스 운영

2. (주)웹크래프트 (2020.06 ~ 2021.12) — 풀스택 개발자
   - React + Express 기반 B2B 어드민 플랫폼 개발
   - GraphQL API 설계 및 구현 (Apollo Server)
   - 고객사 10곳 맞춤형 대시보드 개발
   - 사내 UI 컴포넌트 라이브러리 최초 구축

학력:
- 이화여자대학교 컴퓨터공학과 졸업 (2020)

기술 스택:
- Frontend: React, Next.js, TypeScript, Tailwind CSS, Storybook
- Backend: NestJS, Express, GraphQL (Apollo)
- Database: PostgreSQL, MongoDB, Elasticsearch
- Infra: Vercel, AWS (CloudFront, S3), Docker
- Testing: Jest, React Testing Library, Playwright`,
  },
  {
    id: "md-2-doc-2",
    personaId: "md-2",
    title: "경력기술서 — 커머스랩",
    summary:
      "커머스랩 재직 중 주요 프로젝트 3건. 상품 검색, 디자인 시스템, BFF 아키텍처.",
    extractedText: `경력기술서 — (주)커머스랩 (2022.01 ~ 현재)

프로젝트 1: 상품 검색·필터 UX 리뉴얼 (2023.06 ~ 2023.12)
  역할: 프론트엔드 리드
  - 기존 단순 키워드 검색을 패싯 검색으로 전면 개편
  - Elasticsearch 기반 검색 API 설계 (백엔드팀 협업)
  - 자동완성, 인기 검색어, 연관 검색어 UI 구현
  - 검색 결과 무한 스크롤 + 가상화(react-virtuoso)
  - 결과: 검색 → 구매 전환율 12% → 18%로 향상

프로젝트 2: 디자인 시스템 "Craft UI" 구축 (2023.01 ~ 2023.05)
  역할: 프론트엔드 리드
  - Radix UI + Tailwind CSS 기반 컴포넌트 라이브러리
  - Storybook으로 문서화 및 시각적 회귀 테스트
  - Figma 토큰 연동 자동화 (Style Dictionary)
  - 컴포넌트 40개, 팀 내 4개 프로젝트에서 공유 사용
  - 결과: UI 개발 속도 30% 향상, 디자인 일관성 확보

프로젝트 3: BFF 아키텍처 도입 (2022.03 ~ 2022.08)
  역할: 풀스택 개발
  - 프론트엔드 요구에 최적화된 NestJS BFF 레이어 구축
  - REST 마이크로서비스 → GraphQL 통합 인터페이스 제공
  - 응답 캐싱(Redis), 데이터 애그리게이션
  - API 호출 수 평균 40% 감소 (클라이언트 → BFF 단일 요청)`,
  },
  {
    id: "md-2-doc-3",
    personaId: "md-2",
    title: "자기소개서 초안 — 당근마켓",
    summary:
      "당근마켓 웹 프론트엔드 개발자 지원 자소서 초안. 이커머스 UX, 디자인 시스템 경험 강조.",
    extractedText: `자기소개서 — 당근마켓 웹 프론트엔드 개발자 지원

[지원 동기]
당근마켓의 '하이퍼로컬 커머스' 비전에 공감하며, 이커머스 플랫폼에서 쌓은
검색 UX 최적화와 디자인 시스템 경험을 당근마켓 웹 서비스에 적용하고 싶어 지원합니다.
커머스랩에서 검색 → 구매 전환율을 50% 향상시킨 경험이
당근마켓의 중고거래 탐색 경험 개선에 직접적으로 기여할 수 있다고 확신합니다.

[핵심 역량]
1. 이커머스 UX 전문성: 상품 검색 리뉴얼로 전환율 50% 향상
2. 디자인 시스템 구축: 40개 컴포넌트, 4개 프로젝트 공유
3. BFF 아키텍처: 프론트엔드 최적화된 API 레이어 설계 경험

[향후 목표]
사용자 행동 데이터 기반 A/B 테스트 문화를 정착시키고,
웹 성능 최적화(Core Web Vitals)에 지속적으로 기여하고 싶습니다.`,
  },

  // ── md-3: 최윤호 (3건) ──────────────────────────────────────────────
  {
    id: "md-3-doc-1",
    personaId: "md-3",
    title: "이력서 — 최윤호",
    summary:
      "iOS 개발자, 3년 경력. Swift, UIKit 중심. 모바일 에이전시 및 자체 서비스 경험.",
    extractedText: `최윤호 — iOS 개발자

경력사항:
1. (주)앱팩토리 (2022.03 ~ 현재) — iOS 개발자
   - Swift + UIKit 기반 금융 앱 외주 개발 (3개 프로젝트)
   - 신한카드 마이앱 리뉴얼 프로젝트 참여 (DAU 50만)
   - RxSwift + MVVM-C 아키텍처 적용
   - CI/CD 파이프라인 구축 (Fastlane + GitHub Actions)
   - Tuist 기반 모듈화 도입

2. (주)모바일랩스 (2021.01 ~ 2022.02) — 주니어 iOS 개발자
   - 자체 배달 앱 iOS 클라이언트 유지보수
   - Push 알림 시스템 리팩토링 (FCM + APNs)
   - 앱 크래시율 2.3% → 0.4%로 개선
   - Objective-C → Swift 마이그레이션 (30%)

학력:
- 성균관대학교 소프트웨어학과 졸업 (2020)

기술 스택:
- iOS: Swift, UIKit, SwiftUI, RxSwift, Combine
- Architecture: MVVM-C, Clean Architecture, Tuist
- Networking: URLSession, Moya/Alamofire
- Testing: XCTest, Quick/Nimble, Snapshot Testing
- CI/CD: Fastlane, GitHub Actions
- Others: Firebase, Charles Proxy, Instruments`,
  },
  {
    id: "md-3-doc-2",
    personaId: "md-3",
    title: "포트폴리오 — iOS 앱",
    summary:
      "개인 앱 2개: 습관 트래커 앱(SwiftUI), 오픈소스 네트워크 라이브러리.",
    extractedText: `프로젝트 포트폴리오

1. 습관 트래커 앱 "데일리루틴" (2023)
   - SwiftUI + Combine + CoreData
   - 위젯 확장(WidgetKit)으로 홈 화면 진행률 표시
   - 차트 시각화 (Swift Charts)
   - 앱스토어 출시, 별점 4.7 (리뷰 230+)
   - MAU 3,200명

2. iOS 네트워크 라이브러리 "SwiftNetKit" (2022)
   - async/await 기반 타입세이프 네트워크 레이어
   - Codable 자동 매핑, 에러 핸들링 체계화
   - 인터셉터 패턴으로 인증/로깅/리트라이 지원
   - GitHub Stars 85+
   - Swift Package Manager 배포`,
  },
  {
    id: "md-3-doc-3",
    personaId: "md-3",
    title: "추천서 — 앱팩토리 개발팀장",
    summary:
      "앱팩토리 개발팀장이 작성한 추천서. 코드 품질, 일정 관리 능력 강조.",
    extractedText: `추천서

추천인: 한승민 (앱팩토리 모바일개발팀 팀장)
대상: 최윤호

최윤호 개발자는 앱팩토리에서 2년간 iOS 개발자로 근무하며
금융 앱 외주 프로젝트 3건을 성공적으로 수행하였습니다.

특히 신한카드 마이앱 리뉴얼 프로젝트에서 보여준 역량이 인상적이었습니다.
DAU 50만 규모 앱의 메인 화면 리뉴얼이라는 부담감 속에서도
체계적인 모듈화(Tuist)와 테스트 코드 작성으로 안정적인 릴리즈를 이끌었습니다.
해당 프로젝트는 고객사로부터 "가장 매끄러운 외주 협업"이라는 평가를 받았습니다.

또한 팀 내에서 코드 리뷰 문화 정착에 기여했으며,
후배 개발자 2명의 온보딩 멘토링을 자발적으로 수행하여
팀 전체의 코드 품질 향상에 기여했습니다.

최윤호 개발자를 자신있게 추천합니다.`,
  },

  // ── md-4: 김하늘 (4건) ──────────────────────────────────────────────
  {
    id: "md-4-doc-1",
    personaId: "md-4",
    title: "이력서 — 김하늘",
    summary:
      "데이터 엔지니어, 4년 경력. Python, Spark, Airflow 중심. 물류·리테일 데이터 파이프라인 경험.",
    extractedText: `김하늘 — 데이터 엔지니어

경력사항:
1. (주)데이터웨이브 (2022.06 ~ 현재) — 데이터 엔지니어
   - Apache Spark 기반 대규모 ETL 파이프라인 설계·운영
   - Airflow DAG 150개+ 관리, 일일 데이터 처리량 2TB
   - 데이터 레이크하우스 아키텍처 구축 (Delta Lake + S3)
   - 데이터 품질 모니터링 시스템 도입 (Great Expectations)

2. (주)스마트로지 (2020.09 ~ 2022.05) — 주니어 데이터 엔지니어
   - 물류 데이터 수집·가공 파이프라인 개발 (Python)
   - PostgreSQL → BigQuery 마이그레이션
   - Metabase 기반 물류 현황 대시보드 구축
   - 일일 배송 건수 5만건 데이터 처리

학력:
- 카이스트 산업및시스템공학과 졸업 (2020)

기술 스택:
- Data Processing: Apache Spark, PySpark, Pandas, Polars
- Orchestration: Apache Airflow, Dagster
- Storage: S3, Delta Lake, BigQuery, PostgreSQL, Redshift
- Infra: AWS (EMR, Glue, Athena), Docker, Terraform
- Monitoring: Great Expectations, Datadog
- Others: Python, SQL, dbt, Git`,
  },
  {
    id: "md-4-doc-2",
    personaId: "md-4",
    title: "포트폴리오 — 데이터 프로젝트",
    summary:
      "사이드 프로젝트 2개: 공공데이터 파이프라인 오픈소스, 부동산 시세 분석 대시보드.",
    extractedText: `프로젝트 포트폴리오

1. 공공데이터 자동 수집 파이프라인 "data-harvest" (2023)
   - Python + Airflow로 공공데이터포털 API 자동 수집
   - 데이터셋 50개 일일 자동 갱신
   - Parquet 포맷 변환 + S3 저장
   - dbt로 분석용 테이블 자동 생성
   - GitHub Stars 200+

2. 부동산 시세 분석 대시보드 (2022)
   - 국토교통부 실거래가 API + 네이버 부동산 크롤링
   - PySpark으로 10년치 실거래 데이터 분석
   - Streamlit 대시보드 (지역별 시세 추이, 전세가율)
   - 월간 사용자 1,500명`,
  },
  {
    id: "md-4-doc-3",
    personaId: "md-4",
    title: "경력기술서 — 데이터웨이브",
    summary:
      "데이터웨이브 재직 중 주요 프로젝트 2건. 데이터 레이크하우스, 실시간 파이프라인.",
    extractedText: `경력기술서 — (주)데이터웨이브 (2022.06 ~ 현재)

프로젝트 1: 데이터 레이크하우스 구축 (2023.03 ~ 2023.10)
  역할: 데이터 엔지니어 (메인)
  - 기존 Data Warehouse(Redshift) + Data Lake(S3)를 레이크하우스로 통합
  - Delta Lake 도입으로 ACID 트랜잭션 지원 + 스키마 진화
  - Spark Structured Streaming으로 준실시간 데이터 수집
  - 데이터 카탈로그(AWS Glue Data Catalog) 정비
  - 결과: 데이터 조회 레이턴시 60% 감소, 스토리지 비용 35% 절감

프로젝트 2: 실시간 이벤트 파이프라인 (2022.08 ~ 2023.02)
  역할: 데이터 엔지니어
  - Kafka → Spark Streaming → Delta Lake 실시간 파이프라인
  - 사용자 행동 이벤트 일일 3억건 수집·처리
  - Great Expectations로 데이터 품질 검증 자동화 (200개+ 검증 규칙)
  - Airflow 기반 파이프라인 모니터링 + 장애 자동 복구
  - 결과: 데이터 지연 시간 4시간 → 5분 이내로 단축`,
  },
  {
    id: "md-4-doc-4",
    personaId: "md-4",
    title: "기술 블로그 모음 — 김하늘",
    summary:
      "개인 기술 블로그 주요 게시글. Spark 최적화, Airflow 운영, 데이터 품질 주제.",
    extractedText: `기술 블로그 주요 게시글 — data-haneul.dev

1. "Spark 파티션 전략: 성능을 2배로 만드는 법" (2024.01)
   - repartition vs coalesce 실전 비교
   - Skewed Data 처리 전략 (Salting, AQE)
   - 실제 프로덕션 사례 기반 벤치마크
   - 조회수 8,200+, 북마크 290+

2. "Airflow DAG 150개를 운영하며 배운 것들" (2023.08)
   - DAG 구조화 패턴 (Template DAG, Dynamic DAG)
   - 장애 대응 자동화 (Slack 알림 + 자동 재시도)
   - 리소스 관리 (Pool, Priority Weight)
   - 조회수 6,500+

3. "Great Expectations로 데이터 품질 자동화하기" (2023.03)
   - 데이터 품질 검증이 필요한 이유
   - Expectation Suite 설계 방법론
   - Airflow + GE 통합 운영 사례
   - 조회수 4,100+

4. "Delta Lake vs Apache Iceberg: 어떤 것을 선택할까?" (2023.11)
   - 두 테이블 포맷의 아키텍처 비교
   - Time Travel, Schema Evolution, Compaction 비교
   - 실제 마이그레이션 경험 기반 장단점
   - 조회수 11,000+, 시리즈 총 2편`,
  },

  // ── md-5: 정우진 (3건) ──────────────────────────────────────────────
  {
    id: "md-5-doc-1",
    personaId: "md-5",
    title: "이력서 — 정우진",
    summary:
      "백엔드 개발자, 5년 경력. Go, gRPC, Kubernetes 중심. B2B SaaS 경험.",
    extractedText: `정우진 — 백엔드 개발자

경력사항:
1. (주)클라우드빌드 (2021.09 ~ 현재) — 백엔드 개발자
   - Go + gRPC 기반 B2B SaaS 플랫폼 핵심 서비스 개발
   - 멀티테넌시 아키텍처 설계 (테넌트 120개+ 운영)
   - Kubernetes 기반 마이크로서비스 12개 운영
   - API Gateway + Rate Limiter 구현 (초당 5,000 요청 처리)

2. (주)서버랩 (2019.07 ~ 2021.08) — 백엔드 개발자
   - Java/Spring Boot 기반 REST API 개발
   - 온프레미스 → AWS 클라우드 마이그레이션 참여
   - RabbitMQ 기반 비동기 메시지 처리 시스템 구축
   - 사내 인증/인가 서비스 개발 (OAuth2 + JWT)

학력:
- 고려대학교 컴퓨터학과 졸업 (2019)

기술 스택:
- Backend: Go, Java, gRPC, Protocol Buffers, REST
- Database: PostgreSQL, CockroachDB, Redis, etcd
- Infra: Kubernetes, Docker, Terraform, Helm
- Cloud: AWS (EKS, RDS, ElastiCache, SQS), GCP
- Monitoring: Prometheus, Grafana, Jaeger (분산 트레이싱)
- Testing: Go testing, testify, mockery`,
  },
  {
    id: "md-5-doc-2",
    personaId: "md-5",
    title: "경력기술서 — 클라우드빌드",
    summary:
      "클라우드빌드 재직 중 주요 프로젝트 3건. 멀티테넌시, API Gateway, 인프라 자동화.",
    extractedText: `경력기술서 — (주)클라우드빌드 (2021.09 ~ 현재)

프로젝트 1: 멀티테넌시 SaaS 아키텍처 설계 (2023.01 ~ 2023.08)
  역할: 백엔드 개발 (설계 리드)
  - 싱글테넌트 → 멀티테넌트 전환 설계 및 구현
  - 테넌트별 데이터 격리 (Row-Level Security + Schema 분리 혼합)
  - 테넌트별 리소스 할당 및 사용량 모니터링
  - 120개+ 테넌트 안정 운영
  - 결과: 신규 테넌트 온보딩 시간 2주 → 30분으로 단축

프로젝트 2: API Gateway 자체 개발 (2022.06 ~ 2022.12)
  역할: 백엔드 개발
  - Go 기반 고성능 API Gateway 구현
  - Rate Limiting (Token Bucket 알고리즘)
  - 요청 라우팅, 인증/인가, 로깅 통합
  - Circuit Breaker 패턴 적용
  - 결과: 초당 5,000 요청, p99 레이턴시 15ms 이하 달성

프로젝트 3: Infrastructure as Code 도입 (2022.01 ~ 2022.05)
  역할: 인프라 자동화
  - Terraform으로 AWS 인프라 전체 코드화
  - Helm chart 표준화 (12개 마이크로서비스)
  - GitOps 워크플로 구축 (ArgoCD)
  - 환경 복제 자동화 (dev/staging/prod)
  - 결과: 인프라 프로비저닝 시간 2일 → 2시간`,
  },
  {
    id: "md-5-doc-3",
    personaId: "md-5",
    title: "자기소개서 초안 — 라인플러스",
    summary:
      "라인플러스 서버 개발자 지원 자소서 초안. 대규모 분산 시스템, Go 전문성 강조.",
    extractedText: `자기소개서 — 라인플러스 Server-Side Engineer 지원

[지원 동기]
라인 메신저의 글로벌 스케일 분산 시스템에서 제 Go/gRPC 전문성과
멀티테넌시 아키텍처 경험을 발휘하고 싶어 지원합니다.
클라우드빌드에서 120개 테넌트를 운영하며 체득한 데이터 격리,
리소스 관리, 장애 격리 경험이 라인의 글로벌 서비스 운영에
직접적으로 기여할 수 있다고 확신합니다.

[핵심 역량]
1. Go 전문성: gRPC 기반 마이크로서비스 12개 설계·운영
2. 분산 시스템: 멀티테넌시 아키텍처, API Gateway, Circuit Breaker
3. 인프라 자동화: Kubernetes + Terraform + ArgoCD 기반 GitOps

[기술 철학]
"단순함이 최고의 설계"라는 Go의 철학에 공감합니다.
복잡한 문제를 단순한 인터페이스로 해결하는 것,
그리고 관찰 가능한(Observable) 시스템을 만드는 것을 중시합니다.`,
  },
]

// ---------------------------------------------------------------------------
// 외부 문서 (EXTERNAL_DOCUMENTS)
// ---------------------------------------------------------------------------

export const EXTERNAL_DOCUMENTS: MockExternalDocument[] = [
  // ── md-1: 박지훈 (2건) ──────────────────────────────────────────────
  {
    id: "md-1-ext-1",
    personaId: "md-1",
    title: "채용공고 — 토스 Server Developer",
    summary:
      "토스 서버 개발자 채용. Python/Kotlin, 금융 도메인 경험 우대.",
    extractedText: `[채용공고] 토스 — Server Developer

담당 업무:
- 토스 금융 서비스 핵심 서버 개발
- 대규모 트랜잭션 처리 시스템 설계 및 운영
- 결제/정산/송금 등 금융 도메인 서버 개발
- MSA 기반 서비스 아키텍처 설계

자격 요건:
- 서버 개발 경력 3년 이상
- Python, Kotlin, Java 중 하나 이상 실무 경험
- RDBMS 설계 및 쿼리 최적화 경험
- 비동기 처리 및 메시지 큐 활용 경험

우대 사항:
- 금융/핀테크 도메인 경험
- 대용량 트랜잭션 처리 경험
- PCI-DSS 등 보안 규정 준수 경험
- 오픈소스 기여 경험

혜택 및 복지:
- 연봉 최대 1.2억
- 스톡옵션 부여
- 자기개발비 연 200만원`,
  },
  {
    id: "md-1-ext-2",
    personaId: "md-1",
    title: "기술블로그 — 토스 '실시간 정산 시스템의 진화'",
    summary:
      "토스 기술블로그. 실시간 정산 시스템 아키텍처와 장애 대응 전략.",
    extractedText: `[토스 기술블로그] 실시간 정산 시스템의 진화

토스는 일일 수백만 건의 결제 트랜잭션을 실시간으로 정산합니다.

초기 아키텍처 (2019):
- 배치 기반 D+1 정산
- Spring Batch + MySQL
- 문제점: 가맹점 정산 지연, 배치 실패 시 수동 복구

현재 아키텍처 (2024):
- 이벤트 드리븐 실시간 정산
- Kotlin + Kafka Streams + PostgreSQL
- 정산 이벤트 발행 → 스트림 처리 → 즉시 정산
- 멱등성 보장으로 중복 정산 방지
- 장애 격리: 서비스별 독립 정산 파이프라인

핵심 설계 원칙:
1. 멱등성: 동일 이벤트 재처리에도 결과 불변
2. 보상 트랜잭션: 정산 실패 시 자동 롤백
3. 관찰 가능성: 정산 단계별 메트릭 수집

교훈:
- 금융 시스템에서 "정확성"은 타협 불가
- 실시간 처리도 결국 배치 폴백이 필요
- 모니터링 없는 실시간 시스템은 위험`,
  },

  // ── md-2: 이수연 (2건) ──────────────────────────────────────────────
  {
    id: "md-2-ext-1",
    personaId: "md-2",
    title: "채용공고 — 당근마켓 웹 프론트엔드 개발자",
    summary:
      "당근마켓 웹 프론트엔드 개발자 채용. Next.js, React 경험 필수.",
    extractedText: `[채용공고] 당근마켓 — 웹 프론트엔드 개발자

담당 업무:
- 당근마켓 웹 서비스 개발 및 운영
- 중고거래, 동네생활 등 핵심 서비스 프론트엔드 개발
- 디자인 시스템 구축 및 운영
- 웹 성능 최적화 (Core Web Vitals)

자격 요건:
- 프론트엔드 개발 경력 3년 이상
- React, TypeScript 실무 경험
- Next.js 또는 SSR 프레임워크 경험
- 웹 접근성(a11y) 이해

우대 사항:
- 디자인 시스템 구축 경험
- E2E 테스트 자동화 경험 (Playwright, Cypress)
- 이커머스/마켓플레이스 서비스 경험
- 오픈소스 기여 경험

채용 절차:
서류 → 코딩 테스트 → 1차 기술 면접 → 2차 컬쳐핏 면접`,
  },
  {
    id: "md-2-ext-2",
    personaId: "md-2",
    title: "회사소개 — 당근마켓",
    summary:
      "당근마켓 회사 개요. 하이퍼로컬 플랫폼, MAU 1,800만, 기술 문화.",
    extractedText: `당근마켓 회사 소개

비전: 가까운 이웃과 함께하는 따뜻한 동네 생활
미션: 동네 커뮤니티를 활성화하여 지역 사회를 더 살기 좋게 만든다

주요 지표:
- MAU 1,800만명 (2024 기준)
- 가입자 3,500만명+
- 동네 인증률 97%
- 중고거래 외 동네생활, 알바, 부동산 등 확장

기술 문화:
- 주요 기술 스택: React, Next.js, Kotlin, Go
- 주 1회 Tech Talk, 분기별 해커톤
- 코드 리뷰 필수, 테스트 커버리지 80% 이상 지향
- A/B 테스트 기반 의사결정 문화

엔지니어링 원칙:
1. 사용자 가치 우선
2. 작게 자주 배포
3. 데이터 기반 의사결정
4. 기술 부채 적극 해소`,
  },

  // ── md-3: 최윤호 (2건) ──────────────────────────────────────────────
  {
    id: "md-3-ext-1",
    personaId: "md-3",
    title: "채용공고 — 카카오뱅크 iOS 개발자",
    summary:
      "카카오뱅크 iOS 개발자 채용. Swift, UIKit 경험 필수. 금융 앱 경험 우대.",
    extractedText: `[채용공고] 카카오뱅크 — iOS Developer

담당 업무:
- 카카오뱅크 iOS 앱 개발 및 유지보수
- 금융 서비스 신규 기능 개발 (예금, 대출, 투자)
- 앱 성능 최적화 및 안정성 개선
- UIKit/SwiftUI 기반 UI 개발

자격 요건:
- iOS 개발 경력 3년 이상
- Swift, UIKit 실무 경험 필수
- MVVM, Clean Architecture 등 아키텍처 패턴 이해
- Auto Layout, 다양한 디바이스 대응 경험

우대 사항:
- 금융 앱 개발 경험
- SwiftUI 실무 적용 경험
- 모듈화(SPM, Tuist) 경험
- CI/CD 구축 경험 (Fastlane 등)
- RxSwift 또는 Combine 경험

근무 조건:
- 연봉: 협의
- 유연근무제 (코어타임 10:00~16:00)
- 자기개발비 연 300만원`,
  },
  {
    id: "md-3-ext-2",
    personaId: "md-3",
    title: "기술블로그 — 카카오뱅크 'iOS 모듈화 여정'",
    summary:
      "카카오뱅크 기술블로그. Tuist 기반 iOS 모듈화 전략과 빌드 시간 최적화.",
    extractedText: `[카카오뱅크 기술블로그] iOS 모듈화 여정

카카오뱅크 iOS 팀은 2023년부터 Tuist 기반 모듈화를 본격 도입했습니다.

배경:
- 앱 규모 성장으로 빌드 시간 증가 (풀 빌드 12분)
- 팀 규모 확대 (iOS 개발자 15명)로 코드 충돌 빈번
- 기능 간 의존성 복잡화

모듈화 전략:
1. Feature 모듈: 기능 단위 독립 모듈 (예금, 대출, 투자 등)
2. Core 모듈: 공통 유틸리티, 네트워크, 인증
3. UI 모듈: 디자인 시스템 컴포넌트
4. Domain 모듈: 비즈니스 로직 (UseCase, Repository)

성과:
- 풀 빌드 시간: 12분 → 4분 (67% 단축)
- 증분 빌드: 30초 이내
- 기능별 독립 개발/테스트 가능
- 신규 기능 모듈 생성 템플릿화

교훈:
- 모듈 경계 설계가 가장 어렵고 중요
- 순환 의존성 방지를 위한 DI 컨테이너 필수
- 점진적 마이그레이션이 현실적 (Big-Bang 지양)`,
  },

  // ── md-4: 김하늘 (1건) ──────────────────────────────────────────────
  {
    id: "md-4-ext-1",
    personaId: "md-4",
    title: "채용공고 — 쿠팡 데이터 엔지니어",
    summary:
      "쿠팡 데이터 엔지니어 채용. Spark, Airflow 경험 필수. 대규모 데이터 처리 경험 우대.",
    extractedText: `[채용공고] 쿠팡 — Data Engineer

담당 업무:
- 쿠팡 이커머스 데이터 파이프라인 설계 및 운영
- 대규모 실시간/배치 데이터 처리 시스템 개발
- 데이터 레이크/웨어하우스 아키텍처 설계
- 데이터 품질 관리 및 모니터링 체계 구축

자격 요건:
- 데이터 엔지니어링 경력 3년 이상
- Apache Spark 실무 경험 필수
- Airflow 등 워크플로 오케스트레이션 경험
- SQL 고급 활용 능력 (쿼리 최적화, 윈도우 함수 등)
- Python 프로그래밍 능력

우대 사항:
- 일일 TB 이상 데이터 처리 경험
- Delta Lake, Apache Iceberg 등 테이블 포맷 경험
- Kafka, Kinesis 등 스트리밍 시스템 경험
- 데이터 품질 도구(Great Expectations, dbt) 경험
- IaC(Terraform) 경험

보상:
- 경쟁력 있는 연봉 + RSU
- 사이닝 보너스 협의`,
  },

  // ── md-5: 정우진 (2건) ──────────────────────────────────────────────
  {
    id: "md-5-ext-1",
    personaId: "md-5",
    title: "채용공고 — 라인플러스 Server-Side Engineer",
    summary:
      "라인플러스 서버 개발자 채용. Go/Java, 대규모 분산 시스템 경험 필수.",
    extractedText: `[채용공고] 라인플러스 — Server-Side Engineer

담당 업무:
- 라인 메신저 핵심 서버 시스템 개발
- 글로벌 스케일 분산 시스템 설계 및 운영
- 마이크로서비스 아키텍처 기반 서비스 개발
- 성능 최적화 및 안정성 개선

자격 요건:
- 서버 개발 경력 5년 이상
- Go, Java, Kotlin 중 하나 이상 전문 수준
- gRPC 또는 Thrift 등 RPC 프레임워크 경험
- 대규모 분산 시스템 설계 및 운영 경험
- Kubernetes 환경 서비스 운영 경험

우대 사항:
- 멀티테넌시 시스템 설계 경험
- API Gateway 개발 경험
- 글로벌 서비스 운영 경험 (멀티 리전)
- 오픈소스 프로젝트 기여
- Terraform, Helm 등 IaC 경험

근무지: 성남 판교
연봉: 협의 (업계 최고 수준)`,
  },
  {
    id: "md-5-ext-2",
    personaId: "md-5",
    title: "JD 상세 — 라인플러스 메시징 플랫폼팀",
    summary:
      "라인플러스 메시징 플랫폼팀 상세 소개. 팀 구성, 기술 스택, 업무 환경.",
    extractedText: `라인플러스 메시징 플랫폼팀 소개

팀 미션:
라인 메신저의 핵심 메시징 인프라를 설계·운영합니다.
전 세계 2억명+ 사용자에게 안정적이고 빠른 메시지 전달을 보장합니다.

기술 스택:
- 주 언어: Go, Java
- 통신: gRPC, Kafka, Redis Pub/Sub
- 저장소: HBase, Cassandra, Redis, MySQL
- 인프라: Kubernetes (자체 운영), Prometheus, Grafana
- CI/CD: Jenkins, ArgoCD

팀 구성:
- 서버 개발자 12명, SRE 3명, QA 2명
- 한국/일본 분산 팀 (영어/일본어 커뮤니케이션)

주요 챌린지:
1. 초당 메시지 처리량: 300만+ RPS
2. 글로벌 레이턴시: p99 200ms 이하
3. 가용성: 99.99% SLA
4. 데이터 일관성: 메시지 유실 제로

개발 문화:
- RFC 기반 설계 리뷰
- 주 2회 코드 리뷰 세션
- 분기별 카오스 엔지니어링 훈련
- 20% 타임: 기술 부채 해소 및 혁신 프로젝트`,
  },
]

// ---------------------------------------------------------------------------
// 커리어노트 (CAREER_NOTES)
// ---------------------------------------------------------------------------

export const CAREER_NOTES: MockCareerNote[] = [
  // ── md-1: 박지훈 (4건) ──────────────────────────────────────────────
  {
    id: "md-1-note-1",
    personaId: "md-1",
    title: "실시간 정산 시스템 전환 경험",
    summary:
      "D+1 배치 정산을 T+0 실시간 정산으로 전환. 가맹점 클레임 90% 감소.",
    content: `페이브릿지에서 정산 시스템을 실시간으로 전환한 경험.

문제: 기존 D+1 배치 정산 방식에서 가맹점 정산 지연 클레임이 월 평균 45건 발생
원인 분석:
- 배치 잡 실패 시 수동 복구에 평균 4시간 소요
- 영업일 기준 정산으로 주말/공휴일 지연 불가피
해결:
- FastAPI + Celery 기반 비동기 정산 파이프라인 설계
- 결제 완료 이벤트 → Redis Streams → Celery Worker → 정산 처리
- 멱등성 키(idempotency key)로 중복 정산 방지
- 정산 실패 시 Dead Letter Queue + 자동 재시도 (최대 3회)
결과: 정산 지연 클레임 월 45건 → 4건 (90% 감소), 가맹점 만족도 설문 25점 상승`,
    metadata: { company: "페이브릿지", period: "2023.01-2023.09" },
  },
  {
    id: "md-1-note-2",
    personaId: "md-1",
    title: "FDS 이상거래 탐지 시스템 구축",
    summary:
      "규칙 기반 이상거래 탐지 엔진 개발. 부정 거래 탐지율 2.5배 향상.",
    content: `페이브릿지에서 이상거래 탐지 시스템(FDS)을 구축한 경험.

배경: 간편결제 서비스 확대로 부정 거래 시도 증가 (월 평균 피해액 1,200만원)
해결:
- Python으로 규칙 기반 탐지 엔진 개발
- JSON DSL로 탐지 규칙 정의 (비개발자도 규칙 추가 가능)
- Redis Streams로 실시간 거래 이벤트 수신
- 규칙 예시: 1시간 내 동일 카드 5회 이상 결제, 새벽 2-5시 고액 결제 등
- Slack 알림 + 어드민 대시보드로 의심 거래 즉시 확인
결과: 부정 거래 탐지율 32% → 80% (2.5배 향상), 월 피해액 1,200만원 → 300만원`,
    metadata: { company: "페이브릿지", period: "2022.09-2022.12" },
  },
  {
    id: "md-1-note-3",
    personaId: "md-1",
    title: "FastAPI 오픈소스 기여 경험",
    summary:
      "fastapi-request-logger 라이브러리 개발·배포. 주간 다운로드 800+.",
    content: `개인 오픈소스 프로젝트 fastapi-request-logger 개발 경험.

동기: 페이브릿지에서 FastAPI 사용 중 요청/응답 로깅이 반복적으로 필요
해결:
- 미들웨어 기반 자동 구조화 로깅 (JSON 포맷)
- 민감정보 자동 마스킹 (카드번호, 주민번호, 비밀번호 등)
- 요청/응답 바디, 헤더, 쿼리 파라미터 선택적 기록
- correlation ID 자동 생성으로 요청 추적
성과:
- PyPI 배포, 주간 다운로드 800+
- 기업 3곳에서 프로덕션 사용 확인 (이슈 트래커 기반)
- GitHub Stars 120+, 기여자 5명
배운 점: 오픈소스 유지보수의 책임감, 하위 호환성 유지의 중요성`,
    metadata: { company: "개인", period: "2022.10" },
  },
  {
    id: "md-1-note-4",
    personaId: "md-1",
    title: "Django에서 FastAPI로 전환 결정",
    summary:
      "넥스트코드 → 페이브릿지 이직 시 기술 스택 전환 경험. 비동기 처리 필요성 체감.",
    content: `Django에서 FastAPI로 기술 스택을 전환하게 된 계기와 학습 과정.

배경: 넥스트코드에서 Django REST Framework로 개발하다 페이브릿지 이직
전환 이유:
- 금융 도메인 특성상 비동기 처리 필수 (결제 콜백, 정산 배치)
- Django의 동기 WSGI 한계 체감
- FastAPI의 async/await 네이티브 지원 + 자동 API 문서화
학습 과정:
- 공식 문서 정독 + 토이 프로젝트 3개 진행
- SQLAlchemy async 세션 관리, Alembic 마이그레이션 학습
- Pydantic v2 마이그레이션 경험
깨달은 점:
- 프레임워크 선택은 도메인 요구사항에 맞춰야 한다
- Django의 배터리 포함 철학도 가치가 있으며, 상황에 따라 적합`,
    metadata: { company: "페이브릿지", period: "2022.07" },
  },

  // ── md-2: 이수연 (3건) ──────────────────────────────────────────────
  {
    id: "md-2-note-1",
    personaId: "md-2",
    title: "검색 UX 리뉴얼로 전환율 50% 향상",
    summary:
      "이커머스 상품 검색 UI를 패싯 검색으로 전면 개편. 전환율 12% → 18%.",
    content: `커머스랩에서 상품 검색 UX를 대폭 개선한 경험.

문제: 기존 검색이 단순 키워드 매칭으로, 검색 → 구매 전환율이 12%에 불과
원인 분석:
- 카테고리/가격/브랜드 필터 부재
- 검색 결과 정렬 옵션 부족
- 자동완성 미지원으로 검색 이탈률 높음
해결:
- Elasticsearch 기반 패싯 검색 구현 (백엔드팀 협업)
- 자동완성 + 인기 검색어 + 연관 검색어 UI
- 다중 필터 (카테고리, 가격대, 브랜드, 평점) 실시간 반영
- react-virtuoso로 검색 결과 가상 스크롤 (1,000건 이상도 버벅임 없음)
- A/B 테스트로 단계적 롤아웃
결과: 검색 → 구매 전환율 12% → 18% (50% 향상), 검색 이탈률 35% → 20%`,
    metadata: { company: "커머스랩", period: "2023.06-2023.12" },
  },
  {
    id: "md-2-note-2",
    personaId: "md-2",
    title: "디자인 시스템 구축 경험",
    summary:
      "Radix UI 기반 사내 디자인 시스템 40개 컴포넌트. 개발 속도 30% 향상.",
    content: `커머스랩에서 디자인 시스템 "Craft UI"를 처음부터 구축한 경험.

배경:
- 프로젝트 4개에서 각각 다른 UI 컴포넌트 사용 → 디자인 불일치
- 반복 UI 개발에 시간 낭비
- 디자이너-개발자 간 소통 비용 높음
해결:
- Radix UI Primitives + Tailwind CSS 기반 헤드리스 컴포넌트
- Storybook으로 컴포넌트 문서화 + 시각적 회귀 테스트 (Chromatic)
- Figma 디자인 토큰 → Style Dictionary → CSS 변수 자동 동기화
- 컴포넌트 40개: Button, Input, Modal, Table, DatePicker 등
- npm 사내 레지스트리 배포 (버전 관리)
결과: UI 개발 속도 30% 향상, 디자인-개발 간 핑퐁 70% 감소`,
    metadata: { company: "커머스랩", period: "2023.01-2023.05" },
  },
  {
    id: "md-2-note-3",
    personaId: "md-2",
    title: "BFF 아키텍처 도입 경험",
    summary:
      "NestJS 기반 BFF 레이어 도입. API 호출 수 40% 감소, 프론트 개발 효율화.",
    content: `커머스랩에서 BFF(Backend For Frontend) 아키텍처를 도입한 경험.

문제:
- 프론트엔드에서 마이크로서비스 5개에 직접 호출 → 복잡한 데이터 조합 로직
- 클라이언트 사이드 데이터 조합으로 렌더링 지연
- 백엔드 API 변경 시 프론트엔드 영향 범위 큼
해결:
- NestJS 기반 BFF 레이어 구축
- GraphQL 스키마로 프론트엔드 최적화된 인터페이스 제공
- 데이터 애그리게이션 (상품 + 리뷰 + 재고 통합 응답)
- Redis 캐싱으로 반복 호출 최소화
- TypeScript 타입 공유 (프론트↔BFF)
결과: API 호출 수 40% 감소, 페이지 로딩 시간 평균 1.2초 단축`,
    metadata: { company: "커머스랩", period: "2022.03-2022.08" },
  },

  // ── md-3: 최윤호 (5건) ──────────────────────────────────────────────
  {
    id: "md-3-note-1",
    personaId: "md-3",
    title: "신한카드 마이앱 리뉴얼 프로젝트",
    summary:
      "DAU 50만 금융 앱 메인 화면 리뉴얼. Tuist 모듈화 적용, 크래시율 0.1% 이하 유지.",
    content: `앱팩토리에서 신한카드 마이앱 리뉴얼 프로젝트를 수행한 경험.

규모: DAU 50만 금융 앱, 리뉴얼 범위 전체 화면의 60%
역할: iOS 메인 개발 (2인 중 1명)
주요 작업:
- 기존 MVC 아키텍처 → MVVM-C + Clean Architecture 전환
- Tuist 기반 모듈화 (Feature, Core, UI, Domain 레이어)
- RxSwift로 반응형 데이터 바인딩
- Snapshot Testing으로 UI 회귀 방지 (100개+ 스냅샷)
챌린지:
- 기존 Objective-C 코드와의 호환성 유지
- 릴리즈 일정 준수 (3개월)
- 고객사 QA 기준 충족 (금융 앱 특유의 엄격한 품질 기준)
결과: 예정 일정 내 성공 릴리즈, 크래시율 0.1% 이하, 고객사 최고 평가`,
    metadata: { company: "앱팩토리", period: "2023.03-2023.08" },
  },
  {
    id: "md-3-note-2",
    personaId: "md-3",
    title: "앱 크래시율 개선 경험",
    summary:
      "배달 앱 크래시율 2.3% → 0.4% 개선. 메모리 릭 해결, 비동기 처리 안정화.",
    content: `모바일랩스에서 자체 배달 앱의 크래시율을 대폭 개선한 경험.

문제: 앱 크래시율 2.3%로 앱스토어 평점 3.2까지 하락
원인 분석 (Crashlytics + Instruments):
- 이미지 캐시 메모리 릭 (NSCache 미사용, 직접 Dictionary 관리)
- 네트워크 콜백에서 해제된 ViewController 참조 (retain cycle)
- 멀티스레드 환경 Race Condition (CoreData 동시 접근)
해결:
- NSCache 기반 이미지 캐싱으로 전환 + 메모리 워닝 시 자동 정리
- weak self 캡처 리스트 전수 점검, Combine 전환 시작
- CoreData 전용 background context + main context 분리
- Thread Sanitizer 활성화로 Race Condition 탐지 자동화
결과: 크래시율 2.3% → 0.4%, 앱스토어 평점 3.2 → 4.3`,
    metadata: { company: "모바일랩스", period: "2021.06-2021.09" },
  },
  {
    id: "md-3-note-3",
    personaId: "md-3",
    title: "SwiftUI 개인 앱 출시 경험",
    summary:
      "습관 트래커 앱 데일리루틴 출시. SwiftUI + WidgetKit, MAU 3,200명.",
    content: `개인 프로젝트로 SwiftUI 습관 트래커 앱 '데일리루틴'을 개발·출시한 경험.

동기: UIKit 중심 업무에서 SwiftUI 역량을 키우고 싶어 사이드 프로젝트 시작
기술 선택:
- SwiftUI + Combine: 선언형 UI 학습 목적
- CoreData + CloudKit: 기기 간 동기화
- WidgetKit: 홈 화면 위젯으로 습관 진행률 표시
- Swift Charts: 주간/월간 달성률 시각화
챌린지:
- SwiftUI의 Navigation 한계 (iOS 16 NavigationStack 활용)
- CoreData + CloudKit 동기화 충돌 해결
- 위젯 업데이트 타이밍 최적화 (배터리 소모 고려)
결과: 앱스토어 별점 4.7 (리뷰 230+), MAU 3,200명, 생산성 카테고리 50위 내`,
    metadata: { company: "개인", period: "2023.01-2023.04" },
  },
  {
    id: "md-3-note-4",
    personaId: "md-3",
    title: "Objective-C → Swift 마이그레이션",
    summary:
      "레거시 Objective-C 코드 30% Swift 전환. 점진적 마이그레이션 전략.",
    content: `모바일랩스에서 Objective-C 레거시를 Swift로 점진 전환한 경험.

배경: 배달 앱 코드베이스의 70%가 Objective-C, 신규 채용 어려움
전략:
- 신규 기능은 100% Swift로 개발
- 기존 코드는 수정 발생 시 Swift로 전환 (Strangler Fig 패턴)
- Bridging Header를 통한 ObjC-Swift 상호 운용
주요 작업:
- 네트워킹 레이어 전환 (AFNetworking → Moya)
- 모델 클래스 전환 (NSObject → Codable struct)
- Storyboard → 코드 기반 UI 전환 (SnapKit)
결과: 1년간 전체 코드의 30% Swift 전환, 신규 개발 속도 40% 향상
교훈: 한 번에 전부 바꾸려 하면 실패, 점진적으로 바꾸면서 테스트 보강이 핵심`,
    metadata: { company: "모바일랩스", period: "2021.03-2022.02" },
  },
  {
    id: "md-3-note-5",
    personaId: "md-3",
    title: "CI/CD 파이프라인 구축 경험",
    summary:
      "Fastlane + GitHub Actions 기반 iOS CI/CD. 빌드·배포 자동화, 시간 70% 단축.",
    content: `앱팩토리에서 iOS CI/CD 파이프라인을 구축한 경험.

문제: 수동 빌드·배포로 인한 시간 낭비 (1회 배포에 평균 2시간)
해결:
- Fastlane으로 빌드, 테스트, 배포 자동화
  - match: 인증서·프로비저닝 프로파일 관리 자동화
  - gym: 아카이브 + IPA 생성
  - pilot: TestFlight 자동 업로드
- GitHub Actions 워크플로:
  - PR 생성 시: 린트 + 유닛 테스트 + 스냅샷 테스트
  - develop 머지 시: TestFlight 배포
  - main 태그 시: 앱스토어 제출
결과: 배포 시간 2시간 → 35분 (70% 단축), 인적 오류 제로`,
    metadata: { company: "앱팩토리", period: "2022.06-2022.08" },
  },

  // ── md-4: 김하늘 (3건) ──────────────────────────────────────────────
  {
    id: "md-4-note-1",
    personaId: "md-4",
    title: "데이터 레이크하우스 구축 경험",
    summary:
      "Redshift + S3를 Delta Lake 레이크하우스로 통합. 쿼리 레이턴시 60% 감소.",
    content: `데이터웨이브에서 데이터 레이크하우스를 구축한 경험.

문제:
- Data Warehouse(Redshift)와 Data Lake(S3)가 분리되어 데이터 중복
- Redshift 비용 월 800만원, S3 원시 데이터는 쿼리 불가
- 데이터 분석가들이 두 시스템을 오가며 작업 → 생산성 저하
해결:
- Delta Lake 도입: S3 위에 ACID 트랜잭션 + 스키마 진화 지원
- Spark Structured Streaming으로 준실시간 수집
- Time Travel로 과거 시점 데이터 조회 가능
- AWS Glue Data Catalog로 메타데이터 통합 관리
- Athena + Delta Lake 커넥터로 SQL 즉시 조회
결과: 쿼리 레이턴시 60% 감소, Redshift 비용 제거로 월 800만원 절감, 스토리지 35% 절감`,
    metadata: { company: "데이터웨이브", period: "2023.03-2023.10" },
  },
  {
    id: "md-4-note-2",
    personaId: "md-4",
    title: "데이터 품질 자동화 시스템 도입",
    summary:
      "Great Expectations 기반 200개+ 검증 규칙. 데이터 품질 이슈 조기 탐지율 95%.",
    content: `데이터웨이브에서 데이터 품질 자동화 시스템을 도입한 경험.

문제: 데이터 품질 이슈(NULL, 중복, 범위 이탈)가 분석 리포트 단계에서야 발견
영향: 잘못된 데이터로 인한 비즈니스 의사결정 오류 분기 3건
해결:
- Great Expectations 도입
- Expectation Suite 설계: 테이블별 검증 규칙 정의
  - 예: 매출 테이블 - amount > 0, currency IN ('KRW','USD'), NULL 비율 < 1%
- Airflow DAG에 GE 검증 단계 통합 (ETL 후 자동 실행)
- 검증 실패 시 Slack 알림 + 파이프라인 중단
- Data Docs로 검증 결과 웹 대시보드 자동 생성
결과: 200개+ 검증 규칙, 데이터 품질 이슈 조기 탐지율 95%, 분석 리포트 신뢰도 향상`,
    metadata: { company: "데이터웨이브", period: "2023.06-2023.08" },
  },
  {
    id: "md-4-note-3",
    personaId: "md-4",
    title: "물류 데이터 BigQuery 마이그레이션",
    summary:
      "PostgreSQL → BigQuery 전환. 분석 쿼리 실행 시간 10분 → 30초.",
    content: `스마트로지에서 물류 데이터를 BigQuery로 마이그레이션한 경험.

배경: PostgreSQL에 적재된 2년치 배송 데이터(5억 건)로 분석 쿼리 한계
문제:
- 복잡한 집계 쿼리 실행 시간 10분 이상
- 분석 쿼리가 서비스 DB 부하 유발
- 데이터 분석가들이 SQL 직접 실행 불가
해결:
- PostgreSQL → BigQuery 일일 증분 동기화 파이프라인 구축
- Python + Airflow로 CDC(Change Data Capture) 구현
- BigQuery 파티셔닝 (배송일 기준) + 클러스터링 (지역, 배송사)
- Metabase → BigQuery 연결로 셀프서비스 분석 환경 제공
결과: 분석 쿼리 10분 → 30초, 서비스 DB 부하 분리, 데이터 분석가 자체 분석 가능`,
    metadata: { company: "스마트로지", period: "2021.06-2021.10" },
  },

  // ── md-5: 정우진 (4건) ──────────────────────────────────────────────
  {
    id: "md-5-note-1",
    personaId: "md-5",
    title: "멀티테넌시 아키텍처 설계 경험",
    summary:
      "싱글테넌트 → 멀티테넌트 전환. 120개+ 테넌트, 온보딩 2주 → 30분.",
    content: `클라우드빌드에서 멀티테넌시 SaaS 아키텍처를 설계한 경험.

배경: 고객(테넌트)별로 별도 인스턴스를 띄우는 싱글테넌트 방식 → 운영 비용 급증
문제:
- 테넌트 50개 시점에서 인프라 비용 월 3,000만원 이상
- 신규 테넌트 온보딩에 2주 소요 (인프라 프로비저닝 + 설정)
- 버전 업그레이드 시 50개 인스턴스 개별 배포 필요
해결:
- Row-Level Security(RLS)와 Schema 분리 혼합 전략
  - 일반 테이블: RLS로 테넌트 격리 (tenant_id 컬럼)
  - 민감 데이터: 테넌트별 별도 스키마
- 테넌트 설정 관리 서비스 (etcd 기반)
- 테넌트별 리소스 쿼터 (CPU, 메모리, API 호출 수 제한)
- 자동 온보딩 API: DB 스키마 생성 → 초기 데이터 시딩 → DNS 설정
결과: 120개+ 테넌트 안정 운영, 온보딩 2주 → 30분, 인프라 비용 60% 절감`,
    metadata: { company: "클라우드빌드", period: "2023.01-2023.08" },
  },
  {
    id: "md-5-note-2",
    personaId: "md-5",
    title: "Go 기반 API Gateway 자체 개발",
    summary:
      "Go로 고성능 API Gateway 구현. 초당 5,000 요청, p99 15ms 이하.",
    content: `클라우드빌드에서 API Gateway를 Go로 직접 개발한 경험.

배경: Kong/Envoy 등 기존 솔루션 검토 후 커스텀 요구사항이 많아 자체 개발 결정
요구사항:
- gRPC ↔ REST 변환 (기존 클라이언트 REST 유지)
- 테넌트별 Rate Limiting (Plan별 차등 적용)
- 요청 라우팅 + 인증/인가 + 요청 로깅 통합
구현:
- Go net/http + grpc-gateway 기반
- Token Bucket 알고리즘 Rate Limiter (Redis 기반 분산 처리)
- Circuit Breaker: 연속 5회 실패 시 30초 차단 → half-open → 복구
- Middleware 체인: Auth → RateLimit → CircuitBreaker → Route → Log
- OpenTelemetry 통합 분산 트레이싱
결과: 초당 5,000 요청, p99 레이턴시 15ms 이하, 장애 전파 차단 성공`,
    metadata: { company: "클라우드빌드", period: "2022.06-2022.12" },
  },
  {
    id: "md-5-note-3",
    personaId: "md-5",
    title: "Java에서 Go로 전환한 이유",
    summary:
      "Spring Boot → Go 전환 결정 과정. 성능, 배포 효율, 동시성 모델 비교.",
    content: `서버랩(Java/Spring) → 클라우드빌드(Go) 이직 후 기술 스택 전환 경험.

전환 동기:
- Spring Boot 앱 메모리 사용량 평균 512MB vs Go 바이너리 50MB
- 콜드 스타트: Spring 30초+ vs Go 즉시 (K8s 스케일링에 유리)
- 고루틴 기반 동시성이 스레드 풀 대비 직관적이고 가벼움
학습 과정:
- Go Tour + Effective Go 정독 (2주)
- 개인 프로젝트로 gRPC 서버 구현 (3주)
- 표준 라이브러리 위주 개발 철학 적응 (프레임워크 의존 최소화)
적응 과정에서의 어려움:
- 제네릭 부재 → Go 1.18 이후 해소
- 에러 처리 패턴 (if err != nil) 적응
- ORM 없이 sqlx + 직접 쿼리 작성
결론: Go는 인프라/시스템 소프트웨어에 적합, Java/Spring은 복잡한 비즈니스 로직에 강점`,
    metadata: { company: "클라우드빌드", period: "2021.09" },
  },
  {
    id: "md-5-note-4",
    personaId: "md-5",
    title: "Terraform IaC 도입 경험",
    summary:
      "AWS 인프라 전체 코드화. 인프라 프로비저닝 2일 → 2시간 단축.",
    content: `클라우드빌드에서 Terraform 기반 IaC를 도입한 경험.

문제:
- AWS 콘솔 수동 조작으로 인프라 관리 → 환경 간 불일치
- 신규 환경(staging, demo) 구축에 2일 소요
- 인프라 변경 이력 추적 불가
해결:
- Terraform으로 전체 AWS 인프라 코드화
  - EKS 클러스터, RDS, ElastiCache, SQS, S3
  - IAM 역할/정책, VPC, Security Group
- 모듈화: 재사용 가능한 Terraform 모듈 10개 작성
- Terraform Cloud로 State 관리 + Plan 리뷰
- Helm chart 표준화로 K8s 리소스도 코드 관리
- GitOps: Terraform 변경 → PR → Plan 리뷰 → Apply
결과: 프로비저닝 2일 → 2시간, 환경 간 100% 일치, 변경 이력 완벽 추적`,
    metadata: { company: "클라우드빌드", period: "2022.01-2022.05" },
  },
]

// ---------------------------------------------------------------------------
// 대화 스타일 (CONV_STYLES)
// ---------------------------------------------------------------------------

export const CONV_STYLES: Record<string, Record<string, ConvMessage[]>> = {
  // ── md-1: 박지훈 (백엔드, Python/FastAPI, 핀테크) ───────────────────
  "md-1": {
    polite: [
      {
        role: "user",
        content:
          "안녕하세요, 토스 서버 개발자 포지션에 지원하려고 합니다. 자기소개서 작성을 도와주실 수 있나요?",
      },
      {
        role: "assistant",
        content:
          "안녕하세요! 토스 Server Developer 포지션에 지원하시는군요. 등록하신 이력서와 채용공고를 확인해보겠습니다. 핀테크 경험이 있으시니 좋은 어필 포인트가 될 것 같습니다.",
      },
      {
        role: "user",
        content:
          "네, 페이브릿지에서 실시간 정산 시스템을 만든 경험이 있어서 그 부분을 강조하고 싶습니다.",
      },
      {
        role: "assistant",
        content:
          "좋습니다. 경력기술서를 보니 D+1 배치 정산을 T+0 실시간 정산으로 전환하신 프로젝트가 있네요. 일일 12만건 처리, 클레임 90% 감소 등 구체적인 성과가 있어서 토스의 실시간 정산 기술 블로그와 연결지어 어필하기 좋겠습니다.",
      },
      {
        role: "user",
        content:
          "맞아요. 토스 기술 블로그에서 읽은 정산 시스템 글에 공감한 부분도 자연스럽게 녹여주세요.",
      },
      {
        role: "assistant",
        content:
          "토스 기술 블로그의 '실시간 정산 시스템의 진화' 글에서 멱등성 보장과 보상 트랜잭션 설계를 강조했는데, 박지훈님의 정산 파이프라인에서도 멱등성 키를 사용하셨으니 그 연결고리를 잘 살려보겠습니다.",
      },
      {
        role: "user",
        content:
          "좋습니다. 그리고 이상거래 탐지 시스템(FDS) 경험도 보안 역량으로 어필하면 좋을 것 같은데, 어떻게 생각하세요?",
      },
      {
        role: "assistant",
        content:
          "FDS 경험은 토스 채용공고의 '금융/핀테크 도메인 경험'과 'PCI-DSS 보안 규정 준수 경험' 우대사항에 정확히 맞습니다. 부정 거래 탐지율 2.5배 향상이라는 수치와 함께 작성하겠습니다.",
      },
      {
        role: "user",
        content:
          "감사합니다. 그러면 전체 구조를 한번 잡아주시고, 초안을 작성해주세요.",
      },
      {
        role: "assistant",
        content:
          "네, 지원 동기 → 핵심 역량 → 성장 과정 순서로 구성하겠습니다. 지원 동기에서 토스 기술 블로그 공감 포인트, 핵심 역량에서 정산 시스템 + FDS, 성장 과정에서 Django → FastAPI 전환을 통한 성장을 다루겠습니다.",
      },
    ],
    terse: [
      {
        role: "user",
        content: "토스 서버 개발자 자소서",
      },
      {
        role: "assistant",
        content:
          "토스 Server Developer 포지션 자기소개서를 작성해드리겠습니다. 이력서와 경력기술서를 확인할게요.",
      },
      {
        role: "user",
        content: "정산 시스템 경험 위주로",
      },
      {
        role: "assistant",
        content:
          "실시간 정산 시스템 전환 경험을 중심으로 작성하겠습니다. 일일 12만건 처리, 클레임 90% 감소 성과를 강조할게요.",
      },
      {
        role: "user",
        content: "FDS도 넣어줘",
      },
      {
        role: "assistant",
        content:
          "이상거래 탐지 시스템 경험도 보안 역량으로 추가하겠습니다. 탐지율 2.5배 향상 수치 포함할게요.",
      },
      {
        role: "user",
        content: "토스 기술블로그 읽은 거 어필하고 싶어",
      },
      {
        role: "assistant",
        content:
          "토스의 '실시간 정산 시스템의 진화' 글과 연결지어, 멱등성 설계 공감 포인트를 지원 동기에 녹이겠습니다.",
      },
      {
        role: "user",
        content: "좋아 초안 작성해",
      },
      {
        role: "assistant",
        content:
          "지원 동기, 핵심 역량, 성장 과정 순서로 초안을 작성하겠습니다.",
      },
    ],
    jumpy: [
      {
        role: "user",
        content:
          "토스 지원하려는데 자소서 좀 봐주세요",
      },
      {
        role: "assistant",
        content:
          "네, 토스 Server Developer 자기소개서를 도와드릴게요. 어떤 부분부터 시작할까요?",
      },
      {
        role: "user",
        content:
          "아 잠깐 그전에 내 경력기술서에서 정산 시스템 부분 내용 맞는지 확인해줘",
      },
      {
        role: "assistant",
        content:
          "경력기술서를 확인해보겠습니다. 페이브릿지에서 실시간 정산 시스템 구축(2023.01~09), 일일 12만건 처리, 클레임 90% 감소로 되어 있습니다. 수정할 부분이 있나요?",
      },
      {
        role: "user",
        content:
          "ㅇㅇ 맞아. 근데 토스 기술블로그 보니까 비슷한 걸 하더라고. 그거 언급해도 될까?",
      },
      {
        role: "assistant",
        content:
          "토스 기술블로그의 정산 시스템 글과 비교해서 공감 포인트를 언급하면 지원 동기에 효과적입니다. 멱등성 보장, 이벤트 드리븐 설계 등 공통된 철학을 강조하면 좋겠습니다.",
      },
      {
        role: "user",
        content:
          "아 그리고 FDS 경험은 어떻게 넣지? 근데 그것보다 FastAPI 오픈소스 기여가 더 어필 안 될까?",
      },
      {
        role: "assistant",
        content:
          "둘 다 좋은 어필 포인트입니다. FDS는 '금융 보안 역량', 오픈소스는 '개발 문화 기여'로 각각 다른 항목에 배치할 수 있어요. 토스가 오픈소스 기여도 우대하니 둘 다 넣는 것을 추천합니다.",
      },
      {
        role: "user",
        content: "그럼 전체적으로 구조 잡아줘. 아 근데 분량은 어느 정도가 좋아?",
      },
      {
        role: "assistant",
        content:
          "보통 항목당 300-500자, 전체 1,000-1,500자가 적당합니다. 지원 동기 → 핵심 역량(정산+FDS) → 기술 성장(오픈소스) → 포부 순서로 구성할게요.",
      },
    ],
  },

  // ── md-2: 이수연 (풀스택, TypeScript/Next.js, 이커머스) ──────────────
  "md-2": {
    polite: [
      {
        role: "user",
        content:
          "안녕하세요, 당근마켓 웹 프론트엔드 개발자에 지원하려고 합니다. 자기소개서 초안을 검토해주실 수 있을까요?",
      },
      {
        role: "assistant",
        content:
          "안녕하세요! 당근마켓 웹 프론트엔드 개발자 포지션이시군요. 기존에 작성하신 자소서 초안과 채용공고를 함께 확인해보겠습니다.",
      },
      {
        role: "user",
        content:
          "제 초안에서 검색 UX 리뉴얼 경험을 강조했는데, 당근마켓의 중고거래 검색에 맞게 표현을 다듬어주세요.",
      },
      {
        role: "assistant",
        content:
          "자소서 초안을 확인했습니다. 검색 → 구매 전환율 50% 향상 경험이 잘 드러나 있네요. 당근마켓의 '탐색 경험'에 맞게, 이커머스 검색을 '동네 중고거래 탐색'으로 맥락을 전환하면 더 자연스러울 것 같습니다.",
      },
      {
        role: "user",
        content:
          "좋은 의견이에요. 그리고 디자인 시스템 경험도 채용공고에서 우대하고 있는데, 어떻게 어필하면 좋을까요?",
      },
      {
        role: "assistant",
        content:
          "채용공고에 '디자인 시스템 구축 경험'이 우대사항으로 명시되어 있습니다. Craft UI 40개 컴포넌트, Storybook 문서화, Figma 토큰 연동 경험을 구체적 수치와 함께 언급하면 효과적입니다.",
      },
      {
        role: "user",
        content:
          "당근마켓 회사 소개를 보니 A/B 테스트 기반 의사결정 문화가 있더라고요. 그 부분과 연결지을 수 있는 경험이 있을까요?",
      },
      {
        role: "assistant",
        content:
          "검색 리뉴얼 프로젝트에서 A/B 테스트로 단계적 롤아웃하신 경험이 있으시잖아요. 당근마켓의 데이터 기반 의사결정 문화와 잘 맞는 포인트입니다.",
      },
      {
        role: "user",
        content:
          "완벽하네요. 그 내용까지 반영해서 자소서를 수정해주세요.",
      },
      {
        role: "assistant",
        content:
          "네, 검색 UX를 동네 탐색 맥락으로 전환, 디자인 시스템 구체적 수치 추가, A/B 테스트 경험 연결 — 세 가지를 반영하여 수정하겠습니다.",
      },
    ],
    terse: [
      {
        role: "user",
        content: "당근마켓 프론트엔드 자소서 봐줘",
      },
      {
        role: "assistant",
        content:
          "당근마켓 웹 프론트엔드 포지션 자소서를 확인하겠습니다. 초안과 채용공고를 함께 볼게요.",
      },
      {
        role: "user",
        content: "검색 UX 경험 중심으로 고쳐줘",
      },
      {
        role: "assistant",
        content:
          "검색 전환율 50% 향상 경험을 당근마켓 중고거래 탐색 맥락으로 수정하겠습니다.",
      },
      {
        role: "user",
        content: "디자인 시스템도 넣어",
      },
      {
        role: "assistant",
        content:
          "Craft UI 디자인 시스템 경험을 추가합니다. 컴포넌트 40개, Storybook, Figma 연동 수치와 함께요.",
      },
      {
        role: "user",
        content: "당근 A/B 테스트 문화랑 연결해줘",
      },
      {
        role: "assistant",
        content:
          "검색 리뉴얼에서 A/B 테스트 단계적 롤아웃 경험을 당근마켓의 데이터 기반 문화와 연결짓겠습니다.",
      },
      {
        role: "user",
        content: "ㅇㅋ 전체 수정해줘",
      },
      {
        role: "assistant",
        content:
          "세 가지 포인트 반영해서 자소서 전체를 수정하겠습니다.",
      },
    ],
    jumpy: [
      {
        role: "user",
        content: "당근마켓 지원할 건데요",
      },
      {
        role: "assistant",
        content:
          "당근마켓 웹 프론트엔드 개발자 포지션에 지원하시는 거죠? 어떤 부분을 도와드릴까요?",
      },
      {
        role: "user",
        content:
          "아 잠깐 제 포트폴리오에 BFF 경험이 빠져있는데 괜찮을까요?",
      },
      {
        role: "assistant",
        content:
          "경력기술서에 NestJS BFF 아키텍처 도입 경험이 상세히 기술되어 있어서, 포트폴리오에 없어도 자소서에서 충분히 어필할 수 있습니다.",
      },
      {
        role: "user",
        content:
          "아 그렇구나. 근데 당근은 GraphQL 쓰나? 내 BFF가 GraphQL 기반인데",
      },
      {
        role: "assistant",
        content:
          "당근마켓 회사 소개에 주요 스택이 React, Next.js, Kotlin, Go로 나와있고 GraphQL 언급은 없지만, API 설계 역량 자체는 충분히 어필할 수 있습니다.",
      },
      {
        role: "user",
        content:
          "그럼 자소서 초안 수정해줘. 근데 검색 UX 부분 수치가 맞나 다시 확인해줘",
      },
      {
        role: "assistant",
        content:
          "경력기술서 확인 결과 검색 → 구매 전환율 12% → 18% (50% 향상)이 맞습니다. 자소서 초안에도 동일하게 기재되어 있습니다. 수정을 시작할까요?",
      },
      {
        role: "user",
        content:
          "응 수정해줘. 그리고 당근 엔지니어링 원칙 중에 '작게 자주 배포'랑 내 경험 연결할 수 있을까?",
      },
      {
        role: "assistant",
        content:
          "Craft UI 디자인 시스템의 npm 사내 배포와 컴포넌트 단위 독립 개발 경험이 '작게 자주 배포' 원칙과 잘 맞습니다. 이 연결고리를 향후 목표에 녹이겠습니다.",
      },
    ],
  },

  // ── md-3: 최윤호 (iOS, Swift/UIKit, 모바일 에이전시) ─────────────────
  "md-3": {
    polite: [
      {
        role: "user",
        content:
          "안녕하세요, 카카오뱅크 iOS 개발자 포지션에 지원하려고 합니다. 금융 앱 경험이 있어서 잘 맞을 것 같은데 자소서를 도와주실 수 있을까요?",
      },
      {
        role: "assistant",
        content:
          "안녕하세요! 카카오뱅크 iOS Developer 포지션이시군요. 신한카드 마이앱 리뉴얼 경험이 있으시니 금융 앱 경험 우대사항에 정확히 맞습니다. 어떤 부분부터 작성할까요?",
      },
      {
        role: "user",
        content:
          "지원 동기부터 시작하고 싶습니다. 카카오뱅크의 iOS 모듈화 기술블로그를 읽고 감명받아서 지원하게 되었거든요.",
      },
      {
        role: "assistant",
        content:
          "카카오뱅크 기술블로그의 Tuist 모듈화 글과 최윤호님의 앱팩토리 Tuist 도입 경험을 연결하면 매우 설득력 있는 지원 동기가 될 것 같습니다.",
      },
      {
        role: "user",
        content:
          "맞아요. 제 추천서에도 모듈화와 코드 품질에 대한 내용이 있으니 그것도 활용해주세요.",
      },
      {
        role: "assistant",
        content:
          "추천서에서 한승민 팀장님이 Tuist 모듈화와 스냅샷 테스팅을 통한 안정적 릴리즈를 강조하셨네요. 자소서에서 추천서 내용을 직접 인용하기보다는, 같은 역량을 본인의 관점에서 서술하는 것이 좋겠습니다.",
      },
      {
        role: "user",
        content:
          "좋습니다. 핵심 역량 파트에서 금융 앱 경험과 모듈화 경험을 중심으로 작성해주세요.",
      },
      {
        role: "assistant",
        content:
          "금융 앱(신한카드 DAU 50만) 안정성 확보 경험과 Tuist 모듈화 도입 경험을 두 축으로 핵심 역량을 구성하겠습니다.",
      },
      {
        role: "user",
        content:
          "그리고 데일리루틴 앱을 통해 SwiftUI 역량도 어필하고 싶은데, 카카오뱅크가 SwiftUI 경험을 우대하더라고요.",
      },
      {
        role: "assistant",
        content:
          "채용공고에 'SwiftUI 실무 적용 경험' 우대사항이 있습니다. 데일리루틴 앱의 SwiftUI + WidgetKit + Swift Charts 경험을 '차세대 UI 기술 역량'으로 어필하겠습니다.",
      },
    ],
    terse: [
      {
        role: "user",
        content: "카카오뱅크 iOS 자소서 써줘",
      },
      {
        role: "assistant",
        content:
          "카카오뱅크 iOS Developer 포지션 자소서를 작성하겠습니다. 금융 앱 경험이 있으시니 좋은 어필 포인트가 있네요.",
      },
      {
        role: "user",
        content: "Tuist 모듈화 중심으로",
      },
      {
        role: "assistant",
        content:
          "Tuist 모듈화 경험을 중심으로 작성합니다. 카카오뱅크 기술블로그의 모듈화 사례와 연결짓겠습니다.",
      },
      {
        role: "user",
        content: "신한카드 프로젝트 어필해줘",
      },
      {
        role: "assistant",
        content:
          "DAU 50만 금융 앱 리뉴얼 경험을 강조합니다. 크래시율 0.1% 이하 유지, MVVM-C 아키텍처 전환 포함합니다.",
      },
      {
        role: "user",
        content: "SwiftUI 경험도 넣어",
      },
      {
        role: "assistant",
        content:
          "데일리루틴 앱의 SwiftUI + WidgetKit 경험을 추가합니다. 채용공고 우대사항과 맞아요.",
      },
      {
        role: "user",
        content: "ㅇㅋ 완성해줘",
      },
      {
        role: "assistant",
        content:
          "Tuist 모듈화 + 신한카드 금융 앱 + SwiftUI 세 축으로 자소서를 완성하겠습니다.",
      },
    ],
    jumpy: [
      {
        role: "user",
        content:
          "카카오뱅크 지원하려고요. 제가 추천서도 있는데 도움이 될까요?",
      },
      {
        role: "assistant",
        content:
          "추천서가 있으시군요! 자소서에 직접 첨부하진 않지만, 추천서에서 강조된 역량을 자소서에 일관되게 반영하면 면접 시 시너지가 됩니다.",
      },
      {
        role: "user",
        content:
          "아 근데 카카오뱅크가 RxSwift 쓰나 Combine 쓰나?",
      },
      {
        role: "assistant",
        content:
          "채용공고에 'RxSwift 또는 Combine 경험'으로 둘 다 언급되어 있습니다. 최윤호님은 RxSwift 실무 + Combine 개인 프로젝트 경험이 모두 있으시니 양쪽 다 어필할 수 있습니다.",
      },
      {
        role: "user",
        content:
          "ㅇㅋ. 근데 내 이력서에 크래시율 개선한 거 들어가 있나?",
      },
      {
        role: "assistant",
        content:
          "이력서에 모바일랩스 재직 시 '앱 크래시율 2.3% → 0.4% 개선'이 기재되어 있습니다.",
      },
      {
        role: "user",
        content:
          "그거 카카오뱅크한테 어필되나? 그리고 자소서에서 어떤 구조로 쓰는 게 좋아?",
      },
      {
        role: "assistant",
        content:
          "금융 앱에서 안정성은 최우선이라 크래시율 개선 경험은 강력한 어필 포인트입니다. 구조는 지원 동기 → 핵심 역량(모듈화+안정성) → 기술 성장(UIKit→SwiftUI) → 포부 순서를 추천합니다.",
      },
      {
        role: "user",
        content: "좋아 그 구조로 써줘. CI/CD 경험도 빼지 말고",
      },
      {
        role: "assistant",
        content:
          "Fastlane + GitHub Actions CI/CD 경험도 포함해서 작성하겠습니다. 카카오뱅크 채용공고에도 'CI/CD 구축 경험 (Fastlane 등)' 우대사항이 있습니다.",
      },
    ],
  },

  // ── md-4: 김하늘 (데이터 엔지니어, Python/Spark, 블로그 운영) ────────
  "md-4": {
    polite: [
      {
        role: "user",
        content:
          "안녕하세요, 쿠팡 데이터 엔지니어 포지션에 지원하려고 합니다. 제 블로그와 경력 경험을 잘 어필하고 싶습니다.",
      },
      {
        role: "assistant",
        content:
          "안녕하세요! 쿠팡 Data Engineer 포지션이시군요. 이력서를 보니 Spark, Airflow, Delta Lake 경험이 채용공고의 요구사항과 잘 맞습니다. 기술 블로그도 운영하고 계시네요.",
      },
      {
        role: "user",
        content:
          "네, 블로그에 Spark 최적화나 Airflow 운영 경험을 공유하고 있는데, 이런 활동이 어필이 될까요?",
      },
      {
        role: "assistant",
        content:
          "블로그 글 중 'Spark 파티션 전략' (조회수 8,200+), 'Airflow DAG 150개 운영기' (조회수 6,500+)는 실무 경험 기반의 깊이 있는 콘텐츠로, 기술 커뮤니티 기여도와 전문성을 동시에 보여줍니다.",
      },
      {
        role: "user",
        content:
          "데이터 레이크하우스 구축 경험을 핵심 역량으로 내세우고 싶은데, 쿠팡에서 요구하는 수준에 맞을까요?",
      },
      {
        role: "assistant",
        content:
          "쿠팡 채용공고에 'Delta Lake, Apache Iceberg 등 테이블 포맷 경험'이 우대사항으로 있습니다. 레이크하우스 구축으로 쿼리 레이턴시 60% 감소, 스토리지 35% 절감을 달성하셨으니 충분히 어필할 수 있습니다.",
      },
      {
        role: "user",
        content:
          "그리고 Great Expectations로 데이터 품질 자동화한 경험도 언급하고 싶습니다.",
      },
      {
        role: "assistant",
        content:
          "'데이터 품질 도구(Great Expectations, dbt) 경험'도 채용공고 우대사항에 있습니다. 200개+ 검증 규칙, 95% 조기 탐지율은 대규모 데이터를 다루는 쿠팡에서 매우 높이 평가할 경험입니다.",
      },
      {
        role: "user",
        content:
          "감사합니다. 전체 구조를 잡아서 초안을 작성해주세요.",
      },
      {
        role: "assistant",
        content:
          "지원 동기(대규모 데이터 도전) → 핵심 역량(레이크하우스+품질 자동화) → 기술 성장(블로그 활동) → 포부 순서로 작성하겠습니다.",
      },
    ],
    terse: [
      {
        role: "user",
        content: "쿠팡 데이터 엔지니어 자소서",
      },
      {
        role: "assistant",
        content:
          "쿠팡 Data Engineer 포지션 자소서를 작성하겠습니다. 이력서와 채용공고를 확인할게요.",
      },
      {
        role: "user",
        content: "레이크하우스 경험 위주로",
      },
      {
        role: "assistant",
        content:
          "Delta Lake 레이크하우스 구축 경험을 중심으로 작성합니다. 쿼리 레이턴시 60% 감소 성과를 강조할게요.",
      },
      {
        role: "user",
        content: "블로그 활동도 넣어줘",
      },
      {
        role: "assistant",
        content:
          "Spark, Airflow, Delta Lake 관련 블로그 글 4편(총 조회수 30,000+)을 기술 커뮤니티 기여로 어필합니다.",
      },
      {
        role: "user",
        content: "데이터 품질 자동화 경험도",
      },
      {
        role: "assistant",
        content:
          "Great Expectations 기반 200개+ 검증 규칙, 95% 조기 탐지율 경험을 추가합니다.",
      },
      {
        role: "user",
        content: "전체 써줘",
      },
      {
        role: "assistant",
        content:
          "레이크하우스 + 데이터 품질 + 블로그 활동을 중심으로 자소서를 작성하겠습니다.",
      },
    ],
    jumpy: [
      {
        role: "user",
        content: "쿠팡 데이터 엔지니어 지원해보려고요",
      },
      {
        role: "assistant",
        content:
          "쿠팡 Data Engineer 포지션이군요! Spark, Airflow 경험이 잘 맞습니다. 어떤 부분을 도와드릴까요?",
      },
      {
        role: "user",
        content:
          "아 잠깐 제 블로그에 Delta Lake vs Iceberg 비교 글 썼는데 쿠팡이 뭐 쓰는지 알아?",
      },
      {
        role: "assistant",
        content:
          "채용공고에 'Delta Lake, Apache Iceberg 등 테이블 포맷 경험'으로 둘 다 언급되어 있습니다. 비교 글(조회수 11,000+)이 두 기술에 대한 깊은 이해를 보여주므로 좋은 어필 포인트입니다.",
      },
      {
        role: "user",
        content:
          "ㅇㅇ 그거 좋네. 근데 내 이력서에 일일 데이터 처리량 맞게 적혀있나?",
      },
      {
        role: "assistant",
        content:
          "이력서에 데이터웨이브 '일일 데이터 처리량 2TB'로 기재되어 있습니다. 경력기술서의 실시간 파이프라인에는 '일일 3억건 이벤트'로 되어 있고요.",
      },
      {
        role: "user",
        content:
          "맞아. 아 근데 이전 회사 스마트로지 경험은 빼는 게 나을까? 규모가 작아서...",
      },
      {
        role: "assistant",
        content:
          "스마트로지의 PostgreSQL → BigQuery 마이그레이션 경험은 오히려 '다양한 환경 경험'으로 어필할 수 있습니다. 쿠팡도 다양한 데이터 소스를 다루니 빼지 않는 것을 추천합니다.",
      },
      {
        role: "user",
        content: "알겠어 그럼 자소서 전체 구조 잡아줘",
      },
      {
        role: "assistant",
        content:
          "지원 동기 → 핵심 역량(레이크하우스+실시간 파이프라인) → 기술 커뮤니티(블로그) → 성장 과정(스마트로지→데이터웨이브) 순서로 구성하겠습니다.",
      },
    ],
  },

  // ── md-5: 정우진 (백엔드, Go/gRPC, B2B SaaS) ────────────────────────
  "md-5": {
    polite: [
      {
        role: "user",
        content:
          "안녕하세요, 라인플러스 Server-Side Engineer에 지원하려고 합니다. 자기소개서 초안을 함께 다듬어주실 수 있을까요?",
      },
      {
        role: "assistant",
        content:
          "안녕하세요! 라인플러스 Server-Side Engineer 포지션이시군요. Go + gRPC 경험이 5년이시고, 메시징 플랫폼팀의 기술 스택과 잘 맞습니다. 기존 초안을 확인해볼게요.",
      },
      {
        role: "user",
        content:
          "자소서 초안에서 멀티테넌시 경험을 강조했는데, 라인의 글로벌 스케일에 맞게 톤을 조정해주세요.",
      },
      {
        role: "assistant",
        content:
          "라인 메시징 플랫폼팀은 300만+ RPS, 2억 사용자, 99.99% SLA를 운영합니다. 120개 테넌트 경험을 '데이터 격리와 장애 격리 원칙'으로 추상화하면 글로벌 스케일 맥락에서도 설득력이 있습니다.",
      },
      {
        role: "user",
        content:
          "좋네요. 그리고 API Gateway를 Go로 직접 개발한 경험이 라인에서 높이 평가될까요?",
      },
      {
        role: "assistant",
        content:
          "채용공고에 'API Gateway 개발 경험'이 우대사항으로 있고, JD 상세에도 Go가 주 언어입니다. 초당 5,000 요청, p99 15ms 이하 성능은 고성능 시스템 설계 역량을 잘 보여줍니다.",
      },
      {
        role: "user",
        content:
          "JD 상세를 보니 RFC 기반 설계 리뷰 문화가 있더라고요. 제 설계 경험을 어필하면 좋을 것 같습니다.",
      },
      {
        role: "assistant",
        content:
          "멀티테넌시 아키텍처 설계 리드 경험이 RFC 기반 설계 리뷰 문화와 잘 맞습니다. RLS와 스키마 분리 혼합 전략처럼 구체적인 설계 결정 과정을 언급하면 좋겠습니다.",
      },
      {
        role: "user",
        content:
          "그리고 Terraform IaC 경험도 넣고 싶은데 지면이 부족하지 않을까요?",
      },
      {
        role: "assistant",
        content:
          "JD에 'Terraform, Helm 등 IaC 경험' 우대사항이 있으니 간략히라도 언급하는 것이 좋습니다. 핵심 역량에서 한 문장으로 '12개 마이크로서비스를 Terraform + ArgoCD 기반 GitOps로 운영' 정도로 넣을 수 있습니다.",
      },
      {
        role: "user",
        content:
          "완벽합니다. 그 방향으로 자소서를 수정해주세요.",
      },
      {
        role: "assistant",
        content:
          "멀티테넌시 → 글로벌 스케일 톤 조정, API Gateway Go 구현 강조, RFC 설계 문화 연결, IaC 간략 언급 — 네 가지를 반영하여 수정하겠습니다.",
      },
    ],
    terse: [
      {
        role: "user",
        content: "라인플러스 서버 개발자 자소서",
      },
      {
        role: "assistant",
        content:
          "라인플러스 Server-Side Engineer 자소서를 작성하겠습니다. 이력서와 JD를 확인할게요.",
      },
      {
        role: "user",
        content: "멀티테넌시 경험 중심으로",
      },
      {
        role: "assistant",
        content:
          "120개 테넌트 운영 경험을 글로벌 스케일 맥락으로 어필하겠습니다. 데이터 격리, 장애 격리 중심으로요.",
      },
      {
        role: "user",
        content: "Go API Gateway 경험도",
      },
      {
        role: "assistant",
        content:
          "Go 기반 API Gateway 자체 개발 경험을 추가합니다. 5,000 RPS, p99 15ms 성능 포함합니다.",
      },
      {
        role: "user",
        content: "Terraform 한 줄 넣어줘",
      },
      {
        role: "assistant",
        content:
          "IaC 경험을 핵심 역량에 한 문장으로 넣겠습니다.",
      },
      {
        role: "user",
        content: "전체 완성해",
      },
      {
        role: "assistant",
        content:
          "멀티테넌시 + API Gateway + IaC를 반영해서 자소서를 완성하겠습니다.",
      },
    ],
    jumpy: [
      {
        role: "user",
        content: "라인플러스 지원하려는데 Go 경험 어필할 수 있을까?",
      },
      {
        role: "assistant",
        content:
          "라인 메시징 플랫폼팀의 주 언어가 Go이고, 정우진님은 Go + gRPC로 3년 넘게 실무 경험이 있으시니 강력한 어필 포인트입니다.",
      },
      {
        role: "user",
        content:
          "아 근데 JD 보니까 300만 RPS라고 하던데... 내 경험이 5,000 RPS인데 괜찮을까?",
      },
      {
        role: "assistant",
        content:
          "스케일 차이는 있지만, API Gateway를 직접 설계·구현한 경험 자체가 중요합니다. Token Bucket Rate Limiting, Circuit Breaker 등 분산 시스템 설계 원칙을 이해하고 있다는 것을 강조하면 됩니다.",
      },
      {
        role: "user",
        content:
          "그렇구나. 아 그리고 자소서 초안에 기술 철학 부분이 너무 추상적인 것 같아서 고치고 싶어",
      },
      {
        role: "assistant",
        content:
          "기존 초안의 '단순함이 최고의 설계'를 멀티테넌시 설계의 구체적 사례와 연결하면 추상성이 줄어듭니다. 예를 들어 RLS + 스키마 분리 혼합 전략의 설계 의사결정 과정을 서술하는 식으로요.",
      },
      {
        role: "user",
        content:
          "ㅇㅇ 좋아. 근데 일본어 커뮤니케이션 경험이 없는데 괜찮겠지?",
      },
      {
        role: "assistant",
        content:
          "JD에 한국/일본 분산 팀이 언급되어 있지만, 필수 요건은 아닙니다. 영어 커뮤니케이션이 가능하다면 언급하시고, 자소서에서는 기술 역량에 집중하는 것이 좋겠습니다.",
      },
      {
        role: "user",
        content: "그래 자소서 전체 수정해줘",
      },
      {
        role: "assistant",
        content:
          "기술 철학을 구체화하고, 스케일 차이를 설계 원칙 중심으로 보완해서 전체 수정하겠습니다.",
      },
    ],
  },
}
