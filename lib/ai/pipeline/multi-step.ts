import { streamText, type LanguageModel } from "ai"
import { calculateMaxSteps } from "@/lib/ai/tools"

interface MultiStepParams {
  model: LanguageModel
  system: string
  modelMessages: Parameters<typeof streamText>[0]["messages"]
  tools: Parameters<typeof streamText>[0]["tools"]
  documentCount: number
  careerNoteCount: number
  onFinish: Parameters<typeof streamText>[0]["onFinish"]
}

export function handleMultiStep(params: MultiStepParams) {
  return streamText({
    model: params.model,
    system: params.system,
    messages: params.modelMessages ?? [],
    tools: params.tools,
    stopWhen: calculateMaxSteps(params.documentCount, params.careerNoteCount),
    onFinish: params.onFinish,
  })
}
