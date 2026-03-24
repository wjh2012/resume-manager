import { stepCountIs } from "ai"

export { createReadDocumentTool } from "./read-document"
export { createReadExternalDocumentTool } from "./read-external-document"
export { createReadCareerNoteTool } from "./read-career-note"
export { createSaveCareerNoteTool } from "./save-career-note"

const MAX_STEPS = 15

export function calculateMaxSteps(
  documentCount: number,
  careerNoteCount: number,
  externalDocumentCount: number,
) {
  const steps = Math.min(
    documentCount + careerNoteCount + externalDocumentCount + 2,
    MAX_STEPS,
  )
  return stepCountIs(steps)
}
