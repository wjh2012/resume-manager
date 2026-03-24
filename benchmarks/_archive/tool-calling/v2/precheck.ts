/**
 * 도구 호출 Pre-check — 사용자 메시지 사전 분류 + 동적 힌트 생성
 *
 * 메인 LLM 호출 전에 사용자 메시지를 분석하여
 * 시스템 프롬프트에 동적 힌트를 주입한다.
 */

// ---------------------------------------------------------------------------
// Turn 1 Pre-check: 사용자 메시지 분류 → 도구 힌트 생성
// ---------------------------------------------------------------------------

interface PrecheckResult {
  hint: string
  classification: "number-change" | "new-experience" | "draft-request" | "general"
}

/**
 * 사용자 메시지와 참고자료 요약을 비교하여 도구 힌트를 생성한다.
 * 규칙 기반 분류 — 벤치마크 재현성을 위해 LLM 호출 없이 패턴 매칭.
 */
export function classifyMessage(
  userMessage: string,
  contextSummaries: string
): PrecheckResult {
  // 1. 수치 변경 감지: 기존 기록과 다른 수치를 언급
  if (detectNumberChange(userMessage, contextSummaries)) {
    return {
      classification: "number-change",
      hint: [
        "[TOOL HINT] 사용자가 기존 기록의 수치 변경을 언급했습니다.",
        "readCareerNote로 기존 기록을 확인한 후, 수정된 내용으로 saveCareerNote를 제안하세요.",
      ].join("\n"),
    }
  }

  // 2. 새 경험 감지: 참고자료에 없는 경험/수치
  if (detectNewExperience(userMessage, contextSummaries)) {
    return {
      classification: "new-experience",
      hint: [
        "[TOOL HINT] 사용자가 참고자료에 없는 새 경험/수치를 언급했습니다.",
        "saveCareerNote 저장을 제안하세요. 기존 노트 조회는 불필요합니다.",
      ].join("\n"),
    }
  }

  // 3. 초안/작성 요청 감지
  if (detectDraftRequest(userMessage)) {
    return {
      classification: "draft-request",
      hint: [
        "[TOOL HINT] 사용자가 초안/문단 작성을 요청했습니다.",
        "readDocument로 관련 참고자료 원문을 읽은 후 작성하세요.",
      ].join("\n"),
    }
  }

  // 4. 일반 질문 — 도구 불필요
  return {
    classification: "general",
    hint: "",
  }
}

// ---------------------------------------------------------------------------
// Turn 2 Pre-check: 승인 후 힌트
// ---------------------------------------------------------------------------

/**
 * Turn 2 (사용자 승인 후) 전용 힌트.
 * "승인했으니 바로 saveCareerNote 호출" 지시.
 */
export function generateTurn2Hint(): string {
  return [
    "[TOOL HINT] 사용자가 커리어노트 저장을 승인했습니다.",
    "추가 조회 없이 바로 saveCareerNote를 호출하세요.",
  ].join("\n")
}

// ---------------------------------------------------------------------------
// 패턴 매칭 유틸리티
// ---------------------------------------------------------------------------

/** 기존 기록과 다른 수치를 언급했는지 감지 */
function detectNumberChange(
  message: string,
  contextSummaries: string
): boolean {
  // "아니라", "가 아니라", "에서 X로", "→" 등 변경 표현
  const changePatterns = [
    /아니라/,
    /에서\s*\d+/,
    /\d+.{0,5}(→|->|에서).{0,5}\d+/,
    /(늘었|줄었|변경|바뀌|수정|업데이트)/,
  ]

  const hasChangeExpression = changePatterns.some((p) => p.test(message))
  if (!hasChangeExpression) return false

  // 메시지에 숫자가 있고, 같은 엔티티가 컨텍스트에도 있는지 확인
  const messageNumbers = message.match(/\d+/g)
  if (!messageNumbers) return false

  // 컨텍스트에 등장하는 엔티티(프로젝트명, 지표명 등)가 메시지에도 있는지
  const contextWords = contextSummaries
    .split(/[\s,.\n]+/)
    .filter((w) => w.length > 2)
  const messageWords = message.split(/[\s,.\n]+/)

  const sharedEntities = messageWords.filter((w) =>
    contextWords.some(
      (cw) => cw.length > 2 && w.length > 2 && cw.includes(w)
    )
  )

  return sharedEntities.length > 0
}

/** 참고자료에 없는 새 경험/수치를 언급했는지 감지 */
function detectNewExperience(
  message: string,
  contextSummaries: string
): boolean {
  // 경험 서술 패턴
  const experiencePatterns = [
    /(만들었|개발했|구현했|달성했|처리했)/,
    /\d+.{0,10}(건|개|%|배|만|억)/,
    /(작년|올해|지난).{0,10}(에|부터)/,
  ]

  const hasExperience = experiencePatterns.some((p) => p.test(message))
  if (!hasExperience) return false

  // 핵심 키워드가 컨텍스트에 없는지 확인 (새 경험 = 컨텍스트에 없음)
  const contextLower = contextSummaries.toLowerCase()
  const keywords = message
    .match(/[가-힣a-zA-Z]{2,}/g)
    ?.filter((w) => w.length > 2) ?? []

  // 메시지의 주요 키워드 중 컨텍스트에 없는 것이 있으면 새 경험
  const newKeywords = keywords.filter(
    (w) => !contextLower.includes(w.toLowerCase())
  )

  return newKeywords.length >= 2
}

/** 초안/문단 작성 요청인지 감지 */
function detectDraftRequest(message: string): boolean {
  return /써줘|작성|초안|문단|써\s*주|써봐|만들어/.test(message)
}
