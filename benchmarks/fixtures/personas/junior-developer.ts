/**
 * 신입 개발자 페르소나 fixture 데이터 (5명)
 *
 * jd-1: 컴공 전공, 프론트엔드 지향 (React, 개인 프로젝트)
 * jd-2: 비전공 전환자 (부트캠프 출신, Python/Django)
 * jd-3: 컴공 전공, 백엔드 지향 (Java/Spring, 기술 블로그, 인턴 경험)
 * jd-4: 전자공학 전공, 임베디드→웹 전환 (C/C++ 배경, 웹 신입)
 * jd-5: 부트캠프 출신, 풀스택 (JavaScript/Node.js, 팀 프로젝트)
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
    id: "jd-1",
    name: "이하은",
    category: "junior-developer",
    label: "컴공 전공 / 프론트엔드 지향 / React",
  },
  {
    id: "jd-2",
    name: "박준호",
    category: "junior-developer",
    label: "비전공 전환자 / 부트캠프 출신 / Python·Django",
  },
  {
    id: "jd-3",
    name: "최서연",
    category: "junior-developer",
    label: "컴공 전공 / 백엔드 지향 / Java·Spring / 인턴 경험",
  },
  {
    id: "jd-4",
    name: "김도윤",
    category: "junior-developer",
    label: "전자공학 전공 / 임베디드→웹 전환 / C·C++ 배경",
  },
  {
    id: "jd-5",
    name: "정예린",
    category: "junior-developer",
    label: "부트캠프 출신 / 풀스택 / JavaScript·Node.js",
  },
]

// ---------------------------------------------------------------------------
// 사용자 문서
// ---------------------------------------------------------------------------

export const DOCUMENTS: MockDocument[] = [
  // ── jd-1 이하은: 이력서, 포트폴리오, 자소서 초안 ──
  {
    id: "jd-1-doc-1",
    personaId: "jd-1",
    title: "이력서 — 이하은",
    summary:
      "한양대학교 컴퓨터공학과 졸업 예정. React, TypeScript 중심 프론트엔드 신입 개발자.",
    extractedText: `이하은 — 프론트엔드 개발자

학력:
- 한양대학교 컴퓨터공학과 (2020.03 ~ 2024.02) 졸업 예정
  - 학점: 3.8/4.5
  - 관련 수강: 웹프로그래밍, 소프트웨어공학, 데이터베이스, 알고리즘

프로젝트 경험:
1. "StudyMate" — 실시간 스터디 매칭 웹앱 (2023.09 ~ 2023.12)
   - React + TypeScript + Firebase
   - 실시간 채팅(WebSocket), 캘린더 일정 공유
   - 교내 해커톤 최우수상 수상
   - GitHub Stars 87

2. "PixelBoard" — 협업 화이트보드 SPA (2023.03 ~ 2023.06)
   - React + Canvas API + Socket.io
   - 다중 사용자 동시 드로잉 지원
   - Undo/Redo 히스토리 관리 (Command 패턴)
   - 팀 프로젝트 (4인), 프론트엔드 리드 담당

기술 스택:
- Frontend: React, Next.js, TypeScript, Tailwind CSS, Zustand
- 기타: Git, Figma, Vercel, Firebase
- 알고리즘: 백준 골드 2 (solved.ac 기준)

자격증:
- 정보처리기사 (2023.11)

수상:
- 한양대학교 교내 해커톤 최우수상 (2023.12)
- 캡스톤 디자인 우수 프로젝트 선정 (2023.06)`,
  },
  {
    id: "jd-1-doc-2",
    personaId: "jd-1",
    title: "포트폴리오 — 이하은",
    summary:
      "개인 프로젝트 3개 수록. 실시간 스터디 매칭, 협업 화이트보드, 개인 블로그 플랫폼.",
    extractedText: `포트폴리오 — 이하은

1. StudyMate (2023.09 ~ 2023.12)
   개요: 대학생 실시간 스터디 그룹 매칭 및 관리 웹앱
   기술: React 18, TypeScript, Firebase Auth/Firestore, Tailwind CSS
   주요 기능:
   - 관심 분야·시간대 기반 자동 매칭 알고리즘
   - WebSocket 기반 실시간 그룹 채팅
   - Google Calendar API 연동 일정 공유
   - 출석률·학습 시간 통계 대시보드
   성과:
   - MAU 320명 (교내 배포)
   - 교내 해커톤 최우수상
   - GitHub Stars 87, Fork 23
   배포: https://studymate-demo.vercel.app

2. PixelBoard (2023.03 ~ 2023.06)
   개요: 다중 사용자 실시간 협업 화이트보드
   기술: React, Canvas API, Socket.io, Express
   주요 기능:
   - 최대 10명 동시 드로잉
   - 펜·도형·텍스트·이미지 삽입 도구
   - Command 패턴 기반 Undo/Redo (최대 100단계)
   - 보드 PNG/PDF 내보내기
   성과:
   - 소프트웨어공학 수업 A+ 프로젝트
   - 캡스톤 디자인 우수 프로젝트 선정
   역할: 프론트엔드 리드 (Canvas 렌더링 엔진, 상태 관리 담당)

3. DevLog (2022.06 ~ 개인 운영 중)
   개요: Next.js 기반 마크다운 블로그 플랫폼
   기술: Next.js 13 (App Router), MDX, Vercel, Tailwind CSS
   주요 기능:
   - MDX 기반 포스팅 (코드 하이라이팅, 수식 렌더링)
   - 태그·카테고리 필터링
   - 다크 모드 지원
   - SEO 최적화 (Lighthouse Performance 98점)
   성과:
   - 누적 게시글 28편, 월 방문자 약 1,200명
   배포: https://devlog-haeun.vercel.app`,
  },
  {
    id: "jd-1-doc-3",
    personaId: "jd-1",
    title: "자기소개서 초안 — 토스 프론트엔드",
    summary:
      "토스 프론트엔드 개발자 신입 지원 자기소개서 초안. 사용자 경험과 프로젝트 경험 강조.",
    extractedText: `자기소개서 초안 — 토스 프론트엔드 개발자 신입

[지원 동기]
토스의 "금융을 쉽고 편리하게"라는 미션에 깊이 공감합니다.
StudyMate 프로젝트에서 사용자 피드백을 반영하며 인터페이스를 개선한 경험이
토스의 사용자 중심 개발 문화와 잘 맞는다고 생각합니다.

[프로젝트 경험]
StudyMate에서 실시간 채팅 기능 구현 시 WebSocket 연결 관리와
재연결 로직을 직접 설계했습니다. 초기 30%였던 연결 안정성을
heartbeat + 지수 백오프 재시도 로직을 추가해 98%까지 개선했습니다.

[기술적 관심사]
React 18의 Concurrent Features에 관심이 많으며, Suspense와
useTransition을 활용한 UX 최적화를 블로그에 정리하고 있습니다.
(미완성 초안 — 지원 동기 보강 필요, 성장 과정 항목 추가 예정)`,
  },

  // ── jd-2 박준호: 이력서, 포트폴리오 ──
  {
    id: "jd-2-doc-1",
    personaId: "jd-2",
    title: "이력서 — 박준호",
    summary:
      "경영학 전공, 코드스테이츠 부트캠프 수료. Python/Django 백엔드 신입 개발자.",
    extractedText: `박준호 — 백엔드 개발자

학력:
- 경희대학교 경영학과 졸업 (2017.03 ~ 2021.02)
  - 학점: 3.5/4.5

교육:
- 코드스테이츠 백엔드 부트캠프 28기 (2023.03 ~ 2023.09, 6개월)
  - Python/Django 기반 웹 개발 과정
  - 팀 프로젝트 2회, 개인 프로젝트 1회 수행
  - 수료 성적: 상위 10%

전직 경험:
- (주)한솔유통 마케팅팀 (2021.03 ~ 2022.12, 1년 10개월)
  - 디지털 마케팅 캠페인 기획·운영
  - Google Analytics 기반 데이터 분석
  - 퇴사 사유: 개발 직군 전환을 위해

프로젝트 경험:
1. "FoodDiary" — 식단 기록·분석 서비스 (2023.07 ~ 2023.09)
   - Django REST Framework + React
   - 영양소 자동 계산 API (공공 식품 영양 DB 활용)
   - 주간/월간 식단 리포트 생성
   - 부트캠프 파이널 프로젝트

2. "BookShelf" — 도서 리뷰 커뮤니티 (2023.05 ~ 2023.06)
   - Django + PostgreSQL + Bootstrap
   - 네이버 도서 API 연동 검색
   - 사용자 리뷰·별점·위시리스트 기능
   - 부트캠프 팀 프로젝트 (3인)

기술 스택:
- Backend: Python, Django, Django REST Framework
- Database: PostgreSQL, SQLite
- 기타: Git, Docker(기초), AWS EC2, Linux 기본`,
  },
  {
    id: "jd-2-doc-2",
    personaId: "jd-2",
    title: "포트폴리오 — 박준호",
    summary: "부트캠프 프로젝트 2개 수록. 식단 기록 서비스, 도서 리뷰 커뮤니티.",
    extractedText: `포트폴리오 — 박준호

1. FoodDiary (2023.07 ~ 2023.09)
   개요: 일일 식단을 기록하고 영양 균형을 분석해주는 서비스
   기술: Django REST Framework, React, PostgreSQL, Redis
   주요 기능:
   - 음식 검색 + 영양소 자동 계산 (식약처 공공 DB 연동)
   - 사진 업로드 시 음식 자동 인식 (Google Vision API)
   - 주간·월간 영양 리포트 (차트 시각화)
   - 목표 칼로리 대비 달성률 알림
   역할: 백엔드 전담 (API 설계, DB 모델링, 외부 API 연동)
   성과:
   - REST API 엔드포인트 24개 설계·구현
   - 부트캠프 파이널 프로젝트 최우수 팀 선정
   - 데모 기간 DAU 45명
   배포: AWS EC2 + RDS (부트캠프 기간 중 운영)

2. BookShelf (2023.05 ~ 2023.06)
   개요: 도서 검색·리뷰·추천 커뮨니티
   기술: Django, PostgreSQL, Bootstrap 5, 네이버 검색 API
   주요 기능:
   - 네이버 도서 API 연동 실시간 검색
   - 별점(1~5) + 텍스트 리뷰 CRUD
   - 장르별 인기 도서 랭킹
   - 위시리스트·읽은 책 관리
   역할: 백엔드 + DB 설계 (3인 팀)
   성과:
   - Django ORM 쿼리 최적화 (select_related/prefetch_related)
   - 리뷰 데이터 1,200건 기준 목록 조회 API 응답 800ms→120ms 개선`,
  },

  // ── jd-3 최서연: 이력서, 포트폴리오, 자소서 초안, 블로그 ──
  {
    id: "jd-3-doc-1",
    personaId: "jd-3",
    title: "이력서 — 최서연",
    summary:
      "성균관대 컴공 졸업. Java/Spring 백엔드 신입. 와디즈 인턴 3개월 경험.",
    extractedText: `최서연 — 백엔드 개발자

학력:
- 성균관대학교 소프트웨어학과 졸업 (2020.03 ~ 2024.02)
  - 학점: 4.1/4.5
  - 관련 수강: 자료구조, 운영체제, 컴퓨터네트워크, 분산시스템, 소프트웨어 아키텍처

인턴 경험:
- (주)와디즈 서버개발팀 인턴 (2023.07 ~ 2023.09, 3개월)
  - Spring Boot 기반 크라우드펀딩 API 유지보수
  - 리워드 배송 상태 조회 API 신규 개발
  - JUnit 5 기반 단위 테스트 작성 (커버리지 68%→82%)
  - 레거시 MyBatis → JPA 마이그레이션 일부 수행

프로젝트 경험:
1. "CampusMarket" — 교내 중고거래 플랫폼 (2023.03 ~ 2023.06)
   - Spring Boot + JPA + MySQL
   - 실시간 채팅 (STOMP + WebSocket)
   - 이미지 업로드 (AWS S3)
   - 교내 사용자 200명+ 확보

2. "TaskFlow" — 칸반 보드 프로젝트 관리 도구 (2022.09 ~ 2022.12)
   - Spring Boot + Thymeleaf + MariaDB
   - Drag & Drop 칸반 보드 UI
   - 알림 시스템 (SSE)
   - GitHub Actions CI/CD 구축

기술 스택:
- Backend: Java 17, Spring Boot 3, Spring Data JPA, MyBatis
- Database: MySQL, MariaDB, Redis(기초)
- Testing: JUnit 5, Mockito
- DevOps: Docker, GitHub Actions, AWS (EC2, S3, RDS)
- 기타: Git, IntelliJ IDEA

활동:
- 기술 블로그 "서연의 개발일지" 운영 (2022.06 ~ 현재, 총 42편)
- GDSC 성균관대 멤버 (2022.09 ~ 2023.06)
- 프로그래머스 Level 3 달성`,
  },
  {
    id: "jd-3-doc-2",
    personaId: "jd-3",
    title: "포트폴리오 — 최서연",
    summary:
      "인턴 경험 + 프로젝트 2개 수록. 와디즈 인턴, 교내 중고거래, 칸반 보드.",
    extractedText: `포트폴리오 — 최서연

1. 와디즈 인턴 (2023.07 ~ 2023.09)
   담당: 서버개발팀 — 크라우드펀딩 플랫폼 백엔드
   업무:
   - 리워드 배송 상태 조회 API 설계·구현 (Spring Boot + JPA)
     - 택배사 API 연동 (CJ대한통운, 한진택배)
     - 배송 상태 캐싱 (Redis, TTL 30분)
   - 기존 MyBatis 쿼리 5건을 JPA Repository로 전환
   - 테스트 코드 확충: 기존 68%→82% 라인 커버리지
   배운 점:
   - 코드 리뷰 문화 경험 (PR 기반, 리뷰어 2인 이상 승인)
   - 대규모 트래픽 서비스의 모니터링 체계 학습 (Datadog)

2. CampusMarket (2023.03 ~ 2023.06)
   개요: 성균관대 학생 전용 중고거래 플랫폼
   기술: Spring Boot 3, JPA, MySQL 8, AWS S3, STOMP/WebSocket
   주요 기능:
   - 상품 CRUD + 이미지 다중 업로드 (AWS S3, 최대 5장)
   - 실시간 1:1 채팅 (STOMP over WebSocket)
   - 거래 상태 관리 (판매중/예약중/거래완료)
   - 학교 이메일 인증 기반 가입
   성과:
   - 교내 사용자 200명+, 등록 상품 580건+
   - Swagger UI 기반 API 문서화 (엔드포인트 32개)
   역할: 백엔드 리드 (3인 팀, API 설계·DB 모델링·배포 담당)

3. TaskFlow (2022.09 ~ 2022.12)
   개요: 애자일 팀을 위한 칸반 보드 프로젝트 관리 도구
   기술: Spring Boot, Thymeleaf, MariaDB, SSE
   주요 기능:
   - 칸반 보드 (Todo/In Progress/Done)
   - 마감 기한 알림 (SSE 실시간 푸시)
   - 팀원 초대·역할 관리
   성과:
   - 소프트웨어 아키텍처 수업 A+ 프로젝트
   역할: 풀스택 (2인 팀)`,
  },
  {
    id: "jd-3-doc-3",
    personaId: "jd-3",
    title: "자기소개서 초안 — 카카오 서버 개발",
    summary:
      "카카오 서버 개발자 신입 지원 자기소개서 초안. 인턴 경험과 기술 블로그 강조.",
    extractedText: `자기소개서 초안 — 카카오 서버 개발자 신입

[지원 동기]
카카오톡, 카카오맵 등 일상에서 매일 사용하는 서비스의 백엔드를
직접 만들고 싶습니다. 와디즈 인턴에서 실제 트래픽을 다루며 배운
안정적인 API 설계 경험을 카카오에서 더 넓은 규모로 발전시키고 싶습니다.

[핵심 경험]
와디즈 인턴 기간 중 리워드 배송 조회 API를 설계·구현했습니다.
택배사 API 응답 속도가 불안정한 문제를 Redis 캐싱으로 해결하여
평균 응답 시간을 1.2초에서 180ms로 단축했습니다.

[기술적 성장]
기술 블로그를 통해 학습한 내용을 꾸준히 정리하고 있습니다.
"JPA N+1 문제 해결 가이드" 글은 조회수 8,400회를 기록했으며,
이 과정에서 단순 사용법을 넘어 ORM의 내부 동작을 이해하게 되었습니다.

(미완성 — 팀워크·협업 항목 추가 필요, 구체적 수치 보강 예정)`,
  },
  {
    id: "jd-3-doc-4",
    personaId: "jd-3",
    title: "기술 블로그 글 모음 — 최서연",
    summary:
      "기술 블로그 주요 게시글 4편. JPA, Spring Security, 테스트, Docker 주제.",
    extractedText: `서연의 개발일지 — 주요 게시글

1. "JPA N+1 문제, 진짜 제대로 이해하기" (2023.08)
   - 즉시 로딩 vs 지연 로딩의 N+1 발생 시나리오
   - fetch join, @EntityGraph, BatchSize 비교
   - 와디즈 인턴 중 실제 겪은 사례 포함
   - 조회수 8,400+, 댓글 34개

2. "Spring Security + JWT 인증, 삽질 기록" (2023.04)
   - SecurityFilterChain 커스텀 설정
   - JWT 발급/검증/재발급 플로우
   - CampusMarket 적용 사례
   - 조회수 5,200+

3. "테스트 코드, 왜 귀찮아도 써야 하는가" (2023.10)
   - 와디즈 인턴에서 배운 테스트 문화
   - @SpringBootTest vs @WebMvcTest 사용 가이드
   - Mock 객체 활용 패턴 (Mockito)
   - 조회수 3,100+

4. "Docker 입문: 개발 환경 통일하기" (2022.11)
   - Dockerfile 작성법
   - docker-compose로 Spring + MySQL 환경 구성
   - multi-stage build로 이미지 최적화
   - 조회수 4,600+`,
  },

  // ── jd-4 김도윤: 이력서, 자소서 초안 ──
  {
    id: "jd-4-doc-1",
    personaId: "jd-4",
    title: "이력서 — 김도윤",
    summary:
      "KAIST 전자공학과 졸업. 임베디드 배경, 웹 프론트엔드/백엔드 전환 희망.",
    extractedText: `김도윤 — 웹 개발자 (전환)

학력:
- KAIST 전기및전자공학부 졸업 (2019.03 ~ 2024.02)
  - 학점: 3.6/4.3
  - 관련 수강: 임베디드시스템, 마이크로프로세서, 컴퓨터구조,
    신호처리, 프로그래밍입문(C), 자료구조(C++)

임베디드 프로젝트 경험:
1. IoT 스마트홈 허브 (졸업 프로젝트, 2023.03 ~ 2023.11)
   - Raspberry Pi + MQTT + Node.js 서버
   - 온습도·조도 센서 데이터 수집 및 웹 대시보드 구현
   - React로 실시간 모니터링 UI 개발 (이때 웹 개발에 관심)
   - 졸업 프로젝트 우수상

2. 자율주행 RC카 (2022.06 ~ 2022.12)
   - STM32 + C언어 펌웨어
   - 라이다 센서 기반 장애물 회피
   - PID 제어 알고리즘 구현
   - 임베디드시스템 수업 프로젝트

웹 전환 학습:
- 독학 + 사이드 프로젝트 (2023.06 ~ 현재)
  - "SensorView" — IoT 센서 데이터 시각화 웹앱
    - Next.js + Chart.js + Express + MongoDB
    - MQTT 브로커에서 수신한 센서 데이터를 실시간 차트로 표시
    - 반응형 대시보드 UI
  - Udemy "The Complete Web Developer" 수료
  - MDN Web Docs 기반 JavaScript/TypeScript 학습

기술 스택:
- Embedded: C, C++, STM32, Raspberry Pi, Arduino, MQTT
- Web (학습 중): JavaScript, TypeScript, React, Next.js, Node.js, Express
- Database: MongoDB(기초), SQLite
- 기타: Git, Linux, Python(데이터 분석용)

자격증:
- 전자기사 (2023.06)`,
  },
  {
    id: "jd-4-doc-2",
    personaId: "jd-4",
    title: "자기소개서 초안 — 라인 웹 개발",
    summary:
      "라인 웹 개발자 신입 지원 자기소개서 초안. 임베디드→웹 전환 동기와 강점 서술.",
    extractedText: `자기소개서 초안 — 라인 웹 개발자 신입

[전환 동기]
졸업 프로젝트에서 IoT 기기의 모니터링 대시보드를 React로 개발하면서
웹 기술의 즉각적인 피드백과 넓은 사용자 접점에 매력을 느꼈습니다.
임베디드에서 쌓은 저수준 시스템 이해가 웹 성능 최적화와
네트워크 프로토콜 이해에 강점이 될 것이라 생각합니다.

[차별화 포인트]
C/C++ 기반 시스템 프로그래밍 경험으로 메모리 관리, 비동기 처리,
네트워크 프로토콜(TCP/UDP, MQTT) 등 저수준 영역에 대한 이해도가 높습니다.
SensorView 프로젝트에서 WebSocket과 MQTT 브릿지를 직접 구현하며
이 배경 지식이 웹 개발에서도 유효함을 확인했습니다.

[라인 지원 동기]
라인은 글로벌 메신저로서 대규모 실시간 통신 인프라를 운영하고 있습니다.
임베디드 시스템에서 다뤄온 실시간 데이터 처리 경험이
라인의 메시징 서비스 개발에 기여할 수 있다고 생각합니다.

(미완성 — 웹 프로젝트 경험 보강, 구체적 기여 목표 추가 필요)`,
  },

  // ── jd-5 정예린: 이력서, 포트폴리오, 부트캠프 수료증 ──
  {
    id: "jd-5-doc-1",
    personaId: "jd-5",
    title: "이력서 — 정예린",
    summary:
      "문헌정보학 전공, 패스트캠퍼스 부트캠프 수료. JavaScript/Node.js 풀스택 신입.",
    extractedText: `정예린 — 풀스택 개발자

학력:
- 이화여자대학교 문헌정보학과 졸업 (2018.03 ~ 2022.02)
  - 학점: 3.7/4.5
  - 복수전공: 컴퓨터공학 (부전공 수준 이수, 42학점)

교육:
- 패스트캠퍼스 프론트엔드·백엔드 올인원 부트캠프 (2023.01 ~ 2023.07, 7개월)
  - JavaScript/TypeScript 풀스택 과정
  - React + Node.js(Express) 기반 프로젝트 3회 수행
  - 수료 성적: 상위 5%

전직 경험:
- 국립중앙도서관 디지털정보팀 계약직 (2022.03 ~ 2022.12, 10개월)
  - 전자책 메타데이터 관리 시스템 운영
  - Excel VBA 기반 데이터 정리 자동화 스크립트 작성
  - 퇴사 사유: 개발 직군 전환

프로젝트 경험:
1. "TripLog" — 여행 기록 공유 플랫폼 (2023.05 ~ 2023.07)
   - React + Node.js(Express) + MongoDB
   - 지도 API(카카오맵) 기반 여행 경로 시각화
   - 이미지 업로드(Multer + AWS S3) + 갤러리 뷰
   - 팀 프로젝트 (4인), 풀스택 담당
   - 부트캠프 파이널 프로젝트 우수상

2. "QuizArena" — 실시간 퀴즈 배틀 앱 (2023.03 ~ 2023.04)
   - React + Socket.io + Express + MySQL
   - 최대 8명 실시간 퀴즈 대전
   - 리더보드·점수 랭킹 시스템
   - 팀 프로젝트 (3인), 프론트엔드 + 실시간 통신 담당

기술 스택:
- Frontend: JavaScript, TypeScript, React, Next.js(기초)
- Backend: Node.js, Express, Prisma
- Database: MongoDB, MySQL, Redis(기초)
- DevOps: Docker(기초), Vercel, AWS(EC2, S3)
- 기타: Git, Figma(기초)`,
  },
  {
    id: "jd-5-doc-2",
    personaId: "jd-5",
    title: "포트폴리오 — 정예린",
    summary:
      "부트캠프 팀 프로젝트 2개 + 개인 프로젝트 1개. 여행 기록, 퀴즈 배틀, 도서 검색.",
    extractedText: `포트폴리오 — 정예린

1. TripLog (2023.05 ~ 2023.07)
   개요: 여행 일정·사진·경로를 기록하고 공유하는 플랫폼
   기술: React, Express, MongoDB, AWS S3, 카카오맵 API
   주요 기능:
   - 여행 일정별 타임라인 뷰
   - 카카오맵 기반 경로 시각화 (마커 + 폴리라인)
   - 사진 업로드 + EXIF 기반 자동 위치·날짜 태깅
   - 공개/비공개 여행 기록 설정
   - 좋아요·댓글·팔로우 소셜 기능
   성과:
   - 부트캠프 파이널 프로젝트 우수상
   - 데모 기간 등록 여행기 150건+, DAU 62명
   역할: 풀스택 (API 설계, 카카오맵 연동, 이미지 업로드 전담)

2. QuizArena (2023.03 ~ 2023.04)
   개요: 실시간 온라인 퀴즈 배틀 게임
   기술: React, Socket.io, Express, MySQL, Sequelize
   주요 기능:
   - 방 생성·입장·대기열 시스템
   - 실시간 문제 출제 + 타이머
   - 정답 즉시 채점 + 점수 업데이트
   - 라운드별 리더보드
   성과:
   - 동시 접속 최대 24명 테스트 완료
   - WebSocket 이벤트 설계 문서화 (12개 이벤트 타입)
   역할: 프론트엔드 + Socket.io 실시간 통신 담당

3. BookFinder (개인 프로젝트, 2023.08 ~ 진행 중)
   개요: 도서관 소장 도서 통합 검색 + 대출 가능 여부 확인
   기술: Next.js, Prisma, PostgreSQL, 도서관 정보나루 API
   주요 기능:
   - 전국 도서관 소장 도서 검색 (정보나루 API)
   - 대출 가능 도서관 지도 표시
   - 관심 도서 알림 (대출 가능 시 이메일 알림)
   배경: 전직 도서관 경험을 살려 기획
   현황: MVP 개발 중, API 연동 및 검색 기능 구현 완료`,
  },
  {
    id: "jd-5-doc-3",
    personaId: "jd-5",
    title: "부트캠프 수료증 — 정예린",
    summary: "패스트캠퍼스 프론트엔드·백엔드 올인원 부트캠프 수료증.",
    extractedText: `수료증

성명: 정예린
과정명: 프론트엔드·백엔드 올인원 부트캠프 3기
교육기관: 패스트캠퍼스
교육기간: 2023년 1월 9일 ~ 2023년 7월 14일 (총 840시간)
수료일: 2023년 7월 14일

교육 내용:
- HTML/CSS/JavaScript 기초
- React + TypeScript 프론트엔드 개발
- Node.js + Express 백엔드 개발
- MongoDB, MySQL 데이터베이스
- Git, Docker, AWS 배포
- 팀 프로젝트 2회, 개인 프로젝트 1회

수료 성적: 상위 5% (전체 48명 중 2위)

위 사람은 소정의 교육과정을 이수하였기에 이 증서를 수여합니다.

2023년 7월 14일
패스트캠퍼스 대표 이OO`,
  },
]

// ---------------------------------------------------------------------------
// 외부 문서
// ---------------------------------------------------------------------------

export const EXTERNAL_DOCUMENTS: MockExternalDocument[] = [
  // ── jd-1 이하은: 채용공고, 회사소개 ──
  {
    id: "jd-1-ext-1",
    personaId: "jd-1",
    title: "채용공고 — 토스 프론트엔드 개발자 신입",
    summary:
      "토스 프론트엔드 신입 채용. React, TypeScript 필수. 사용자 경험 중시.",
    extractedText: `[채용공고] 토스 — 프론트엔드 개발자 (신입/주니어)

담당 업무:
- 토스 앱 내 웹뷰 및 관리자 도구 프론트엔드 개발
- 디자인 시스템 컴포넌트 개발 및 유지보수
- 사용자 경험 개선을 위한 A/B 테스트 참여
- 웹 성능 최적화 (Core Web Vitals 기준)

자격 요건:
- React, TypeScript 활용 가능
- HTML, CSS 기본기 탄탄
- Git 기반 협업 경험
- 웹 표준 및 접근성에 대한 이해

우대 사항:
- Next.js 프로젝트 경험
- 상태 관리 라이브러리 경험 (Zustand, Recoil 등)
- 디자인 시스템 구축 경험
- 오픈소스 기여 경험
- 기술 블로그 운영

채용 절차:
서류 → 코딩 테스트 → 1차 면접 (기술) → 2차 면접 (컬처핏)`,
  },
  {
    id: "jd-1-ext-2",
    personaId: "jd-1",
    title: "회사소개 — 토스 (비바리퍼블리카)",
    summary:
      "토스(비바리퍼블리카) 회사 소개. 금융 슈퍼앱, MAU 2,100만, 기술 문화.",
    extractedText: `토스 (비바리퍼블리카) 회사 소개

미션: 금융을 쉽고 편리하게
비전: 모든 금융 경험을 하나의 앱에서

주요 지표:
- MAU 2,100만+
- 누적 가입자 3,000만+
- 직원 수 약 2,500명 (개발자 800명+)

주요 서비스:
- 토스 앱 (송금, 결제, 투자, 보험, 대출)
- 토스뱅크 (인터넷 전문은행)
- 토스페이먼츠 (PG사)
- 토스증권

개발 문화:
- 사일로(Silo) 조직 구조: 제품 단위 자율 팀
- 코드 리뷰 필수, PR 기반 협업
- 기술 블로그 "toss.tech" 운영
- Slash 라이브러리 오픈소스 공개
- 프론트엔드 기술 스택: React, TypeScript, Next.js
- 주 1회 기술 세미나

복리후생:
- 유연근무제, 원격근무 가능
- 장비 지원 (맥북 프로, 모니터 등)
- 교육비 지원 (연 100만원)`,
  },

  // ── jd-2 박준호: 채용공고 ──
  {
    id: "jd-2-ext-1",
    personaId: "jd-2",
    title: "채용공고 — 당근마켓 백엔드 개발자 신입",
    summary:
      "당근마켓 백엔드 신입 채용. Python/Django 또는 Ruby/Rails 경험 우대.",
    extractedText: `[채용공고] 당근마켓 — 백엔드 개발자 (신입)

담당 업무:
- 당근마켓 서비스 백엔드 API 개발
- 데이터 파이프라인 구축 및 관리
- 서비스 안정성 및 성능 개선
- 기존 시스템 리팩토링 참여

자격 요건:
- 웹 백엔드 개발 프레임워크 사용 경험 (Django, Rails, Spring 등)
- RDBMS (MySQL, PostgreSQL 등) 사용 경험
- RESTful API 설계 이해
- Git 기반 협업 경험
- 컴퓨터 과학 기초 지식 (자료구조, 알고리즘, 네트워크)

우대 사항:
- Python/Django 실무 또는 프로젝트 경험
- Docker, CI/CD 경험
- 테스트 코드 작성 습관
- 비전공자 전환 경험 (학습 의지 및 적응력 평가)
- 기술 블로그 또는 개인 프로젝트 운영

전형 절차:
서류 → 사전 과제 → 1차 면접 (기술) → 2차 면접 (컬처핏)

참고:
- 비전공 전환자도 적극 지원 환영합니다
- 포트폴리오 또는 GitHub 링크 필수 제출`,
  },

  // ── jd-3 최서연: 채용공고, 기술블로그 ──
  {
    id: "jd-3-ext-1",
    personaId: "jd-3",
    title: "채용공고 — 카카오 서버 개발자 신입",
    summary:
      "카카오 서버 개발자 신입 채용. Java/Kotlin, Spring 경험 필수. 대규모 트래픽 처리.",
    extractedText: `[채용공고] 카카오 — 서버 개발자 (신입)

담당 업무:
- 카카오 서비스 서버 개발 및 운영
- 대규모 트래픽을 처리하는 API 서버 설계·구현
- 마이크로서비스 아키텍처 기반 개발 참여
- 서비스 모니터링 및 장애 대응

자격 요건:
- Java 또는 Kotlin 프로그래밍 역량
- Spring Boot 기반 웹 애플리케이션 개발 경험
- RDBMS 및 SQL 활용 능력
- RESTful API 설계 및 구현 경험
- Git 기반 버전 관리 경험

우대 사항:
- JPA/Hibernate ORM 사용 경험
- Redis, Kafka 등 미들웨어 사용 경험
- 테스트 코드 작성 경험 (JUnit, Mockito)
- Docker, Kubernetes 기본 이해
- 기술 블로그 운영 또는 오픈소스 기여
- 인턴 또는 실무 경험

전형 절차:
서류 → 코딩 테스트 → 1차 면접 (기술) → 2차 면접 (인성)`,
  },
  {
    id: "jd-3-ext-2",
    personaId: "jd-3",
    title: "카카오 기술 블로그 — Spring Boot 3 마이그레이션 사례",
    summary:
      "카카오 기술 블로그 게시글. Spring Boot 2→3 마이그레이션 경험 공유.",
    extractedText: `카카오 기술 블로그 — "Spring Boot 3 마이그레이션, 우리는 이렇게 했습니다"

작성자: 카카오 서버플랫폼팀
게시일: 2024.01.15

요약:
카카오 내부 서비스 중 하나를 Spring Boot 2.7에서 3.2로 마이그레이션한
과정과 이슈를 공유합니다.

주요 변경 사항:
1. Java 17 필수 전환
   - 레코드 클래스, sealed 클래스 등 신규 기능 활용
   - GC 튜닝 (G1GC → ZGC 전환 검토)

2. Jakarta EE 전환
   - javax.* → jakarta.* 패키지 마이그레이션
   - 자동 변환 스크립트 작성으로 2,300개 파일 일괄 처리

3. Spring Security 6 대응
   - SecurityFilterChain 방식으로 전면 전환
   - deprecated된 antMatchers → requestMatchers 변경

4. 테스트 호환성 이슈
   - MockMvc 변경 사항 대응
   - TestContainers 버전 호환성 해결

교훈:
- 대규모 마이그레이션은 점진적으로 (모듈 단위 전환)
- 테스트 커버리지가 높을수록 안전한 마이그레이션 가능
- 팀 전체가 변경 사항을 이해해야 유지보수 가능`,
  },

  // ── jd-4 김도윤: 채용공고, JD상세 ──
  {
    id: "jd-4-ext-1",
    personaId: "jd-4",
    title: "채용공고 — 라인 웹 개발자 신입",
    summary:
      "라인 웹 개발자 신입 채용. JavaScript/TypeScript 필수, 실시간 통신 경험 우대.",
    extractedText: `[채용공고] LINE — 웹 개발자 (신입)

담당 업무:
- LINE 메신저 웹 클라이언트 개발
- 내부 어드민 도구 웹 프론트엔드 개발
- LINE 플랫폼 연동 웹 서비스 개발
- 사용자 인터페이스 및 인터랙션 개선

자격 요건:
- JavaScript 또는 TypeScript 프로그래밍 역량
- React 또는 Vue.js 프레임워크 사용 경험
- HTML5, CSS3, 반응형 웹 구현 능력
- HTTP, WebSocket 등 웹 프로토콜 이해
- Git 기반 협업 경험

우대 사항:
- 실시간 통신(WebSocket, SSE) 구현 경험
- Node.js 백엔드 개발 경험
- 웹 성능 최적화 경험
- 크로스 브라우저 호환성 이슈 해결 경험
- 전공 무관 (CS 기초 지식 보유 시)

전형 절차:
서류 → 코딩 테스트 → 1차 면접 (기술) → 2차 면접 (임원)

참고:
- 비전공자, 전과자 적극 환영
- 포트폴리오 또는 기술 블로그 제출 권장`,
  },
  {
    id: "jd-4-ext-2",
    personaId: "jd-4",
    title: "JD 상세 — 라인 웹 개발 직무 소개",
    summary: "라인 웹 개발 직무의 상세 설명. 팀 구성, 기술 스택, 성장 경로.",
    extractedText: `LINE 웹 개발 직무 상세 소개

팀 구성:
- 웹 개발팀 약 40명 (프론트엔드 25명, 풀스택 15명)
- 한국·일본 개발자 혼합 팀 (영어 커뮤니케이션)
- Scrum 기반 2주 스프린트

기술 스택:
- Frontend: React, TypeScript, Next.js, Webpack/Vite
- Backend: Node.js, Express, NestJS
- 실시간: WebSocket, gRPC
- 테스트: Jest, Cypress, Playwright
- 인프라: Kubernetes, Docker, Vercel, AWS

신입 성장 경로:
- 입사 후 3개월: 온보딩 + 멘토링 (시니어 개발자 1:1 매칭)
- 3~6개월: 소규모 기능 개발 담당
- 6개월~: 독립 기능 개발 + 코드 리뷰 참여
- 1년~: 프로젝트 리드 기회

글로벌 환경:
- 일본 본사와 협업 (영어 문서, 영어 회의 주 1회)
- 글로벌 서비스 경험 (2억+ MAU)
- 해외 컨퍼런스 참석 지원`,
  },

  // ── jd-5 정예린: 채용공고, 회사소개 ──
  {
    id: "jd-5-ext-1",
    personaId: "jd-5",
    title: "채용공고 — 쿠팡 풀스택 개발자 신입",
    summary:
      "쿠팡 풀스택 신입 채용. JavaScript/TypeScript, React, Node.js 경험 우대.",
    extractedText: `[채용공고] 쿠팡 — 풀스택 개발자 (신입)

담당 업무:
- 쿠팡 내부 운영 도구 프론트엔드 + 백엔드 개발
- 물류·배송 관련 대시보드 개발
- 데이터 시각화 및 리포팅 도구 구축
- 기존 시스템 성능 개선 및 리팩토링

자격 요건:
- JavaScript 또는 TypeScript 프로그래밍 능력
- React 프론트엔드 프레임워크 사용 경험
- Node.js 또는 Python 백엔드 개발 경험
- RDBMS(MySQL, PostgreSQL) 또는 NoSQL(MongoDB) 사용 경험
- RESTful API 설계 및 구현 경험

우대 사항:
- Next.js 프로젝트 경험
- ORM(Prisma, Sequelize 등) 사용 경험
- Docker, CI/CD 경험
- 팀 프로젝트 경험 (Git 기반 협업)
- 비전공자 전환 경험 환영

전형 절차:
서류 → 온라인 코딩 테스트 → 1차 면접 (기술) → 2차 면접 (리더십)`,
  },
  {
    id: "jd-5-ext-2",
    personaId: "jd-5",
    title: "회사소개 — 쿠팡",
    summary: "쿠팡 회사 소개. 로켓배송, 기술 문화, 글로벌 인재 환경.",
    extractedText: `쿠팡 회사 소개

미션: 고객이 "쿠팡 없이 어떻게 살았을까" 생각하게 만드는 것
비전: 기술로 커머스 혁신

주요 지표:
- 활성 고객 수 2,000만+
- 로켓배송 주문 비율 70%+
- 직원 수 약 70,000명 (개발 조직 3,000명+)

주요 서비스:
- 쿠팡 마켓플레이스 (종합 쇼핑)
- 로켓배송 / 로켓프레시
- 쿠팡이츠 (음식 배달)
- 쿠팡플레이 (OTT)

개발 문화:
- 소규모 스쿼드(Squad) 조직
- 코드 리뷰 필수 (PR 승인 2인+)
- 기술 블로그 "Coupang Engineering" 운영
- 사내 해커톤 분기 1회
- 기술 스택: React, TypeScript, Node.js, Java, Spring, Kubernetes

복리후생:
- 스톡옵션 (RSU)
- 유연근무제
- 장비 지원
- 교육비 지원 (연 200만원)`,
  },
]

// ---------------------------------------------------------------------------
// 커리어노트
// ---------------------------------------------------------------------------

export const CAREER_NOTES: MockCareerNote[] = [
  // ── jd-1 이하은: 3건 ──
  {
    id: "jd-1-note-1",
    personaId: "jd-1",
    title: "StudyMate WebSocket 안정성 개선",
    summary:
      "WebSocket 연결 불안정 문제를 heartbeat + 지수 백오프로 해결. 연결 안정성 30%→98%.",
    content: `StudyMate 프로젝트에서 실시간 채팅의 WebSocket 연결 안정성을 개선한 경험.

문제: 모바일 환경에서 WebSocket 연결이 자주 끊어져 메시지 유실 발생
  - 특히 네트워크 전환(Wi-Fi↔LTE) 시 재연결 실패율 높음
  - 사용자 불만 다수 (5건/일 평균)

원인 분석:
  - 브라우저의 WebSocket 자동 재연결이 없음
  - 연결 상태 감지 로직 부재
  - 서버 측 타임아웃 설정 불일치

해결:
  - ping/pong heartbeat 구현 (30초 간격)
  - 연결 끊김 감지 시 지수 백오프 재시도 (1초, 2초, 4초, 8초, 최대 30초)
  - 재연결 성공 후 미수신 메시지 동기화 (lastEventId 기반)
  - 연결 상태 UI 표시 (연결 중/끊김/재연결 중)

결과:
  - 연결 안정성 30%→98% 개선
  - 메시지 유실 건수 일 5건→월 1건 미만
  - 교내 해커톤 심사 시 "안정성" 항목에서 높은 평가`,
    metadata: { project: "StudyMate", period: "2023.11" },
  },
  {
    id: "jd-1-note-2",
    personaId: "jd-1",
    title: "PixelBoard Canvas 렌더링 최적화",
    summary:
      "Canvas 드로잉 성능을 requestAnimationFrame + 더블 버퍼링으로 최적화. FPS 15→60.",
    content: `PixelBoard 프로젝트에서 다중 사용자 동시 드로잉 시 발생한 성능 이슈를 해결한 경험.

문제: 5명 이상 동시 드로잉 시 프레임 드롭 심각 (15 FPS 이하)
  - Canvas에 모든 스트로크를 매번 다시 그리는 방식의 비효율

원인 분석:
  - 매 입력 이벤트마다 전체 캔버스 재렌더링
  - 다른 사용자의 스트로크 데이터가 실시간으로 들어올 때 즉시 렌더링

해결:
  - requestAnimationFrame 기반 렌더 루프로 전환 (이벤트 드리븐→프레임 드리븐)
  - 더블 버퍼링: 오프스크린 캔버스에 완성된 스트로크 축적, 메인 캔버스는 현재 입력만 렌더
  - 원격 사용자 스트로크 배치 처리 (100ms 단위 모아서 렌더)
  - 화면 밖 스트로크 렌더 스킵 (뷰포트 기반 컬링)

결과:
  - 10명 동시 드로잉 시에도 안정적 60 FPS 유지
  - 체감 지연 시간 200ms→50ms 이하
  - 캡스톤 디자인 심사에서 "기술적 완성도" 최고점`,
    metadata: { project: "PixelBoard", period: "2023.05" },
  },
  {
    id: "jd-1-note-3",
    personaId: "jd-1",
    title: "DevLog 블로그 SEO 및 성능 최적화",
    summary:
      "Next.js 블로그의 Lighthouse 점수를 72→98로 개선. SSG, 이미지 최적화, 메타태그.",
    content: `개인 블로그 DevLog의 SEO 및 웹 성능을 최적화한 경험.

문제: 구글 검색 노출이 거의 없음, Lighthouse Performance 72점
  - 월 방문자 200명 미만

분석:
  - CSR 방식이라 검색 엔진 크롤링 불리
  - 이미지 최적화 없이 원본 그대로 서빙
  - 메타태그, OG 태그 누락

해결:
  - Next.js App Router + generateStaticParams로 SSG 전환
  - next/image 컴포넌트로 자동 WebP 변환 + lazy loading
  - generateMetadata로 페이지별 동적 메타태그 생성
  - sitemap.xml, robots.txt 자동 생성
  - 코드 스플리팅 + 폰트 최적화 (next/font)

결과:
  - Lighthouse Performance 72→98점
  - 구글 검색 유입 월 800건+ (기존 거의 0)
  - 월 방문자 200명→1,200명 (6배 증가)
  - "React useTransition 사용법" 키워드 구글 검색 1페이지 진입`,
    metadata: { project: "DevLog", period: "2023.08" },
  },

  // ── jd-2 박준호: 2건 ──
  {
    id: "jd-2-note-1",
    personaId: "jd-2",
    title: "FoodDiary API 응답 속도 개선",
    summary:
      "식품 영양 DB 조회 API 응답 시간을 Redis 캐싱으로 2.1초→280ms로 단축.",
    content: `FoodDiary 프로젝트에서 식품 영양 정보 조회 API의 느린 응답 속도를 개선한 경험.

문제: 음식 검색 시 응답 시간 평균 2.1초로, 사용자 체감 속도 매우 느림
  - 부트캠프 멘토 피드백: "검색이 너무 느려서 실사용이 어렵다"

원인 분석:
  - 매 요청마다 식약처 공공 API 외부 호출 (평균 1.5초)
  - 공공 API 응답을 파싱·변환하는 로직 비효율
  - 동일 검색어에 대한 중복 호출

해결:
  - Redis 캐싱 도입 (검색어 해시를 키, TTL 24시간)
  - 인기 검색어 100개 사전 캐싱 (cron job, 매일 새벽 3시)
  - 공공 API 응답 파싱 로직 최적화 (불필요한 필드 제거)
  - 클라이언트 측 디바운싱 (300ms)

결과:
  - 캐시 히트 시 응답 시간 280ms (86% 개선)
  - 캐시 히트율 72% (인기 음식 검색이 대부분)
  - 부트캠프 파이널 발표에서 "성능 개선 사례" 항목 높은 평가`,
    metadata: { project: "FoodDiary", period: "2023.09" },
  },
  {
    id: "jd-2-note-2",
    personaId: "jd-2",
    title: "비전공자에서 개발자로의 전환 과정",
    summary:
      "경영학 전공에서 백엔드 개발자로 전환한 6개월간의 학습 및 적응 과정 기록.",
    content: `경영학 전공에서 백엔드 개발자로 전환하기까지의 과정 기록.

전환 동기:
  - 한솔유통 마케팅팀에서 GA 데이터를 다루며 프로그래밍에 관심
  - Excel VBA로 반복 업무 자동화하면서 개발의 재미를 느낌
  - 사수가 "코드 잘 짜는데 개발자 해보지 않겠냐"고 권유

부트캠프 선택 이유 (코드스테이츠):
  - Python/Django 커리큘럼 (비전공자 친화적)
  - 팀 프로젝트 비중 높음 (실무 경험)
  - 수료 후 취업 지원 프로그램

학습 전략:
  - 오전: 강의 수강 + 실습
  - 오후: 팀 프로젝트 + 페어 프로그래밍
  - 저녁: CS 기초 보충 (자료구조, 네트워크, DB)
  - 주말: 알고리즘 문제 풀이 (프로그래머스 Level 2까지)

어려웠던 점:
  - 초반 2달: CS 용어 자체가 낯설어 수업 따라가기 힘들었음
  - Django ORM의 N+1 문제 이해에 2주 소요
  - 팀 프로젝트에서 Git 충돌 해결에 어려움

극복 과정:
  - 매일 TIL(Today I Learned) 작성으로 학습 내용 체계화
  - 모르는 개념은 유튜브 + 공식 문서 병행 학습
  - 스터디 그룹 결성 (4명, 주 3회 알고리즘 스터디)

성장 지표:
  - 부트캠프 수료 성적 상위 10%
  - 프로그래머스 Level 2 완료 (Python)
  - FoodDiary 프로젝트 최우수 팀 선정`,
    metadata: { period: "2023.01 ~ 2023.09" },
  },

  // ── jd-3 최서연: 4건 ──
  {
    id: "jd-3-note-1",
    personaId: "jd-3",
    title: "와디즈 인턴: 배송 조회 API Redis 캐싱",
    summary:
      "택배사 API 응답 불안정 문제를 Redis 캐싱으로 해결. 응답 시간 1.2초→180ms.",
    content: `와디즈 인턴 기간 중 리워드 배송 상태 조회 API의 성능을 개선한 경험.

배경:
  - 크라우드펀딩 리워드 배송 상태를 조회하는 API 신규 개발 담당
  - 택배사(CJ대한통운, 한진택배) API를 연동해 실시간 조회

문제:
  - 택배사 API 응답 시간이 불안정 (200ms~3초, 평균 1.2초)
  - 동일 운송장 번호에 대한 반복 조회 빈번 (하루 평균 5회/건)
  - 사용자가 페이지 새로고침할 때마다 외부 API 호출

해결:
  - Redis 캐싱 도입 (운송장 번호를 키, 배송 상태 JSON을 값)
  - TTL 30분 설정 (배송 상태 갱신 주기 고려)
  - 캐시 미스 시에만 택배사 API 호출 후 캐시 저장
  - 배송 완료 상태는 TTL 24시간으로 연장

결과:
  - 캐시 히트 시 응답 시간 180ms (85% 개선)
  - 택배사 API 호출 횟수 80% 감소
  - 팀 리드 코멘트: "신입인데 캐싱 전략을 잘 설계했다"`,
    metadata: { company: "와디즈", period: "2023.08" },
  },
  {
    id: "jd-3-note-2",
    personaId: "jd-3",
    title: "CampusMarket 실시간 채팅 구현",
    summary:
      "STOMP + WebSocket 기반 1:1 실시간 채팅 구현. 메시지 읽음 처리, 알림 기능 포함.",
    content: `CampusMarket 프로젝트에서 중고거래 1:1 실시간 채팅 기능을 구현한 경험.

요구사항:
  - 판매자-구매자 간 1:1 실시간 채팅
  - 메시지 읽음/안읽음 상태 표시
  - 새 메시지 알림 (브라우저 푸시)
  - 채팅 내역 영구 저장

기술 선택:
  - STOMP over WebSocket (Spring 공식 지원, 구현 편의성)
  - SockJS (WebSocket 미지원 브라우저 폴백)
  - MySQL에 메시지 영구 저장 (chat_room, chat_message 테이블)

구현 상세:
  - /topic/chat/{roomId} 구독으로 실시간 메시지 수신
  - 메시지 전송 시 DB 저장 + WebSocket 브로드캐스트
  - 읽음 처리: 상대방 구독 중이면 즉시 "읽음" 상태 업데이트
  - 오프라인 시 SSE로 새 메시지 알림 전송

어려웠던 점:
  - STOMP 세션 관리와 스프링 시큐리티 인증 연동
  - 해결: ChannelInterceptor에서 JWT 토큰 검증 로직 구현

성과:
  - 평균 메시지 전달 지연 시간 120ms 이하
  - 동시 접속 50명 테스트 통과
  - 교내 사용자 200명 중 채팅 활용률 78%`,
    metadata: { project: "CampusMarket", period: "2023.05" },
  },
  {
    id: "jd-3-note-3",
    personaId: "jd-3",
    title: "와디즈 인턴: MyBatis→JPA 마이그레이션",
    summary:
      "레거시 MyBatis 쿼리를 JPA Repository로 전환. 코드량 40% 감소, 타입 안정성 확보.",
    content: `와디즈 인턴에서 레거시 MyBatis 코드를 JPA로 마이그레이션한 경험.

배경:
  - 와디즈 서버 코드의 일부가 MyBatis XML 매퍼로 관리
  - 새 기능 추가 시 MyBatis와 JPA가 혼재되어 유지보수 어려움
  - 팀 방침: 점진적으로 JPA로 전환

담당 범위:
  - 리워드 관련 MyBatis 쿼리 5건을 Spring Data JPA Repository로 전환
  - 기존 동작과 100% 동일한 결과를 보장해야 함

작업 내용:
  - MyBatis XML의 SQL을 분석하여 JPA Entity + Repository 매핑
  - 복잡한 조건 검색은 QueryDSL 또는 @Query로 처리
  - 기존 테스트 코드를 JPA 기반으로 수정 + 추가 작성
  - 마이그레이션 전후 동일 입력에 대한 결과 비교 검증 스크립트 작성

어려웠던 점:
  - MyBatis의 dynamic SQL (<if>, <choose>)을 JPA로 변환하는 것
  - 해결: Specification 패턴 + Criteria API 조합

결과:
  - 쿼리 관련 코드량 40% 감소 (XML 제거, 타입 안전한 코드)
  - 테스트 커버리지 68%→82%로 증가
  - 코드 리뷰에서 "깔끔한 전환"이라는 피드백`,
    metadata: { company: "와디즈", period: "2023.09" },
  },
  {
    id: "jd-3-note-4",
    personaId: "jd-3",
    title: "GDSC 활동: 기술 세미나 발표",
    summary:
      "GDSC 성균관대에서 'Spring Boot 테스트 전략' 주제로 세미나 발표. 참석자 35명.",
    content: `GDSC(Google Developer Student Clubs) 성균관대 멤버로 활동하며 기술 세미나에서 발표한 경험.

발표 주제: "Spring Boot 테스트, 어디까지 해봤니?"
참석자: GDSC 멤버 35명
일시: 2023년 4월

발표 내용:
1. 테스트 피라미드 (단위 → 통합 → E2E)
2. @SpringBootTest vs @WebMvcTest vs @DataJpaTest 비교
3. Mockito로 의존성 격리하기
4. TestContainers로 실제 DB 테스트
5. 라이브 코딩: 간단한 CRUD API의 테스트 작성

준비 과정:
  - 발표 자료 제작 2주
  - 라이브 코딩 예제 프로젝트 준비
  - 사전 리허설 2회

배운 점:
  - 기술을 '설명할 수 있을 만큼' 이해하는 것의 중요성
  - 발표 후 질문에 답변하며 스스로의 지식 구멍 발견
  - "왜" 테스트를 작성하는지 동기 부여가 먼저라는 점

반응:
  - 만족도 설문 4.6/5.0
  - 발표 후 개인 블로그에 정리한 글이 조회수 3,100+ 기록`,
    metadata: { activity: "GDSC 성균관대", period: "2023.04" },
  },

  // ── jd-4 김도윤: 3건 ──
  {
    id: "jd-4-note-1",
    personaId: "jd-4",
    title: "IoT 졸업프로젝트: MQTT-WebSocket 브릿지 구현",
    summary:
      "Raspberry Pi의 MQTT 센서 데이터를 WebSocket으로 브릿지하여 웹 대시보드에 실시간 표시.",
    content: `졸업 프로젝트(IoT 스마트홈 허브)에서 MQTT 데이터를 웹으로 전달하는 브릿지를 구현한 경험.

배경:
  - Raspberry Pi에 연결된 센서들이 MQTT 프로토콜로 데이터 전송
  - 웹 브라우저에서 실시간으로 센서 데이터를 모니터링해야 함
  - 브라우저는 MQTT를 직접 지원하지 않음

해결 아키텍처:
  - Node.js 서버가 MQTT 브로커(Mosquitto)를 구독
  - 수신한 데이터를 WebSocket으로 연결된 브라우저에 전달
  - React 프론트엔드에서 Chart.js로 실시간 그래프 렌더링

구현 상세:
  - mqtt.js로 MQTT 구독 (토픽: home/+/sensor/+)
  - ws 라이브러리로 WebSocket 서버 구현
  - 토픽 기반 라우팅: MQTT 토픽 → WebSocket 채널 매핑
  - 데이터 포맷 변환: MQTT 바이너리 → JSON → 프론트엔드 표시

임베디드 지식 활용:
  - 센서 데이터의 노이즈 필터링 (이동 평균 필터, C에서 구현 경험 있음)
  - MQTT QoS 레벨 설정 (센서별 중요도에 따라 0/1/2 구분)
  - 센서 캘리브레이션 로직 (임베디드에서의 경험 활용)

결과:
  - 센서→화면 전달 지연 시간 평균 150ms
  - 졸업 프로젝트 우수상 수상
  - "이 프로젝트가 웹 개발로 전환하는 계기가 되었습니다"`,
    metadata: { project: "IoT 스마트홈 허브", period: "2023.09" },
  },
  {
    id: "jd-4-note-2",
    personaId: "jd-4",
    title: "SensorView: Express + MongoDB 백엔드 구축",
    summary:
      "IoT 센서 데이터 저장·조회용 REST API를 Express + MongoDB로 구축한 학습 기록.",
    content: `웹 전환 사이드 프로젝트 SensorView의 백엔드를 처음부터 구축한 경험.

목표:
  - IoT 센서에서 수집한 데이터를 저장하고 조회하는 REST API 구축
  - 웹 백엔드 개발을 처음부터 실습하여 실무 감각 확보

기술 스택:
  - Node.js + Express (라우팅, 미들웨어)
  - MongoDB + Mongoose (센서 데이터 스키마)
  - JWT 인증 (jsonwebtoken + bcrypt)

구현한 API:
  - POST /api/sensors — 센서 데이터 저장 (MQTT에서 수신 후 호출)
  - GET /api/sensors/:type — 센서 종류별 최근 데이터 조회
  - GET /api/sensors/range — 기간별 데이터 조회 (쿼리 파라미터)
  - GET /api/dashboard/summary — 전체 센서 요약 통계
  - POST /api/auth/login, /api/auth/register — 인증

배운 점:
  - Express 미들웨어 체인의 동작 원리 (C의 함수 포인터 체인과 유사)
  - MongoDB의 유연한 스키마가 센서 데이터에 적합 (센서별 필드 다름)
  - 에러 핸들링 미들웨어의 중요성 (초기에 에러 처리 누락으로 서버 크래시)

임베디드와의 차이점 체감:
  - 메모리 관리를 직접 하지 않는 편안함 (C malloc/free vs JS GC)
  - 비동기 프로그래밍 패러다임의 어려움 (콜백 → Promise → async/await)
  - HTTP 프로토콜 이해가 빠른 편 (TCP 소켓 프로그래밍 경험 덕분)`,
    metadata: { project: "SensorView", period: "2023.08" },
  },
  {
    id: "jd-4-note-3",
    personaId: "jd-4",
    title: "C/C++ 시스템 프로그래밍 경험이 웹에서 도움된 사례",
    summary:
      "임베디드 배경이 웹 개발에서 어떻게 강점으로 작용하는지 정리한 기록.",
    content: `임베디드/시스템 프로그래밍 배경이 웹 개발에서 실제로 도움이 된 사례 정리.

1. 네트워크 프로토콜 이해
   - 임베디드: TCP/UDP 소켓 프로그래밍, MQTT 직접 구현 경험
   - 웹 적용: WebSocket 핸드셰이크 과정, HTTP/2 멀티플렉싱 이해가 빠름
   - 실제: SensorView에서 WebSocket 연결 문제를 패킷 레벨에서 디버깅

2. 메모리와 성능 의식
   - 임베디드: 제한된 RAM(256KB)에서 최적화하는 습관
   - 웹 적용: 불필요한 렌더링, 메모리 누수를 민감하게 감지
   - 실제: React 컴포넌트의 useEffect cleanup을 빠뜨리지 않는 습관

3. 비트 연산 / 데이터 변환
   - 임베디드: 센서 데이터의 바이트 파싱, 엔디안 변환
   - 웹 적용: ArrayBuffer, DataView 다루기에 익숙
   - 실제: MQTT 바이너리 페이로드→JSON 변환 시 효율적 구현

4. 디버깅 방법론
   - 임베디드: 오실로스코프, 로직 분석기로 저수준 디버깅
   - 웹 적용: Chrome DevTools의 Network/Performance 탭 활용에 거부감 없음
   - 실제: 네트워크 타이밍 분석으로 API 병목 구간 빠르게 식별

결론:
  "저수준을 이해하면 고수준을 더 잘 다룰 수 있다"는 것을 체감.
  전환이 아닌 확장이라 생각하며 학습 중.`,
    metadata: { period: "2023.06 ~ 현재" },
  },

  // ── jd-5 정예린: 2건 ──
  {
    id: "jd-5-note-1",
    personaId: "jd-5",
    title: "TripLog: 카카오맵 API 연동 및 경로 시각화",
    summary:
      "카카오맵 API로 여행 경로를 시각화하고, EXIF 데이터로 사진 위치를 자동 태깅.",
    content: `TripLog 프로젝트에서 카카오맵 API를 연동하고 여행 경로를 시각화한 경험.

요구사항:
  - 여행 일정의 방문 장소를 지도에 마커로 표시
  - 방문 순서대로 폴리라인으로 경로 연결
  - 사진 업로드 시 촬영 위치를 자동으로 지도에 표시

기술 구현:
  1. 카카오맵 JavaScript SDK 연동
     - React 컴포넌트로 래핑 (useMap 커스텀 훅)
     - 마커 클러스터링 (장소가 많을 때 성능 최적화)

  2. 경로 시각화
     - 방문 순서대로 Polyline 렌더링
     - 일자별 색상 구분 (Day 1: 파랑, Day 2: 초록 ...)
     - 줌 레벨에 따른 경로 단순화 (Douglas-Peucker 알고리즘)

  3. EXIF 기반 자동 위치 태깅
     - exifr 라이브러리로 사진 EXIF 메타데이터 파싱
     - GPS 좌표 추출 → 카카오맵 좌표계 변환
     - 촬영 날짜·시간 자동 추출

어려웠던 점:
  - EXIF GPS 좌표(도분초) → 십진수 변환 로직 구현
  - iOS 사진의 EXIF 형식이 Android와 달라 분기 처리 필요

결과:
  - 사진 업로드만으로 여행 경로 자동 생성 기능 구현
  - 부트캠프 발표에서 "지도 연동이 직관적" 호평
  - TripLog 데모 기간 중 등록 여행기 150건+ 달성에 기여`,
    metadata: { project: "TripLog", period: "2023.06" },
  },
  {
    id: "jd-5-note-2",
    personaId: "jd-5",
    title: "비전공에서 개발자로: 도서관 경험이 개발에 미친 영향",
    summary:
      "문헌정보학 전공과 도서관 근무 경험이 개발자로서의 정보 구조화·문서화 역량에 미친 영향.",
    content: `문헌정보학 전공과 도서관 근무 경험이 개발에 어떻게 도움이 되는지 정리.

1. 정보 구조화 능력
   - 도서관학: 정보 분류 체계(KDC, DDC), 메타데이터 스키마 설계
   - 개발 적용: DB 스키마 설계 시 정규화·관계 설정이 직관적
   - 실제: TripLog의 여행기-일정-장소-사진 계층 구조를 빠르게 모델링

2. 문서화 습관
   - 도서관학: 목록 기술, 초록 작성 등 정보 요약 훈련
   - 개발 적용: API 문서, README, 코드 주석 작성이 체계적
   - 실제: QuizArena WebSocket 이벤트 12종의 문서를 작성하여 팀 커뮤니케이션 원활

3. 검색 시스템 이해
   - 도서관학: 정보 검색론, 불리언 검색, 색인 원리
   - 개발 적용: DB 인덱싱, 전문 검색 개념 이해가 빠름
   - 실제: BookFinder 프로젝트에서 도서관 정보나루 API 검색 로직 설계

4. 사용자 관점
   - 도서관: 이용자 서비스 경험 (정보 안내, 검색 도움)
   - 개발 적용: 사용자 니즈 파악, UX 설계에 강점
   - 실제: TripLog의 사진 자동 태깅 기능은 이용자 편의성을 고려한 기획

결론:
  비전공이 '약점'이 아니라 '다른 강점'이 될 수 있음을 경험으로 확인.
  정보 구조화, 문서화, 사용자 관점은 개발에서도 핵심 역량.`,
    metadata: { period: "2023.01 ~ 현재" },
  },
]

// ---------------------------------------------------------------------------
// 대화 스타일
// ---------------------------------------------------------------------------

export const CONV_STYLES: Record<string, Record<string, ConvMessage[]>> = {
  // ── jd-1 이하은: 토스 프론트엔드 지원 ──
  "jd-1": {
    polite: [
      {
        role: "user",
        content:
          "안녕하세요, 토스 프론트엔드 개발자 신입에 지원하려고 합니다. 자기소개서 작성을 도와주실 수 있을까요?",
      },
      {
        role: "assistant",
        content:
          "네, 토스 프론트엔드 신입 포지션 자기소개서를 도와드리겠습니다! 이력서와 포트폴리오, 채용공고를 확인해볼게요. 어떤 부분부터 시작할까요?",
      },
      {
        role: "user",
        content:
          "일단 자소서 초안이 있는데 좀 부족한 것 같아서요. 초안을 기반으로 보강해주시면 좋겠습니다.",
      },
      {
        role: "assistant",
        content:
          "자기소개서 초안을 확인했습니다. 지원 동기, 프로젝트 경험, 기술적 관심사로 구성되어 있네요. 토스 채용공고에서 사용자 경험, 디자인 시스템, 웹 성능 최적화를 강조하고 있으니 이 키워드에 맞춰 보강하면 좋겠습니다. 어떤 항목부터 수정할까요?",
      },
      {
        role: "user",
        content:
          "지원 동기부터 보강해주세요. 토스의 어떤 점에 관심이 있는지 구체적으로 쓰고 싶어요.",
      },
      {
        role: "assistant",
        content:
          "토스의 특징을 반영해서 지원 동기를 보강해보겠습니다. 토스는 MAU 2,100만의 금융 슈퍼앱이고, Slash 라이브러리 같은 오픈소스 활동, toss.tech 기술 블로그 등 프론트엔드 기술 문화가 활발합니다. 이하은 님의 DevLog 블로그 운영 경험과 연결하면 좋을 것 같은데요, 이런 방향이 괜찮으실까요?",
      },
      {
        role: "user",
        content:
          "네, 좋아요. 그리고 StudyMate 프로젝트에서 사용자 피드백 반영 경험도 넣어주세요. 실제로 MAU 320명을 달성했던 게 토스의 사용자 중심 문화와 맞닿아 있다고 생각해요.",
      },
      {
        role: "assistant",
        content:
          "좋은 포인트예요. StudyMate의 교내 MAU 320명 달성 경험과 사용자 피드백 기반 개선을 지원 동기에 녹여서 작성하겠습니다. '소규모지만 실제 사용자의 피드백을 반영하며 서비스를 개선한 경험이 토스에서 더 큰 규모로 확장할 발판이 된다'는 스토리로 잡아볼까요?",
      },
      {
        role: "user",
        content:
          "완벽해요. 그 방향으로 지원 동기를 작성해주시고, 프로젝트 경험 항목도 StudyMate의 WebSocket 안정성 개선 사례를 중심으로 써주세요.",
      },
    ],
    terse: [
      {
        role: "user",
        content: "토스 프론트엔드 자소서",
      },
      {
        role: "assistant",
        content:
          "토스 프론트엔드 신입 자기소개서를 작성해드리겠습니다. 초안이 있으시네요. 이걸 기반으로 보강할까요, 새로 쓸까요?",
      },
      {
        role: "user",
        content: "초안 기반으로 고쳐줘",
      },
      {
        role: "assistant",
        content:
          "초안 확인했습니다. 지원 동기가 좀 추상적이고, 성장 과정 항목이 빠져 있네요. 토스 채용공고 키워드에 맞게 보강하겠습니다.",
      },
      {
        role: "user",
        content: "StudyMate 경험 위주로",
      },
      {
        role: "assistant",
        content:
          "StudyMate의 WebSocket 안정성 개선(30%→98%)과 MAU 320명 달성 경험을 중심으로 작성하겠습니다.",
      },
      {
        role: "user",
        content: "블로그 SEO도 넣어",
      },
      {
        role: "assistant",
        content:
          "DevLog 블로그의 Lighthouse 98점 달성, 월 방문자 6배 증가 경험도 기술적 관심사 항목에 반영하겠습니다.",
      },
    ],
    jumpy: [
      {
        role: "user",
        content: "토스 자소서 쓸건데 도와줘",
      },
      {
        role: "assistant",
        content:
          "네, 토스 프론트엔드 신입 자기소개서를 도와드리겠습니다. 어떤 부분부터 시작할까요?",
      },
      {
        role: "user",
        content: "아 잠깐 그전에 내 포트폴리오에 StudyMate Stars가 맞는지 확인해줘",
      },
      {
        role: "assistant",
        content:
          "포트폴리오 확인했습니다. StudyMate는 GitHub Stars 87, Fork 23으로 기재되어 있습니다. 수정할 부분이 있나요?",
      },
      {
        role: "user",
        content:
          "ㅇㅇ 맞아 이제 92인데 나중에 고치고. 근데 자소서 말고 이력서에 Zustand 추가해야 되나?",
      },
      {
        role: "assistant",
        content:
          "이력서에 Zustand가 이미 기술 스택에 포함되어 있습니다. 토스 채용공고에서도 Zustand를 우대사항으로 언급하고 있어서 잘 넣으셨네요.",
      },
      {
        role: "user",
        content:
          "아 맞다 그럼 자소서로 돌아가서, PixelBoard 캔버스 최적화 얘기도 넣을 수 있을까?",
      },
      {
        role: "assistant",
        content:
          "PixelBoard의 Canvas 렌더링 최적화(FPS 15→60) 경험은 토스 채용공고의 '웹 성능 최적화' 키워드와 잘 맞습니다. 프로젝트 경험 항목에 반영하겠습니다.",
      },
      {
        role: "user",
        content:
          "좋아 근데 토스 회사 문화가 사일로 조직이라는데 그거 지원 동기에 어떻게 녹이지?",
      },
      {
        role: "assistant",
        content:
          "토스의 사일로 조직은 제품 단위 자율 팀이에요. PixelBoard에서 프론트엔드 리드로 팀을 이끈 경험이나, StudyMate를 독립적으로 기획·개발한 경험을 연결하면 '자율적으로 문제를 해결하는 역량'으로 어필할 수 있습니다.",
      },
      {
        role: "user",
        content: "오 그거 좋다. 그럼 그 방향으로 지원 동기 써줘",
      },
    ],
  },

  // ── jd-2 박준호: 당근마켓 백엔드 지원 ──
  "jd-2": {
    polite: [
      {
        role: "user",
        content:
          "안녕하세요, 당근마켓 백엔드 개발자 신입에 지원하려고 합니다. 비전공 전환자인데 자기소개서를 어떻게 쓰면 좋을까요?",
      },
      {
        role: "assistant",
        content:
          "안녕하세요! 당근마켓 백엔드 신입 포지션이군요. 채용공고를 보니 비전공 전환자도 적극 환영한다고 되어 있어서 좋은 기회입니다. 이력서와 포트폴리오를 확인해볼게요. 어떤 구조로 자소서를 쓸지 함께 정해볼까요?",
      },
      {
        role: "user",
        content:
          "네, 우선 비전공 전환자라는 점이 약점이 되지 않도록 쓰고 싶어요. 오히려 강점으로 어필할 수 있을까요?",
      },
      {
        role: "assistant",
        content:
          "충분히 가능합니다! 마케팅팀에서의 데이터 분석 경험이 개발 동기로 이어진 스토리, 그리고 부트캠프 상위 10% 수료 성적은 학습 의지와 적응력을 잘 보여줍니다. 당근마켓 채용공고에서도 '학습 의지 및 적응력 평가'를 명시하고 있어요.",
      },
      {
        role: "user",
        content:
          "좋네요. 그러면 전환 동기를 먼저 작성해주시고, FoodDiary 프로젝트 경험도 함께 넣어주세요.",
      },
      {
        role: "assistant",
        content:
          "네, 마케팅 데이터 분석 → VBA 자동화 → 개발 전환이라는 자연스러운 흐름으로 전환 동기를 작성하겠습니다. FoodDiary의 Redis 캐싱 성능 개선 사례(2.1초→280ms)도 기술 역량 항목에 활용하면 좋겠습니다.",
      },
      {
        role: "user",
        content:
          "감사합니다. 당근마켓이 중고거래 서비스니까 FoodDiary보다 BookShelf의 커뮤니티 기능이 더 어필되지 않을까요?",
      },
      {
        role: "assistant",
        content:
          "좋은 관점이에요! BookShelf의 리뷰·별점·검색 기능은 당근마켓의 서비스 특성(사용자 간 소통, 검색·필터링)과 잘 맞습니다. ORM 쿼리 최적화로 응답 시간 800ms→120ms 개선한 경험도 함께 어필하면 좋겠습니다.",
      },
      {
        role: "user",
        content:
          "네, 두 프로젝트를 적절히 섞어서 작성해주세요. BookShelf는 서비스 이해도 측면에서, FoodDiary는 기술 역량 측면에서요.",
      },
    ],
    terse: [
      {
        role: "user",
        content: "당근마켓 자소서 써야 됨",
      },
      {
        role: "assistant",
        content:
          "당근마켓 백엔드 신입 자기소개서를 작성해드리겠습니다. 비전공 전환자 배경을 어떻게 다룰까요?",
      },
      {
        role: "user",
        content: "강점으로 포장해줘",
      },
      {
        role: "assistant",
        content:
          "마케팅 데이터 분석 경험 → 개발 전환으로 자연스러운 스토리를 만들겠습니다. 부트캠프 상위 10%도 어필 포인트입니다.",
      },
      {
        role: "user",
        content: "FoodDiary 캐싱 이야기 넣어",
      },
      {
        role: "assistant",
        content:
          "FoodDiary의 Redis 캐싱으로 응답 시간 2.1초→280ms 개선한 경험을 기술 역량 항목에 넣겠습니다.",
      },
      {
        role: "user",
        content: "당근이 중고거래니까 BookShelf도 어필되게",
      },
      {
        role: "assistant",
        content:
          "BookShelf의 커뮤니티 기능(리뷰, 검색, 랭킹)을 당근마켓 서비스 이해도와 연결하여 작성하겠습니다.",
      },
    ],
    jumpy: [
      {
        role: "user",
        content: "당근마켓 자소서 도와줘",
      },
      {
        role: "assistant",
        content:
          "네, 당근마켓 백엔드 신입 자기소개서를 도와드리겠습니다. 어떤 구조로 쓸까요?",
      },
      {
        role: "user",
        content: "아 근데 이력서에 한솔유통 경력 빼야 되나? 개발이랑 관련 없잖아",
      },
      {
        role: "assistant",
        content:
          "한솔유통 마케팅 경험은 오히려 전환 동기의 핵심이에요. GA 데이터 분석, VBA 자동화 경험이 개발로 이어진 스토리가 되니까 남겨두는 게 좋습니다.",
      },
      {
        role: "user",
        content: "ㅇㅋ 근데 자소서에 알고리즘 실력도 어필해야 되나?",
      },
      {
        role: "assistant",
        content:
          "당근마켓 채용공고에 'CS 기초 지식(자료구조, 알고리즘)' 자격 요건이 있어요. 프로그래머스 Level 2 달성을 간단히 언급하면 충분합니다.",
      },
      {
        role: "user",
        content:
          "ㅇㅇ 알겠어. 아 그리고 당근은 사전 과제가 있다는데 포트폴리오 GitHub 필수래. 내 GitHub 정리 좀 해줘... 아 근데 자소서 먼저 하자",
      },
      {
        role: "assistant",
        content:
          "네, 자기소개서 먼저 진행하겠습니다. GitHub 정리는 나중에 도와드릴게요. 자소서 구조를 전환 동기, 기술 역량, 서비스 이해도, 성장 의지로 잡아볼까요?",
      },
      {
        role: "user",
        content: "굿 그렇게 해줘. 근데 FoodDiary랑 BookShelf 중에 뭘 먼저 넣지?",
      },
      {
        role: "assistant",
        content:
          "당근마켓 서비스 특성상 BookShelf(커뮤니티, 리뷰, 검색)를 먼저, FoodDiary(기술 역량, 성능 최적화)를 후순위로 배치하면 좋겠습니다.",
      },
      {
        role: "user",
        content: "ㅇㅇ 좋아 그 순서로 써줘",
      },
    ],
  },

  // ── jd-3 최서연: 카카오 서버 개발 지원 ──
  "jd-3": {
    polite: [
      {
        role: "user",
        content:
          "안녕하세요, 카카오 서버 개발자 신입에 지원하려고 합니다. 자기소개서 초안을 좀 보강하고 싶은데 도와주실 수 있나요?",
      },
      {
        role: "assistant",
        content:
          "네, 카카오 서버 개발자 신입 자기소개서를 도와드리겠습니다! 초안과 관련 자료들을 확인해볼게요. 인턴 경험이 있으시니 그 부분이 큰 강점이 될 것 같습니다.",
      },
      {
        role: "user",
        content:
          "네, 와디즈 인턴 경험을 어떻게 잘 녹일 수 있을지가 고민이에요. 3개월 짧은 기간이라 어필이 될지 모르겠어서요.",
      },
      {
        role: "assistant",
        content:
          "3개월이어도 구체적인 성과가 있으면 충분히 어필됩니다. 배송 조회 API의 Redis 캐싱으로 응답 시간 1.2초→180ms 개선, 테스트 커버리지 68%→82% 향상 등 정량적 성과가 탄탄하네요. 카카오 채용공고에서도 '인턴 또는 실무 경험'을 우대하고 있으니 자신감을 가지셔도 됩니다.",
      },
      {
        role: "user",
        content:
          "감사합니다. 그러면 초안에서 지원 동기 부분을 더 구체적으로 보강해주시고, 팀워크 항목을 새로 추가해주세요.",
      },
      {
        role: "assistant",
        content:
          "좋습니다. 지원 동기는 카카오 기술 블로그의 Spring Boot 3 마이그레이션 글을 참고하여, 카카오의 기술적 도전 과제에 공감한다는 방향으로 보강하겠습니다. 팀워크는 와디즈에서의 코드 리뷰 경험과 GDSC 세미나 발표 경험을 활용하면 좋겠어요.",
      },
      {
        role: "user",
        content:
          "오, 카카오 기술 블로그 내용까지 연결하는 거 좋네요. 그 방향으로 작성해주세요. 블로그에 JPA N+1 글 쓴 것도 반영해주시고요.",
      },
      {
        role: "assistant",
        content:
          "네, 카카오 기술 블로그의 'Spring Boot 3 마이그레이션'에서 '테스트 커버리지가 높을수록 안전한 마이그레이션 가능'이라고 했는데, 이 점이 와디즈에서 테스트 커버리지를 높인 경험과 잘 연결됩니다. 기술 블로그의 JPA N+1 글(조회수 8,400+)도 기술적 깊이를 보여주는 소재로 활용하겠습니다.",
      },
      {
        role: "user",
        content: "완벽합니다. 그 구조로 자소서 전체를 작성해주세요.",
      },
    ],
    terse: [
      {
        role: "user",
        content: "카카오 서버 자소서 초안 보강해줘",
      },
      {
        role: "assistant",
        content:
          "초안 확인했습니다. 팀워크 항목이 빠져 있고, 지원 동기가 좀 일반적이에요. 보강하겠습니다.",
      },
      {
        role: "user",
        content: "와디즈 인턴 중심으로",
      },
      {
        role: "assistant",
        content:
          "와디즈 인턴의 Redis 캐싱 성능 개선, 테스트 커버리지 향상, MyBatis→JPA 전환 경험을 핵심으로 작성하겠습니다.",
      },
      {
        role: "user",
        content: "기술 블로그도 넣어",
      },
      {
        role: "assistant",
        content:
          "JPA N+1 글 조회수 8,400+, 전체 42편 운영을 기술적 성장 항목에 반영하겠습니다. 카카오 채용공고 우대사항에 '기술 블로그 운영'이 있어서 딱 맞습니다.",
      },
      {
        role: "user",
        content: "팀워크는 GDSC 발표 넣어줘",
      },
      {
        role: "assistant",
        content:
          "GDSC에서 'Spring Boot 테스트 전략' 세미나 발표(35명 참석, 만족도 4.6/5.0) 경험을 팀워크·커뮤니케이션 항목에 넣겠습니다.",
      },
    ],
    jumpy: [
      {
        role: "user",
        content: "카카오 서버 개발 자소서 도와줘",
      },
      {
        role: "assistant",
        content:
          "네, 카카오 서버 개발자 신입 자기소개서를 도와드리겠습니다. 초안이 있으시니 기반으로 보강할까요?",
      },
      {
        role: "user",
        content:
          "잠깐 카카오 기술 블로그 글 봤는데, Spring Boot 3 마이그레이션 관련이라 재밌더라. 나도 인턴 때 MyBatis에서 JPA 전환 경험이 있으니까 이거 어필되겠지?",
      },
      {
        role: "assistant",
        content:
          "네! 카카오 기술 블로그의 마이그레이션 사례와 와디즈 인턴에서의 MyBatis→JPA 전환 경험이 직접적으로 연결됩니다. 자소서에서 '카카오의 기술적 과제에 공감하고 유사 경험이 있다'고 어필하면 좋겠어요.",
      },
      {
        role: "user",
        content:
          "오 근데 CampusMarket 실시간 채팅도 카카오톡 서비스랑 연관지을 수 있지 않아?",
      },
      {
        role: "assistant",
        content:
          "좋은 발상이에요. CampusMarket의 STOMP + WebSocket 기반 실시간 채팅 구현 경험을 카카오톡의 실시간 메시징과 연결하면 지원 동기에 설득력이 생깁니다.",
      },
      {
        role: "user",
        content: "아 근데 자소서에 블로그 링크 넣어도 돼? 아니 그건 이력서에 넣는 건가",
      },
      {
        role: "assistant",
        content:
          "블로그 링크는 보통 이력서에 넣고, 자소서에서는 '기술 블로그 42편 운영, JPA N+1 글 조회수 8,400+'처럼 구체적 성과를 수치로 언급하는 게 효과적입니다.",
      },
      {
        role: "user",
        content: "ㅇㅋ 그럼 자소서에는 수치 중심으로 쓰고, 블로그 링크는 이력서에 넣자. 자소서 전체 구조 잡아줘",
      },
      {
        role: "assistant",
        content:
          "자소서 구조를 1) 지원 동기(카카오 기술 블로그 공감 + 실시간 서비스 경험), 2) 핵심 역량(인턴 캐싱·테스트 성과), 3) 기술적 성장(블로그 42편, JPA 심층 학습), 4) 팀워크(GDSC 발표, 인턴 코드 리뷰 문화)로 잡겠습니다.",
      },
    ],
  },

  // ── jd-4 김도윤: 라인 웹 개발 지원 ──
  "jd-4": {
    polite: [
      {
        role: "user",
        content:
          "안녕하세요, 라인 웹 개발자 신입에 지원하려고 합니다. 전자공학 전공이라 웹은 신입 수준인데 자소서를 어떻게 쓰면 좋을까요?",
      },
      {
        role: "assistant",
        content:
          "안녕하세요! 라인 웹 개발자 신입 포지션이군요. 채용공고를 보니 '전공 무관, CS 기초 지식 보유 시'라고 되어 있고, 실시간 통신 경험도 우대하고 있어요. 전자공학 배경이 오히려 강점이 될 수 있습니다.",
      },
      {
        role: "user",
        content:
          "정말요? 임베디드 경험이 웹에서 어필이 될까요? C/C++ 위주라 JavaScript는 아직 많이 부족한데요.",
      },
      {
        role: "assistant",
        content:
          "네, 라인은 메신저 서비스라 실시간 통신이 핵심이에요. 졸업 프로젝트에서 MQTT-WebSocket 브릿지를 구현한 경험이 있으시잖아요. 이건 라인 메신저의 실시간 통신 기술과 직접 연결됩니다. 자소서 초안에도 이 방향으로 쓰셨는데, 더 구체화하면 좋겠어요.",
      },
      {
        role: "user",
        content:
          "감사합니다. 그러면 전환 동기와 차별화 포인트를 중심으로 보강해주세요. 특히 임베디드 경험이 웹에서 어떻게 도움되는지를 잘 설명하고 싶어요.",
      },
      {
        role: "assistant",
        content:
          "좋습니다. 커리어노트에 '임베디드 경험이 웹에서 도움된 사례'를 정리하신 게 있네요. 네트워크 프로토콜 이해, 성능 의식, 디버깅 방법론 등 4가지 포인트가 잘 정리되어 있습니다. 이걸 자소서의 차별화 포인트로 녹여보겠습니다.",
      },
      {
        role: "user",
        content:
          "네, 그리고 라인의 글로벌 환경도 매력적인데요. 일본 본사와 협업한다는 점이 흥미로워요. 영어 커뮤니케이션이 가능하다는 것도 어필하고 싶은데 관련 경험이 KAIST에서 영어 강의를 들은 것 정도예요.",
      },
      {
        role: "assistant",
        content:
          "KAIST 영어 강의 수강 경험도 충분히 어필 가능합니다. 라인 JD 상세에 '영어 문서, 영어 회의 주 1회'라고 되어 있으니, 영어 환경에 대한 적응력을 간결하게 언급하면 좋겠습니다.",
      },
      {
        role: "user",
        content: "좋아요, 그 방향으로 자소서 전체를 작성해주세요.",
      },
    ],
    terse: [
      {
        role: "user",
        content: "라인 웹 개발 자소서",
      },
      {
        role: "assistant",
        content:
          "라인 웹 개발자 신입 자기소개서를 작성해드리겠습니다. 임베디드→웹 전환 스토리를 중심으로 할까요?",
      },
      {
        role: "user",
        content: "ㅇㅇ 전환 이유 잘 포장해줘",
      },
      {
        role: "assistant",
        content:
          "졸업 프로젝트의 웹 대시보드 개발이 전환 계기, 임베디드 배경이 웹에서 차별화 강점이 되는 구조로 작성하겠습니다.",
      },
      {
        role: "user",
        content: "MQTT-WebSocket 브릿지 어필되게",
      },
      {
        role: "assistant",
        content:
          "MQTT-WebSocket 브릿지 구현 경험을 라인 메신저의 실시간 통신과 연결하여 작성하겠습니다. 센서→화면 전달 지연 150ms 성과도 포함합니다.",
      },
      {
        role: "user",
        content: "SensorView Express 백엔드도 넣어",
      },
      {
        role: "assistant",
        content:
          "SensorView의 REST API 설계, JWT 인증 구현 경험을 웹 백엔드 역량 항목에 반영하겠습니다.",
      },
    ],
    jumpy: [
      {
        role: "user",
        content: "라인 자소서 써야 되는데",
      },
      {
        role: "assistant",
        content:
          "네, 라인 웹 개발자 신입 자기소개서를 도와드리겠습니다. 초안을 기반으로 보강할까요?",
      },
      {
        role: "user",
        content:
          "아 잠깐 라인이 글로벌 회사라 영어 필요하대 영어 못하면 불리해?",
      },
      {
        role: "assistant",
        content:
          "JD 상세를 보면 '영어 문서, 영어 회의 주 1회' 수준이에요. KAIST에서 영어 강의 수강하셨으니 기본적인 영어 커뮤니케이션은 어필할 수 있습니다. 업무 영어는 입사 후 빠르게 적응하는 경우가 많아요.",
      },
      {
        role: "user",
        content: "ㅇㅋ 다행이다. 근데 임베디드 경력이 웹에서 좀 어색하지 않아?",
      },
      {
        role: "assistant",
        content:
          "오히려 라인에서는 강점입니다. 채용공고에 '실시간 통신(WebSocket, SSE) 구현 경험' 우대사항이 있고, MQTT-WebSocket 브릿지 경험이 직접적으로 연관돼요.",
      },
      {
        role: "user",
        content:
          "아 맞다 자소서 말고 SensorView 프로젝트 설명 좀 다듬어야 할 것 같은데... 아니 자소서 먼저 하자",
      },
      {
        role: "assistant",
        content:
          "네, 자소서 먼저 진행하겠습니다. 전환 동기, 차별화 포인트(임베디드 배경), 라인 지원 동기 순서로 작성할까요?",
      },
      {
        role: "user",
        content: "좋아 근데 차별화 포인트에서 네트워크 프로토콜 이해도를 강조해줘. TCP/UDP 직접 다뤄본 건 웹 개발자 중에 드물잖아",
      },
      {
        role: "assistant",
        content:
          "맞습니다. TCP/UDP 소켓 프로그래밍, MQTT 프로토콜 직접 구현 경험은 웹 개발 신입 중 매우 드문 배경이에요. 이걸 '라인 메신저의 실시간 통신 프로토콜을 깊이 이해하고 기여할 수 있는 역량'으로 포장하겠습니다.",
      },
    ],
  },

  // ── jd-5 정예린: 쿠팡 풀스택 지원 ──
  "jd-5": {
    polite: [
      {
        role: "user",
        content:
          "안녕하세요, 쿠팡 풀스택 개발자 신입에 지원하려고 합니다. 부트캠프 출신인데 자기소개서를 어떻게 쓰면 좋을까요?",
      },
      {
        role: "assistant",
        content:
          "안녕하세요! 쿠팡 풀스택 신입 포지션이군요. 채용공고를 보니 JavaScript/TypeScript, React, Node.js 경험을 요구하고 있어서 정예린 님의 기술 스택과 잘 맞습니다. 비전공 전환 경험도 환영한다고 되어 있어요.",
      },
      {
        role: "user",
        content:
          "다행이에요. 문헌정보학 전공인데 이게 어필이 될 수 있을까요? 도서관에서 일한 경험도 있거든요.",
      },
      {
        role: "assistant",
        content:
          "충분히 어필할 수 있어요! 문헌정보학의 정보 구조화 능력, 메타데이터 설계 경험은 DB 스키마 설계, API 문서화에 직접 연결됩니다. 도서관 경험에서 쌓은 사용자 서비스 관점도 쿠팡의 '고객 중심' 문화와 맞아요.",
      },
      {
        role: "user",
        content:
          "그렇게 연결할 수 있군요! 그러면 전직 경험을 강점으로 살려서 자소서를 작성해주세요. TripLog 프로젝트 경험도 함께 넣어주시면 좋겠습니다.",
      },
      {
        role: "assistant",
        content:
          "네, 문헌정보학 + 도서관 경험 → 정보 구조화 역량 → 개발 전환이라는 스토리로 작성하겠습니다. TripLog의 카카오맵 연동, EXIF 자동 태깅, 팀 프로젝트 우수상 수상 등을 기술 역량 항목에서 다루겠습니다.",
      },
      {
        role: "user",
        content:
          "좋아요. 쿠팡이 물류·배송 대시보드 개발을 담당 업무로 하고 있는데, TripLog의 지도 시각화 경험이 어필되지 않을까요?",
      },
      {
        role: "assistant",
        content:
          "맞습니다! TripLog의 카카오맵 기반 경로 시각화 경험은 쿠팡의 물류·배송 대시보드 개발과 직접적으로 연관됩니다. 마커, 폴리라인, 클러스터링 등의 기술이 배송 경로 시각화에 활용될 수 있다는 점을 강조하면 좋겠어요.",
      },
      {
        role: "user",
        content:
          "완벽해요. 부트캠프 수료 성적 상위 5%와 우수상 수상도 함께 넣어서 전체 자소서를 작성해주세요.",
      },
    ],
    terse: [
      {
        role: "user",
        content: "쿠팡 풀스택 자소서",
      },
      {
        role: "assistant",
        content:
          "쿠팡 풀스택 신입 자기소개서를 작성해드리겠습니다. 문헌정보학 전공을 어떻게 다룰까요?",
      },
      {
        role: "user",
        content: "강점으로 써줘",
      },
      {
        role: "assistant",
        content:
          "정보 구조화, 메타데이터 설계, 문서화 역량을 개발에서의 강점으로 연결하겠습니다.",
      },
      {
        role: "user",
        content: "TripLog 지도 기능 쿠팡 물류랑 연결해서",
      },
      {
        role: "assistant",
        content:
          "TripLog의 카카오맵 경로 시각화 경험을 쿠팡의 물류·배송 대시보드와 연결하여 작성하겠습니다.",
      },
      {
        role: "user",
        content: "부트캠프 상위 5%도 넣어",
      },
      {
        role: "assistant",
        content:
          "패스트캠퍼스 부트캠프 상위 5%(48명 중 2위), 파이널 프로젝트 우수상을 학습 역량 항목에 반영하겠습니다.",
      },
    ],
    jumpy: [
      {
        role: "user",
        content: "쿠팡 자소서 써야 되는데",
      },
      {
        role: "assistant",
        content:
          "네, 쿠팡 풀스택 신입 자기소개서를 도와드리겠습니다. TripLog, QuizArena 프로젝트와 부트캠프 경험을 활용할까요?",
      },
      {
        role: "user",
        content: "아 잠깐 수료증 첨부해야 되나? 부트캠프 수료증 있긴 한데",
      },
      {
        role: "assistant",
        content:
          "수료증은 보통 서류 지원 시 포트폴리오와 함께 첨부합니다. 자소서 본문에는 '패스트캠퍼스 부트캠프 상위 5% 수료'로 간결하게 언급하면 충분해요.",
      },
      {
        role: "user",
        content: "ㅇㅇ 알겠어. 근데 BookFinder 프로젝트 아직 미완성인데 넣어도 될까?",
      },
      {
        role: "assistant",
        content:
          "BookFinder는 전직 도서관 경험을 살린 기획이라 스토리텔링에 좋아요. '진행 중'이라고 명시하면서 도서관 경험 → 개발 기획 역량으로 어필하면 됩니다.",
      },
      {
        role: "user",
        content:
          "아 그리고 쿠팡이 데이터 시각화 도구 만든다는데 TripLog 지도 기능이랑 연결되나?",
      },
      {
        role: "assistant",
        content:
          "네, 쿠팡 채용공고에 '데이터 시각화 및 리포팅 도구 구축'이 담당 업무에 있어요. TripLog의 카카오맵 경로 시각화, 마커 클러스터링 경험이 직접 연결됩니다.",
      },
      {
        role: "user",
        content: "좋아 그 포인트 위주로 자소서 써줘. 아 QuizArena 실시간 기능도 넣고",
      },
      {
        role: "assistant",
        content:
          "TripLog 지도 시각화 + QuizArena 실시간 Socket.io 경험을 핵심으로 자소서를 작성하겠습니다. 문헌정보학 배경의 정보 구조화 강점도 녹여서 전체 구조를 잡아볼게요.",
      },
      {
        role: "user",
        content: "굿 부탁해~",
      },
    ],
  },
}
