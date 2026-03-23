# Chat Pipeline Benchmark

채팅 파이프라인에서 LLM이 사용자 문서를 얼마나 정확하게 선택·활용하는지 비교하는 벤치마크.

## 비교 대상

두 가지 문서 선택 방식을 비교한다:

| 방식 | 설명 |
|---|---|
| **멀티스텝 Tool Loop** | LLM이 자율적으로 `readDocument`/`readCareerNote` 도구를 호출하여 필요한 문서를 읽음 |
| **1단계 분류 + 서버 실행** | LLM이 먼저 어떤 문서를 읽을지 분류(structured output) → 서버가 해당 문서를 fetch → LLM이 응답 생성 |

## 평가 기준

1. **문서 선택 정확도** — 핵심 문서(포트폴리오 doc-2, 채용공고 doc-3)를 정확히 선택했는가
2. **응답 품질** — deploy-ez 구체적 내용(Go, K8s, Stars 450+), 채용공고 매칭, 자소서 문장 형태
3. **토큰 효율성** — 동일 품질 대비 토큰 소모량
4. **응답 속도** — 전체 파이프라인 소요 시간
5. **비용** — 프로바이더별 실제 API 비용

## 평가 방법

### 정답 정의

사용자 질문은 "deploy-ez 프로젝트를 네이버 클라우드에 어필할 수 있는 부분 뽑아줘"이다.
이 질문에 정확히 답하려면 최소 2개의 문서를 읽어야 한다:

- **doc-2 (포트폴리오)** — deploy-ez의 구체적 내용 (Go, Docker+K8s, Stars 450+, npm 2K+)
- **doc-3 (채용공고)** — 네이버 클라우드의 요구사항 (K8s, MSA, Go, 오픈소스 기여)

doc-1(이력서), 커리어노트 등은 읽어도 되고 안 읽어도 됨 (선택적).

### 정확도 측정

각 모델×시나리오×방식 조합에서 다음을 확인:

1. **도구 호출 로그** — 어떤 문서를 읽었는지 (멀티스텝: toolCalls, 분류: documentsToRead)
2. **doc-2 적중 여부** — deploy-ez 상세 정보 접근 가능 여부
3. **doc-3 적중 여부** — 채용공고 요구사항 매칭 가능 여부
4. **응답 내용 검증** — 구체적 수치(Stars 450+, npm 2K+) 포함 여부, 환각(hallucination) 유무

### 정량 데이터 수집

Vercel AI SDK의 `generateText` 반환값에서 자동 수집:

- `step.usage.inputTokens` / `outputTokens` — 스텝별 토큰 사용량
- `result.steps.length` — 총 스텝 수
- `Date.now()` 차이 — 전체 소요 시간(ms)
- `step.toolCalls` — 도구 호출 내역

### 비용 산출

각 프로바이더의 공식 가격표 기준으로 `(input 토큰 × input 단가) + (output 토큰 × output 단가)` 계산.

### 결과 분석

정량 데이터(토큰, 속도, 도구 호출 로그, 비용)는 벤치마크 스크립트가 자동 수집한다.

정성 평가는 **Claude Code (claude-opus-4-6, effort: high)** 가 결과 파일의 도구 호출 로그와 응답 전문을 읽고 수행하여 report.md를 작성했다. 정성 평가 항목:

- 응답 품질 평가 (구체적 수치 포함 여부, 환각 유무, 채용공고 매칭 정도)
- 모델별 특성 및 패턴 도출
- 방식별 적합 모델 판단
- 비용 대비 정확도 가성비 분석

## 테스트 시나리오

목업 데이터(이력서, 포트폴리오, 채용공고, 경력기술서, 커리어노트 등)를 사용하며, 3가지 시나리오로 테스트:

| 시나리오 | 문서 | 노트 | 사용자 유형 |
|---|---|---|---|
| 소규모 | 3개 | 2개 | 정중한 유저 (구체적 요청) |
| 중규모 | 5개 | 3개 | 짧은 유저 (모호한 요청) |
| 대규모 | 7개 | 5개 | 맥락 끊는 유저 |

## 실행 방법

```bash
# 프로바이더별 실행 (프로젝트 루트에서)
npx tsx benchmarks/chat-pipeline/v1/openai.ts
npx tsx benchmarks/chat-pipeline/v1/anthropic.ts
npx tsx benchmarks/chat-pipeline/v1/google.ts
```

각 파일 상단의 `MODELS` 상수에서 테스트할 모델을 변경할 수 있다.

API 키는 `.env.local`에서 읽는다: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`

## 버전

| 버전 | 설명 |
|---|---|
| **v1** | 초기 벤치마크. 목업 데이터 기반, 멀티스텝 vs 분류방식 비교 |
