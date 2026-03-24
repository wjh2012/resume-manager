/**
 * 시니어 개발자 카테고리 페르소나 fixture
 *
 * sd-1: 김철수 — 풀스택 개발자 5년차 (기존 mock-data.ts 마이그레이션)
 * sd-2: 박준형 — 백엔드 특화 (Java/Kotlin, 대기업 경력, MSA/DDD) 7년+
 * sd-3: 이서진 — 인프라/DevOps 특화 (AWS/Terraform, SRE 경력, 특허 보유) 8년+
 * sd-4: 장민호 — 프론트엔드 특화 (React/Vue, 디자인시스템, 대규모 SPA) 7년+
 * sd-5: 한수연 — 데이터 엔지니어링 특화 (Spark/Airflow, ML 파이프라인, 데이터 플랫폼) 8년+
 */

import type {
  MockPersona,
  MockDocument,
  MockExternalDocument,
  MockCareerNote,
  ConvMessage,
} from "../types"

// ===========================================================================
// Personas
// ===========================================================================

export const PERSONAS: MockPersona[] = [
  {
    id: "sd-1",
    name: "김철수",
    category: "senior-developer",
    label: "풀스택 개발자 5년차",
  },
  {
    id: "sd-2",
    name: "박준형",
    category: "senior-developer",
    label: "백엔드 특화 개발자 7년차",
  },
  {
    id: "sd-3",
    name: "이서진",
    category: "senior-developer",
    label: "인프라/DevOps 엔지니어 8년차",
  },
  {
    id: "sd-4",
    name: "장민호",
    category: "senior-developer",
    label: "프론트엔드 특화 개발자 7년차",
  },
  {
    id: "sd-5",
    name: "한수연",
    category: "senior-developer",
    label: "데이터 엔지니어링 특화 8년차",
  },
]

// ===========================================================================
// Documents
// ===========================================================================

export const DOCUMENTS: MockDocument[] = [
  // -------------------------------------------------------------------------
  // sd-1 김철수 (6건) — 기존 doc-1,2,4,5,6,7 마이그레이션
  // -------------------------------------------------------------------------
  {
    id: "sd-1-doc-1",
    personaId: "sd-1",
    title: "이력서 — 김철수",
    summary:
      "풀스택 개발자, 5년 경력. React, Node.js, PostgreSQL 중심. 스타트업 2곳 경험.",
    extractedText: `김철수 — 풀스택 개발자

경력사항:
1. (주)테크스타트 (2021.03 ~ 현재) — 시니어 개발자
   - React + Next.js 기반 SaaS 플랫폼 개발
   - 사용자 10만명 규모 서비스 운영
   - CI/CD 파이프라인 구축 (GitHub Actions)
   - 팀 리드로서 5명 개발팀 관리

2. (주)코드랩 (2019.01 ~ 2021.02) — 주니어 개발자
   - Node.js + Express 백엔드 API 개발
   - PostgreSQL 데이터베이스 설계 및 최적화
   - 결제 시스템 연동 (PG사 API)
   - 일일 트랜잭션 5,000건 처리

학력:
- 서울대학교 컴퓨터공학과 졸업 (2018)

기술 스택:
- Frontend: React, Next.js, TypeScript, Tailwind CSS
- Backend: Node.js, Express, NestJS
- Database: PostgreSQL, Redis, MongoDB
- DevOps: Docker, AWS, GitHub Actions`,
  },
  {
    id: "sd-1-doc-2",
    personaId: "sd-1",
    title: "프로젝트 포트폴리오",
    summary:
      "개인 프로젝트 3개: AI 챗봇, 이커머스 플랫폼, 오픈소스 CLI 도구.",
    extractedText: `프로젝트 포트폴리오

1. AI 고객상담 챗봇 (2023)
   - GPT-4 API + RAG 파이프라인 구축
   - 고객 문의 자동 응답률 70% 달성
   - Pinecone 벡터 DB + LangChain 활용
   - 월 3,000건 문의 처리

2. 이커머스 플랫폼 "마켓플러스" (2022)
   - Next.js + Stripe 결제 연동
   - 판매자 대시보드 (매출 분석, 재고 관리)
   - 실시간 주문 알림 (WebSocket)
   - MAU 5,000명 달성

3. CLI 배포 도구 "deploy-ez" (2021)
   - Go로 개발한 오픈소스 프로젝트
   - GitHub Stars 450+
   - Docker + Kubernetes 자동 배포
   - npm 패키지로도 배포 (월 다운로드 2,000+)`,
  },
  {
    id: "sd-1-doc-3",
    personaId: "sd-1",
    title: "경력기술서 — 테크스타트",
    summary:
      "테크스타트 재직 중 수행한 주요 프로젝트 4건. SaaS 플랫폼, 데이터 파이프라인, 내부 도구 등.",
    extractedText: `경력기술서 — (주)테크스타트 (2021.03 ~ 현재)

프로젝트 1: B2B SaaS 대시보드 리뉴얼 (2023.01 ~ 2023.08)
  역할: 프론트엔드 리드
  - 레거시 jQuery 기반 대시보드를 React + TypeScript로 전면 재구축
  - 실시간 데이터 시각화 (D3.js, recharts)
  - 멀티테넌시 지원 (조직별 권한 분리)
  - 결과: 고객 만족도 NPS 32 → 58 상승

프로젝트 2: 데이터 파이프라인 구축 (2022.06 ~ 2022.12)
  역할: 백엔드 개발
  - Kafka + Spark Streaming 기반 실시간 이벤트 처리
  - 일일 이벤트 500만건 처리
  - S3 + Athena로 분석 데이터 레이크 구성
  - ETL 자동화로 데이터팀 수작업 80% 감소

프로젝트 3: 내부 배포 자동화 도구 (2022.01 ~ 2022.05)
  역할: DevOps 리드
  - GitHub Actions + ArgoCD 기반 GitOps 파이프라인
  - Helm chart 표준화 (서비스 12개 통합 관리)
  - 배포 시간 평균 25분 → 8분으로 단축
  - 롤백 자동화 (실패 시 이전 버전 자동 복구)

프로젝트 4: 모니터링 시스템 고도화 (2021.06 ~ 2021.12)
  역할: 인프라 엔지니어
  - Prometheus + Grafana + AlertManager 스택 구축
  - 커스텀 메트릭 수집기 개발 (Go)
  - SLO/SLI 기반 알림 체계 도입
  - MTTR 4시간 → 45분으로 개선`,
  },
  {
    id: "sd-1-doc-4",
    personaId: "sd-1",
    title: "자기소개서 초안 — 카카오",
    summary:
      "카카오 백엔드 개발자 지원 시 작성한 자기소개서 초안. 분산 시스템, 팀 리더십 강조.",
    extractedText: `자기소개서 — 카카오 백엔드 개발자 지원

[성장 과정]
저는 "동작하는 코드"에서 "신뢰할 수 있는 시스템"으로 관점을 전환하며 성장해왔습니다.
코드랩에서 결제 시스템 장애를 경험한 후, 단순히 기능을 구현하는 것을 넘어
시스템의 가용성과 회복 탄력성에 깊은 관심을 갖게 되었습니다.

[지원 동기]
카카오의 대규모 트래픽 처리 기술과 사용자 중심 서비스 철학에 공감하여 지원합니다.
특히 카카오톡의 메시지 시스템처럼 높은 신뢰성이 요구되는 분산 시스템 개발에
제 경험을 활용하고 싶습니다.

[핵심 역량]
1. 분산 시스템 설계: Kafka 기반 이벤트 드리븐 아키텍처 경험
2. 장애 대응: Circuit Breaker, 폴백 시스템 등 회복 탄력성 설계
3. 팀 리더십: 5명 개발팀 리드로서 코드 리뷰 문화 정착, 배포 자동화 주도`,
  },
  {
    id: "sd-1-doc-5",
    personaId: "sd-1",
    title: "추천서 — 코드랩 CTO",
    summary:
      "코드랩 CTO가 작성한 추천서. 문제 해결 능력과 주도성 강조.",
    extractedText: `추천서

추천인: 이영호 (코드랩 CTO)
대상: 김철수

김철수 개발자는 코드랩에서 약 2년간 백엔드 개발자로 근무하였습니다.

특히 인상 깊었던 점은 결제 시스템 장애 대응 과정에서 보여준 주도성입니다.
장애 발생 후 단순 복구에 그치지 않고, 근본 원인을 분석하여 폴백 시스템을
자발적으로 제안하고 구현하였습니다. 이 시스템은 이후 3차례의 PG사 장애에서
다운타임 제로를 달성하는 데 핵심적인 역할을 했습니다.

또한 주니어 개발자임에도 불구하고 데이터베이스 최적화에 깊은 관심을 보여,
느린 쿼리 모니터링 도구를 자체 개발하고 주요 API 응답 시간을 평균 40% 개선한
성과를 거두었습니다.

김철수 개발자를 적극 추천합니다.`,
  },
  {
    id: "sd-1-doc-6",
    personaId: "sd-1",
    title: "기술 블로그 모음",
    summary:
      "개인 기술 블로그 주요 게시글 모음. Kubernetes, Go, 성능 최적화 주제.",
    extractedText: `기술 블로그 주요 게시글

1. "Kubernetes에서 Zero-Downtime 배포 전략 비교" (2023.09)
   - Rolling Update vs Blue-Green vs Canary 배포 비교
   - 실제 프로덕션 환경에서의 적용 사례
   - Helm + ArgoCD를 활용한 자동화 방법
   - 조회수 12,000+, 북마크 340+

2. "Go로 만드는 고성능 CLI 도구" (2022.08)
   - cobra + viper 라이브러리 활용법
   - 크로스 컴파일 및 배포 자동화
   - deploy-ez 개발기
   - 조회수 8,500+

3. "PostgreSQL 쿼리 최적화 실전 가이드" (2021.05)
   - EXPLAIN ANALYZE 읽는 법
   - 인덱스 전략 (B-tree, GIN, GiST)
   - 파티셔닝으로 대용량 테이블 관리
   - 조회수 15,000+, 시리즈 총 3편`,
  },

  // -------------------------------------------------------------------------
  // sd-2 박준형 (4건: 이력서, 경력기술서, 자소서 초안, 블로그)
  // -------------------------------------------------------------------------
  {
    id: "sd-2-doc-1",
    personaId: "sd-2",
    title: "이력서 — 박준형",
    summary:
      "백엔드 개발자 7년 경력. Java/Kotlin, Spring Boot, MSA/DDD 전문. 대기업 2곳 경험.",
    extractedText: `박준형 — 백엔드 개발자

경력사항:
1. (주)쿠팡 (2022.01 ~ 현재) — 시니어 백엔드 개발자
   - Kotlin + Spring Boot 기반 주문/결제 도메인 개발
   - MSA 전환 프로젝트 리드 (모놀리스 → 15개 마이크로서비스)
   - 일일 주문 처리량 200만건 이상 시스템 운영
   - DDD 기반 도메인 모델링 및 Bounded Context 설계

2. (주)LG CNS (2019.03 ~ 2021.12) — 백엔드 개발자
   - Java + Spring Framework 기반 금융 시스템 개발
   - 증권 거래 시스템 백엔드 (초당 트랜잭션 3,000건)
   - Oracle DB 튜닝 및 쿼리 최적화
   - 레거시 시스템 리팩토링 (EJB → Spring Boot 전환)

3. (주)우아한형제들 (2017.06 ~ 2019.02) — 주니어 개발자
   - Java + Spring MVC 기반 배달 주문 API 개발
   - Redis 캐시 레이어 설계 및 적용
   - 성능 테스트 자동화 (nGrinder)

학력:
- KAIST 전산학부 졸업 (2017)

기술 스택:
- Language: Java, Kotlin, Go
- Framework: Spring Boot, Spring Cloud, Ktor
- Database: MySQL, PostgreSQL, Oracle, Redis
- Infra: Kubernetes, Docker, AWS, Kafka
- Architecture: MSA, DDD, Event Sourcing, CQRS`,
  },
  {
    id: "sd-2-doc-2",
    personaId: "sd-2",
    title: "경력기술서 — 쿠팡",
    summary:
      "쿠팡 재직 중 수행한 주요 프로젝트 3건. MSA 전환, 결제 시스템 리아키텍처링, 장애 대응 체계 구축.",
    extractedText: `경력기술서 — (주)쿠팡 (2022.01 ~ 현재)

프로젝트 1: 주문 도메인 MSA 전환 (2023.03 ~ 2023.12)
  역할: 테크 리드
  - 모놀리식 주문 시스템을 15개 마이크로서비스로 분리
  - DDD 기반 Bounded Context 설계 (주문, 결제, 배송, 재고, 정산)
  - Saga 패턴 적용으로 분산 트랜잭션 관리
  - Kafka 기반 이벤트 소싱 아키텍처 구현
  - 결과: 배포 주기 월 1회 → 일 3회, 장애 격리 성공률 95%

프로젝트 2: 결제 시스템 리아키텍처링 (2022.06 ~ 2023.02)
  역할: 백엔드 개발
  - 결제 수단 10종 통합 게이트웨이 설계
  - Idempotency Key 기반 중복 결제 방지 시스템
  - 초당 결제 처리 5,000건 → 15,000건 스케일업
  - 결제 성공률 99.2% → 99.8% 개선
  - 결과: 분기별 매출 손실 약 8억원 방지

프로젝트 3: 장애 대응 체계 고도화 (2022.01 ~ 2022.05)
  역할: SRE 협업
  - Circuit Breaker + Bulkhead 패턴 표준화
  - Chaos Engineering 도입 (Litmus Chaos)
  - 장애 시뮬레이션 주 1회 정기 실행
  - 결과: MTTR 2시간 → 20분, P0 장애 건수 분기 5건 → 1건`,
  },
  {
    id: "sd-2-doc-3",
    personaId: "sd-2",
    title: "자기소개서 초안 — 토스",
    summary:
      "토스 서버 플랫폼팀 지원 자기소개서 초안. MSA 설계 경험과 대규모 트랜잭션 처리 역량 강조.",
    extractedText: `자기소개서 — 토스 서버 플랫폼팀 지원

[성장 과정]
우아한형제들에서 처음 대규모 트래픽을 경험하며 "확장 가능한 설계"의 중요성을 배웠습니다.
LG CNS에서 금융 시스템의 엄격한 데이터 정합성 요구사항을 다루며 트랜잭션 설계 역량을 키웠고,
쿠팡에서 MSA 전환을 직접 리드하며 분산 시스템 아키텍트로 성장했습니다.

[지원 동기]
토스의 "금융을 혁신하는 기술"이라는 비전에 공감합니다.
특히 서버 플랫폼팀에서 내부 개발자 생산성을 높이는 공통 인프라를 만드는 역할에
제 MSA 플랫폼 구축 경험을 기여하고 싶습니다.

[핵심 역량]
1. MSA 아키텍처 설계: 모놀리스에서 15개 서비스로의 점진적 분리 경험
2. 고가용성 시스템: 일일 200만 주문 처리, 결제 성공률 99.8% 달성
3. DDD 실전: Bounded Context 설계, Saga 패턴, Event Sourcing 적용
4. 장애 엔지니어링: Chaos Engineering 도입으로 예방적 장애 대응 체계 구축`,
  },
  {
    id: "sd-2-doc-4",
    personaId: "sd-2",
    title: "기술 블로그 모음 — 박준형",
    summary:
      "개인 기술 블로그 주요 게시글 모음. DDD, MSA 전환, Kotlin 관련 주제.",
    extractedText: `기술 블로그 주요 게시글

1. "모놀리스에서 MSA로: 쿠팡 주문 시스템 전환기" (2024.01)
   - 왜 MSA가 필요했나: 배포 병목과 장애 전파 문제
   - Strangler Fig 패턴을 활용한 점진적 전환 전략
   - Saga 패턴 vs 2PC: 분산 트랜잭션 선택 기준
   - 조회수 25,000+, 북마크 890+

2. "DDD 실전에서의 Bounded Context 설계" (2023.07)
   - Context Map 그리기: 팀 간 협업 모델 정의
   - Anti-Corruption Layer로 레거시 격리하기
   - Aggregate Root 설계 시 흔한 실수들
   - 조회수 18,000+

3. "Kotlin Coroutine으로 비동기 API 성능 3배 개선하기" (2023.02)
   - Java Thread Pool vs Kotlin Coroutine 벤치마크
   - 실서비스 적용 사례: 결제 게이트웨이
   - structured concurrency 패턴 정리
   - 조회수 14,000+

4. "금융 시스템에서의 Idempotency 설계" (2022.09)
   - 중복 결제를 막는 Idempotency Key 패턴
   - Redis + DB 조합의 구현 전략
   - 분산 환경에서의 edge case 처리
   - 조회수 11,000+`,
  },

  // -------------------------------------------------------------------------
  // sd-3 이서진 (5건: 이력서, 포트폴리오, 경력기술서, 추천서, 특허)
  // -------------------------------------------------------------------------
  {
    id: "sd-3-doc-1",
    personaId: "sd-3",
    title: "이력서 — 이서진",
    summary:
      "인프라/DevOps 엔지니어 8년 경력. AWS, Terraform, Kubernetes, SRE 전문. 특허 보유.",
    extractedText: `이서진 — 인프라/DevOps 엔지니어

경력사항:
1. (주)라인플러스 (2021.09 ~ 현재) — Staff SRE Engineer
   - 글로벌 메시징 서비스 인프라 운영 (일본/태국/대만/인도네시아)
   - Terraform IaC로 멀티 리전 인프라 관리 (AWS 8개 리전)
   - SLO/SLI 체계 수립 및 에러 버짓 기반 배포 정책 도입
   - 8명 SRE팀 테크 리드

2. (주)카카오 (2018.07 ~ 2021.08) — DevOps 엔지니어
   - 카카오톡 인프라 운영 (MAU 4,700만 규모)
   - Kubernetes 클러스터 운영 (노드 300+ 규모)
   - 내부 CI/CD 플랫폼 "Kargo" 개발
   - 장애 대응 자동화 시스템 구축

3. (주)넥슨 (2016.03 ~ 2018.06) — 시스템 엔지니어
   - 게임 서버 인프라 운영 (동시 접속 50만명)
   - AWS 비용 최적화 프로젝트 (연간 3억원 절감)
   - 모니터링 시스템 구축 (Zabbix → Prometheus 전환)

학력:
- 포항공과대학교 컴퓨터공학과 석사 졸업 (2016)
  논문: "클라우드 환경에서의 자동 스케일링 최적화 알고리즘"

자격/특허:
- AWS Solutions Architect Professional
- CKA (Certified Kubernetes Administrator)
- 특허: "컨테이너 기반 자동 장애 복구 시스템" (10-2023-XXXXXXX)

기술 스택:
- IaC: Terraform, Pulumi, CloudFormation, Ansible
- Container: Kubernetes, Docker, Istio, Envoy
- CI/CD: ArgoCD, Jenkins, GitHub Actions, Spinnaker
- Monitoring: Prometheus, Grafana, Datadog, PagerDuty
- Cloud: AWS (Expert), GCP, Azure
- Language: Go, Python, Bash, HCL`,
  },
  {
    id: "sd-3-doc-2",
    personaId: "sd-3",
    title: "프로젝트 포트폴리오 — 이서진",
    summary:
      "오픈소스 프로젝트 2개 + 사이드 프로젝트 1개. Kubernetes 운영 도구, Terraform 모듈.",
    extractedText: `프로젝트 포트폴리오

1. 오픈소스: "kube-guardian" — Kubernetes 보안 감사 도구 (2023)
   - Go로 개발한 K8s 클러스터 보안 스캐너
   - CIS Benchmark 기반 자동 점검 (150+ 항목)
   - RBAC 권한 분석 및 시각화
   - GitHub Stars 1,200+, Contributors 28명
   - CNCF Landscape 등재

2. 오픈소스: "tf-modules-kr" — 한국 클라우드 Terraform 모듈 (2022)
   - NHN Cloud, NCP, AWS Korea 리전 특화 모듈
   - VPC, EKS, RDS, ElastiCache 등 20+ 모듈
   - GitHub Stars 680+
   - 국내 기업 30+ 도입 사례

3. 사이드 프로젝트: "infra-cost-bot" — 슬랙 비용 알림 봇 (2021)
   - AWS Cost Explorer API + Slack 연동
   - 일일 비용 리포트 + 이상 탐지 알림
   - 사내 도입 후 비용 인식 문화 정착
   - 월 평균 15% 비용 절감 기여`,
  },
  {
    id: "sd-3-doc-3",
    personaId: "sd-3",
    title: "경력기술서 — 라인플러스",
    summary:
      "라인플러스 재직 중 수행한 주요 프로젝트 3건. 멀티 리전 인프라, SRE 체계, 장애 자동 복구.",
    extractedText: `경력기술서 — (주)라인플러스 (2021.09 ~ 현재)

프로젝트 1: 글로벌 멀티 리전 인프라 마이그레이션 (2023.01 ~ 2023.10)
  역할: 인프라 아키텍트 / 테크 리드
  - IDC 기반 인프라를 AWS 8개 리전으로 마이그레이션
  - Terraform으로 전체 인프라 IaC 전환 (모듈 120+ 작성)
  - 리전 간 데이터 동기화 (AWS DMS + Global Accelerator)
  - Zero-Downtime 마이그레이션 (서비스 중단 0초)
  - 결과: 인프라 비용 연간 12억원 절감, 글로벌 지연시간 40% 감소

프로젝트 2: SRE 체계 수립 및 운영 (2022.03 ~ 2022.12)
  역할: SRE 리드
  - SLO/SLI 정의 (핵심 서비스 45개 대상)
  - 에러 버짓 기반 배포 정책 도입
  - Incident Response 프로세스 표준화
  - 포스트모템 문화 정착 (월 2회 공유)
  - 결과: 서비스 가용성 99.95% → 99.99% 달성

프로젝트 3: 컨테이너 기반 자동 장애 복구 시스템 (2021.09 ~ 2022.02)
  역할: 시스템 설계 및 개발
  - Kubernetes Custom Controller 개발 (Go)
  - Health Check 실패 시 자동 롤백 + 노드 교체
  - 장애 패턴 학습 기반 예측 스케일링
  - 특허 출원 (10-2023-XXXXXXX)
  - 결과: 자동 복구 성공률 92%, 야간 호출 80% 감소`,
  },
  {
    id: "sd-3-doc-4",
    personaId: "sd-3",
    title: "추천서 — 카카오 인프라팀장",
    summary:
      "카카오 인프라팀장이 작성한 추천서. 대규모 인프라 운영 역량과 자동화 리더십 강조.",
    extractedText: `추천서

추천인: 최동혁 (카카오 인프라플랫폼팀 팀장)
대상: 이서진

이서진 엔지니어는 카카오에서 약 3년간 DevOps 엔지니어로 근무하며
카카오톡 핵심 인프라 운영에 핵심적인 역할을 수행하였습니다.

가장 인상적이었던 점은 Kubernetes 전환 프로젝트에서 보여준 기술적 깊이와
리더십입니다. 당시 노드 300대 이상의 대규모 클러스터를 안정적으로 운영하면서도
자체 CI/CD 플랫폼 "Kargo"를 설계하고 개발하여, 개발팀 200명 이상이
사용하는 배포 표준 도구로 자리잡게 했습니다.

또한 AWS 비용 최적화 프로젝트를 자발적으로 제안하여 연간 3억원의 비용을
절감한 성과가 있으며, 이 과정에서 개발한 비용 모니터링 도구는 현재도
사내 표준으로 사용되고 있습니다.

기술적 역량뿐 아니라 후배 엔지니어 멘토링에도 헌신적이어서,
이서진 엔지니어가 멘토링한 주니어 3명이 모두 시니어로 성장했습니다.

이서진 엔지니어를 강력히 추천합니다.`,
  },
  {
    id: "sd-3-doc-5",
    personaId: "sd-3",
    title: "특허 명세서 — 컨테이너 기반 자동 장애 복구 시스템",
    summary:
      "Kubernetes 환경에서 장애 패턴을 학습하고 자동 복구하는 시스템 특허. 2023년 출원.",
    extractedText: `특허 명세서

발명의 명칭: 컨테이너 기반 자동 장애 복구 시스템 및 그 방법
출원번호: 10-2023-XXXXXXX
출원일: 2023.05.15
발명자: 이서진

[기술 분야]
본 발명은 컨테이너 오케스트레이션 환경에서 장애를 자동으로 감지, 분류,
복구하는 시스템에 관한 것이다.

[발명의 배경]
기존 Kubernetes의 자가 치유(self-healing) 기능은 단순 재시작에 한정되어
있어, 복합적인 장애 상황에서의 대응이 제한적이다.

[발명의 내용]
1. 장애 패턴 분류 엔진: 과거 장애 데이터를 기반으로 장애 유형을 자동 분류
   (메모리 누수, 네트워크 파티션, 디스크 풀 등 12가지 유형)
2. 복구 전략 선택기: 장애 유형별 최적 복구 전략 자동 선택
   (재시작, 롤백, 노드 교체, 트래픽 우회 등)
3. 예측 스케일링: 장애 선행 지표 모니터링을 통한 사전 대응
4. 학습 피드백 루프: 복구 결과를 학습 데이터로 활용하여 정확도 개선

[효과]
- 자동 복구 성공률: 92% (기존 Kubernetes 기본 기능 대비 35%p 향상)
- 야간 엔지니어 호출 80% 감소
- MTTR 45분 → 8분으로 단축`,
  },

  // -------------------------------------------------------------------------
  // sd-4 장민호 (4건: 이력서, 경력기술서, 포트폴리오, 자소서 초안)
  // -------------------------------------------------------------------------
  {
    id: "sd-4-doc-1",
    personaId: "sd-4",
    title: "이력서 — 장민호",
    summary:
      "프론트엔드 개발자 7년 경력. React/Vue, 디자인시스템, 대규모 SPA 전문. 토스/배민 경험.",
    extractedText: `장민호 — 프론트엔드 개발자

경력사항:
1. (주)토스 (2022.03 ~ 현재) — 프론트엔드 플랫폼 시니어 개발자
   - 토스 공통 디자인시스템 "TDS" 핵심 개발자
   - 60+ 컴포넌트 라이브러리 설계 및 유지보수
   - 사내 100+ 프로젝트에서 사용하는 공통 UI 인프라
   - 웹 접근성(WCAG 2.1 AA) 준수 컴포넌트 개발
   - 프론트엔드 성능 모니터링 도구 개발

2. (주)우아한형제들 (2019.06 ~ 2022.02) — 프론트엔드 개발자
   - 배달의민족 사장님 사이트 리뉴얼 (Vue.js → React 전환)
   - 대규모 SPA 상태 관리 (React Query + Zustand)
   - Micro Frontend 아키텍처 도입 (Module Federation)
   - 프론트엔드 테스트 자동화 (Cypress + Testing Library)

3. (주)직방 (2017.08 ~ 2019.05) — 주니어 프론트엔드 개발자
   - 부동산 매물 검색 SPA 개발 (Vue.js)
   - 지도 기반 UI 개발 (Naver Maps API)
   - 모바일 웹 최적화 (PWA 전환)

학력:
- 연세대학교 정보산업공학과 졸업 (2017)

기술 스택:
- Framework: React, Next.js, Vue.js, Nuxt.js
- State: React Query, Zustand, Recoil, Pinia
- Styling: Tailwind CSS, Vanilla Extract, Emotion, Storybook
- Testing: Vitest, Playwright, Cypress, Testing Library
- Build: Vite, Webpack, Turbopack, Module Federation
- Language: TypeScript, JavaScript`,
  },
  {
    id: "sd-4-doc-2",
    personaId: "sd-4",
    title: "경력기술서 — 토스",
    summary:
      "토스 재직 중 수행한 주요 프로젝트 3건. 디자인시스템, 성능 최적화, Micro Frontend.",
    extractedText: `경력기술서 — (주)토스 (2022.03 ~ 현재)

프로젝트 1: 토스 디자인시스템 TDS v3 리뉴얼 (2023.06 ~ 2024.01)
  역할: 코어 개발자
  - Headless UI 패턴으로 컴포넌트 아키텍처 재설계
  - Compound Component + Render Props 패턴 도입
  - WAI-ARIA 기반 접근성 완전 준수 (WCAG 2.1 AA)
  - Vanilla Extract로 Zero-runtime CSS 전환
  - Chromatic + Storybook으로 Visual Regression Test 자동화
  - 결과: 디자인-개발 간 핸드오프 시간 60% 단축, 접근성 점수 72 → 96

프로젝트 2: 토스 웹 성능 최적화 프로젝트 (2023.01 ~ 2023.05)
  역할: 성능 엔지니어
  - Core Web Vitals 개선 (LCP, FID, CLS)
  - React Server Components 도입 검토 및 적용
  - Bundle Analyzer + Tree Shaking 최적화
  - 이미지 CDN + AVIF/WebP 자동 변환 파이프라인
  - 결과: LCP 3.8초 → 1.2초, CLS 0.25 → 0.05, Lighthouse 점수 62 → 94

프로젝트 3: 사장님 대시보드 Micro Frontend 전환 (2022.03 ~ 2022.12)
  역할: 아키텍트
  - Module Federation 기반 MFE 아키텍처 설계
  - 5개 팀이 독립 배포 가능한 구조 구현
  - 공유 상태 관리 (Custom Events + React Context)
  - 점진적 마이그레이션 전략 수립 (Strangler Pattern)
  - 결과: 팀별 독립 배포 가능, 빌드 시간 12분 → 3분`,
  },
  {
    id: "sd-4-doc-3",
    personaId: "sd-4",
    title: "프로젝트 포트폴리오 — 장민호",
    summary:
      "오픈소스 디자인시스템 키트, 프론트엔드 성능 측정 도구, 개인 기술 블로그.",
    extractedText: `프로젝트 포트폴리오

1. 오픈소스: "react-a11y-kit" — 접근성 우선 React 컴포넌트 (2023)
   - Headless UI 패턴 기반 접근성 컴포넌트 라이브러리
   - Dialog, Dropdown, Tabs, Toast 등 15개 컴포넌트
   - 스크린 리더 테스트 자동화 (axe-core)
   - GitHub Stars 920+, npm 주간 다운로드 3,500+

2. "perf-dashboard" — 프론트엔드 성능 대시보드 (2022)
   - Core Web Vitals 실시간 모니터링
   - Lighthouse CI + Custom Metrics 수집
   - 성능 회귀 탐지 및 Slack 알림
   - 사내 도입 후 5개 서비스 성능 개선에 기여

3. 기술 블로그 "프론트엔드 딥다이브" (2020 ~ 현재)
   - 월 평균 방문자 8,000명
   - "React 렌더링 최적화 완전 정복" 시리즈 (조회수 45,000+)
   - "디자인시스템 구축기" 시리즈 (조회수 32,000+)
   - 프론트엔드 컨퍼런스 FEConf 2023 발표`,
  },
  {
    id: "sd-4-doc-4",
    personaId: "sd-4",
    title: "자기소개서 초안 — 당근",
    summary:
      "당근 프론트엔드 플랫폼팀 지원 자기소개서 초안. 디자인시스템과 DX 역량 강조.",
    extractedText: `자기소개서 — 당근 프론트엔드 플랫폼팀 지원

[성장 과정]
직방에서 Vue.js로 프론트엔드 커리어를 시작하여, 배달의민족에서 대규모 서비스의
상태 관리와 아키텍처 설계를 배웠습니다. 토스에서는 디자인시스템이라는
"개발자를 위한 제품"을 만들며, 사용성과 접근성의 가치를 체득했습니다.

[지원 동기]
당근의 "하이퍼로컬" 비전에서 다양한 사용자 경험을 설계해야 하는 도전을 봤습니다.
특히 프론트엔드 플랫폼팀에서 사내 개발자 경험(DX)을 혁신하는 역할에
제 디자인시스템 구축 경험이 큰 시너지를 낼 수 있다고 생각합니다.

[핵심 역량]
1. 디자인시스템 설계: 60+ 컴포넌트 라이브러리 구축, 100+ 프로젝트 적용
2. 웹 접근성: WCAG 2.1 AA 완전 준수 컴포넌트 개발 경험
3. 성능 최적화: LCP 3.8초 → 1.2초, Lighthouse 62 → 94 달성
4. MFE 아키텍처: Module Federation 기반 5개 팀 독립 배포 구조 설계`,
  },

  // -------------------------------------------------------------------------
  // sd-5 한수연 (5건: 이력서, 경력기술서, 자소서 초안, 블로그, 추천서)
  // -------------------------------------------------------------------------
  {
    id: "sd-5-doc-1",
    personaId: "sd-5",
    title: "이력서 — 한수연",
    summary:
      "데이터 엔지니어 8년 경력. Spark, Airflow, ML 파이프라인, 데이터 플랫폼 전문. 네이버/SK 경험.",
    extractedText: `한수연 — 데이터 엔지니어

경력사항:
1. (주)네이버 (2022.01 ~ 현재) — 시니어 데이터 엔지니어
   - 네이버 검색 데이터 플랫폼 운영 (일일 처리량 50TB)
   - Apache Spark 기반 대규모 ETL 파이프라인 설계
   - Airflow DAG 300+ 운영 및 최적화
   - ML Feature Store 구축 (Feast + Redis)
   - 데이터 품질 자동화 프레임워크 개발

2. (주)SK텔레콤 (2019.01 ~ 2021.12) — 데이터 엔지니어
   - AI 추천 시스템 데이터 파이프라인 구축
   - 실시간 스트리밍 처리 (Kafka + Flink)
   - 데이터 레이크 아키텍처 설계 (S3 + Delta Lake)
   - A/B 테스트 플랫폼 데이터 인프라 개발

3. (주)넷마블 (2016.07 ~ 2018.12) — 주니어 데이터 엔지니어
   - 게임 로그 수집 파이프라인 구축 (Fluentd + Elasticsearch)
   - 유저 행동 분석 대시보드 개발 (Kibana + Superset)
   - Hadoop 클러스터 운영 (노드 50대)
   - DAU 200만명 게임의 로그 분석

학력:
- 서울대학교 통계학과 졸업 (2016)

기술 스택:
- Processing: Apache Spark, Flink, Kafka Streams
- Orchestration: Airflow, Dagster, Prefect
- Storage: S3, Delta Lake, Iceberg, Hive, HDFS
- ML Infra: MLflow, Feast, Kubeflow
- Database: PostgreSQL, BigQuery, Redshift, ClickHouse
- Language: Python, Scala, SQL, Java`,
  },
  {
    id: "sd-5-doc-2",
    personaId: "sd-5",
    title: "경력기술서 — 네이버",
    summary:
      "네이버 재직 중 수행한 주요 프로젝트 3건. 검색 데이터 플랫폼, ML Feature Store, 데이터 품질 자동화.",
    extractedText: `경력기술서 — (주)네이버 (2022.01 ~ 현재)

프로젝트 1: 검색 데이터 플랫폼 리아키텍처링 (2023.03 ~ 2023.12)
  역할: 데이터 아키텍트 / 테크 리드
  - Hadoop MapReduce 기반 레거시를 Spark 3.x + Delta Lake로 전환
  - 일일 데이터 처리량 50TB, 파이프라인 300+ 마이그레이션
  - 데이터 카탈로그 구축 (Apache Atlas + 자체 UI)
  - 컬럼 레벨 리니지 트래킹 시스템 개발
  - 결과: ETL 처리 시간 60% 단축, 스토리지 비용 40% 절감

프로젝트 2: ML Feature Store 구축 (2022.09 ~ 2023.02)
  역할: ML 인프라 개발
  - Feast 기반 Feature Store 설계 및 구축
  - 온라인(Redis) + 오프라인(Delta Lake) 이중 저장소
  - Feature 버전 관리 및 시점 일치(Point-in-time Join) 구현
  - ML 모델 학습 파이프라인과 Feature 자동 연동
  - 결과: 피처 재사용률 70% 달성, ML 모델 개발 주기 4주 → 1주

프로젝트 3: 데이터 품질 자동화 프레임워크 (2022.01 ~ 2022.08)
  역할: 프레임워크 설계 및 개발
  - Great Expectations 기반 데이터 검증 규칙 엔진
  - 데이터 이상 탐지 자동화 (통계적 이상치 감지)
  - 데이터 SLA 모니터링 대시보드
  - 데이터 사고 자동 알림 및 롤백 시스템
  - 결과: 데이터 사고 발생률 85% 감소, 탐지 시간 평균 4시간 → 15분`,
  },
  {
    id: "sd-5-doc-3",
    personaId: "sd-5",
    title: "자기소개서 초안 — 카카오",
    summary:
      "카카오 데이터 플랫폼팀 지원 자기소개서 초안. 대규모 데이터 처리와 ML 인프라 역량 강조.",
    extractedText: `자기소개서 — 카카오 데이터 플랫폼팀 지원

[성장 과정]
넷마블에서 게임 로그 분석으로 데이터 엔지니어링을 시작하여,
SK텔레콤에서 실시간 스트리밍과 ML 파이프라인의 세계를 경험했습니다.
네이버에서는 일일 50TB를 처리하는 검색 데이터 플랫폼의 아키텍트로서
"데이터 플랫폼을 만드는 엔지니어"로 성장했습니다.

[지원 동기]
카카오의 다양한 서비스 — 카카오톡, 카카오맵, 카카오페이 — 가 만들어내는
방대한 데이터를 하나의 통합 플랫폼으로 다루는 도전에 매력을 느낍니다.
특히 ML 기반 추천/검색 고도화를 위한 데이터 인프라 구축에
제 Feature Store 및 실시간 파이프라인 구축 경험을 기여하고 싶습니다.

[핵심 역량]
1. 대규모 ETL: 일일 50TB 데이터 처리 파이프라인 설계 및 운영
2. ML 인프라: Feature Store 구축, 모델 학습 파이프라인 자동화
3. 데이터 품질: 자동화 프레임워크로 데이터 사고 85% 감소
4. 실시간 처리: Kafka + Flink 기반 실시간 스트리밍 파이프라인 구축`,
  },
  {
    id: "sd-5-doc-4",
    personaId: "sd-5",
    title: "기술 블로그 모음 — 한수연",
    summary:
      "개인 기술 블로그 주요 게시글 모음. Spark 최적화, 데이터 플랫폼 설계, ML 파이프라인 주제.",
    extractedText: `기술 블로그 주요 게시글

1. "Spark 3.x 성능 최적화 실전 가이드" (2024.01)
   - AQE(Adaptive Query Execution) 활용법
   - Skew Join 해결 전략 3가지
   - Dynamic Partition Pruning 적용 사례
   - 실제 파이프라인 처리 시간 60% 단축 사례
   - 조회수 22,000+, 북마크 750+

2. "Delta Lake로 데이터 레이크하우스 구축하기" (2023.08)
   - ACID 트랜잭션이 왜 데이터 레이크에 필요한가
   - Time Travel로 데이터 롤백 구현
   - Z-Ordering으로 쿼리 성능 최적화
   - Hive에서 Delta Lake로의 마이그레이션 전략
   - 조회수 16,000+

3. "ML Feature Store 설계 및 구축기" (2023.04)
   - Feature Store가 필요한 이유
   - Feast vs Tecton vs Hopsworks 비교
   - Point-in-time Join의 중요성
   - 온라인/오프라인 일관성 보장 전략
   - 조회수 13,000+

4. "Airflow DAG 300개를 효율적으로 관리하는 법" (2022.11)
   - DAG Factory 패턴으로 보일러플레이트 제거
   - Dynamic DAG Generation 활용
   - Task Group으로 복잡한 파이프라인 구조화
   - 모니터링 및 알림 전략
   - 조회수 9,800+`,
  },
  {
    id: "sd-5-doc-5",
    personaId: "sd-5",
    title: "추천서 — SK텔레콤 데이터팀 리드",
    summary:
      "SK텔레콤 데이터팀 리드가 작성한 추천서. 데이터 파이프라인 설계 능력과 비즈니스 이해도 강조.",
    extractedText: `추천서

추천인: 김태현 (SK텔레콤 AI센터 데이터팀 리드)
대상: 한수연

한수연 엔지니어는 SK텔레콤에서 약 3년간 데이터 엔지니어로 근무하며
AI 추천 시스템의 데이터 인프라를 책임졌습니다.

가장 돋보였던 역량은 기술적 깊이와 비즈니스 이해를 겸비한 문제 해결 능력입니다.
A/B 테스트 플랫폼의 데이터 인프라를 설계할 때, 단순히 데이터 수집에 그치지 않고
통계적 유의성 검증을 자동화하여 기획팀이 스스로 실험 결과를 해석할 수 있는
셀프서비스 환경을 구축했습니다. 이를 통해 A/B 테스트 결과 리포팅 시간을
2일에서 2시간으로 단축했습니다.

또한 실시간 스트리밍 파이프라인(Kafka + Flink) 구축 프로젝트에서는
초당 10만 이벤트를 지연 없이 처리하는 시스템을 설계하면서도,
데이터 유실 제로를 보장하는 exactly-once 처리를 구현한 점이 인상적이었습니다.

팀 내에서도 항상 문서화와 지식 공유를 선도하여,
사내 데이터 엔지니어링 가이드라인을 작성하고 신규 입사자 온보딩에 기여했습니다.

한수연 엔지니어를 진심으로 추천합니다.`,
  },
]

// ===========================================================================
// External Documents
// ===========================================================================

export const EXTERNAL_DOCUMENTS: MockExternalDocument[] = [
  // -------------------------------------------------------------------------
  // sd-1 김철수 (1건: 채용공고)
  // -------------------------------------------------------------------------
  {
    id: "sd-1-ext-1",
    personaId: "sd-1",
    title: "채용공고 — 네이버 클라우드",
    summary:
      "네이버 클라우드 플랫폼 시니어 백엔드 개발자 채용. Kubernetes, MSA 경험 우대.",
    extractedText: `[채용공고] 네이버 클라우드 — 시니어 백엔드 개발자

담당 업무:
- 네이버 클라우드 플랫폼 핵심 서비스 백엔드 개발
- 대규모 트래픽 처리를 위한 MSA 설계 및 구현
- Kubernetes 기반 컨테이너 오케스트레이션
- 내부 개발자 도구 및 CI/CD 파이프라인 개선

자격 요건:
- 백엔드 개발 경력 5년 이상
- Java, Kotlin, Go 중 하나 이상 실무 경험
- RDBMS 및 NoSQL 설계/운영 경험
- 대규모 분산 시스템 경험

우대 사항:
- Kubernetes 운영 경험
- MSA 전환 프로젝트 경험
- 오픈소스 기여 경험
- 클라우드 인프라(AWS/GCP/NCP) 운영 경험`,
  },

  // -------------------------------------------------------------------------
  // sd-2 박준형 (2건: 채용공고, JD 상세)
  // -------------------------------------------------------------------------
  {
    id: "sd-2-ext-1",
    personaId: "sd-2",
    title: "채용공고 — 토스 서버 플랫폼팀",
    summary:
      "토스 서버 플랫폼팀 시니어 백엔드 개발자 채용. Kotlin/Spring, MSA 플랫폼 경험 필수.",
    extractedText: `[채용공고] 토스 — 서버 플랫폼팀 시니어 백엔드 개발자

담당 업무:
- 서버 플랫폼 공통 라이브러리 및 프레임워크 개발
- MSA 플랫폼 인프라 설계 및 구현
- 내부 개발자 생산성 도구 개발
- 서비스 메시(Istio) 운영 및 고도화

자격 요건:
- 백엔드 개발 경력 5년 이상
- Kotlin 또는 Java 실무 경험 3년 이상
- Spring Boot/Spring Cloud 기반 MSA 개발 경험
- 대규모 트랜잭션 시스템 운영 경험

우대 사항:
- 공통 플랫폼/프레임워크 개발 경험
- DDD, Event Sourcing, CQRS 패턴 적용 경험
- Kubernetes 기반 서비스 운영 경험
- 기술 블로그 또는 오픈소스 활동`,
  },
  {
    id: "sd-2-ext-2",
    personaId: "sd-2",
    title: "JD 상세 — 토스 서버 플랫폼팀",
    summary:
      "토스 서버 플랫폼팀 상세 직무 기술서. 팀 문화, 기술 스택, 인터뷰 프로세스 포함.",
    extractedText: `토스 서버 플랫폼팀 상세 직무 기술서

[팀 소개]
서버 플랫폼팀은 토스 전체 서비스의 백엔드 공통 인프라를 담당합니다.
200+ 마이크로서비스가 사용하는 공통 라이브러리, 프레임워크, 플랫폼 도구를
개발하고 운영합니다.

[기술 스택]
- Language: Kotlin (주력), Java
- Framework: Spring Boot 3.x, Spring Cloud
- Database: MySQL, Redis, MongoDB
- Messaging: Kafka, RabbitMQ
- Infra: Kubernetes, Istio, ArgoCD
- Monitoring: Datadog, PagerDuty

[팀 문화]
- 주 1회 기술 공유 세션
- 코드 리뷰 필수 (리뷰어 2명 승인)
- 분기별 Tech Debt Sprint
- 개인 성장 지원 (컨퍼런스 참석, 도서 구매)

[인터뷰 프로세스]
1. 서류 심사
2. 코딩 테스트 (3시간, 알고리즘 + 시스템 설계)
3. 1차 기술 면접 (시스템 설계 심화)
4. 2차 컬쳐핏 면접
5. 처우 협의`,
  },

  // -------------------------------------------------------------------------
  // sd-3 이서진 (2건: 채용공고, 회사소개)
  // -------------------------------------------------------------------------
  {
    id: "sd-3-ext-1",
    personaId: "sd-3",
    title: "채용공고 — AWS Korea SRE",
    summary:
      "AWS Korea Solutions Architecture 팀 시니어 SRE 채용. 글로벌 인프라 운영 경험 필수.",
    extractedText: `[채용공고] AWS Korea — Senior Site Reliability Engineer

담당 업무:
- AWS 한국 리전 핵심 서비스 안정성 보장
- 대규모 분산 시스템 장애 대응 및 근본 원인 분석
- 자동화 도구 개발로 운영 효율성 향상
- 글로벌 SRE 팀과의 협업 및 온콜 대응

자격 요건:
- SRE/DevOps/인프라 엔지니어 경력 7년 이상
- Linux 시스템 깊은 이해 (커널, 네트워크, 스토리지)
- IaC (Terraform/CloudFormation) 실무 경험
- 프로그래밍 언어 1개 이상 능숙 (Go, Python, Java)

우대 사항:
- 대규모 Kubernetes 클러스터 운영 경험 (100+ 노드)
- 글로벌 멀티 리전 인프라 운영 경험
- SLO/SLI 기반 운영 체계 경험
- 오픈소스 기여 또는 특허 보유`,
  },
  {
    id: "sd-3-ext-2",
    personaId: "sd-3",
    title: "회사소개 — AWS Korea",
    summary:
      "AWS Korea 조직 소개. 한국 리전 인프라, 팀 구성, 복지 및 성장 환경 포함.",
    extractedText: `AWS Korea 소개

[조직]
AWS Korea는 서울 리전(ap-northeast-2)을 운영하며,
국내 주요 기업(삼성, SK, 네이버, 카카오 등)에 클라우드 서비스를 제공합니다.
2024년 기준 한국 클라우드 시장 점유율 1위.

[SRE 팀]
- 팀 규모: 15명 (서울 8명 + 글로벌 협업)
- 담당 서비스: EC2, EKS, Lambda, RDS 등 핵심 서비스
- 온콜: 주 1회 (글로벌 팀과 로테이션)
- 장애 대응 SLA: P1 15분 이내 대응

[기술 환경]
- 자체 인프라 자동화 도구 개발
- 내부 CI/CD 파이프라인
- 대규모 분산 시스템 운영 경험

[복지]
- RSU (주식 보상)
- 연간 교육비 지원 ($5,000)
- re:Invent 등 글로벌 컨퍼런스 참석
- 유연근무제 (코어타임 10:00 ~ 16:00)`,
  },

  // -------------------------------------------------------------------------
  // sd-4 장민호 (2건: 채용공고, JD 상세)
  // -------------------------------------------------------------------------
  {
    id: "sd-4-ext-1",
    personaId: "sd-4",
    title: "채용공고 — 당근 프론트엔드 플랫폼팀",
    summary:
      "당근 프론트엔드 플랫폼팀 시니어 개발자 채용. 디자인시스템, DX 도구 경험 우대.",
    extractedText: `[채용공고] 당근 — 프론트엔드 플랫폼팀 시니어 개발자

담당 업무:
- 당근 공통 디자인시스템 개발 및 유지보수
- 프론트엔드 공통 라이브러리 및 CLI 도구 개발
- 빌드/배포 파이프라인 최적화
- 프론트엔드 성능 모니터링 인프라 구축

자격 요건:
- 프론트엔드 개발 경력 5년 이상
- React/TypeScript 실무 경험 3년 이상
- 디자인시스템 또는 공통 컴포넌트 라이브러리 개발 경험
- 웹 성능 최적화 경험

우대 사항:
- 웹 접근성(WCAG) 구현 경험
- Micro Frontend 아키텍처 경험
- Storybook, Chromatic 등 UI 개발 도구 경험
- 오픈소스 기여 경험`,
  },
  {
    id: "sd-4-ext-2",
    personaId: "sd-4",
    title: "JD 상세 — 당근 프론트엔드 플랫폼팀",
    summary:
      "당근 프론트엔드 플랫폼팀 상세 직무 기술서. 팀 미션, 기술 스택, 업무 방식 포함.",
    extractedText: `당근 프론트엔드 플랫폼팀 상세 직무 기술서

[팀 미션]
프론트엔드 플랫폼팀은 당근의 모든 프론트엔드 개발자가
빠르고 일관되게 제품을 만들 수 있도록 돕는 팀입니다.
디자인시스템, 공통 라이브러리, 빌드 인프라, 성능 모니터링 등
개발자 경험(DX)을 혁신하는 것이 핵심 미션입니다.

[기술 스택]
- Framework: React, Next.js
- Language: TypeScript
- Styling: Vanilla Extract, Tailwind CSS
- Testing: Vitest, Playwright, Storybook
- Build: Turborepo, Vite
- CI/CD: GitHub Actions, Vercel

[현재 과제]
- 디자인시스템 v2 리뉴얼 (Headless UI 패턴 전환)
- 모노레포 빌드 최적화 (Turborepo 도입)
- 프론트엔드 성능 자동 모니터링 시스템 구축
- 서버 컴포넌트 도입 가이드라인 수립

[업무 방식]
- 2주 스프린트
- PR 기반 코드 리뷰 (리뷰어 1명 필수)
- 주 1회 기술 공유 (Tech Talk)
- 분기 1회 해커톤`,
  },

  // -------------------------------------------------------------------------
  // sd-5 한수연 (2건: 채용공고, 기술 블로그)
  // -------------------------------------------------------------------------
  {
    id: "sd-5-ext-1",
    personaId: "sd-5",
    title: "채용공고 — 카카오 데이터 플랫폼팀",
    summary:
      "카카오 데이터 플랫폼팀 시니어 데이터 엔지니어 채용. Spark, Airflow, ML 파이프라인 경험 필수.",
    extractedText: `[채용공고] 카카오 — 데이터 플랫폼팀 시니어 데이터 엔지니어

담당 업무:
- 카카오 통합 데이터 플랫폼 설계 및 운영
- 대규모 ETL/ELT 파이프라인 개발
- ML 모델 서빙을 위한 Feature Engineering 인프라 구축
- 데이터 품질 관리 및 거버넌스 체계 수립

자격 요건:
- 데이터 엔지니어링 경력 5년 이상
- Apache Spark 실무 경험 3년 이상
- Airflow 등 워크플로우 오케스트레이션 도구 경험
- SQL 능숙, Python/Scala 실무 경험

우대 사항:
- 일일 10TB 이상 대규모 데이터 처리 경험
- ML 파이프라인 또는 Feature Store 구축 경험
- Delta Lake/Iceberg 등 레이크하우스 경험
- 데이터 품질 자동화 프레임워크 경험`,
  },
  {
    id: "sd-5-ext-2",
    personaId: "sd-5",
    title: "기술 블로그 — 카카오 데이터 플랫폼 소개",
    summary:
      "카카오 데이터 플랫폼팀 기술 블로그. 팀 아키텍처, 기술 스택, 도전 과제 소개.",
    extractedText: `카카오 데이터 플랫폼 — 기술 블로그

[팀 소개]
카카오 데이터 플랫폼팀은 카카오톡, 카카오맵, 카카오페이 등
카카오 전 서비스의 데이터를 통합 관리하는 중앙 데이터 조직입니다.

[규모]
- 일일 데이터 처리량: 80TB+
- Airflow DAG: 500+
- 데이터 테이블: 15,000+
- 데이터 사용자: 사내 1,000명+

[기술 아키텍처]
- 수집: Kafka (초당 50만 이벤트)
- 처리: Spark on Kubernetes (노드 200+)
- 저장: S3 + Delta Lake (총 15PB)
- 서빙: Presto + Trino (ad-hoc 쿼리)
- 오케스트레이션: Airflow 2.x
- 카탈로그: 자체 개발 데이터 카탈로그

[현재 도전 과제]
- Hive → Iceberg 마이그레이션
- 실시간 Feature Store 구축
- 데이터 메시(Data Mesh) 도입 검토
- 비용 최적화 (Spot Instance 활용)`,
  },
]

// ===========================================================================
// Career Notes
// ===========================================================================

export const CAREER_NOTES: MockCareerNote[] = [
  // -------------------------------------------------------------------------
  // sd-1 김철수 (5건) — 기존 note-1~5 마이그레이션
  // -------------------------------------------------------------------------
  {
    id: "sd-1-note-1",
    personaId: "sd-1",
    title: "SaaS 플랫폼 성능 최적화 경험",
    summary:
      "React 렌더링 최적화로 LCP 40% 개선. 코드 스플리팅, 메모이제이션 적용.",
    content: `테크스타트에서 SaaS 플랫폼의 성능 이슈를 해결한 경험.

문제: 대시보드 페이지 LCP가 4.2초로 사용자 이탈률 높음
원인 분석: 불필요한 리렌더링 + 번들 사이즈 과대
해결:
- React.memo + useMemo로 렌더링 최적화
- dynamic import로 코드 스플리팅 (번들 60% 감소)
- 이미지 lazy loading + WebP 변환
결과: LCP 4.2초 → 2.5초 (40% 개선), 이탈률 25% 감소`,
    metadata: { company: "테크스타트", period: "2023.06" },
  },
  {
    id: "sd-1-note-2",
    personaId: "sd-1",
    title: "결제 시스템 장애 대응",
    summary: "PG사 장애 시 폴백 결제 시스템 구축. 다운타임 0 달성.",
    content: `코드랩에서 결제 시스템 장애 대응 체계를 구축한 경험.

상황: 주 PG사(KG이니시스) 장애로 2시간 결제 불가 → 매출 손실 약 500만원
대응:
- 보조 PG사(토스페이먼츠) 연동으로 폴백 시스템 구축
- Circuit Breaker 패턴 적용 (5초 내 3회 실패 시 자동 전환)
- 실시간 모니터링 대시보드 (Grafana + Prometheus)
결과: 이후 PG사 장애 3회 발생했으나 다운타임 0초 유지`,
    metadata: { company: "코드랩", period: "2020.11" },
  },
  {
    id: "sd-1-note-3",
    personaId: "sd-1",
    title: "Kafka 기반 이벤트 드리븐 아키텍처 도입",
    summary:
      "모놀리식 → 이벤트 드리븐 전환. 일일 500만 이벤트 처리. 서비스 간 결합도 감소.",
    content: `테크스타트에서 모놀리식 아키텍처를 이벤트 드리븐으로 전환한 경험.

배경: 서비스 성장으로 단일 DB의 병목 발생, 기능 간 강결합으로 배포 속도 저하
해결:
- Apache Kafka 도입, 토픽 설계 (도메인 이벤트 기반)
- Consumer Group으로 서비스별 독립 처리
- Dead Letter Queue로 실패 이벤트 관리
- Schema Registry로 이벤트 스키마 버전 관리
결과: 일일 500만 이벤트 안정 처리, 배포 주기 2주 → 3일로 단축`,
    metadata: { company: "테크스타트", period: "2022.09" },
  },
  {
    id: "sd-1-note-4",
    personaId: "sd-1",
    title: "GitOps 기반 배포 자동화",
    summary:
      "ArgoCD + Helm 기반 GitOps. 12개 서비스 통합 관리. 배포 시간 25분→8분.",
    content: `테크스타트에서 수동 배포를 GitOps 기반으로 전환한 경험.

문제: kubectl apply 수동 실행, 환경별 설정 불일치, 롤백 시 혼란
해결:
- ArgoCD 도입으로 Git 커밋 = 배포 자동 트리거
- Helm chart 표준 템플릿 작성 (12개 마이크로서비스 통합)
- 환경별 values 파일 분리 (dev/staging/prod)
- 자동 롤백 정책 (health check 실패 시)
결과: 배포 시간 25분 → 8분, 배포 실패율 15% → 2%`,
    metadata: { company: "테크스타트", period: "2022.03" },
  },
  {
    id: "sd-1-note-5",
    personaId: "sd-1",
    title: "DB 쿼리 최적화 프로젝트",
    summary:
      "느린 쿼리 모니터링 도구 자체 개발. 주요 API 응답시간 40% 개선.",
    content: `코드랩에서 데이터베이스 성능 최적화를 수행한 경험.

문제: 주문 조회 API 응답 시간이 피크 시 3초 이상, 고객 불만 증가
분석:
- pg_stat_statements로 느린 쿼리 Top 20 추출
- EXPLAIN ANALYZE로 실행 계획 분석
- 불필요한 Seq Scan, 누락된 인덱스 발견
해결:
- 복합 인덱스 추가 (주문 테이블 user_id + created_at)
- N+1 쿼리 제거 (JOIN으로 전환)
- 커넥션 풀 최적화 (pgBouncer 도입)
- 느린 쿼리 자동 알림 도구 자체 개발 (Go)
결과: 주문 조회 API 응답 시간 3초 → 180ms (94% 개선)`,
    metadata: { company: "코드랩", period: "2020.06" },
  },

  // -------------------------------------------------------------------------
  // sd-2 박준형 (4건)
  // -------------------------------------------------------------------------
  {
    id: "sd-2-note-1",
    personaId: "sd-2",
    title: "모놀리스→MSA 전환 의사결정 과정",
    summary:
      "쿠팡 주문 도메인 MSA 전환 시 겪은 기술적 의사결정. Saga vs 2PC, 이벤트 소싱 도입 근거.",
    content: `쿠팡에서 주문 도메인 MSA 전환을 리드하며 겪은 의사결정 과정.

배경: 모놀리스의 배포 병목 (월 1회 릴리스), 장애 전파 빈발
핵심 의사결정:
1. 분산 트랜잭션: 2PC vs Saga
   - 2PC는 가용성 저하 위험 → Saga(Orchestration) 선택
   - Saga 오케스트레이터를 별도 서비스로 분리하여 단일 장애점 방지
2. 데이터 일관성: 강일관성 vs 최종 일관성
   - 결제 도메인만 강일관성 유지 (Outbox Pattern)
   - 나머지 도메인은 최종 일관성 허용 (이벤트 소싱)
3. 서비스 분리 기준: 기능별 vs 도메인별
   - DDD Bounded Context 기준으로 분리
   - Context Map으로 팀 간 의존 관계 명시화
교훈: "Big Bang 전환"은 위험. Strangler Fig 패턴으로 점진적 전환이 핵심`,
    metadata: { company: "쿠팡", period: "2023.03" },
  },
  {
    id: "sd-2-note-2",
    personaId: "sd-2",
    title: "결제 시스템 Idempotency 설계",
    summary:
      "중복 결제 방지를 위한 Idempotency Key 패턴 설계. Redis + DB 이중 검증 전략.",
    content: `쿠팡 결제 시스템에서 Idempotency를 설계한 경험.

문제: 네트워크 지연으로 인한 중복 결제 요청 (월 평균 2,000건 발생)
해결:
- Idempotency Key: 클라이언트 생성 UUID, 요청 헤더에 포함
- Redis에 키 저장 (TTL 24시간), 중복 요청 즉시 차단
- DB에 최종 결과 저장, 서버 재시작 시 Redis 복구
- 분산 환경 고려: Redlock으로 동시성 제어
결과: 중복 결제 건수 월 2,000건 → 0건, 결제 성공률 99.8%
교훈: Idempotency는 네트워크 레벨의 문제이므로 클라이언트-서버 협업이 필수`,
    metadata: { company: "쿠팡", period: "2022.09" },
  },
  {
    id: "sd-2-note-3",
    personaId: "sd-2",
    title: "Chaos Engineering 도입기",
    summary:
      "Litmus Chaos를 활용한 장애 주입 실험. MTTR 2시간→20분. P0 장애 분기 5건→1건.",
    content: `쿠팡에서 Chaos Engineering을 도입한 경험.

배경: 분기 평균 P0 장애 5건, 대부분 예측 가능했던 장애 시나리오
도입 과정:
1. 경영진 설득: "장애를 의도적으로 발생시키는 것"에 대한 거부감 해소
   - Netflix Chaos Monkey 사례 제시
   - 스테이징 환경에서 먼저 시작, 점진적으로 프로덕션 확대
2. 도구 선택: Litmus Chaos (K8s 네이티브, CNCF 프로젝트)
3. 장애 시나리오: 네트워크 파티션, Pod 삭제, CPU 스트레스, 디스크 풀 등
4. 게임데이: 주 1회 정기 장애 주입 실험
결과: MTTR 2시간 → 20분, P0 장애 분기 5건 → 1건
교훈: "장애는 반드시 발생한다. 대비가 피해를 줄인다"`,
    metadata: { company: "쿠팡", period: "2022.03" },
  },
  {
    id: "sd-2-note-4",
    personaId: "sd-2",
    title: "금융 시스템 레거시 전환 경험",
    summary:
      "LG CNS에서 EJB→Spring Boot 전환. 증권 거래 시스템 리팩토링. 초당 3,000건 처리 유지.",
    content: `LG CNS에서 증권 거래 시스템 레거시를 전환한 경험.

상황: 10년 된 EJB 기반 증권 거래 시스템, 유지보수 난이도 극심
제약 사항:
- 24x365 무중단 요구사항 (증권 거래 시간 외에도 해외 주식 처리)
- 초당 3,000건 트랜잭션 처리 성능 유지 필수
- 금감원 규정 준수 (데이터 보존, 감사 로그)
전환 전략:
- Strangler Fig: API Gateway 뒤에서 신규/레거시 병행 운영
- 기능별 점진적 전환 (로그인 → 잔고 조회 → 주문 → 체결)
- 성능 회귀 테스트 자동화 (nGrinder로 부하 테스트)
결과: 18개월에 걸쳐 전체 전환 완료, 다운타임 0초
교훈: 레거시 전환의 핵심은 "속도"가 아니라 "안정성"`,
    metadata: { company: "LG CNS", period: "2020.06" },
  },

  // -------------------------------------------------------------------------
  // sd-3 이서진 (6건)
  // -------------------------------------------------------------------------
  {
    id: "sd-3-note-1",
    personaId: "sd-3",
    title: "IDC→AWS 멀티 리전 마이그레이션",
    summary:
      "라인 글로벌 서비스 IDC에서 AWS 8개 리전으로 마이그레이션. 서비스 중단 0초, 비용 12억 절감.",
    content: `라인플러스에서 글로벌 인프라를 IDC에서 AWS로 마이그레이션한 경험.

규모: 서버 500대 이상, 8개 국가, 일일 트래픽 10억 요청
핵심 과제:
1. Zero-Downtime: DNS 기반 트래픽 점진적 전환 (Route53 가중 라우팅)
2. 데이터 동기화: DMS + CDC로 실시간 데이터 복제
3. 지연시간 최적화: Global Accelerator + CloudFront 조합
4. IaC 전환: 전체 인프라를 Terraform 모듈로 정의 (120+ 모듈)
5. 비용 최적화: Reserved Instance + Spot Instance 조합
결과: 서비스 중단 0초, 인프라 비용 연간 12억원 절감, 글로벌 지연시간 40% 감소
교훈: 마이그레이션 성공의 핵심은 "롤백 계획". 모든 단계에 롤백 시나리오 준비 필수`,
    metadata: { company: "라인플러스", period: "2023.06" },
  },
  {
    id: "sd-3-note-2",
    personaId: "sd-3",
    title: "SLO/SLI 체계 수립과 에러 버짓",
    summary:
      "라인 핵심 서비스 45개 대상 SLO/SLI 정의. 에러 버짓 기반 배포 정책으로 가용성 99.99% 달성.",
    content: `라인플러스에서 SRE 체계를 수립한 경험.

배경: "가용성 100%를 목표로" → 비현실적. 개발 속도와 안정성의 트레이드오프 필요
SLO/SLI 설계:
- SLI: 요청 성공률, 지연시간(p99), 에러율
- SLO: 핵심 서비스 99.99% (월 다운타임 4.3분 허용)
- 에러 버짓: SLO와의 차이 = 혁신에 투자할 수 있는 여유
배포 정책 적용:
- 에러 버짓 50% 이상 남음: 자유 배포
- 에러 버짓 50% 미만: 배포 승인 필요
- 에러 버짓 소진: 배포 동결, 안정화 집중
결과: 서비스 가용성 99.95% → 99.99%, 포스트모템 문화 정착
교훈: SLO는 "기술 지표"가 아니라 "비즈니스 약속". PM/기획자도 함께 정의해야 함`,
    metadata: { company: "라인플러스", period: "2022.06" },
  },
  {
    id: "sd-3-note-3",
    personaId: "sd-3",
    title: "Kubernetes Custom Controller 개발 (특허 기반)",
    summary:
      "장애 패턴 학습 + 자동 복구 Custom Controller 개발. 자동 복구 92%, 야간 호출 80% 감소.",
    content: `라인플러스에서 Kubernetes Custom Controller를 개발한 경험 (특허 출원).

동기: 기본 K8s self-healing은 단순 재시작만 지원, 복합 장애 대응 불가
설계:
1. 장애 패턴 분류 엔진
   - 과거 인시던트 200건 분석 → 12가지 장애 유형 도출
   - 메트릭 패턴 매칭으로 실시간 분류
2. 복구 전략 선택기
   - 유형별 최적 복구 전략 매핑 (재시작, 롤백, 노드 교체, 트래픽 우회)
   - Canary 복구: 일부 Pod만 먼저 복구 후 전체 적용
3. 예측 스케일링
   - 장애 선행 지표(메모리 증가 추세, 에러율 상승) 모니터링
   - 임계치 도달 전 사전 스케일 아웃
구현: Go로 Kubernetes Operator SDK 기반 개발, CRD 정의
결과: 자동 복구 성공률 92%, 야간 호출 80% 감소
교훈: 자동화의 핵심은 "판단 로직". 무조건 재시작이 아닌 상황별 최적 대응이 중요`,
    metadata: { company: "라인플러스", period: "2021.12" },
  },
  {
    id: "sd-3-note-4",
    personaId: "sd-3",
    title: "카카오톡 Kubernetes 전환 프로젝트",
    summary:
      "MAU 4,700만 카카오톡 인프라를 K8s로 전환. 노드 300대 규모 클러스터 운영.",
    content: `카카오에서 카카오톡 인프라를 Kubernetes로 전환한 경험.

규모: MAU 4,700만, 동시 접속 500만, 일일 메시지 100억건
핵심 과제:
1. 안정성: 카카오톡은 "국민 앱" — 장애 = 사회적 이슈
   - Blue-Green 배포로 무중단 전환
   - 카나리 배포로 점진적 트래픽 이동 (1% → 10% → 50% → 100%)
2. 성능: 기존 VM 대비 동등 이상 성능 보장
   - CPU Pinning, NUMA 최적화
   - Network Policy로 서비스 간 통신 지연 최소화
3. 자체 CI/CD 플랫폼 "Kargo" 개발
   - 배포 요청 → 빌드 → 테스트 → 배포 → 모니터링 일관된 파이프라인
   - 개발팀 200명+ 사용, 일일 배포 50건+ 처리
결과: 전환 완료 후 인프라 비용 30% 절감, 배포 시간 60% 단축
교훈: 대규모 인프라 전환은 "기술"보다 "조직 합의"가 중요. 모든 팀의 참여 필요`,
    metadata: { company: "카카오", period: "2020.03" },
  },
  {
    id: "sd-3-note-5",
    personaId: "sd-3",
    title: "AWS 비용 최적화 프로젝트",
    summary:
      "넥슨 게임 서버 AWS 비용 연간 3억원 절감. RI/Spot 조합, 인스턴스 Right-sizing.",
    content: `넥슨에서 AWS 비용을 최적화한 경험.

상황: 월 AWS 비용 5억원, 연간 60억원 규모. 경영진의 비용 절감 요구
분석:
- AWS Cost Explorer + 자체 분석 도구로 비용 구조 파악
- 미사용 리소스: 꺼진 EC2 인스턴스 120대, 빈 S3 버킷 50개
- Over-provisioning: 평균 CPU 사용률 15%인 인스턴스 다수
최적화:
1. Right-sizing: CloudWatch 메트릭 기반 인스턴스 타입 재조정 (40% 다운사이징)
2. Reserved Instance: 안정적 워크로드에 1년 RI 적용 (35% 할인)
3. Spot Instance: 게임 테스트 서버, CI/CD에 Spot 적용 (70% 할인)
4. 미사용 리소스 정리: 자동 탐지 + 알림 시스템 구축
5. 비용 모니터링 봇: Slack으로 일일 비용 리포트 + 이상 탐지 알림
결과: 연간 3억원 절감 (5%), 비용 인식 문화 정착
교훈: 비용 최적화는 일회성이 아닌 "문화". 지속적 모니터링과 인식 전환이 핵심`,
    metadata: { company: "넥슨", period: "2017.09" },
  },
  {
    id: "sd-3-note-6",
    personaId: "sd-3",
    title: "오픈소스 kube-guardian 개발기",
    summary:
      "K8s 보안 감사 오픈소스 도구 개발. GitHub Stars 1,200+, CNCF Landscape 등재.",
    content: `오픈소스 프로젝트 kube-guardian을 개발한 경험.

동기: K8s 보안 점검을 수동으로 하다 보니 누락되는 항목 다수
기획:
- CIS Kubernetes Benchmark를 기반으로 자동 점검 도구 개발
- 단순 점검을 넘어 RBAC 권한 분석, 네트워크 정책 검증까지
개발:
- Go로 개발, cobra CLI 프레임워크 사용
- Kubernetes API를 통한 리소스 스캔
- HTML/JSON 리포트 자동 생성
- GitHub Actions CI/CD, GoReleaser로 멀티 플랫폼 배포
성장:
- 첫 릴리스 (2023.03): 50개 점검 항목
- v0.5 (2023.07): 100개 항목 + RBAC 분석 추가
- v1.0 (2023.11): 150개 항목 + 네트워크 정책 + GUI 대시보드
- CNCF Landscape "Security & Compliance" 카테고리 등재 (2024.01)
현재: GitHub Stars 1,200+, Contributors 28명, 기업 사용자 50+
교훈: 오픈소스 성공의 핵심은 "문서화". README, 기여 가이드, 사용 사례가 관건`,
    metadata: { company: "개인", period: "2023.03" },
  },

  // -------------------------------------------------------------------------
  // sd-4 장민호 (5건)
  // -------------------------------------------------------------------------
  {
    id: "sd-4-note-1",
    personaId: "sd-4",
    title: "디자인시스템 TDS v3 리뉴얼 과정",
    summary:
      "Headless UI 패턴 도입, 접근성 WCAG 2.1 AA 준수. 디자인-개발 핸드오프 60% 단축.",
    content: `토스에서 디자인시스템 TDS를 v3로 리뉴얼한 경험.

문제:
- TDS v2의 스타일 커스터마이징 한계 (Prop drilling 과다)
- 접근성 점수 72점 (WCAG 2.1 AA 미달)
- 디자이너와 개발자 간 커뮤니케이션 비용 높음
해결:
1. Headless UI 패턴 도입
   - 로직(접근성, 키보드 내비게이션)과 스타일 완전 분리
   - Compound Component로 유연한 조합 지원
   - Render Props로 완전한 스타일 커스터마이징 허용
2. 접근성 강화
   - WAI-ARIA 패턴 전면 적용
   - 키보드 내비게이션 표준화
   - 스크린 리더 테스트 자동화 (axe-core + Playwright)
3. 개발 경험 개선
   - Storybook + Chromatic으로 Visual Regression Test
   - 자동 생성 API 문서 (TypeDoc)
결과: 접근성 점수 72 → 96, 핸드오프 시간 60% 단축, 사내 100+ 프로젝트 적용
교훈: 디자인시스템은 "컴포넌트 모음"이 아닌 "언어". 디자이너와 함께 설계해야 함`,
    metadata: { company: "토스", period: "2023.09" },
  },
  {
    id: "sd-4-note-2",
    personaId: "sd-4",
    title: "Core Web Vitals 최적화 실전",
    summary:
      "토스 웹 서비스 LCP 3.8초→1.2초, CLS 0.25→0.05, Lighthouse 62→94.",
    content: `토스에서 웹 성능을 대폭 개선한 경험.

상황: 토스 주요 웹 서비스의 Core Web Vitals 지표가 "Poor" 등급
측정 결과 (Before):
- LCP: 3.8초 (목표: 2.5초 이하)
- FID: 180ms (목표: 100ms 이하)
- CLS: 0.25 (목표: 0.1 이하)
- Lighthouse 점수: 62점
최적화:
1. LCP 개선
   - Hero Image에 priority + preload 적용
   - React Server Components로 서버사이드 렌더링 범위 확대
   - 폰트 서브셋 + preconnect 적용
2. FID/INP 개선
   - Long Task 분석 후 코드 스플리팅
   - Web Worker로 무거운 계산 오프로드
   - React 18 Concurrent Features 활용 (useTransition)
3. CLS 개선
   - 이미지 aspect-ratio 명시
   - 폰트 swap: 'optional' 적용
   - 동적 콘텐츠에 skeleton UI 통일
결과 (After): LCP 1.2초, FID 45ms, CLS 0.05, Lighthouse 94점
교훈: 성능은 "측정 → 분석 → 개선 → 측정"의 반복. RUM 데이터가 랩 데이터보다 중요`,
    metadata: { company: "토스", period: "2023.03" },
  },
  {
    id: "sd-4-note-3",
    personaId: "sd-4",
    title: "Micro Frontend 아키텍처 도입",
    summary:
      "배민 사장님 대시보드를 Module Federation 기반 MFE로 전환. 5개 팀 독립 배포, 빌드 12분→3분.",
    content: `배달의민족에서 Micro Frontend 아키텍처를 도입한 경험.

배경: 사장님 대시보드에 5개 팀이 기여하는데, 단일 레포의 빌드 시간 12분, 배포 충돌 빈발
선택지 분석:
1. Monorepo + 코드오너십: 빌드 병목 해결 안됨
2. npm 패키지 분리: 버전 관리 복잡, 배포 의존성 여전
3. Module Federation: 런타임 통합, 독립 배포 가능 → 선택
구현:
- Webpack 5 Module Federation으로 5개 리모트 앱 구성
- Shell App: 라우팅 + 인증 + 글로벌 상태 관리
- Shared Dependencies: React, React Router, 디자인시스템 공유
- 공유 상태: Custom Events + React Context 조합
- CSS 격리: CSS Modules + BEM 네이밍 컨벤션
점진적 전환:
- Phase 1: 매출 분석 모듈 분리 (1개월)
- Phase 2: 주문 관리, 메뉴 관리 분리 (2개월)
- Phase 3: 리뷰 관리, 정산 관리 분리 (2개월)
결과: 팀별 독립 배포 가능, 빌드 12분 → 3분, 배포 충돌 0건
교훈: MFE는 "기술"보다 "조직 구조"에 맞출 때 효과적. Conway's Law 실체험`,
    metadata: { company: "우아한형제들", period: "2022.06" },
  },
  {
    id: "sd-4-note-4",
    personaId: "sd-4",
    title: "Vue→React 대규모 마이그레이션",
    summary:
      "배민 사장님 사이트 Vue.js→React 전환. 6개월간 점진적 마이그레이션. 개발 생산성 40% 향상.",
    content: `배달의민족에서 사장님 사이트를 Vue.js에서 React로 전환한 경험.

배경: 채용 시장에서 Vue.js 개발자 수급 어려움, 사내 표준(React)과의 불일치
제약:
- 서비스 중단 불가 (사장님들의 매일 사용하는 필수 도구)
- 6개월 내 전환 완료 목표
- 기존 Vue 개발자 3명의 React 전환 교육도 병행
전략:
1. Wrapper Component: Vue 컴포넌트를 React에서 사용 가능하게 래핑
2. 페이지 단위 전환: 트래픽 낮은 페이지부터 시작
3. 공통 로직 추출: Composables → Custom Hooks로 1:1 매핑
4. 상태 관리: Vuex → React Query + Zustand (기존 스토어 구조 유지)
진행:
- Month 1-2: 설정 페이지, 알림 관리 (트래픽 적은 페이지)
- Month 3-4: 메뉴 관리, 리뷰 관리 (중간 복잡도)
- Month 5-6: 주문 관리, 매출 대시보드 (핵심 페이지)
결과: 6개월 내 100% 전환 완료, 서비스 중단 0건, 개발 생산성 40% 향상
교훈: 프레임워크 전환은 "기술 부채 청산"의 기회. 단순 변환이 아닌 구조 개선을 병행해야 함`,
    metadata: { company: "우아한형제들", period: "2020.01" },
  },
  {
    id: "sd-4-note-5",
    personaId: "sd-4",
    title: "오픈소스 react-a11y-kit 개발기",
    summary:
      "접근성 우선 React 컴포넌트 라이브러리. GitHub Stars 920+, npm 주간 3,500+ 다운로드.",
    content: `오픈소스 프로젝트 react-a11y-kit을 개발한 경험.

동기: 기존 UI 라이브러리들이 접근성을 "옵션"으로 취급하는 문제
- 디자인시스템 업무를 하며 접근성의 중요성을 체감
- Headless UI 패턴의 가능성을 TDS 리뉴얼에서 확인
설계 원칙:
1. Accessibility First: 접근성이 기본, 스타일은 선택
2. Headless: 로직만 제공, 스타일은 사용자 자유
3. Composable: 작은 단위의 조합으로 복잡한 UI 구성
4. Tested: 모든 컴포넌트 axe-core + 스크린 리더 테스트
컴포넌트:
- Dialog, Dropdown, Tabs, Accordion, Toast, Tooltip 등 15개
- 각 컴포넌트 WAI-ARIA 패턴 완전 준수
- 키보드 내비게이션, 포커스 트랩 내장
커뮤니티:
- FEConf 2023 발표: "접근성 있는 컴포넌트, 어렵지 않습니다"
- GitHub Stars 920+, npm 주간 다운로드 3,500+
- 기업 사용자 15+, Contributors 12명
교훈: 접근성은 "추가 기능"이 아닌 "기본 품질". 처음부터 고려하면 비용이 적음`,
    metadata: { company: "개인", period: "2023.06" },
  },

  // -------------------------------------------------------------------------
  // sd-5 한수연 (4건)
  // -------------------------------------------------------------------------
  {
    id: "sd-5-note-1",
    personaId: "sd-5",
    title: "검색 데이터 플랫폼 리아키텍처링",
    summary:
      "Hadoop MapReduce→Spark+Delta Lake 전환. 일일 50TB, 300+ 파이프라인. 처리 시간 60%, 비용 40% 절감.",
    content: `네이버에서 검색 데이터 플랫폼을 리아키텍처링한 경험.

상황: 5년 된 Hadoop MapReduce 기반 플랫폼의 한계
- ETL 처리 시간 증가 (SLA 위반 월 5건)
- 스키마 변경 시 전체 파이프라인 재배포 필요
- 데이터 리니지 추적 불가
전환 전략:
1. 엔진: MapReduce → Spark 3.x
   - AQE로 자동 최적화
   - Delta Lake로 ACID 트랜잭션 보장
2. 파이프라인 마이그레이션:
   - 300+ DAG를 3단계로 나눠 점진적 전환
   - 신규 파이프라인은 Spark + Delta Lake로만 개발
   - 기존 파이프라인은 우선순위 기반 전환 (데이터 SLA 높은 것부터)
3. 데이터 카탈로그:
   - Apache Atlas 기반 메타데이터 관리
   - 컬럼 레벨 리니지 트래킹 자체 개발
   - 데이터 검색 UI (React + Elasticsearch)
결과: ETL 처리 시간 60% 단축, 스토리지 비용 40% 절감, SLA 위반 0건
교훈: 데이터 플랫폼 전환의 핵심은 "데이터 품질 보장". 전환 중 데이터 불일치가 가장 큰 위험`,
    metadata: { company: "네이버", period: "2023.09" },
  },
  {
    id: "sd-5-note-2",
    personaId: "sd-5",
    title: "ML Feature Store 구축기",
    summary:
      "Feast 기반 Feature Store. 온라인(Redis)+오프라인(Delta Lake). 피처 재사용률 70%, ML 개발 주기 4주→1주.",
    content: `네이버에서 ML Feature Store를 구축한 경험.

배경: ML 팀마다 피처를 중복 개발, 학습/서빙 피처 불일치로 모델 성능 저하
요구사항:
- 피처 중앙 관리 및 재사용
- 온라인(실시간 서빙) + 오프라인(학습) 일관성
- Point-in-time Join (특정 시점의 피처 값 정확히 조회)
- 피처 버전 관리
설계:
1. 저장소:
   - 오프라인: Delta Lake (대규모 배치 처리에 최적)
   - 온라인: Redis Cluster (p99 지연시간 5ms 이하)
2. 파이프라인:
   - Airflow로 오프라인 → 온라인 동기화 (15분 주기)
   - Spark Streaming으로 실시간 피처 계산
3. SDK:
   - Python SDK: ML 엔지니어가 피처 정의, 등록, 조회
   - REST API: 서빙 시스템에서 온라인 피처 조회
결과: 피처 재사용률 70%, ML 개발 주기 4주 → 1주, 모델 정확도 평균 5% 향상
교훈: Feature Store 성공의 핵심은 "사용성". ML 엔지니어의 워크플로우에 자연스럽게 통합되어야 함`,
    metadata: { company: "네이버", period: "2022.12" },
  },
  {
    id: "sd-5-note-3",
    personaId: "sd-5",
    title: "실시간 스트리밍 파이프라인 구축",
    summary:
      "SK텔레콤 AI 추천 시스템의 Kafka+Flink 실시간 파이프라인. 초당 10만 이벤트, exactly-once 보장.",
    content: `SK텔레콤에서 실시간 스트리밍 파이프라인을 구축한 경험.

배경: 추천 모델의 실시간 피드백 반영 필요 (배치 → 실시간 전환)
규모: 초당 10만 이벤트, 일일 80억 이벤트
설계:
1. 수집: Kafka (파티션 120개, 3x 복제)
   - Avro + Schema Registry로 스키마 관리
   - Dead Letter Queue로 불량 이벤트 격리
2. 처리: Apache Flink
   - Windowed Aggregation (1분/5분/1시간 윈도우)
   - State Backend: RocksDB (체크포인트 10초 주기)
   - Exactly-once 보장: Kafka 트랜잭션 + Flink 체크포인트
3. 서빙: Redis + ClickHouse
   - 실시간 피처: Redis (p99 3ms)
   - 분석용: ClickHouse (실시간 집계 쿼리)
운영:
- Flink 클러스터 모니터링 (Prometheus + Grafana)
- 백프레셔 감지 및 자동 스케일링
- 장애 시 체크포인트 기반 자동 복구
결과: 추천 정확도 12% 향상, 실시간 피드백 반영 지연시간 1분 이내
교훈: 실시간 시스템의 핵심은 "정확성". 속도보다 데이터 유실 제로가 더 중요`,
    metadata: { company: "SK텔레콤", period: "2020.06" },
  },
  {
    id: "sd-5-note-4",
    personaId: "sd-5",
    title: "데이터 품질 자동화 프레임워크",
    summary:
      "Great Expectations 기반 데이터 검증. 이상 탐지 자동화. 데이터 사고 85% 감소, 탐지 시간 4시간→15분.",
    content: `네이버에서 데이터 품질 자동화 프레임워크를 개발한 경험.

문제: 데이터 사고가 ML 모델 성능 저하로 이어지는 빈도 증가
- 상류 데이터 스키마 변경 미통보
- NULL 비율 급증 (외부 API 장애)
- 중복 데이터 유입 (파이프라인 재실행 시)
해결:
1. 검증 규칙 엔진 (Great Expectations 기반)
   - 스키마 검증: 컬럼 타입, nullable, 허용 값 범위
   - 통계 검증: NULL 비율, 고유값 수, 분포 이상
   - 비즈니스 규칙: 날짜 범위, 외래 키 참조 무결성
2. 이상 탐지 자동화
   - 이동 평균 기반 통계적 이상치 감지
   - 데이터 볼륨 급변 탐지 (전일 대비 ±30% 초과 시 알림)
   - Slack + PagerDuty 연동 자동 알림
3. 대시보드
   - 데이터 SLA 모니터링 (도착 시간, 완전성, 정확성)
   - 테이블별 품질 점수 트래킹
   - 데이터 사고 이력 관리
결과: 데이터 사고 발생률 85% 감소, 탐지 시간 4시간 → 15분
교훈: 데이터 품질은 "방어 비용"이 "복구 비용"보다 항상 저렴함`,
    metadata: { company: "네이버", period: "2022.05" },
  },
]

// ===========================================================================
// Conversation Styles
// ===========================================================================

export const CONV_STYLES: Record<string, Record<string, ConvMessage[]>> = {
  // -------------------------------------------------------------------------
  // sd-1 김철수 — 기존 mock-data.ts CONV_STYLES 마이그레이션
  // -------------------------------------------------------------------------
  "sd-1": {
    polite: [
      { role: "user", content: "안녕하세요, 네이버 클라우드 지원하려고 합니다." },
      { role: "assistant", content: "네, 네이버 클라우드 시니어 백엔드 개발자 포지션에 지원하시는군요! 채용공고와 참고자료를 확인해보겠습니다. 어떤 부분의 자기소개서를 먼저 작성할까요?" },
      { role: "user", content: "일단 전체적인 구조를 잡아주세요. 어떤 항목을 넣으면 좋을지 추천해주세요." },
      { role: "assistant", content: "네이버 클라우드 채용공고를 보면 Kubernetes, MSA, 대규모 분산 시스템, 오픈소스 기여를 중시합니다. 다음 구조를 추천드립니다:\n\n1. 지원 동기\n2. 핵심 역량\n3. 프로젝트 경험\n4. 성장 가능성\n\n어떤 항목부터 시작할까요?" },
      { role: "user", content: "좋네요. 2번 핵심 역량부터 시작하죠. 제 Kubernetes 경험을 중심으로 써주세요." },
      { role: "assistant", content: "Kubernetes 관련 경험을 정리해보겠습니다. deploy-ez에서 Docker + Kubernetes 자동 배포 경험, 경력기술서에 ArgoCD 기반 GitOps 파이프라인 경험이 있으시네요." },
      { role: "user", content: "네, deploy-ez 프로젝트에서의 Kubernetes 경험과 회사에서의 경험을 합쳐서 하나의 스토리로 만들어주세요." },
      { role: "assistant", content: "좋습니다. deploy-ez 오픈소스에서 시작된 K8s 자동화가 회사에서 12개 서비스 GitOps로 이어진 스토리로 작성하겠습니다." },
      { role: "user", content: "그리고 블로그에 Kubernetes 관련 글도 썼었는데 그것도 반영해주세요. 제 프로젝트 경험 중에서 네이버 클라우드에 어필할 수 있는 부분을 뽑아주세요. 특히 deploy-ez 프로젝트와 관련해서요." },
    ],
    terse: [
      { role: "user", content: "네이버 클라우드 자소서" },
      { role: "assistant", content: "네이버 클라우드 시니어 백엔드 개발자 포지션 자기소개서를 작성해드리겠습니다. 어떤 부분부터 시작할까요?" },
      { role: "user", content: "그냥 알아서 써줘" },
      { role: "assistant", content: "참고자료를 확인해서 전체 구조를 잡겠습니다. 지원 동기, 핵심 역량, 프로젝트 경험 순서로 작성하겠습니다." },
      { role: "user", content: "쿠버네티스 위주로" },
      { role: "assistant", content: "Kubernetes 경험을 중심으로 작성하겠습니다. deploy-ez와 회사 경험이 관련되어 있네요." },
      { role: "user", content: "deploy-ez 그거 어필되게 해줘" },
    ],
    jumpy: [
      { role: "user", content: "네이버 클라우드 지원할건데 자소서 좀 도와주세요" },
      { role: "assistant", content: "네, 네이버 클라우드 시니어 백엔드 개발자 자기소개서를 도와드리겠습니다. 어떤 부분부터 할까요?" },
      { role: "user", content: "아 잠깐 그전에 내 이력서 내용 맞는지 확인해줘" },
      { role: "assistant", content: "이력서를 확인해보겠습니다. 테크스타트 시니어 개발자(2021~현재), 코드랩 주니어 개발자(2019~2021)로 되어 있습니다. 수정할 부분이 있나요?" },
      { role: "user", content: "ㅇㅇ 맞아. 근데 자소서 말고 deploy-ez 프로젝트가 네이버에 어필될까?" },
      { role: "assistant", content: "deploy-ez는 Go + Docker + Kubernetes 자동 배포 도구로, 네이버 클라우드 채용공고의 K8s/오픈소스 우대사항과 잘 맞습니다." },
      { role: "user", content: "그럼 그거 중심으로 어필 포인트 뽑아줘" },
    ],
  },

  // -------------------------------------------------------------------------
  // sd-2 박준형
  // -------------------------------------------------------------------------
  "sd-2": {
    polite: [
      { role: "user", content: "안녕하세요, 토스 서버 플랫폼팀에 지원하려고 합니다. 자기소개서 작성을 도와주실 수 있을까요?" },
      { role: "assistant", content: "네, 토스 서버 플랫폼팀 시니어 백엔드 개발자 포지션이군요! 채용공고와 JD 상세를 확인해보겠습니다. 어떤 부분부터 준비할까요?" },
      { role: "user", content: "먼저 제 경력이 이 포지션에 잘 맞는지 분석해주시겠어요? 쿠팡, LG CNS, 배민 경험이 있습니다." },
      { role: "assistant", content: "네, 경력을 분석해보겠습니다. 쿠팡에서의 MSA 전환 경험과 DDD 기반 설계가 토스 서버 플랫폼팀의 'MSA 플랫폼 인프라 설계' 요구사항과 잘 맞습니다. LG CNS 금융 시스템 경험도 토스의 핀테크 도메인과 시너지가 있겠네요." },
      { role: "user", content: "감사합니다. 그럼 MSA 전환 경험을 중심으로 핵심 역량 부분을 작성해주세요. Saga 패턴 적용한 부분을 강조하고 싶습니다." },
      { role: "assistant", content: "좋습니다. 모놀리스에서 15개 마이크로서비스로 전환하면서 Saga 패턴을 적용한 경험을 중심으로 작성하겠습니다. 배포 주기가 월 1회에서 일 3회로 개선된 성과도 포함할까요?" },
      { role: "user", content: "네, 그 부분 꼭 넣어주세요. 그리고 결제 시스템의 Idempotency 설계 경험도 포함시켜주세요. 토스가 금융 서비스이니 데이터 정합성 관련 경험이 어필될 것 같습니다." },
      { role: "assistant", content: "맞습니다. Idempotency Key 설계로 중복 결제를 완전히 방지하고 결제 성공률 99.8%를 달성한 경험은 토스의 금융 서비스 관점에서 매우 강력한 어필 포인트입니다. MSA 전환 + 결제 정합성을 하나의 스토리로 엮어 작성하겠습니다." },
      { role: "user", content: "좋습니다. 그리고 지원 동기 부분도 준비해주세요. 토스의 서버 플랫폼팀이 하는 일과 제 경험의 접점을 잘 보여주고 싶습니다." },
    ],
    terse: [
      { role: "user", content: "토스 서버 플랫폼팀 자소서 써야 돼" },
      { role: "assistant", content: "토스 서버 플랫폼팀 자기소개서를 작성해드리겠습니다. 어떤 경험을 중심으로 할까요?" },
      { role: "user", content: "MSA 경험 위주로 알아서 해줘" },
      { role: "assistant", content: "쿠팡 MSA 전환 경험을 중심으로 작성하겠습니다. Saga 패턴, DDD, 결제 시스템 경험을 엮겠습니다." },
      { role: "user", content: "결제 쪽 많이 써줘. 토스니까" },
      { role: "assistant", content: "결제 시스템 리아키텍처링 경험을 강조하겠습니다. Idempotency Key, 결제 성공률 99.8%, 초당 15,000건 처리 내용을 중점적으로 넣겠습니다." },
      { role: "user", content: "블로그 글도 넣어" },
    ],
    jumpy: [
      { role: "user", content: "토스 지원하려는데 자소서 좀 봐주세요" },
      { role: "assistant", content: "네, 토스 서버 플랫폼팀 자기소개서를 도와드리겠습니다. 기존에 작성하신 초안이 있나요?" },
      { role: "user", content: "아 초안은 있는데, 잠깐 그전에 쿠팡 경력기술서 내용 좀 확인해줘요" },
      { role: "assistant", content: "쿠팡 경력기술서를 확인해보겠습니다. MSA 전환, 결제 리아키텍처링, 장애 대응 체계 총 3건의 프로젝트가 정리되어 있습니다." },
      { role: "user", content: "맞아요 근데 Chaos Engineering 도입한 거 경력기술서에 안 넣었나? 그것도 있는데" },
      { role: "assistant", content: "장애 대응 체계 고도화 프로젝트에 Litmus Chaos 도입 내용이 포함되어 있습니다. MTTR 2시간에서 20분으로 개선한 성과도 기재되어 있어요." },
      { role: "user", content: "아 그거 토스 자소서에 넣을까 말까 고민인데. 그보다 DDD 블로그 글이 있잖아 그거 토스에서 관심 가질까?" },
      { role: "assistant", content: "토스 JD에 DDD, Event Sourcing, CQRS 패턴 적용 경험이 우대사항으로 명시되어 있어서 DDD 블로그 글은 좋은 어필 포인트입니다. Chaos Engineering도 서버 플랫폼의 안정성 관점에서 넣으시면 좋겠습니다." },
    ],
  },

  // -------------------------------------------------------------------------
  // sd-3 이서진
  // -------------------------------------------------------------------------
  "sd-3": {
    polite: [
      { role: "user", content: "안녕하세요, AWS Korea SRE 포지션에 지원하려고 합니다. 자기소개서를 함께 준비해주실 수 있을까요?" },
      { role: "assistant", content: "네, AWS Korea 시니어 SRE 포지션이군요! 채용공고를 확인해보겠습니다. 글로벌 인프라 운영과 자동화 도구 개발이 핵심 업무로 보입니다. 어떤 부분부터 준비하실까요?" },
      { role: "user", content: "제 라인플러스에서의 글로벌 멀티 리전 경험이 가장 어필될 것 같은데, 어떻게 생각하시나요?" },
      { role: "assistant", content: "맞습니다. AWS 8개 리전으로의 마이그레이션 경험은 AWS Korea SRE가 요구하는 '글로벌 멀티 리전 인프라 운영 경험'과 직접적으로 매칭됩니다. Terraform IaC 120+ 모듈 작성과 Zero-Downtime 마이그레이션 성과도 강력한 어필 포인트입니다." },
      { role: "user", content: "그렇죠. 그리고 특허도 가지고 있는데, 채용공고에 특허 보유가 우대사항으로 있더라고요. 이것도 잘 녹여주세요." },
      { role: "assistant", content: "컨테이너 기반 자동 장애 복구 시스템 특허는 AWS의 인프라 자동화 방향성과도 잘 맞습니다. 장애 패턴 학습 기반 예측 스케일링이 핵심인데, 이 기술적 깊이를 잘 표현하겠습니다." },
      { role: "user", content: "좋습니다. 카카오에서의 대규모 K8s 운영 경험도 빠지면 안 됩니다. 노드 300대 규모를 강조해주세요." },
      { role: "assistant", content: "카카오톡 인프라의 K8s 클러스터 노드 300대 운영은 채용공고의 '대규모 Kubernetes 클러스터 운영 경험 100+ 노드' 우대사항을 크게 초과하는 경험입니다. 라인의 글로벌 운영과 카카오의 대규모 국내 서비스 경험을 조합하여 작성하겠습니다." },
      { role: "user", content: "네, 오픈소스 kube-guardian도 언급해주세요. CNCF Landscape에 등재된 점을 어필하고 싶습니다." },
    ],
    terse: [
      { role: "user", content: "AWS Korea SRE 자소서" },
      { role: "assistant", content: "AWS Korea SRE 포지션 자기소개서를 작성해드리겠습니다. 어떤 경험을 중심으로 할까요?" },
      { role: "user", content: "멀티 리전이랑 특허 중심으로" },
      { role: "assistant", content: "라인의 AWS 8개 리전 마이그레이션과 자동 장애 복구 특허를 중심으로 작성하겠습니다." },
      { role: "user", content: "kube-guardian도 넣어줘" },
      { role: "assistant", content: "CNCF Landscape 등재된 kube-guardian 오픈소스 경험도 포함하겠습니다. 오픈소스 기여 우대사항에 잘 맞습니다." },
      { role: "user", content: "CKA 자격증도 빠뜨리지 마" },
    ],
    jumpy: [
      { role: "user", content: "AWS Korea 지원할건데 도와주세요" },
      { role: "assistant", content: "네, AWS Korea 시니어 SRE 포지션 자기소개서를 도와드리겠습니다. 어떤 부분부터 할까요?" },
      { role: "user", content: "아 그전에 내 이력서에 넥슨 경력도 있는 거 맞지?" },
      { role: "assistant", content: "네, 넥슨(2016~2018) 시스템 엔지니어 경력이 있습니다. 게임 서버 인프라 운영과 AWS 비용 최적화 프로젝트를 수행하셨습니다." },
      { role: "user", content: "ㅇㅇ 근데 AWS 비용 최적화 경험이 AWS에 지원할 때 어필이 될까? 아님 좀 그런가" },
      { role: "assistant", content: "오히려 강점입니다. AWS 서비스를 깊이 이해하고 있다는 증거이고, 고객사 비용 최적화 컨설팅 관점에서도 가치가 있습니다." },
      { role: "user", content: "아 맞다 그리고 특허 있잖아 그거 AWS에서 관심 가질까? 아 근데 먼저 자소서 전체 구조부터 잡아줘" },
      { role: "assistant", content: "자소서 구조를 먼저 잡겠습니다. 특허는 우대사항에 명시되어 있어 확실히 어필됩니다. 구조는 1)지원동기 2)글로벌 인프라 운영 3)자동화/오픈소스 4)SRE 철학 순서를 추천합니다." },
    ],
  },

  // -------------------------------------------------------------------------
  // sd-4 장민호
  // -------------------------------------------------------------------------
  "sd-4": {
    polite: [
      { role: "user", content: "안녕하세요, 당근 프론트엔드 플랫폼팀에 지원하고 싶은데요. 자기소개서를 함께 준비해주실 수 있나요?" },
      { role: "assistant", content: "네, 당근 프론트엔드 플랫폼팀 시니어 개발자 포지션이군요! 채용공고와 JD 상세를 확인해보겠습니다. 디자인시스템과 DX 도구 경험이 핵심인 것 같습니다." },
      { role: "user", content: "맞아요. 토스에서 디자인시스템 TDS를 만든 경험이 있는데, 이게 가장 큰 강점이 될 것 같습니다." },
      { role: "assistant", content: "TDS v3 리뉴얼에서 Headless UI 패턴 도입과 접근성 WCAG 2.1 AA 준수 경험은 당근의 '디자인시스템 v2 리뉴얼(Headless UI 패턴 전환)' 현재 과제와 정확히 일치합니다. 이미 해본 경험이 있다는 점이 큰 어필 포인트가 되겠네요." },
      { role: "user", content: "그렇죠! 그리고 웹 접근성 부분도 강조하고 싶어요. react-a11y-kit 오픈소스도 있으니까요." },
      { role: "assistant", content: "접근성 오픈소스 react-a11y-kit(Stars 920+)과 FEConf 2023 발표 경험까지 합치면 접근성 전문가로서의 포지셔닝이 매우 강력합니다. 당근 JD에도 WCAG 구현 경험이 우대사항으로 있어서 잘 맞습니다." },
      { role: "user", content: "좋아요. 배민에서의 Micro Frontend 경험도 넣을까요? 당근에서도 여러 팀이 프론트엔드를 개발할 텐데 관련이 있을 것 같아서요." },
      { role: "assistant", content: "Module Federation 기반 5개 팀 독립 배포 경험은 플랫폼팀의 '프론트엔드 공통 인프라' 역할과 맞닿아 있습니다. 여러 팀의 개발 경험을 지원하는 플랫폼 관점을 잘 보여줄 수 있겠습니다." },
      { role: "user", content: "그럼 디자인시스템 + 접근성 + MFE 이 세 축으로 자기소개서를 작성해주세요. 성능 최적화 경험도 자연스럽게 녹여주시면 좋겠습니다." },
    ],
    terse: [
      { role: "user", content: "당근 프론트엔드 플랫폼팀 자소서" },
      { role: "assistant", content: "당근 프론트엔드 플랫폼팀 자기소개서를 작성하겠습니다. 어떤 경험을 중심으로 할까요?" },
      { role: "user", content: "디자인시스템 위주로" },
      { role: "assistant", content: "토스 TDS 디자인시스템 경험을 중심으로 작성하겠습니다. Headless UI 패턴과 접근성 경험도 함께 넣겠습니다." },
      { role: "user", content: "react-a11y-kit도 넣어" },
      { role: "assistant", content: "접근성 오픈소스 react-a11y-kit과 FEConf 발표 경험도 포함하겠습니다." },
      { role: "user", content: "성능 최적화도 좀 넣어줘" },
    ],
    jumpy: [
      { role: "user", content: "당근 지원하려는데 자소서 도와줘요" },
      { role: "assistant", content: "네, 당근 프론트엔드 플랫폼팀 자기소개서를 도와드리겠습니다. 어떤 부분부터 할까요?" },
      { role: "user", content: "아 잠깐 당근 JD에 Turborepo 쓴다고 돼있던데 나 그거 경험 있나?" },
      { role: "assistant", content: "이력서와 경력기술서를 확인해보니 Turborepo 직접 경험은 없지만, Webpack Module Federation과 모노레포 경험이 있으시고, Vite 경험도 있어서 Turborepo 도입은 충분히 가능한 범위입니다." },
      { role: "user", content: "ㅇㅇ 그건 빠르게 배울 수 있으니까. 근데 디자인시스템 v2 리뉴얼이 당근 현재 과제라며? 내가 TDS v3 해봤으니까 딱인데" },
      { role: "assistant", content: "맞습니다. 당근이 Headless UI 패턴으로 디자인시스템 v2를 전환하려는데, 정확히 TDS v3에서 그 작업을 하셨잖아요. 이 경험을 자소서의 핵심 어필 포인트로 삼으면 됩니다." },
      { role: "user", content: "좋아 그거 중심으로 써줘. 아 근데 그전에 Vue에서 React 전환한 것도 넣을까?" },
      { role: "assistant", content: "배민 사장님 사이트 Vue→React 전환 경험은 당근에서도 레거시 전환이 생길 수 있어 의미있습니다. 다만 자소서 분량을 고려하면 디자인시스템과 접근성을 중심으로 하고, Vue→React 전환은 면접에서 언급하는 것을 추천합니다." },
    ],
  },

  // -------------------------------------------------------------------------
  // sd-5 한수연
  // -------------------------------------------------------------------------
  "sd-5": {
    polite: [
      { role: "user", content: "안녕하세요, 카카오 데이터 플랫폼팀에 지원하려고 합니다. 자기소개서 작성을 도와주실 수 있을까요?" },
      { role: "assistant", content: "네, 카카오 데이터 플랫폼팀 시니어 데이터 엔지니어 포지션이군요! 채용공고를 확인해보겠습니다. 어떤 부분부터 시작할까요?" },
      { role: "user", content: "먼저 제 경력이 이 포지션에 얼마나 잘 맞는지 분석해주시겠어요?" },
      { role: "assistant", content: "네이버에서의 일일 50TB 검색 데이터 플랫폼 운영 경험이 카카오의 '일일 10TB 이상 대규모 데이터 처리' 우대사항을 크게 초과합니다. Feature Store 구축 경험도 정확히 매칭되고, Spark 3년+ 요구사항도 충족하시네요. 매우 적합한 후보입니다." },
      { role: "user", content: "감사합니다. 그러면 검색 데이터 플랫폼 리아키텍처링 경험을 중심으로 핵심 역량을 작성해주세요." },
      { role: "assistant", content: "Hadoop에서 Spark + Delta Lake로의 전환 경험을 중심으로 작성하겠습니다. 카카오도 현재 Hive에서 Iceberg로 마이그레이션을 검토 중이라, 유사한 레이크하우스 전환 경험이 큰 어필 포인트가 됩니다." },
      { role: "user", content: "맞아요, 그 부분을 강조해주세요. 그리고 데이터 품질 자동화 프레임워크 개발 경험도 넣어주세요. 카카오도 거버넌스 체계 수립이 요구사항이니까요." },
      { role: "assistant", content: "데이터 품질 자동화로 데이터 사고 85% 감소시킨 성과는 카카오의 '데이터 품질 관리 및 거버넌스 체계 수립' 업무와 직결됩니다. 플랫폼 전환 + 품질 거버넌스를 하나의 스토리로 엮어 작성하겠습니다." },
      { role: "user", content: "좋습니다. SK텔레콤에서의 실시간 스트리밍 경험도 간략히 포함시켜주세요. 카카오의 Kafka 초당 50만 이벤트 처리와 관련이 있으니까요." },
    ],
    terse: [
      { role: "user", content: "카카오 데이터 플랫폼팀 자소서" },
      { role: "assistant", content: "카카오 데이터 플랫폼팀 자기소개서를 작성하겠습니다. 어떤 경험 중심으로 할까요?" },
      { role: "user", content: "Spark 전환이랑 Feature Store 위주" },
      { role: "assistant", content: "네이버에서의 Spark + Delta Lake 전환과 Feature Store 구축 경험 중심으로 작성하겠습니다." },
      { role: "user", content: "데이터 품질 쪽도 써줘" },
      { role: "assistant", content: "데이터 품질 자동화 프레임워크로 사고 85% 감소시킨 경험도 포함하겠습니다." },
      { role: "user", content: "SKT 실시간 스트리밍도 한 줄 넣어" },
    ],
    jumpy: [
      { role: "user", content: "카카오 데이터 플랫폼팀 지원할건데요" },
      { role: "assistant", content: "네, 카카오 데이터 플랫폼팀 시니어 데이터 엔지니어 자기소개서를 도와드리겠습니다. 어떤 부분부터 할까요?" },
      { role: "user", content: "아 잠깐 카카오 기술 블로그에 팀 소개가 있던데 그거 봤어?" },
      { role: "assistant", content: "네, 카카오 데이터 플랫폼 기술 블로그를 확인했습니다. 일일 80TB+ 처리, Airflow DAG 500+, Spark on K8s 노드 200+ 규모이고, 현재 Hive에서 Iceberg 마이그레이션을 검토 중입니다." },
      { role: "user", content: "오 그럼 나의 Delta Lake 경험이랑 비슷한 맥락이네. 근데 잠깐 내 블로그 글에 Spark 최적화 글 있잖아 그거 카카오에서 관심 가질까?" },
      { role: "assistant", content: "Spark 3.x 성능 최적화 글(조회수 22,000+)은 카카오의 Spark on K8s 환경에서 바로 적용 가능한 내용이라 관심을 가질 겁니다. AQE나 Skew Join 해결 경험이 특히 어필될 것 같습니다." },
      { role: "user", content: "좋아 그럼 자소서 써주는데, 아 먼저 지원 동기 부분에 Iceberg 마이그레이션 관련 내 경험을 연결해서 써줘" },
      { role: "assistant", content: "네, Delta Lake 전환 경험을 바탕으로 카카오의 Iceberg 마이그레이션 과제에 기여할 수 있다는 방향으로 지원 동기를 작성하겠습니다. 레이크하우스 아키텍처에 대한 이해와 실전 경험을 강조하겠습니다." },
    ],
  },
}
