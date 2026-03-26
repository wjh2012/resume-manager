export const INSIGHT_CATEGORIES = [
  "strength",
  "experience",
  "motivation",
  "skill",
  "other",
] as const

export type InsightCategory = (typeof INSIGHT_CATEGORIES)[number]

export const INSIGHT_CATEGORY_LABELS: Record<InsightCategory, string> = {
  strength: "강점, 장점",
  experience: "경험, 경력, 성과",
  motivation: "동기, 가치관, 목표",
  skill: "기술, 역량",
  other: "기타",
}

const categoryList = Object.entries(INSIGHT_CATEGORY_LABELS)
  .map(([key, label]) => `- ${key}: ${label}`)
  .join("\n")

export const insightExtractionPrompt = `대화 내용을 분석하여 취업 준비에 유용한 인사이트를 추출하세요.

각 인사이트를 다음 카테고리 중 하나로 분류하세요:
${categoryList}

구체적이고 재활용 가능한 정보만 추출하세요. 일반적인 내용은 제외하세요.

JSON 배열로 응답하세요:
[{ "category": "strength", "title": "제목", "content": "상세 내용" }]`
