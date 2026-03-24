# Benchmark CLI & Config 개선 설계

## 배경

PR #91에서 벤치마크 프레임워크를 전면 리팩토링하여 공통 인프라(providers, cost, cli, report)와
Batch API 지원을 구축했다. 현재 CLI는 `--suite`, `--provider`, `--model`(단일), `--batch`를
지원하고, 페르소나는 `sd-1` 하드코딩이다.

## 목표

1. **Config 파일 기반 실행** — 모델/페르소나 조합을 선언적으로 정의하여 반복 실행 용이하게
2. **CLI 옵션 확장** — `--persona` 복수 지정, `--model` 복수 지정, `--config` 지원
3. **v1 잔여 파일 archive** — `benchmarks/tool-calling/v1/` → `_archive/`로 이동

## 설계

### 1. Config 파일 구조

```ts
// benchmarks/benchmark.config.ts
import type { BenchmarkConfig } from "./lib/config";

export default {
  suites: ["tool-calling"],
  providers: ["openai", "anthropic"],
  models: ["gpt-5.4-nano", "claude-haiku-4-5"],
  personas: ["sd-1", "jd-3"],
  batch: false,
} satisfies BenchmarkConfig;
```

**`BenchmarkConfig` 타입** (`benchmarks/lib/config.ts`):

```ts
export interface BenchmarkConfig {
  suites: "all" | Array<"tool-calling" | "chat-pipeline">;
  providers?: "all" | Array<"openai" | "anthropic" | "google">;
  models: string[];
  personas: string[];  // 페르소나 ID 또는 ["all"]
  batch: boolean;
}
```

**동작 규칙:**

- `providers`는 선택적 필터 — 명시하면 해당 provider만 허용, 생략 시 제한 없음
- `personas: ["all"]`이면 25개 전체 순회
- 페르소나 ID는 로드 시 `ALL_PERSONAS`와 대조하여 유효성 검증 — 잘못된 ID는 에러
- 페르소나는 데이터 다양성 확보 용도이므로 페르소나별 비교 리포트는 생성하지 않음
- `--config` 미지정 시 config 파일 자동 로드 없음 — CLI 옵션 + 기본값으로만 동작

### 2. CLI 변경

기존 옵션 유지 + 신규 옵션 추가:

```
--suite <suite>        기존 유지
--provider <provider>  기존 유지 (providers 필터 역할)
--model <models>       콤마 구분 복수 지정 (기존: 단일)
--persona <personas>   신규. 콤마 구분 복수 지정 또는 "all"
--config <path>        신규. config 파일 경로
--batch                기존 유지
```

**사용 예시:**

```bash
# config 파일 사용
npm run bench -- --config benchmarks/benchmark.config.ts

# CLI 옵션만
npm run bench -- --suite tool-calling --model gpt-5.4-nano,claude-haiku-4-5 --persona sd-1,jd-3

# 혼합 — config 로드 후 CLI로 override
npm run bench -- --config benchmarks/benchmark.config.ts --batch
```

**우선순위:** CLI 옵션 > config 파일 > 기본값

**`BenchmarkOptions` 변경:**

```ts
export interface BenchmarkOptions {
  suites: string[];      // 기존 suite: string → 복수
  providers: string[];   // 기존 provider: string → 복수 (필터 역할)
  models: string[];      // 기존 model?: string → 복수
  personas: string[];    // 신규
  batch: boolean;
}
```

`--provider`는 CLI에서 단일 값으로 받되, 내부적으로 `providers: string[]`로 변환한다.
config에서 복수 지정한 경우 그대로 배열로 사용한다.
`providers`는 모델→provider 자동 매핑의 허용 필터 역할이다.

### 3. 모델→Provider 자동 매핑

모델명 prefix로 provider를 자동 결정한다:

| Prefix | Provider |
|--------|----------|
| `gpt-*` | openai |
| `o1-*`, `o3-*`, `o4-*` | openai |
| `claude-*` | anthropic |
| `gemini-*` | google |

- 명시적 prefix 목록으로 매칭 — 단일 문자(`o*`) 같은 과도한 패턴은 사용하지 않음
- config의 `providers` 필드는 허용 필터 역할 — 매핑된 provider가 `providers`에 없으면 스킵 + 경고 로그
- prefix 매핑 실패 시 에러 로그 + 스킵

### 4. 실행 루프 변경

```
1. config 로드 (있으면) → CLI 옵션으로 override → 최종 BenchmarkOptions resolve
2. for (model of models)
     provider = resolveProvider(model)
     if (providers 필터에 없으면) skip
     for (persona of personas)
       suite.run(provider, model, persona)
3. 결과 파일 네이밍:
   benchmark-result-{date}_{model}_{persona}_{mode}.json
```

### 5. 시나리오 팩토리 함수 전환

현재 `tool-calling/scenarios.ts`와 `chat-pipeline/scenarios.ts`는 `sd-1` 데이터를
모듈 최상위에서 상수로 구성한다. 페르소나를 동적으로 주입하려면 `SCENARIOS` 상수를
**팩토리 함수**로 전환해야 한다:

```ts
// 변경 전: 정적 상수
export const SCENARIOS: Scenario[] = [...]

// 변경 후: 팩토리 함수
export function buildScenarios(personaId: string): Scenario[] { ... }
```

각 suite의 `run.ts`에서 `buildScenarios(persona)`를 호출하여 시나리오를 생성한다.
대화 스타일(polite/terse/jumpy)은 기존 시나리오 설계에 따라 시나리오별로 결정되며,
페르소나 파라미터로 변경하지 않는다.

### 6. 파일 변경 목록

| 파일 | 변경 |
|------|------|
| `benchmarks/benchmark.config.ts` | 신규 — 예시 config 파일 |
| `benchmarks/lib/config.ts` | 신규 — `BenchmarkConfig` 타입, config 로드, CLI 머지, 페르소나 유효성 검증 |
| `benchmarks/lib/cli.ts` | `--persona`, `--config`, 복수 `--model` 파싱 추가, `BenchmarkOptions` 타입 변경 |
| `benchmarks/lib/index.ts` | config 모듈 re-export 추가 |
| `benchmarks/run.ts` | config 로드 + 모델×페르소나 루프로 변경 |
| `benchmarks/tool-calling/run.ts` | persona 파라미터 수신, 결과 파일명에 persona 포함 |
| `benchmarks/tool-calling/scenarios.ts` | `SCENARIOS` 상수 → `buildScenarios(personaId)` 팩토리 함수 전환 |
| `benchmarks/chat-pipeline/run.ts` | persona 파라미터 수신, 결과 파일명에 persona 포함 |
| `benchmarks/chat-pipeline/scenarios.ts` | `SCENARIOS` 상수 → `buildScenarios(personaId)` 팩토리 함수 전환 |
| `benchmarks/lib/__tests__/cli.test.ts` | 신규 옵션 테스트 추가 |
| `benchmarks/lib/__tests__/config.test.ts` | 신규 — config 로드, 머지, 유효성 검증 테스트 |
| `benchmarks/tool-calling/v1/` | `benchmarks/_archive/tool-calling/v1/`로 이동 |

### 7. 범위 외

- 페르소나별 비교 리포트 (페르소나는 데이터 다양성 용도)
- 프로그래머블 API (.test.ts 방식 실행)
- 결과 리포팅 형식 변경 (기존 JSON 유지)
- 대화 스타일 파라미터화
