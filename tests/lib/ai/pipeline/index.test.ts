import { describe, it, expect } from "vitest"
import { selectPipeline } from "@/lib/ai/pipeline"

describe("selectPipeline", () => {
  it("openai이면 multi-step을 반환한다", () => {
    expect(selectPipeline("openai")).toBe("multi-step")
  })

  it("anthropic이면 classification을 반환한다", () => {
    expect(selectPipeline("anthropic")).toBe("classification")
  })

  it("google이면 classification을 반환한다", () => {
    expect(selectPipeline("google")).toBe("classification")
  })

  it("알 수 없는 프로바이더도 classification을 반환한다", () => {
    expect(selectPipeline("unknown")).toBe("classification")
  })
})
