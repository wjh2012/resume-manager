import { generateText, Output, type LanguageModel } from "ai"
import type { z } from "zod"

interface ClassifyParams<T extends z.ZodType> {
  model: LanguageModel
  schema: T
  context: string
  messages: { role: string; content: string }[]
}

interface ClassifyResult<T> {
  classification: T
  usage: { inputTokens: number; outputTokens: number }
}

export async function classify<T extends z.ZodType>(
  params: ClassifyParams<T>,
): Promise<ClassifyResult<z.infer<T>>> {
  const prompt = `사용자 메시지와 참고자료 요약을 보고 판단하세요.

[참고자료 요약]
${params.context}

[현재 대화]
${params.messages.map((m) => `${m.role}: ${m.content}`).join("\n")}`

  const result = await generateText({
    model: params.model,
    output: Output.object({ schema: params.schema }),
    prompt,
  })

  if (!result.output) {
    throw new Error("분류 결과가 비어있습니다.")
  }

  return {
    classification: result.output,
    usage: {
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
    },
  }
}
