# 도구 호출 판단력 벤치마크 설계

## 배경

자소서 채팅에서 LLM이 도구(readDocument, readCareerNote, saveCareerNote)를 올바른 타이밍에 호출하는지 측정하는 벤치마크. 시스템 프롬프트의 도구 호출 지시 방식에 따라 정확도가 어떻게 달라지는지 비교한다.

## 비교 대상

tool description은 현재 코드 그대로 고정. 시스템 프롬프트의 도구 호출 지시 부분만 4가지 변형.

| 변형 | 스타일 | 설명 |
|------|--------|------|
| S1 | 최소 | 도구 호출 지시 없음. "참고자료는 요약입니다. 필요하면 도구로 전문을 읽으세요" 정도만 |
| S2 | 현재 | 현재 `buildCoverLetterSystemPrompt`의 커리어노트 관련 지시 그대로 |
| S3 | few-shot | S2 + 도구 호출 판단 예시 4개 |
| S4 | 단계별 판단 | if/else 의사결정 트리 형태 |

### S3 few-shot 예시

```
[도구 호출 판단 예시]
- "작년에 AWS 마이그레이션 리드했어" → saveCareerNote 제안 (새 경험)
- "성능 개선은 40%가 아니라 60%였어" → readCareerNote 후 saveCareerNote 갱신 제안
- "핵심역량 써줘" → readDocument로 전문 읽기
- "고마워요" → 도구 호출 없음
```

### S4 단계별 판단

```
도구 호출 판단 기준:
1. 사용자가 문서에 없는 새 경험/성과/수치를 언급했는가? → saveCareerNote로 저장 제안
2. 기존 커리어노트와 다른 정보인가? → readCareerNote로 확인 후 saveCareerNote로 갱신 제안
3. 구체적 문장 작성이 필요한가? → readDocument로 전문 읽기
4. 위에 해당하지 않으면 → 도구 호출 없이 응답
```

## 시나리오

`benchmarks/chat-pipeline/v1/common.ts`의 목업 데이터(MOCK_DOCUMENTS, MOCK_CAREER_NOTES)를 재사용. 대화 히스토리는 `polite` 스타일 앞부분 4턴을 공통 사용하고, 마지막 메시지만 시나리오별로 변경.

| # | 상황 | 마지막 사용자 메시지 | 기대 도구 호출 |
|---|------|---------------------|---------------|
| 1 | 새 경험 | "작년에 Rust로 고성능 메시지 큐 만들었는데 초당 50만 건 처리했어" | `saveCareerNote` (생성) |
| 2 | 수치 변경 | "아 그 deploy-ez Stars가 450개가 아니라 800개로 늘었어" | `readCareerNote` → `saveCareerNote` (갱신) |
| 3 | 초안 요청 | "deploy-ez 프로젝트 중심으로 핵심역량 써줘" | `readDocument` |
| 4 | 단순 질문 | "자소서 분량은 보통 얼마나 돼?" | 없음 |

## 모델

OpenAI만 우선 실행. 추후 Anthropic, Google 확장 가능.

| 모델 | 역할 |
|------|------|
| gpt-5.4 | 신세대 고성능 |
| gpt-5.4-nano | 신세대 저가 |

## 실행 구조

### 서브에이전트 병렬 디스패치

Claude Code가 모델별 서브에이전트 2개를 병렬 실행:

```
서브에이전트 1: npx tsx benchmarks/tool-calling/v1/openai.ts --model gpt-5.4
서브에이전트 2: npx tsx benchmarks/tool-calling/v1/openai.ts --model gpt-5.4-nano
```

### 스크립트 내부 병렬

각 스크립트 내부에서 4시나리오 × 4프롬프트 = 16 runs를 Promise.all로 병렬 실행.

### 총 실행 수

2모델 × 4프롬프트 × 4시나리오 = **32 runs**

## 결과 수집

### BenchmarkResult 타입

```typescript
interface BenchmarkResult {
  model: string           // "gpt-5.4"
  scenario: string        // "새 경험"
  promptVariant: string   // "S1"
  toolCalls: string[]     // ["saveCareerNote({title: ...})"]
  expectedTools: string[] // ["saveCareerNote"]
  pass: boolean           // 기대와 일치하는지
  inputTokens: number
  outputTokens: number
  durationMs: number
  responseFull: string    // 정성 평가용
}
```

### pass 판정 로직

- 기대 도구를 **모두 호출**했는가 (recall)
- 기대하지 않은 도구를 호출하지 **않았는가** (precision)
- 시나리오 2(수치 변경)는 `readCareerNote` → `saveCareerNote` **순서**도 확인

### 결과 파일

```
benchmarks/tool-calling/v1/results/
  benchmark-result-{timestamp}_{model}.json   — 원시 데이터 (정성 평가 입력용)
  benchmark-result-{timestamp}_{model}.txt    — 사람이 읽을 수 있는 요약 + 응답 전문
```

## 파일 구조

```
benchmarks/tool-calling/v1/
├── scenarios.ts    — 목업 데이터(chat-pipeline/v1 재사용) + 4개 시나리오 + 기대 동작
├── prompts.ts      — S1~S4 시스템 프롬프트 변형 + 공통 tool 정의
├── runner.ts       — 벤치마크 실행(병렬) + pass 판정 + 결과 수집/저장
├── openai.ts       — OpenAI 엔트리포인트 (--model 인자로 모델 선택)
├── README.md       — 벤치마크 설명, 실행 방법, 평가 기준
└── results/        — 결과 파일
```

추후 `anthropic.ts`, `google.ts` 추가 시 `runner.ts`를 공유.

## 평가

### 정량 (스크립트 자동 수집)

- 시나리오별 pass/fail
- 프롬프트 변형별 pass rate
- 도구 호출 로그
- 토큰 사용량, 소요 시간

### 정성 (Claude Code opus-4-6, effort: high)

결과 JSON + txt를 읽고 `report.md` 작성:

- 프롬프트 변형별 pass rate 비교 (S1 vs S2 vs S3 vs S4)
- 모델별 차이 (gpt-5.4 vs gpt-5.4-nano)
- 시나리오별 난이도 분석 (어떤 상황이 가장 어려운가)
- 최적 프롬프트 변형 추천
- false positive/negative 패턴 분석

## 실행 방법

```bash
# 단일 모델 실행
npx tsx benchmarks/tool-calling/v1/openai.ts --model gpt-5.4

# Claude Code에서 서브에이전트 병렬 디스패치로 2모델 동시 실행
```

API 키는 `.env.local`에서 읽는다: `OPENAI_API_KEY`
