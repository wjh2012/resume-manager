export { handleMultiStep } from "./multi-step"
export { handleClassification } from "./classification"
export type { ClassificationPreStageUsage } from "./classification"
export {
  coverLetterClassificationSchema,
  interviewClassificationSchema,
} from "./schema"
export { buildOnFinish } from "./on-finish"

export function selectPipeline(provider: string): "multi-step" | "classification" {
  if (provider === "openai") {
    return "multi-step"
  }
  return "classification"
}
