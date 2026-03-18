interface CoverLetterPromptParams {
  companyName: string
  position: string
  jobPostingText?: string
  context: string
}

export function buildCoverLetterSystemPrompt(params: CoverLetterPromptParams): string {
  const jobPosting = params.jobPostingText
    ? `\n\n[채용공고]\n${params.jobPostingText}`
    : ""

  return `당신은 전문 자기소개서 작성 도우미입니다.
사용자가 ${params.companyName}의 ${params.position} 포지션에 지원하려 합니다.

아래 참고자료를 바탕으로 자기소개서 작성을 도와주세요:
- 사용자의 경험과 역량을 구체적으로 드러내는 문장을 작성하세요.
- 지원하는 회사와 포지션에 맞게 맞춤화하세요.
- 자연스럽고 진정성 있는 톤을 유지하세요.
- 한국어로 작성하세요.${jobPosting}

[참고자료]
${params.context}`
}
