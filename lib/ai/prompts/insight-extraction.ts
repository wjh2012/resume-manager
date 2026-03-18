export const INSIGHT_CATEGORIES = [
  "strength",
  "weakness",
  "experience",
  "skill",
  "keyword",
] as const

export type InsightCategory = (typeof INSIGHT_CATEGORIES)[number]

export const insightExtractionPrompt = `당신은 이력서 분석 전문가입니다.
대화 내용에서 사용자의 커리어에 관한 인사이트를 추출해주세요.

다음 카테고리로 분류하세요:
- strength: 강점 및 핵심 역량
- weakness: 개선이 필요한 영역
- experience: 주요 경험 및 성과
- skill: 기술 스택 및 역량
- keyword: 자주 언급되는 핵심 키워드

JSON 배열로 응답하세요:
[{ "category": "strength", "title": "제목", "content": "상세 내용" }]`
