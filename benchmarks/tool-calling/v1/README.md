# 도구 호출 판단력 벤치마크 (v1)

시스템 프롬프트의 도구 호출 지시 방식에 따라 LLM의 도구 호출 정확도가 어떻게 달라지는지 측정한다.

## 비교 대상

| 변형 | 스타일 | 설명 |
|------|--------|------|
| S1 | 최소 | 도구 호출 지시 없음 |
| S2 | 현재 | buildCoverLetterSystemPrompt 현재 버전 |
| S3 | few-shot | S2 + 도구 호출 판단 예시 4개 |
| S4 | 단계별 판단 | if/else 의사결정 트리 형태 |

## 시나리오

| # | 상황 | 기대 도구 호출 |
|---|------|---------------|
| 1 | 새 경험 언급 | saveCareerNote |
| 2 | 수치 변경 | readCareerNote → saveCareerNote |
| 3 | 초안 요청 | readDocument |
| 4 | 단순 질문 | 없음 |

## 실행

```bash
# 단일 모델
npx tsx benchmarks/tool-calling/v1/openai.ts --model gpt-5.4

# Claude Code 서브에이전트 병렬 디스패치
# 에이전트 1: --model gpt-5.4
# 에이전트 2: --model gpt-5.4-nano
```

API 키: `.env.local`의 `OPENAI_API_KEY`

## Pass 판정

- **Recall**: 기대 도구를 모두 호출했는가
- **Precision**: 기대하지 않은 도구를 호출하지 않았는가
- **순서** (시나리오 2): readCareerNote가 saveCareerNote보다 이전 step에 있어야 함

## 결과

`results/` 디렉토리에 JSON + TXT 형식으로 저장.

- JSON: 정성 평가 입력용 (원시 데이터)
- TXT: 사람이 읽을 수 있는 요약 + 응답 전문
