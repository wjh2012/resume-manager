import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}))

import { buildContext } from "@/lib/ai/context"

describe("buildContext()", () => {
  it("빈 문자열을 반환해야 한다 (임시 stub)", async () => {
    const result = await buildContext("user-1", {})

    expect(result).toBe("")
  })
})
