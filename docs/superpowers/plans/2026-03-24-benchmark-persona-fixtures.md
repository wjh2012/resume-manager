# Benchmark Persona Fixtures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 25명의 벤치마크 페르소나 fixture 데이터를 생성하고, Document/ExternalDocument 분리 구조를 적용한다.

**Architecture:** `benchmarks/fixtures/types.ts`에 공통 타입 정의 → `personas/` 하위에 카테고리별 5개 파일로 데이터 분리 → `mock-data.ts`에서 통합 re-export. 카테고리별 파일 생성은 5개 에이전트 병렬 실행.

**Tech Stack:** TypeScript (데이터 fixture 파일, 로직 없음)

**Spec:** `docs/superpowers/specs/2026-03-24-benchmark-persona-fixtures-design.md`

---

### Task 1: types.ts 생성

**Files:**
- Create: `benchmarks/fixtures/types.ts`

- [ ] **Step 1: types.ts 작성**

```ts
export type PersonaCategory =
  | "university-admission"
  | "office-entry"
  | "junior-developer"
  | "mid-developer"
  | "senior-developer"

export interface MockPersona {
  id: string
  name: string
  category: PersonaCategory
  label: string
}

export interface MockDocument {
  id: string
  personaId: string
  title: string
  summary: string
  extractedText: string
}

export interface MockExternalDocument {
  id: string
  personaId: string
  title: string
  summary: string
  extractedText: string
}

export interface MockCareerNote {
  id: string
  personaId: string
  title: string
  summary: string
  content: string
  metadata?: Record<string, string>
}

export type ConvMessage = { role: "user" | "assistant"; content: string }
```

- [ ] **Step 2: personas/ 디렉토리 생성**

Run: `mkdir -p benchmarks/fixtures/personas`

- [ ] **Step 3: 커밋**

```bash
git add benchmarks/fixtures/types.ts
git commit -m "feat(benchmark): fixture 공통 타입 정의 (types.ts)"
```

---

### Task 2: senior-developer.ts 생성 (김철수 마이그레이션 포함) [PARALLEL-START]

> **병렬 실행:** Task 2~6은 5개 에이전트로 동시 실행. 각 에이전트는 독립 파일을 생성하므로 충돌 없음.

**Files:**
- Create: `benchmarks/fixtures/personas/senior-developer.ts`
- Reference: `benchmarks/fixtures/mock-data.ts` (기존 김철수 데이터 읽기용)

**에이전트 지시사항:**

이 태스크는 시니어 개발자 카테고리 5명의 fixture 데이터를 생성한다.

1. `benchmarks/fixtures/mock-data.ts`에서 기존 김철수 데이터를 읽어 sd-1로 마이그레이션한다.
2. sd-2 ~ sd-5는 새로 생성한다.
3. 모든 데이터는 김철수 수준의 리얼한 디테일을 갖춰야 한다.

**김철수 마이그레이션 ID 매핑:**

| 기존 ID | 신규 ID | 분류 |
|---|---|---|
| doc-1 (이력서) | sd-1-doc-1 | MockDocument |
| doc-2 (포트폴리오) | sd-1-doc-2 | MockDocument |
| doc-3 (채용공고 네이버) | sd-1-ext-1 | MockExternalDocument |
| doc-4 (경력기술서) | sd-1-doc-3 | MockDocument |
| doc-5 (자소서 초안) | sd-1-doc-4 | MockDocument |
| doc-6 (추천서) | sd-1-doc-5 | MockDocument |
| doc-7 (기술 블로그) | sd-1-doc-6 | MockDocument |
| note-1~5 | sd-1-note-1~5 | MockCareerNote |

**볼륨 테이블:**

| # | 사용자 문서 | 외부 문서 | 커리어노트 |
|---|---|---|---|
| sd-1 (김철수) | 6건 (기존 유지) | 1건 (채용공고) | 5건 |
| sd-2 | 4건 (이력서, 경력기술서, 자소서 초안, 블로그) | 2건 (채용공고, JD상세) | 4건 |
| sd-3 | 5건 (이력서, 포트폴리오, 경력기술서, 추천서, 특허) | 2건 (채용공고, 회사소개) | 6건 |
| sd-4 | 4건 (이력서, 경력기술서, 포트폴리오, 자소서 초안) | 2건 (채용공고, JD상세) | 5건 |
| sd-5 | 5건 (이력서, 경력기술서, 자소서 초안, 블로그, 추천서) | 2건 (채용공고, 기술블로그) | 4건 |

**페르소나 다양성 가이드 (sd-2 ~ sd-5):**
- sd-2: 백엔드 특화 (Java/Kotlin, 대기업 경력, MSA/DDD)
- sd-3: 인프라/DevOps 특화 (AWS/Terraform, SRE 경력, 특허 보유)
- sd-4: 프론트엔드 특화 (React/Vue, 디자인시스템, 대규모 SPA)
- sd-5: 데이터 엔지니어링 특화 (Spark/Airflow, ML 파이프라인, 데이터 플랫폼)

- [ ] **Step 1: senior-developer.ts 파일 작성**

`benchmarks/fixtures/types.ts`에서 타입 import 후, 아래 export 구조로 작성:

```ts
import type { MockPersona, MockDocument, MockExternalDocument, MockCareerNote, ConvMessage } from "../types"

export const PERSONAS: MockPersona[] = [
  { id: "sd-1", name: "김철수", category: "senior-developer", label: "풀스택 개발자 5년차" },
  { id: "sd-2", name: "...", category: "senior-developer", label: "..." },
  // sd-3, sd-4, sd-5
]

export const DOCUMENTS: MockDocument[] = [
  // sd-1: 기존 김철수 데이터를 id/personaId만 변경하여 이동
  // sd-2~5: 새 데이터
]

export const EXTERNAL_DOCUMENTS: MockExternalDocument[] = [
  // sd-1-ext-1: 기존 doc-3(채용공고 네이버) 이동
  // sd-2~5: 새 채용공고/JD상세/회사소개/기술블로그
]

export const CAREER_NOTES: MockCareerNote[] = [
  // sd-1: 기존 note-1~5를 id/personaId만 변경
  // sd-2~5: 새 데이터
]

export const CONV_STYLES: Record<string, Record<string, ConvMessage[]>> = {
  "sd-1": {
    polite: [ /* 기존 CONV_STYLES.polite를 그대로 이동 */ ],
    terse: [ /* 기존 CONV_STYLES.terse */ ],
    jumpy: [ /* 기존 CONV_STYLES.jumpy */ ],
  },
  "sd-2": { polite: [...], terse: [...], jumpy: [...] },
  // sd-3, sd-4, sd-5
}
```

**대화 스타일 작성 가이드:**
- polite: 정중하고 순차적. 존댓말. 한 번에 하나씩 요청.
- terse: 짧고 무뚝뚝. 반말/축약. "알아서 써줘" 스타일.
- jumpy: 주제 전환 잦음. "아 잠깐 그전에~", "근데 말고~" 패턴.
- 각 스타일 6~10개 메시지 (user/assistant 교대).
- 해당 페르소나의 지원 대상, 보유 문서에 맞는 자연스러운 대화.

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit benchmarks/fixtures/personas/senior-developer.ts`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add benchmarks/fixtures/personas/senior-developer.ts
git commit -m "feat(benchmark): 시니어 개발자 페르소나 5명 (김철수 마이그레이션 포함)"
```

---

### Task 3: university-admission.ts 생성 [PARALLEL]

**Files:**
- Create: `benchmarks/fixtures/personas/university-admission.ts`

**에이전트 지시사항:**

대학입학 카테고리 5명의 fixture 데이터를 생성한다.
`benchmarks/fixtures/types.ts`에서 타입을 import한다.
`benchmarks/fixtures/mock-data.ts`의 기존 김철수 데이터를 품질 참고용으로 읽는다.

**볼륨 테이블:**

| # | 사용자 문서 | 외부 문서 | 커리어노트 |
|---|---|---|---|
| ua-1 | 3건 (학생부, 자소서 초안, 수상내역) | 1건 (입시요강) | 3건 |
| ua-2 | 2건 (학생부, 자소서 초안) | 1건 (입시요강) | 2건 |
| ua-3 | 2건 (학생부, 활동보고서) | 2건 (입시요강, 학과소개) | 1건 |
| ua-4 | 3건 (학생부, 자소서 초안, 봉사활동기록) | 1건 (입시요강) | 2건 |
| ua-5 | 4건 (학생부, 자소서 초안, 수상내역, 독서활동) | 2건 (입시요강, 학과소개) | 3건 |

**페르소나 다양성 가이드:**
- ua-1: 이공계 지원 (수학/과학 수상, 과학탐구 동아리)
- ua-2: 인문계 지원 (국어/영어 우수, 토론 동아리)
- ua-3: 예체능 지원 (미술/디자인 포트폴리오, 예술활동)
- ua-4: 사회과학 지원 (봉사활동 중심, 사회참여 동아리)
- ua-5: 자연과학 지원 (연구 활동, 과학 경시대회, 독서 활동 풍부)

**맥락 참고:**
- 외부문서: 대학 입시요강(모집요강 형식), 학과소개(학과 커리큘럼/비전 형식)
- 커리어노트: 대학입학 맥락에서는 "경력"이 아니라 동아리/봉사/수상/연구 등 활동 경험 기록
- 학생부: 생활기록부 형식 (교과 성적, 세부능력특기사항, 창의적체험활동)
- 5명의 이름, 학교, 지원 대학/학과가 모두 달라야 함

- [ ] **Step 1: university-admission.ts 파일 작성**

아래 export 구조로 작성:

```ts
import type { MockPersona, MockDocument, MockExternalDocument, MockCareerNote, ConvMessage } from "../types"

export const PERSONAS: MockPersona[] = [...]
export const DOCUMENTS: MockDocument[] = [...]
export const EXTERNAL_DOCUMENTS: MockExternalDocument[] = [...]
export const CAREER_NOTES: MockCareerNote[] = [...]
export const CONV_STYLES: Record<string, Record<string, ConvMessage[]>> = {
  "ua-1": { polite: [...], terse: [...], jumpy: [...] },
  // ua-2 ~ ua-5
}
```

**대화 스타일 작성 가이드:**
- polite: 정중하고 순차적. 존댓말. 한 번에 하나씩 요청.
- terse: 짧고 무뚝뚝. 반말/축약. "알아서 써줘" 스타일.
- jumpy: 주제 전환 잦음. "아 잠깐 그전에~", "근데 말고~" 패턴.
- 각 스타일 6~10개 메시지 (user/assistant 교대).
- 해당 페르소나의 지원 대상, 보유 문서에 맞는 자연스러운 대화.

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit benchmarks/fixtures/personas/university-admission.ts`

- [ ] **Step 3: 커밋**

```bash
git add benchmarks/fixtures/personas/university-admission.ts
git commit -m "feat(benchmark): 대학입학 페르소나 5명"
```

---

### Task 4: office-entry.ts 생성 [PARALLEL]

**Files:**
- Create: `benchmarks/fixtures/personas/office-entry.ts`

**에이전트 지시사항:**

일반사무직 신입 카테고리 5명의 fixture 데이터를 생성한다.
`benchmarks/fixtures/types.ts`에서 타입을 import한다.
`benchmarks/fixtures/mock-data.ts`의 기존 김철수 데이터를 품질 참고용으로 읽는다.

**볼륨 테이블:**

| # | 사용자 문서 | 외부 문서 | 커리어노트 |
|---|---|---|---|
| oe-1 | 3건 (이력서, 자소서 초안, 자격증 목록) | 1건 (채용공고) | 3건 |
| oe-2 | 2건 (이력서, 자소서 초안) | 1건 (채용공고) | 2건 |
| oe-3 | 2건 (이력서, 추천서) | 2건 (채용공고, 회사소개) | 1건 |
| oe-4 | 3건 (이력서, 자소서 초안, 인턴확인서) | 2건 (채용공고, 회사소개) | 3건 |
| oe-5 | 2건 (이력서, 자소서 초안) | 1건 (채용공고) | 4건 |

**페르소나 다양성 가이드:**
- oe-1: 경영/회계 직군 (상경계 전공, 회계 자격증, 재무 인턴)
- oe-2: 마케팅 직군 (마케팅 전공, SNS 운영 경험)
- oe-3: 인사/총무 직군 (경영학 전공, 교수 추천서)
- oe-4: 무역/물류 직군 (무역학 전공, 무역회사 인턴)
- oe-5: 고객지원/CS 직군 (심리학 전공, 서비스업 아르바이트 경험 풍부)

**맥락 참고:**
- 외부문서: 채용공고(기업 공채/수시 채용 형식), 회사소개(기업 비전/복지 형식)
- 이력서: 일반 사무직 형식 (학력, 자격증, 어학성적, 경험 중심)
- 5명의 이름, 대학, 지원 회사/직군이 모두 달라야 함

- [ ] **Step 1: office-entry.ts 파일 작성**

아래 export 구조로 작성:

```ts
import type { MockPersona, MockDocument, MockExternalDocument, MockCareerNote, ConvMessage } from "../types"

export const PERSONAS: MockPersona[] = [...]
export const DOCUMENTS: MockDocument[] = [...]
export const EXTERNAL_DOCUMENTS: MockExternalDocument[] = [...]
export const CAREER_NOTES: MockCareerNote[] = [...]
export const CONV_STYLES: Record<string, Record<string, ConvMessage[]>> = {
  "oe-1": { polite: [...], terse: [...], jumpy: [...] },
  // oe-2 ~ oe-5
}
```

**대화 스타일 작성 가이드:**
- polite: 정중하고 순차적. 존댓말. 한 번에 하나씩 요청.
- terse: 짧고 무뚝뚝. 반말/축약. "알아서 써줘" 스타일.
- jumpy: 주제 전환 잦음. "아 잠깐 그전에~", "근데 말고~" 패턴.
- 각 스타일 6~10개 메시지 (user/assistant 교대).
- 해당 페르소나의 지원 대상, 보유 문서에 맞는 자연스러운 대화.

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit benchmarks/fixtures/personas/office-entry.ts`

- [ ] **Step 3: 커밋**

```bash
git add benchmarks/fixtures/personas/office-entry.ts
git commit -m "feat(benchmark): 일반사무직 신입 페르소나 5명"
```

---

### Task 5: junior-developer.ts 생성 [PARALLEL]

**Files:**
- Create: `benchmarks/fixtures/personas/junior-developer.ts`

**에이전트 지시사항:**

신입 개발자 카테고리 5명의 fixture 데이터를 생성한다.
`benchmarks/fixtures/types.ts`에서 타입을 import한다.
`benchmarks/fixtures/mock-data.ts`의 기존 김철수 데이터를 품질 참고용으로 읽는다.

**볼륨 테이블:**

| # | 사용자 문서 | 외부 문서 | 커리어노트 |
|---|---|---|---|
| jd-1 | 3건 (이력서, 포트폴리오, 자소서 초안) | 2건 (채용공고, 회사소개) | 3건 |
| jd-2 | 2건 (이력서, 포트폴리오) | 1건 (채용공고) | 2건 |
| jd-3 | 4건 (이력서, 포트폴리오, 자소서 초안, 블로그) | 2건 (채용공고, 기술블로그) | 4건 |
| jd-4 | 2건 (이력서, 자소서 초안) | 2건 (채용공고, JD상세) | 3건 |
| jd-5 | 3건 (이력서, 포트폴리오, 부트캠프 수료증) | 2건 (채용공고, 회사소개) | 2건 |

**페르소나 다양성 가이드:**
- jd-1: 컴공 전공 졸업, 프론트엔드 지향 (React, 개인 프로젝트)
- jd-2: 비전공 전환자 (부트캠프 출신, Python/Django)
- jd-3: 컴공 전공, 백엔드 지향 (Java/Spring, 기술 블로그 운영, 인턴 경험)
- jd-4: 전자공학 전공, 임베디드→웹 전환 (C/C++ 배경, 웹 신입)
- jd-5: 부트캠프 출신, 풀스택 (JavaScript/Node.js, 팀 프로젝트)

**맥락 참고:**
- 신입이므로 경력 대신 프로젝트/인턴/부트캠프 경험 중심
- 포트폴리오: 개인/팀 프로젝트 2~3개 수준
- 5명의 이름, 출신 학교/부트캠프, 지원 회사가 모두 달라야 함

- [ ] **Step 1: junior-developer.ts 파일 작성**

아래 export 구조로 작성:

```ts
import type { MockPersona, MockDocument, MockExternalDocument, MockCareerNote, ConvMessage } from "../types"

export const PERSONAS: MockPersona[] = [...]
export const DOCUMENTS: MockDocument[] = [...]
export const EXTERNAL_DOCUMENTS: MockExternalDocument[] = [...]
export const CAREER_NOTES: MockCareerNote[] = [...]
export const CONV_STYLES: Record<string, Record<string, ConvMessage[]>> = {
  "jd-1": { polite: [...], terse: [...], jumpy: [...] },
  // jd-2 ~ jd-5
}
```

**대화 스타일 작성 가이드:**
- polite: 정중하고 순차적. 존댓말. 한 번에 하나씩 요청.
- terse: 짧고 무뚝뚝. 반말/축약. "알아서 써줘" 스타일.
- jumpy: 주제 전환 잦음. "아 잠깐 그전에~", "근데 말고~" 패턴.
- 각 스타일 6~10개 메시지 (user/assistant 교대).
- 해당 페르소나의 지원 대상, 보유 문서에 맞는 자연스러운 대화.

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit benchmarks/fixtures/personas/junior-developer.ts`

- [ ] **Step 3: 커밋**

```bash
git add benchmarks/fixtures/personas/junior-developer.ts
git commit -m "feat(benchmark): 신입 개발자 페르소나 5명"
```

---

### Task 6: mid-developer.ts 생성 [PARALLEL-END]

**Files:**
- Create: `benchmarks/fixtures/personas/mid-developer.ts`

**에이전트 지시사항:**

미들 개발자 카테고리 5명의 fixture 데이터를 생성한다.
`benchmarks/fixtures/types.ts`에서 타입을 import한다.
`benchmarks/fixtures/mock-data.ts`의 기존 김철수 데이터를 품질 참고용으로 읽는다.

**볼륨 테이블:**

| # | 사용자 문서 | 외부 문서 | 커리어노트 |
|---|---|---|---|
| md-1 | 4건 (이력서, 포트폴리오, 경력기술서, 자소서 초안) | 2건 (채용공고, 기술블로그) | 4건 |
| md-2 | 3건 (이력서, 경력기술서, 자소서 초안) | 2건 (채용공고, 회사소개) | 3건 |
| md-3 | 3건 (이력서, 포트폴리오, 추천서) | 2건 (채용공고, 기술블로그) | 5건 |
| md-4 | 4건 (이력서, 포트폴리오, 경력기술서, 블로그) | 1건 (채용공고) | 3건 |
| md-5 | 3건 (이력서, 경력기술서, 자소서 초안) | 2건 (채용공고, JD상세) | 4건 |

**페르소나 다양성 가이드:**
- md-1: 백엔드 (Python/FastAPI, 3년차, 핀테크 스타트업)
- md-2: 풀스택 (TypeScript/Next.js, 4년차, 이커머스)
- md-3: iOS 개발 (Swift/UIKit, 3년차, 모바일 에이전시, 추천서 보유)
- md-4: 데이터 엔지니어 (Python/Spark, 4년차, 개인 블로그 운영)
- md-5: 백엔드 (Go/gRPC, 5년차, B2B SaaS)

**맥락 참고:**
- 경력 3~5년 수준의 실무 경험 (프로젝트 2~4개)
- 경력기술서: 회사별 프로젝트 경험 상세 기술
- 5명의 이름, 회사, 기술 스택, 지원 대상이 모두 달라야 함

- [ ] **Step 1: mid-developer.ts 파일 작성**

아래 export 구조로 작성:

```ts
import type { MockPersona, MockDocument, MockExternalDocument, MockCareerNote, ConvMessage } from "../types"

export const PERSONAS: MockPersona[] = [...]
export const DOCUMENTS: MockDocument[] = [...]
export const EXTERNAL_DOCUMENTS: MockExternalDocument[] = [...]
export const CAREER_NOTES: MockCareerNote[] = [...]
export const CONV_STYLES: Record<string, Record<string, ConvMessage[]>> = {
  "md-1": { polite: [...], terse: [...], jumpy: [...] },
  // md-2 ~ md-5
}
```

**대화 스타일 작성 가이드:**
- polite: 정중하고 순차적. 존댓말. 한 번에 하나씩 요청.
- terse: 짧고 무뚝뚝. 반말/축약. "알아서 써줘" 스타일.
- jumpy: 주제 전환 잦음. "아 잠깐 그전에~", "근데 말고~" 패턴.
- 각 스타일 6~10개 메시지 (user/assistant 교대).
- 해당 페르소나의 지원 대상, 보유 문서에 맞는 자연스러운 대화.

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit benchmarks/fixtures/personas/mid-developer.ts`

- [ ] **Step 3: 커밋**

```bash
git add benchmarks/fixtures/personas/mid-developer.ts
git commit -m "feat(benchmark): 미들 개발자 페르소나 5명"
```

---

### Task 7: mock-data.ts re-export 허브 업데이트

> **의존성:** Task 2~6 완료 후 실행

**Files:**
- Modify: `benchmarks/fixtures/mock-data.ts`

- [ ] **Step 1: mock-data.ts를 re-export 허브로 교체**

기존 내용 전체를 아래로 교체:

```ts
/**
 * 벤치마크 공통 목업 데이터 — Re-export 허브
 *
 * 모든 페르소나 데이터는 personas/ 하위 카테고리 파일에 정의.
 * 이 파일은 전체 데이터를 통합 re-export한다.
 */

export type {
  PersonaCategory,
  MockPersona,
  MockDocument,
  MockExternalDocument,
  MockCareerNote,
  ConvMessage,
} from "./types"

import * as ua from "./personas/university-admission"
import * as oe from "./personas/office-entry"
import * as jd from "./personas/junior-developer"
import * as md from "./personas/mid-developer"
import * as sd from "./personas/senior-developer"

import type { MockPersona, MockDocument, MockExternalDocument, MockCareerNote, ConvMessage } from "./types"

export const ALL_PERSONAS: MockPersona[] = [
  ...ua.PERSONAS,
  ...oe.PERSONAS,
  ...jd.PERSONAS,
  ...md.PERSONAS,
  ...sd.PERSONAS,
]

export const ALL_DOCUMENTS: MockDocument[] = [
  ...ua.DOCUMENTS,
  ...oe.DOCUMENTS,
  ...jd.DOCUMENTS,
  ...md.DOCUMENTS,
  ...sd.DOCUMENTS,
]

export const ALL_EXTERNAL_DOCUMENTS: MockExternalDocument[] = [
  ...ua.EXTERNAL_DOCUMENTS,
  ...oe.EXTERNAL_DOCUMENTS,
  ...jd.EXTERNAL_DOCUMENTS,
  ...md.EXTERNAL_DOCUMENTS,
  ...sd.EXTERNAL_DOCUMENTS,
]

export const ALL_CAREER_NOTES: MockCareerNote[] = [
  ...ua.CAREER_NOTES,
  ...oe.CAREER_NOTES,
  ...jd.CAREER_NOTES,
  ...md.CAREER_NOTES,
  ...sd.CAREER_NOTES,
]

export const ALL_CONV_STYLES: Record<string, Record<string, ConvMessage[]>> = {
  ...ua.CONV_STYLES,
  ...oe.CONV_STYLES,
  ...jd.CONV_STYLES,
  ...md.CONV_STYLES,
  ...sd.CONV_STYLES,
}

// 카테고리별 개별 re-export
export { ua, oe, jd, md, sd }
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit benchmarks/fixtures/mock-data.ts`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add benchmarks/fixtures/mock-data.ts
git commit -m "refactor(benchmark): mock-data.ts를 re-export 허브로 전환"
```

---

### Task 8: 전체 검증

> **의존성:** Task 7 완료 후 실행

**Files:**
- Read: 모든 fixtures 파일

- [ ] **Step 1: 전체 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (기존 벤치마크 코드에서 import 경로 깨짐은 예상됨 — breaking change)

- [ ] **Step 2: 데이터 볼륨 검증**

각 카테고리 파일에서 export된 배열 길이가 스펙과 일치하는지 확인:

| 카테고리 | PERSONAS | DOCUMENTS | EXTERNAL_DOCUMENTS | CAREER_NOTES | CONV_STYLES 키 |
|---|---|---|---|---|---|
| university-admission | 5 | 14 | 7 | 11 | 5 |
| office-entry | 5 | 12 | 7 | 13 | 5 |
| junior-developer | 5 | 14 | 9 | 14 | 5 |
| mid-developer | 5 | 17 | 9 | 19 | 5 |
| senior-developer | 5 | 24 | 9 | 24 | 5 |
| **합계** | **25** | **81** | **41** | **81** | **25** |

- [ ] **Step 3: ID 컨벤션 검증**

모든 ID가 `{카테고리접두어}-{번호}-{타입}-{번호}` 패턴을 따르는지 확인.
personaId가 해당 카테고리의 페르소나 ID와 일치하는지 확인.

- [ ] **Step 4: 최종 커밋 (필요시)**

검증 중 수정이 필요했다면 커밋.

---

## 실행 전략

```
Task 1 (types.ts)          ← 인라인 실행 (선행)
    │
    ├── Task 2 (senior-developer.ts)    ┐
    ├── Task 3 (university-admission.ts) │
    ├── Task 4 (office-entry.ts)         ├── 5개 에이전트 병렬
    ├── Task 5 (junior-developer.ts)     │
    └── Task 6 (mid-developer.ts)       ┘
                │
        Task 7 (mock-data.ts)           ← 인라인 실행
                │
        Task 8 (전체 검증)              ← 인라인 실행
```
