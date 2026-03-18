import { describe, it, expect } from "vitest"
import { aiSettingsSchema, aiSettingsUpdateSchema, maskApiKey } from "@/lib/validations/ai-settings"

describe("aiSettingsSchema", () => {
  describe("유효한 데이터", () => {
    it("openai 제공자와 지원 모델, apiKey가 있으면 통과해야 한다", () => {
      const result = aiSettingsSchema.safeParse({
        provider: "openai",
        model: "gpt-4o",
        apiKey: "sk-test1234",
      })
      expect(result.success).toBe(true)
    })

    it("anthropic 제공자와 지원 모델, apiKey가 있으면 통과해야 한다", () => {
      const result = aiSettingsSchema.safeParse({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        apiKey: "sk-ant-test",
      })
      expect(result.success).toBe(true)
    })

    it("google 제공자와 지원 모델, apiKey가 있으면 통과해야 한다", () => {
      const result = aiSettingsSchema.safeParse({
        provider: "google",
        model: "gemini-2.0-flash",
        apiKey: "AIzaSy-test",
      })
      expect(result.success).toBe(true)
    })
  })

  describe("잘못된 제공자", () => {
    it("지원하지 않는 제공자이면 실패해야 한다", () => {
      const result = aiSettingsSchema.safeParse({
        provider: "cohere",
        model: "command-r",
        apiKey: "sk-test1234",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("제공자-모델 불일치", () => {
    it("openai 제공자에 anthropic 모델을 지정하면 실패해야 한다", () => {
      const result = aiSettingsSchema.safeParse({
        provider: "openai",
        model: "claude-sonnet-4-20250514",
        apiKey: "sk-test1234",
      })
      expect(result.success).toBe(false)
    })

    it("anthropic 제공자에 google 모델을 지정하면 실패해야 한다", () => {
      const result = aiSettingsSchema.safeParse({
        provider: "anthropic",
        model: "gemini-2.0-flash",
        apiKey: "sk-ant-test",
      })
      expect(result.success).toBe(false)
    })

    it("google 제공자에 openai 모델을 지정하면 실패해야 한다", () => {
      const result = aiSettingsSchema.safeParse({
        provider: "google",
        model: "gpt-4o",
        apiKey: "AIzaSy-test",
      })
      expect(result.success).toBe(false)
    })

    it("존재하지 않는 모델 값이면 실패해야 한다", () => {
      const result = aiSettingsSchema.safeParse({
        provider: "openai",
        model: "gpt-99-ultra",
        apiKey: "sk-test1234",
      })
      expect(result.success).toBe(false)
    })

    it("실패 시 에러 메시지에 '선택한 제공자에서 지원하지 않는 모델입니다.'가 포함되어야 한다", () => {
      const result = aiSettingsSchema.safeParse({
        provider: "openai",
        model: "claude-sonnet-4-20250514",
        apiKey: "sk-test1234",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain("선택한 제공자에서 지원하지 않는 모델입니다.")
      }
    })
  })

  describe("apiKey 누락 또는 빈 값", () => {
    it("apiKey가 없으면 실패해야 한다", () => {
      const result = aiSettingsSchema.safeParse({
        provider: "openai",
        model: "gpt-4o",
      })
      expect(result.success).toBe(false)
    })

    it("apiKey가 빈 문자열이면 실패해야 한다", () => {
      const result = aiSettingsSchema.safeParse({
        provider: "openai",
        model: "gpt-4o",
        apiKey: "",
      })
      expect(result.success).toBe(false)
    })

    it("apiKey 빈 문자열 실패 시 에러 메시지에 'API 키를 입력해주세요.'가 포함되어야 한다", () => {
      const result = aiSettingsSchema.safeParse({
        provider: "openai",
        model: "gpt-4o",
        apiKey: "",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain("API 키를 입력해주세요.")
      }
    })
  })
})

describe("aiSettingsUpdateSchema", () => {
  describe("유효한 데이터", () => {
    it("apiKey 포함 시 통과해야 한다", () => {
      const result = aiSettingsUpdateSchema.safeParse({
        provider: "openai",
        model: "gpt-4o-mini",
        apiKey: "sk-new-key",
      })
      expect(result.success).toBe(true)
    })

    it("apiKey 없이도 통과해야 한다", () => {
      const result = aiSettingsUpdateSchema.safeParse({
        provider: "anthropic",
        model: "claude-haiku-4-5-20251001",
      })
      expect(result.success).toBe(true)
    })

    it("apiKey가 빈 문자열이어도 통과해야 한다", () => {
      const result = aiSettingsUpdateSchema.safeParse({
        provider: "google",
        model: "gemini-2.5-pro",
        apiKey: "",
      })
      expect(result.success).toBe(true)
    })
  })

  describe("제공자-모델 불일치", () => {
    it("openai 제공자에 google 모델을 지정하면 실패해야 한다", () => {
      const result = aiSettingsUpdateSchema.safeParse({
        provider: "openai",
        model: "gemini-2.0-flash",
      })
      expect(result.success).toBe(false)
    })

    it("실패 시 에러 메시지에 '선택한 제공자에서 지원하지 않는 모델입니다.'가 포함되어야 한다", () => {
      const result = aiSettingsUpdateSchema.safeParse({
        provider: "anthropic",
        model: "gpt-4o",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain("선택한 제공자에서 지원하지 않는 모델입니다.")
      }
    })
  })

  describe("잘못된 제공자", () => {
    it("지원하지 않는 제공자이면 실패해야 한다", () => {
      const result = aiSettingsUpdateSchema.safeParse({
        provider: "mistral",
        model: "mistral-large",
      })
      expect(result.success).toBe(false)
    })
  })
})

describe("maskApiKey()", () => {
  describe("8자 이상 키", () => {
    it("8자 키는 앞 4자리 + *** + 뒤 4자리로 마스킹되어야 한다", () => {
      expect(maskApiKey("abcd1234")).toBe("abcd***1234")
    })

    it("긴 키는 앞 4자리 + *** + 뒤 4자리로 마스킹되어야 한다", () => {
      expect(maskApiKey("sk-test-1234567890abcdef")).toBe("sk-t***cdef")
    })

    it("정확히 8자인 경우 앞 4자리와 뒤 4자리가 겹쳐도 올바르게 마스킹되어야 한다", () => {
      expect(maskApiKey("12345678")).toBe("1234***5678")
    })
  })

  describe("8자 미만 키", () => {
    it("7자 키는 '****'를 반환해야 한다", () => {
      expect(maskApiKey("sk-abcd")).toBe("****")
    })

    it("1자 키는 '****'를 반환해야 한다", () => {
      expect(maskApiKey("x")).toBe("****")
    })

    it("빈 문자열은 '****'를 반환해야 한다", () => {
      expect(maskApiKey("")).toBe("****")
    })
  })
})
