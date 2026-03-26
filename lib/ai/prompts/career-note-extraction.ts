import { z } from "zod"

export const CAREER_NOTE_METADATA_KEYS = [
  "where",
  "role",
  "what",
  "result",
  "challenge",
  "motivation",
  "feeling",
  "lesson",
] as const

// AI 추출용 스키마 — OpenAI structured output은 모든 필드가 required여야 하므로 nullable 사용
export const careerNoteMetadataSchema = z.object({
  where: z.string().nullable(),
  role: z.string().nullable(),
  what: z.string().nullable(),
  result: z.string().nullable(),
  challenge: z.string().nullable(),
  motivation: z.string().nullable(),
  feeling: z.string().nullable(),
  lesson: z.string().nullable(),
})

export const careerNoteExtractionSchema = z.object({
  notes: z.array(
    z.object({
      title: z.string().max(200),
      content: z.string().max(5000),
      metadata: careerNoteMetadataSchema,
      relatedExistingNoteId: z.string().uuid().nullable(),
      suggestedMerge: z
        .object({
          title: z.string().max(200),
          content: z.string().max(5000),
          metadata: careerNoteMetadataSchema,
        })
        .nullable(),
    }),
  ),
})

export function buildCareerNoteExtractionPrompt(
  existingNotes: { id: string; title: string; content: string; metadata: unknown }[],
): string {
  const existingNotesSection =
    existingNotes.length > 0
      ? `\n\n[기존 커리어노트]\n${existingNotes
          .map(
            (n) =>
              `- ID: ${n.id}\n  제목: ${n.title}\n  내용: ${n.content}\n  메타데이터: ${JSON.stringify(n.metadata)}`,
          )
          .join("\n")}`
      : ""

  return `당신은 커리어코치의 상담 노트를 작성하는 전문가입니다.
대화 내용을 분석하여 사용자의 커리어 경험을 구조화된 노트로 추출하세요.

## 핵심 원칙
- 사용자(user) 메시지에서만 경험, 역량, 감정, 깨달음을 추출하세요. AI(assistant) 응답은 맥락 파악용으로만 참고하고 추출 대상에 포함하지 마세요
- 일반적인 이력서의 성과 나열이 아닙니다
- 객관적 사실뿐 아니라 사용자의 주관적 경험(감정, 태도, 가치관, 깨달음)까지 포착하세요
- 객관적으로 큰 성과를 냈지만 별 감흥이 없었던 경험과, 작은 일이지만 큰 의미를 느낀 경험을 구분하세요
- 구체적이고 재활용 가능한 정보만 추출하세요. 일반적인 내용은 제외하세요
- content는 최대 5000자, title은 최대 200자로 작성하세요

## metadata 필드 (모두 선택적)
- where: 프로젝트/회사/환경
- role: 역할
- what: 행동/상황
- result: 성과/결과 (객관적 지표)
- challenge: 어려웠던 점, 장애물
- motivation: 동기, 왜 그 행동을 했는지
- feeling: 느낀 점, 감정, 내면의 반응
- lesson: 배운 점, 깨달음

## 기존 노트와의 비교
기존 커리어노트가 있으면 아래에 제시됩니다.
새로 추출한 노트가 기존 노트와 관련 있으면:
1. relatedExistingNoteId에 기존 노트 ID를 지정하세요
2. suggestedMerge에 두 노트를 병합한 결과(title, content, metadata)를 제안하세요
관련 없으면 relatedExistingNoteId를 null, suggestedMerge를 null로 두세요.
${existingNotesSection}`
}
