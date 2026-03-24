# Benchmark Persona Fixtures Design

## Summary

벤치마크 검증 데이터를 25명의 페르소나(5카테고리 × 5명)로 확장한다.
사용자 문서(`MockDocument`)와 외부 문서(`MockExternalDocument`)를 분리하고,
기존 김철수 데이터도 새 구조로 소급 적용한다.

## Motivation

현재 벤치마크 데이터가 "김철수"(풀스택 개발자 5년차) 단일 페르소나에 의존하고 있어,
다양한 직군·경력 수준에서의 도구 호출 판단력을 검증하기 어렵다.
대학입학부터 시니어 개발자까지 폭넓은 페르소나를 추가하여 벤치마크 커버리지를 확보한다.

## Data Types

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

## ID Convention

```
페르소나:    ua-1, oe-3, jd-2, md-5, sd-1 ...
문서:        ua-1-doc-1, ua-1-doc-2 ...
외부문서:    ua-1-ext-1, ua-1-ext-2 ...
커리어노트:  ua-1-note-1, ua-1-note-2 ...
```

카테고리 접두어: `ua`(university-admission), `oe`(office-entry), `jd`(junior-developer), `md`(mid-developer), `sd`(senior-developer)

기존 김철수: `sd-1`로 재배정. `doc-1`~`doc-7` → `sd-1-doc-1`~`sd-1-doc-6` + `sd-1-ext-1`.

## File Structure

```
benchmarks/fixtures/
  types.ts                          # 타입 정의
  personas/
    university-admission.ts         # 대학입학 5명
    office-entry.ts                 # 일반사무직 신입 5명
    junior-developer.ts             # 신입 개발자 5명
    mid-developer.ts                # 미들 개발자 5명
    senior-developer.ts             # 시니어 개발자 5명 (김철수 포함)
  mock-data.ts                      # 전체 re-export (레거시 호환)
```

### 카테고리 파일 export 구조

각 카테고리 파일은 동일한 export 패턴을 따른다:

```ts
// 예: university-admission.ts
import type { MockPersona, MockDocument, MockExternalDocument, MockCareerNote, ConvMessage } from "../types"

export const PERSONAS: MockPersona[] = [...]
export const DOCUMENTS: MockDocument[] = [...]
export const EXTERNAL_DOCUMENTS: MockExternalDocument[] = [...]
export const CAREER_NOTES: MockCareerNote[] = [...]
export const CONV_STYLES: Record<string, Record<string, ConvMessage[]>> = {
  "ua-1": { polite: [...], terse: [...], jumpy: [...] },
  // ...
}
```

### mock-data.ts re-export 허브

`mock-data.ts`는 모든 카테고리 파일을 통합 re-export한다:

```ts
// 모든 카테고리에서 import 후 합쳐서 export
export const ALL_PERSONAS: MockPersona[] = [...]
export const ALL_DOCUMENTS: MockDocument[] = [...]
export const ALL_EXTERNAL_DOCUMENTS: MockExternalDocument[] = [...]
export const ALL_CAREER_NOTES: MockCareerNote[] = [...]
export const ALL_CONV_STYLES: Record<string, Record<string, ConvMessage[]>> = {...}
```

## Per-Persona Data Volume

### 대학입학 (university-admission)

| # | 사용자 문서 | 외부 문서 | 커리어노트 |
|---|---|---|---|
| ua-1 | 3건 (학생부, 자소서 초안, 수상내역) | 1건 (입시요강) | 3건 |
| ua-2 | 2건 (학생부, 자소서 초안) | 1건 (입시요강) | 2건 |
| ua-3 | 2건 (학생부, 활동보고서) | 2건 (입시요강, 학과소개) | 1건 |
| ua-4 | 3건 (학생부, 자소서 초안, 봉사활동기록) | 1건 (입시요강) | 2건 |
| ua-5 | 4건 (학생부, 자소서 초안, 수상내역, 독서활동) | 2건 (입시요강, 학과소개) | 3건 |

### 일반사무직 신입 (office-entry)

| # | 사용자 문서 | 외부 문서 | 커리어노트 |
|---|---|---|---|
| oe-1 | 3건 (이력서, 자소서 초안, 자격증 목록) | 1건 (채용공고) | 3건 |
| oe-2 | 2건 (이력서, 자소서 초안) | 1건 (채용공고) | 2건 |
| oe-3 | 2건 (이력서, 추천서) | 2건 (채용공고, 회사소개) | 1건 |
| oe-4 | 3건 (이력서, 자소서 초안, 인턴확인서) | 2건 (채용공고, 회사소개) | 3건 |
| oe-5 | 2건 (이력서, 자소서 초안) | 1건 (채용공고) | 4건 |

### 신입 개발자 (junior-developer)

| # | 사용자 문서 | 외부 문서 | 커리어노트 |
|---|---|---|---|
| jd-1 | 3건 (이력서, 포트폴리오, 자소서 초안) | 2건 (채용공고, 회사소개) | 3건 |
| jd-2 | 2건 (이력서, 포트폴리오) | 1건 (채용공고) | 2건 |
| jd-3 | 4건 (이력서, 포트폴리오, 자소서 초안, 블로그) | 2건 (채용공고, 기술블로그) | 4건 |
| jd-4 | 2건 (이력서, 자소서 초안) | 2건 (채용공고, JD상세) | 3건 |
| jd-5 | 3건 (이력서, 포트폴리오, 부트캠프 수료증) | 2건 (채용공고, 회사소개) | 2건 |

### 미들 개발자 (mid-developer)

| # | 사용자 문서 | 외부 문서 | 커리어노트 |
|---|---|---|---|
| md-1 | 4건 (이력서, 포트폴리오, 경력기술서, 자소서 초안) | 2건 (채용공고, 기술블로그) | 4건 |
| md-2 | 3건 (이력서, 경력기술서, 자소서 초안) | 2건 (채용공고, 회사소개) | 3건 |
| md-3 | 3건 (이력서, 포트폴리오, 추천서) | 2건 (채용공고, 기술블로그) | 5건 |
| md-4 | 4건 (이력서, 포트폴리오, 경력기술서, 블로그) | 1건 (채용공고) | 3건 |
| md-5 | 3건 (이력서, 경력기술서, 자소서 초안) | 2건 (채용공고, JD상세) | 4건 |

### 시니어 개발자 (senior-developer)

| # | 사용자 문서 | 외부 문서 | 커리어노트 |
|---|---|---|---|
| sd-1 (김철수) | 6건 (기존 유지) | 1건 (채용공고) | 5건 |
| sd-2 | 4건 (이력서, 경력기술서, 자소서 초안, 블로그) | 2건 (채용공고, JD상세) | 4건 |
| sd-3 | 5건 (이력서, 포트폴리오, 경력기술서, 추천서, 특허) | 2건 (채용공고, 회사소개) | 6건 |
| sd-4 | 4건 (이력서, 경력기술서, 포트폴리오, 자소서 초안) | 2건 (채용공고, JD상세) | 5건 |
| sd-5 | 5건 (이력서, 경력기술서, 자소서 초안, 블로그, 추천서) | 2건 (채용공고, 기술블로그) | 4건 |

### 개발자 카테고리 외부 문서 균등 분배

| | 신입 개발자 | 미들 개발자 | 시니어 개발자 |
|---|---|---|---|
| **1** | 채용공고, 회사소개 | 채용공고, 기술블로그 | 채용공고 (김철수) |
| **2** | 채용공고 | 채용공고, 회사소개 | 채용공고, JD상세 |
| **3** | 채용공고, 기술블로그 | 채용공고, 기술블로그 | 채용공고, 회사소개 |
| **4** | 채용공고, JD상세 | 채용공고 | 채용공고, JD상세 |
| **5** | 채용공고, 회사소개 | 채용공고, JD상세 | 채용공고, 기술블로그 |

분포 (15명 중): 채용공고 15건, 회사소개 4건, 기술블로그 4건, JD상세 4건

## Conversation Styles

각 페르소나에 3종(polite, terse, jumpy) 대화 스타일 전부 포함.
25명 × 3종 = 75개 대화 스크립트.

각 대화 스크립트는 해당 페르소나의 맥락(지원 대상, 보유 문서)에 맞게 작성.

```ts
// 각 카테고리 파일에서 export
export const CONV_STYLES: Record<string, Record<string, ConvMessage[]>> = {
  "ua-1": {
    polite: [...],
    terse: [...],
    jumpy: [...],
  },
  // ...
}
```

## Migration: 김철수 데이터

기존 `mock-data.ts`의 김철수 데이터를 `senior-developer.ts`로 이동:

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

## Data Quality Guidelines

- 김철수 수준의 리얼한 디테일 (실제 수치, 기술 스택, 프로젝트 세부사항)
- 각 페르소나 간 이름, 학교, 회사, 기술 스택 등이 겹치지 않도록 다양성 확보
- `extractedText`는 실제 문서 형태를 모방 (이력서 형식, 채용공고 형식 등)
- 카테고리별 맥락에 맞는 자연스러운 내용 (대학입학은 학교 활동, 시니어 개발자는 대규모 시스템 경험 등)

## Breaking Changes

이 작업은 기존 벤치마크 코드에 breaking change를 발생시킨다.
기존 벤치마크 코드(chat-pipeline, tool-calling)는 별도 작업으로 전면 리팩토링할 예정이므로, 하위 호환을 유지하지 않는다.

주요 breaking change:
- `MOCK_DOCUMENTS` → `ALL_DOCUMENTS`로 변경, `personaId` 필드 추가
- `MOCK_CAREER_NOTES` → `ALL_CAREER_NOTES`로 변경, `personaId` 필드 추가
- `CONV_STYLES` → `ALL_CONV_STYLES`로 변경, `Record<string, ConvMessage[]>` → `Record<string, Record<string, ConvMessage[]>>`
- 문서 ID 체계 변경: `doc-1` → `sd-1-doc-1` 등
- `MockExternalDocument` 타입 신설, 기존 채용공고 분리

## Benchmark Integration

벤치마크 연동은 이 스펙 범위 밖. 데이터만 준비하고, 기존 벤치마크 코드 리팩토링은 별도 작업으로 진행.
