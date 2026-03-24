# 벤치마크 실행 가이드

## 개요

LLM의 도구 호출 판단력(`tool-calling`)과 채팅 파이프라인(`chat-pipeline`) 성능을 측정하는 벤치마크 프레임워크.

## 사전 준비

provider별 API 키를 `.env`에 설정:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=AI...
```

## 실행 방법

### CLI 옵션

```bash
npm run bench -- [options]
```

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--suite <name>` | `tool-calling`, `chat-pipeline`, `all` | `all` |
| `--provider <name>` | `openai`, `anthropic`, `google`, `all` (허용 필터) | `all` |
| `--model <models>` | 콤마 구분 복수 지정 | provider별 기본 모델 |
| `--persona <ids>` | 콤마 구분 복수 지정 또는 `all` | `sd-1` |
| `--config <path>` | config 파일 경로 | 없음 |
| `--batch` | Batch API 모드 활성화 | `false` |

### 기본 실행

```bash
# 전체 suite, 전체 provider 기본 모델, sd-1 페르소나
npm run bench

# 특정 suite만
npm run bench -- --suite tool-calling

# 특정 모델 지정
npm run bench -- --model gpt-5.4-nano

# 복수 모델 + 복수 페르소나
npm run bench -- --model gpt-5.4-nano,claude-haiku-4-5-20251001 --persona sd-1,jd-3

# Batch API 모드
npm run bench -- --suite tool-calling --model gpt-5.4-nano --batch
```

### Config 파일 사용

`benchmarks/benchmark.config.ts`에 실행 조합을 선언:

```ts
import type { BenchmarkConfig } from "./lib/config";

export default {
  suites: ["tool-calling"],
  providers: ["openai", "anthropic"],
  models: ["gpt-5.4-nano", "claude-haiku-4-5-20251001"],
  personas: ["sd-1", "jd-3"],
  batch: false,
} satisfies BenchmarkConfig;
```

```bash
# config 파일로 실행
npm run bench -- --config benchmarks/benchmark.config.ts

# config + CLI override (CLI가 우선)
npm run bench -- --config benchmarks/benchmark.config.ts --batch
```

**우선순위:** CLI 옵션 > config 파일 > 기본값

## 모델→Provider 자동 매핑

모델명 prefix로 provider가 자동 결정됩니다:

| Prefix | Provider |
|--------|----------|
| `gpt-*` | openai |
| `o1-*`, `o3-*`, `o4-*` | openai |
| `claude-*` | anthropic |
| `gemini-*` | google |

`--provider`는 허용 필터 역할 — 매핑된 provider가 `--provider`에 없으면 해당 모델은 스킵됩니다.

## 결과

결과 JSON은 각 suite의 `results/` 디렉토리에 저장:

```
benchmarks/tool-calling/results/benchmark-result-{date}_{model}_{persona}_{mode}.json
benchmarks/chat-pipeline/results/benchmark-result-{date}_{model}_{persona}_{mode}.json
```

## 테스트

```bash
npx vitest run benchmarks/
```

## Batch 모드 제한

- `tool-calling`: 2턴 시나리오 스킵 (단일 completion만 지원)
- `chat-pipeline`: multistep 시나리오 스킵 (maxSteps > 1 불가)
