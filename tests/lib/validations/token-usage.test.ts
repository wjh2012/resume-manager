import { describe, it, expect } from "vitest"
import { tokenUsageQuerySchema, usageSummaryQuerySchema } from "@/lib/validations/token-usage"

describe("tokenUsageQuerySchema", () => {
  it("endDate < startDate 이면 실패", () => {
    const result = tokenUsageQuerySchema.safeParse({
      startDate: "2024-03-10",
      endDate: "2024-03-01",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const endDateError = result.error.issues.find((i) => i.path.includes("endDate"))
      expect(endDateError).toBeDefined()
      expect(endDateError?.message).toBe("종료일은 시작일 이후여야 합니다.")
    }
  })

  it("endDate >= startDate 이면 통과", () => {
    const result = tokenUsageQuerySchema.safeParse({
      startDate: "2024-03-01",
      endDate: "2024-03-10",
    })
    expect(result.success).toBe(true)
  })

  it("날짜 없이도 통과", () => {
    const result = tokenUsageQuerySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("startDate만 있어도 통과", () => {
    const result = tokenUsageQuerySchema.safeParse({
      startDate: "2024-03-01",
    })
    expect(result.success).toBe(true)
  })

  it("endDate만 있어도 통과", () => {
    const result = tokenUsageQuerySchema.safeParse({
      endDate: "2024-03-10",
    })
    expect(result.success).toBe(true)
  })
})

describe("usageSummaryQuerySchema", () => {
  it("endDate < startDate 이면 실패", () => {
    const result = usageSummaryQuerySchema.safeParse({
      startDate: "2024-03-10",
      endDate: "2024-03-01",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const endDateError = result.error.issues.find((i) => i.path.includes("endDate"))
      expect(endDateError).toBeDefined()
      expect(endDateError?.message).toBe("종료일은 시작일 이후여야 합니다.")
    }
  })

  it("period만 있어도 통과", () => {
    const result = usageSummaryQuerySchema.safeParse({
      period: "30d",
    })
    expect(result.success).toBe(true)
  })

  it("endDate >= startDate 이면 통과", () => {
    const result = usageSummaryQuerySchema.safeParse({
      startDate: "2024-01-01",
      endDate: "2024-12-31",
    })
    expect(result.success).toBe(true)
  })
})
