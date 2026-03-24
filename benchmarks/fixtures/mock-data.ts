/**
 * 벤치마크 공통 목업 데이터
 *
 * 모든 벤치마크에서 공유하는 가상 사용자 데이터.
 * chat-pipeline, tool-calling 등 각 벤치마크에서 직접 import.
 *
 * 포함 데이터:
 * - MOCK_DOCUMENTS: 문서 7건 (이력서, 포트폴리오, 채용공고 등)
 * - MOCK_CAREER_NOTES: 커리어노트 5건
 * - CONV_STYLES: 대화 스타일 3종 (polite, terse, jumpy)
 */

// ---------------------------------------------------------------------------
// 문서 (이력서, 포트폴리오, 채용공고, 경력기술서 등)
// ---------------------------------------------------------------------------

export const MOCK_DOCUMENTS = [
  {
    id: "doc-1",
    title: "이력서 — 김철수",
    summary: "풀스택 개발자, 5년 경력. React, Node.js, PostgreSQL 중심. 스타트업 2곳 경험.",
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
    id: "doc-2",
    title: "프로젝트 포트폴리오",
    summary: "개인 프로젝트 3개: AI 챗봇, 이커머스 플랫폼, 오픈소스 CLI 도구.",
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
    id: "doc-3",
    title: "채용공고 — 네이버 클라우드",
    summary: "네이버 클라우드 플랫폼 시니어 백엔드 개발자 채용. Kubernetes, MSA 경험 우대.",
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
  {
    id: "doc-4",
    title: "경력기술서 — 테크스타트",
    summary: "테크스타트 재직 중 수행한 주요 프로젝트 4건. SaaS 플랫폼, 데이터 파이프라인, 내부 도구 등.",
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
    id: "doc-5",
    title: "자기소개서 초안 — 카카오",
    summary: "카카오 백엔드 개발자 지원 시 작성한 자기소개서 초안. 분산 시스템, 팀 리더십 강조.",
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
    id: "doc-6",
    title: "추천서 — 코드랩 CTO",
    summary: "코드랩 CTO가 작성한 추천서. 문제 해결 능력과 주도성 강조.",
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
    id: "doc-7",
    title: "기술 블로그 모음",
    summary: "개인 기술 블로그 주요 게시글 모음. Kubernetes, Go, 성능 최적화 주제.",
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
]

// ---------------------------------------------------------------------------
// 커리어노트
// ---------------------------------------------------------------------------

export const MOCK_CAREER_NOTES = [
  {
    id: "note-1",
    title: "SaaS 플랫폼 성능 최적화 경험",
    summary: "React 렌더링 최적화로 LCP 40% 개선. 코드 스플리팅, 메모이제이션 적용.",
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
    id: "note-2",
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
    id: "note-3",
    title: "Kafka 기반 이벤트 드리븐 아키텍처 도입",
    summary: "모놀리식 → 이벤트 드리븐 전환. 일일 500만 이벤트 처리. 서비스 간 결합도 감소.",
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
    id: "note-4",
    title: "GitOps 기반 배포 자동화",
    summary: "ArgoCD + Helm 기반 GitOps. 12개 서비스 통합 관리. 배포 시간 25분→8분.",
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
    id: "note-5",
    title: "DB 쿼리 최적화 프로젝트",
    summary: "느린 쿼리 모니터링 도구 자체 개발. 주요 API 응답시간 40% 개선.",
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
]

// ---------------------------------------------------------------------------
// 대화 스타일 (polite, terse, jumpy)
// ---------------------------------------------------------------------------

export type ConvMessage = { role: "user" | "assistant"; content: string }

export const CONV_STYLES: Record<string, ConvMessage[]> = {
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
}
