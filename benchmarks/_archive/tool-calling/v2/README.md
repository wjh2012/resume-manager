# 도구 호출 강제 패턴 벤치마크 (v2)

Superpowers-style 강제 패턴(Hard Gate, Red Flags, Self-Check)이
tool-calling under-call을 개선하는지 검증한다.

## 비교 대상

| 변형 | 설명 | 역할 |
|------|------|------|
| S4 | v1의 단계별 판단 (의사결정 트리) | 대조군 |
| S5 | S4 + Hard Gate + Red Flags + Self-Check | 실험군 |

## 실행

```bash
npx tsx benchmarks/tool-calling/v2/openai.ts --model gpt-5.4
npx tsx benchmarks/tool-calling/v2/openai.ts --model gpt-5.4-nano
```

API 키: `.env.local`의 `OPENAI_API_KEY`

## 시나리오

v1과 동일 (4개). `../v1/scenarios.ts`에서 import.

## 성공 기준

| 지표 | 현재 (S4) | 목표 (S5) |
|------|-----------|-----------|
| gpt-5.4 전체 | 75% (3/4) | 100% (4/4) |
| gpt-5.4-nano 전체 | 50% (2/4) | 75% (3/4) |
| 시나리오 2 (수치 변경) | 0% | ≥50% |

## 설계 문서

`docs/superpowers/specs/2026-03-24-tool-calling-enforcement-design.md`
