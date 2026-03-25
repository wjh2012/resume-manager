import { z } from "zod"

/**
 * Deterministic Routing 벤치마크용 분류 스키마.
 *
 * LLM이 사용자 메시지를 보고 "어떤 데이터가 필요하고, 어떤 액션이 필요한지"를
 * structured output으로 판단한다.
 */
export const routingSchema = z.object({
  /** 전문을 읽어야 할 문서 ID 목록. 요약만으로 충분하면 빈 배열. */
  documentsToRead: z.array(z.string())
    .describe("전문을 읽어야 할 문서 ID 목록. 요약만으로 충분하면 빈 배열."),

  /** 전문을 읽어야 할 커리어노트 ID 목록. 수정 전 확인이 필요할 때 사용. */
  careerNotesToRead: z.array(z.string())
    .describe("전문을 읽어야 할 커리어노트 ID 목록. 수정이 필요할 때 기존 내용 확인용."),

  /** 새 경험 저장 또는 기존 노트 수정이 필요하면 true. */
  saveCareerNote: z.boolean()
    .describe("커리어노트 저장/수정이 필요하면 true."),
})

export type RoutingClassification = z.infer<typeof routingSchema>
