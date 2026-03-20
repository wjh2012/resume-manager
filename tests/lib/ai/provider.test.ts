import { describe, it, expect, vi, beforeEach } from "vitest"

// vi.mock은 정적으로 호이스팅되어 import보다 먼저 실행된다
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(),
}))

vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi.fn(),
}))

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiSettings: {
      findUnique: vi.fn(),
    },
  },
}))

import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { prisma } from "@/lib/prisma"
import {
  createLanguageModel,
  getLanguageModel,
  AiSettingsNotFoundError,
} from "@/lib/ai/provider"

const mockModel = { modelId: "mock-model" }

beforeEach(() => {
  vi.clearAllMocks()

  vi.mocked(createOpenAI).mockReturnValue(vi.fn().mockReturnValue(mockModel) as never)
  vi.mocked(createAnthropic).mockReturnValue(vi.fn().mockReturnValue(mockModel) as never)
  vi.mocked(createGoogleGenerativeAI).mockReturnValue(vi.fn().mockReturnValue(mockModel) as never)
})

// ─────────────────────────────────────────────────────────────────────────────

describe("AiSettingsNotFoundError", () => {
  it("올바른 메시지를 가져야 한다", () => {
    const error = new AiSettingsNotFoundError()
    expect(error.message).toBe(
      "AI 설정이 완료되지 않았습니다. 설정 페이지에서 API 키를 등록해주세요.",
    )
  })

  it("Error를 상속해야 한다", () => {
    const error = new AiSettingsNotFoundError()
    expect(error).toBeInstanceOf(Error)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe("createLanguageModel()", () => {
  describe("openai 제공자", () => {
    it("createOpenAI를 호출하고 LanguageModel을 반환해야 한다", () => {
      const result = createLanguageModel("openai", "gpt-4o", "sk-test")

      expect(createOpenAI).toHaveBeenCalledWith({ apiKey: "sk-test" })
      expect(result).toBe(mockModel)
    })
  })

  describe("anthropic 제공자", () => {
    it("createAnthropic을 호출하고 LanguageModel을 반환해야 한다", () => {
      const result = createLanguageModel("anthropic", "claude-sonnet-4-20250514", "sk-ant-test")

      expect(createAnthropic).toHaveBeenCalledWith({ apiKey: "sk-ant-test" })
      expect(result).toBe(mockModel)
    })
  })

  describe("google 제공자", () => {
    it("createGoogleGenerativeAI를 호출하고 LanguageModel을 반환해야 한다", () => {
      const result = createLanguageModel("google", "gemini-2.0-flash", "google-test-key")

      expect(createGoogleGenerativeAI).toHaveBeenCalledWith({ apiKey: "google-test-key" })
      expect(result).toBe(mockModel)
    })
  })

  describe("각 제공자에 모델 식별자 전달", () => {
    it("openai 제공자에 모델 이름을 전달해야 한다", () => {
      const modelFn = vi.fn().mockReturnValue(mockModel)
      vi.mocked(createOpenAI).mockReturnValue(modelFn as never)

      createLanguageModel("openai", "gpt-4o-mini", "sk-test")

      expect(modelFn).toHaveBeenCalledWith("gpt-4o-mini")
    })

    it("anthropic 제공자에 모델 이름을 전달해야 한다", () => {
      const modelFn = vi.fn().mockReturnValue(mockModel)
      vi.mocked(createAnthropic).mockReturnValue(modelFn as never)

      createLanguageModel("anthropic", "claude-haiku-4-5-20251001", "sk-ant-test")

      expect(modelFn).toHaveBeenCalledWith("claude-haiku-4-5-20251001")
    })

    it("google 제공자에 모델 이름을 전달해야 한다", () => {
      const modelFn = vi.fn().mockReturnValue(mockModel)
      vi.mocked(createGoogleGenerativeAI).mockReturnValue(modelFn as never)

      createLanguageModel("google", "gemini-2.5-pro", "google-test-key")

      expect(modelFn).toHaveBeenCalledWith("gemini-2.5-pro")
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe("getLanguageModel()", () => {
  describe("정상 경로", () => {
    it("유효한 설정이 있으면 LanguageModel을 반환해야 한다", async () => {
      vi.mocked(prisma.aiSettings.findUnique).mockResolvedValue({
        provider: "openai",
        model: "gpt-4o",
        apiKey: "sk-valid-key",
      } as never)

      const result = await getLanguageModel("user-123")

      expect(result).toBe(mockModel)
    })

    it("anthropic 설정으로도 LanguageModel을 반환해야 한다", async () => {
      vi.mocked(prisma.aiSettings.findUnique).mockResolvedValue({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        apiKey: "sk-ant-valid",
      } as never)

      const result = await getLanguageModel("user-456")

      expect(result).toBe(mockModel)
      expect(createAnthropic).toHaveBeenCalledWith({ apiKey: "sk-ant-valid" })
    })

    it("올바른 userId로 DB를 조회해야 한다", async () => {
      vi.mocked(prisma.aiSettings.findUnique).mockResolvedValue({
        provider: "openai",
        model: "gpt-4o",
        apiKey: "sk-valid-key",
      } as never)

      await getLanguageModel("user-789")

      expect(prisma.aiSettings.findUnique).toHaveBeenCalledWith({
        where: { userId: "user-789" },
        select: { provider: true, model: true, apiKey: true },
      })
    })
  })

  describe("설정 없음 오류", () => {
    it("설정이 없으면 AiSettingsNotFoundError를 던져야 한다", async () => {
      vi.mocked(prisma.aiSettings.findUnique).mockResolvedValue(null)

      await expect(getLanguageModel("user-no-settings")).rejects.toThrow(AiSettingsNotFoundError)
    })

    it("apiKey가 null이면 AiSettingsNotFoundError를 던져야 한다", async () => {
      vi.mocked(prisma.aiSettings.findUnique).mockResolvedValue({
        provider: "openai",
        model: "gpt-4o",
        apiKey: null,
      } as never)

      await expect(getLanguageModel("user-no-key")).rejects.toThrow(AiSettingsNotFoundError)
    })

    it("apiKey가 undefined이면 AiSettingsNotFoundError를 던져야 한다", async () => {
      vi.mocked(prisma.aiSettings.findUnique).mockResolvedValue({
        provider: "openai",
        model: "gpt-4o",
        apiKey: undefined,
      } as never)

      await expect(getLanguageModel("user-undefined-key")).rejects.toThrow(AiSettingsNotFoundError)
    })

    it("AiSettingsNotFoundError 메시지가 올바른지 확인해야 한다", async () => {
      vi.mocked(prisma.aiSettings.findUnique).mockResolvedValue(null)

      await expect(getLanguageModel("user-no-settings")).rejects.toThrow(
        "AI 설정이 완료되지 않았습니다. 설정 페이지에서 API 키를 등록해주세요.",
      )
    })
  })

  describe("지원하지 않는 제공자 오류", () => {
    it("알 수 없는 제공자이면 Error를 던져야 한다", async () => {
      vi.mocked(prisma.aiSettings.findUnique).mockResolvedValue({
        provider: "unknown-provider",
        model: "some-model",
        apiKey: "sk-valid-key",
      } as never)

      await expect(getLanguageModel("user-bad-provider")).rejects.toThrow(
        "지원하지 않는 AI 제공자: unknown-provider",
      )
    })

    it("지원하지 않는 제공자 오류는 AiSettingsNotFoundError가 아니어야 한다", async () => {
      vi.mocked(prisma.aiSettings.findUnique).mockResolvedValue({
        provider: "unknown-provider",
        model: "some-model",
        apiKey: "sk-valid-key",
      } as never)

      await expect(getLanguageModel("user-bad-provider")).rejects.not.toThrow(
        AiSettingsNotFoundError,
      )
    })
  })

  describe("모델 유효성 검사", () => {
    it("openai의 유효한 모델(gpt-4o)이면 LanguageModel을 반환해야 한다", async () => {
      vi.mocked(prisma.aiSettings.findUnique).mockResolvedValue({
        provider: "openai",
        model: "gpt-4o",
        apiKey: "sk-valid-key",
      } as never)

      const result = await getLanguageModel("user-valid-model")

      expect(result).toBe(mockModel)
    })

    it("openai의 유효한 모델(gpt-4o-mini)이면 LanguageModel을 반환해야 한다", async () => {
      vi.mocked(prisma.aiSettings.findUnique).mockResolvedValue({
        provider: "openai",
        model: "gpt-4o-mini",
        apiKey: "sk-valid-key",
      } as never)

      const result = await getLanguageModel("user-valid-model-mini")

      expect(result).toBe(mockModel)
    })

    it("anthropic의 유효한 모델이면 LanguageModel을 반환해야 한다", async () => {
      vi.mocked(prisma.aiSettings.findUnique).mockResolvedValue({
        provider: "anthropic",
        model: "claude-haiku-4-5-20251001",
        apiKey: "sk-ant-valid",
      } as never)

      const result = await getLanguageModel("user-valid-anthropic")

      expect(result).toBe(mockModel)
    })

    it("google의 유효한 모델이면 LanguageModel을 반환해야 한다", async () => {
      vi.mocked(prisma.aiSettings.findUnique).mockResolvedValue({
        provider: "google",
        model: "gemini-2.5-pro",
        apiKey: "google-valid-key",
      } as never)

      const result = await getLanguageModel("user-valid-google")

      expect(result).toBe(mockModel)
    })

    it("openai 제공자에 존재하지 않는 모델이면 Error를 던져야 한다", async () => {
      vi.mocked(prisma.aiSettings.findUnique).mockResolvedValue({
        provider: "openai",
        model: "gpt-999-ultra",
        apiKey: "sk-valid-key",
      } as never)

      await expect(getLanguageModel("user-bad-model")).rejects.toThrow(
        "지원하지 않는 모델입니다: gpt-999-ultra (openai)",
      )
    })

    it("anthropic 제공자에 존재하지 않는 모델이면 Error를 던져야 한다", async () => {
      vi.mocked(prisma.aiSettings.findUnique).mockResolvedValue({
        provider: "anthropic",
        model: "claude-fake-model",
        apiKey: "sk-ant-valid",
      } as never)

      await expect(getLanguageModel("user-bad-anthropic-model")).rejects.toThrow(
        "지원하지 않는 모델입니다: claude-fake-model (anthropic)",
      )
    })

    it("google 제공자에 존재하지 않는 모델이면 Error를 던져야 한다", async () => {
      vi.mocked(prisma.aiSettings.findUnique).mockResolvedValue({
        provider: "google",
        model: "gemini-unknown",
        apiKey: "google-valid-key",
      } as never)

      await expect(getLanguageModel("user-bad-google-model")).rejects.toThrow(
        "지원하지 않는 모델입니다: gemini-unknown (google)",
      )
    })

    it("모델 유효성 오류는 AiSettingsNotFoundError가 아니어야 한다", async () => {
      vi.mocked(prisma.aiSettings.findUnique).mockResolvedValue({
        provider: "openai",
        model: "gpt-999-ultra",
        apiKey: "sk-valid-key",
      } as never)

      await expect(getLanguageModel("user-bad-model")).rejects.not.toThrow(
        AiSettingsNotFoundError,
      )
    })
  })
})
