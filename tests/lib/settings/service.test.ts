import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"
import {
  getAiSettings,
  getAiSettingsForApi,
  updateAiSettings,
} from "@/lib/settings/service"

const mockFindUnique = vi.mocked(prisma.aiSettings.findUnique)
const mockUpsert = vi.mocked(prisma.aiSettings.upsert)

// ─────────────────────────────────────────────────────────────────────────────
describe("getAiSettings()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("설정이 없는 경우", () => {
    it("DB에 설정이 없으면 기본값을 반환해야 한다", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue(null)

      // Act
      const result = await getAiSettings("user-1")

      // Assert
      expect(result).toEqual({
        provider: "openai",
        model: "gpt-4o",
        hasApiKey: false,
      })
    })
  })

  describe("설정이 있는 경우", () => {
    it("provider와 model을 DB 값으로 반환해야 한다", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        apiKey: "sk-ant-testkey1234",
      } as never)

      // Act
      const result = await getAiSettings("user-1")

      // Assert
      expect(result.provider).toBe("anthropic")
      expect(result.model).toBe("claude-sonnet-4-20250514")
    })

    it("apiKey가 있으면 hasApiKey는 true여야 한다", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue({
        provider: "openai",
        model: "gpt-4o",
        apiKey: "sk-testkey1234",
      } as never)

      // Act
      const result = await getAiSettings("user-1")

      // Assert
      expect(result.hasApiKey).toBe(true)
    })

    it("apiKey가 null이면 hasApiKey는 false여야 한다", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue({
        provider: "openai",
        model: "gpt-4o",
        apiKey: null,
      } as never)

      // Act
      const result = await getAiSettings("user-1")

      // Assert
      expect(result.hasApiKey).toBe(false)
    })

    it("반환값에 maskedApiKey 필드가 없어야 한다 (RSC용)", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue({
        provider: "openai",
        model: "gpt-4o",
        apiKey: "sk-testkey1234",
      } as never)

      // Act
      const result = await getAiSettings("user-1")

      // Assert
      expect(result).not.toHaveProperty("maskedApiKey")
    })

    it("올바른 userId로 findUnique를 호출해야 한다", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue(null)
      const userId = "user-xyz"

      // Act
      await getAiSettings(userId)

      // Assert
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { userId },
        select: { provider: true, model: true, apiKey: true },
      })
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("getAiSettingsForApi()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("설정이 없는 경우", () => {
    it("DB에 설정이 없으면 기본값과 maskedApiKey: null을 반환해야 한다", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue(null)

      // Act
      const result = await getAiSettingsForApi("user-1")

      // Assert
      expect(result).toEqual({
        provider: "openai",
        model: "gpt-4o",
        hasApiKey: false,
        maskedApiKey: null,
      })
    })
  })

  describe("설정이 있는 경우", () => {
    it("apiKey가 있으면 마스킹된 키를 maskedApiKey로 반환해야 한다", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue({
        provider: "openai",
        model: "gpt-4o",
        apiKey: "sk-testkey1234abcd",
      } as never)

      // Act
      const result = await getAiSettingsForApi("user-1")

      // Assert
      expect(result.maskedApiKey).toBe("sk-t***abcd")
      expect(result.hasApiKey).toBe(true)
    })

    it("apiKey가 null이면 maskedApiKey는 null이어야 한다", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        apiKey: null,
      } as never)

      // Act
      const result = await getAiSettingsForApi("user-1")

      // Assert
      expect(result.maskedApiKey).toBeNull()
      expect(result.hasApiKey).toBe(false)
    })

    it("provider와 model을 DB 값으로 반환해야 한다", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue({
        provider: "google",
        model: "gemini-2.0-flash",
        apiKey: "AIzaSy-testkey1234",
      } as never)

      // Act
      const result = await getAiSettingsForApi("user-1")

      // Assert
      expect(result.provider).toBe("google")
      expect(result.model).toBe("gemini-2.0-flash")
    })

    it("8자 미만 apiKey는 maskedApiKey가 '****'여야 한다", async () => {
      // Arrange
      mockFindUnique.mockResolvedValue({
        provider: "openai",
        model: "gpt-4o",
        apiKey: "short",
      } as never)

      // Act
      const result = await getAiSettingsForApi("user-1")

      // Assert
      expect(result.maskedApiKey).toBe("****")
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("updateAiSettings()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("upsert 호출 인자 검증", () => {
    it("apiKey를 제공하면 upsert create/update 데이터에 apiKey가 포함되어야 한다", async () => {
      // Arrange
      mockUpsert.mockResolvedValue({
        provider: "openai",
        model: "gpt-4o",
        apiKey: "sk-newkey1234abcd",
      } as never)
      const userId = "user-1"
      const data = { provider: "openai", model: "gpt-4o", apiKey: "sk-newkey1234abcd" }

      // Act
      await updateAiSettings(userId, data)

      // Assert
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          create: expect.objectContaining({ userId, apiKey: "sk-newkey1234abcd" }),
          update: expect.objectContaining({ apiKey: "sk-newkey1234abcd" }),
        }),
      )
    })

    it("apiKey가 빈 문자열이면 upsert 데이터에 apiKey를 포함하지 않아야 한다", async () => {
      // Arrange
      mockUpsert.mockResolvedValue({
        provider: "openai",
        model: "gpt-4o",
        apiKey: "sk-existingkey1234",
      } as never)
      const data = { provider: "openai", model: "gpt-4o", apiKey: "" }

      // Act
      await updateAiSettings("user-1", data)

      // Assert
      const callArg = mockUpsert.mock.calls[0][0]
      expect(callArg.create).not.toHaveProperty("apiKey")
      expect(callArg.update).not.toHaveProperty("apiKey")
    })

    it("apiKey가 undefined이면 upsert 데이터에 apiKey를 포함하지 않아야 한다", async () => {
      // Arrange
      mockUpsert.mockResolvedValue({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        apiKey: "sk-existingkey1234",
      } as never)
      const data = { provider: "anthropic", model: "claude-sonnet-4-20250514" }

      // Act
      await updateAiSettings("user-1", data)

      // Assert
      const callArg = mockUpsert.mock.calls[0][0]
      expect(callArg.create).not.toHaveProperty("apiKey")
      expect(callArg.update).not.toHaveProperty("apiKey")
    })

    it("provider와 model은 항상 upsert 데이터에 포함되어야 한다", async () => {
      // Arrange
      mockUpsert.mockResolvedValue({
        provider: "google",
        model: "gemini-2.0-flash",
        apiKey: null,
      } as never)
      const data = { provider: "google", model: "gemini-2.0-flash" }

      // Act
      await updateAiSettings("user-2", data)

      // Assert
      const callArg = mockUpsert.mock.calls[0][0]
      expect(callArg.create).toMatchObject({ provider: "google", model: "gemini-2.0-flash" })
      expect(callArg.update).toMatchObject({ provider: "google", model: "gemini-2.0-flash" })
    })
  })

  describe("반환값 검증", () => {
    it("upsert 결과의 apiKey가 있으면 마스킹된 maskedApiKey를 반환해야 한다", async () => {
      // Arrange
      mockUpsert.mockResolvedValue({
        provider: "openai",
        model: "gpt-4o",
        apiKey: "sk-resultkey1234abcd",
      } as never)

      // Act
      const result = await updateAiSettings("user-1", {
        provider: "openai",
        model: "gpt-4o",
        apiKey: "sk-resultkey1234abcd",
      })

      // Assert
      expect(result.maskedApiKey).toBe("sk-r***abcd")
      expect(result.hasApiKey).toBe(true)
    })

    it("upsert 결과의 apiKey가 null이면 maskedApiKey는 null이어야 한다", async () => {
      // Arrange
      mockUpsert.mockResolvedValue({
        provider: "openai",
        model: "gpt-4o-mini",
        apiKey: null,
      } as never)

      // Act
      const result = await updateAiSettings("user-1", {
        provider: "openai",
        model: "gpt-4o-mini",
      })

      // Assert
      expect(result.maskedApiKey).toBeNull()
      expect(result.hasApiKey).toBe(false)
    })

    it("반환값에 provider, model, hasApiKey, maskedApiKey가 모두 포함되어야 한다", async () => {
      // Arrange
      mockUpsert.mockResolvedValue({
        provider: "anthropic",
        model: "claude-haiku-4-5-20251001",
        apiKey: "sk-ant-testkey1234",
      } as never)

      // Act
      const result = await updateAiSettings("user-1", {
        provider: "anthropic",
        model: "claude-haiku-4-5-20251001",
        apiKey: "sk-ant-testkey1234",
      })

      // Assert
      expect(result).toMatchObject({
        provider: "anthropic",
        model: "claude-haiku-4-5-20251001",
        hasApiKey: true,
        maskedApiKey: expect.any(String),
      })
    })
  })
})
