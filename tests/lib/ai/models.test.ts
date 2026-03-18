import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { validateApiKey, ApiKeyValidationError } from "@/lib/ai/models"

// ─────────────────────────────────────────────────────────────────────────────

function makeFetchResponse(status: number, ok: boolean): Response {
  return { ok, status } as Response
}

// ─────────────────────────────────────────────────────────────────────────────

describe("ApiKeyValidationError", () => {
  it("Error를 상속해야 한다", () => {
    const error = new ApiKeyValidationError("테스트 오류")

    expect(error).toBeInstanceOf(Error)
  })

  it("name 프로퍼티가 'ApiKeyValidationError'여야 한다", () => {
    const error = new ApiKeyValidationError("테스트 오류")

    expect(error.name).toBe("ApiKeyValidationError")
  })

  it("생성자에 전달한 메시지를 가져야 한다", () => {
    const error = new ApiKeyValidationError("유효하지 않은 API 키입니다.")

    expect(error.message).toBe("유효하지 않은 API 키입니다.")
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe("validateApiKey()", () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── 성공 경로 ───────────────────────────────────────────────────────────────

  describe("성공 경로 (200 응답)", () => {
    it("openai 제공자 — 200 응답이면 오류 없이 완료되어야 한다", async () => {
      vi.mocked(global.fetch).mockResolvedValue(makeFetchResponse(200, true))

      await expect(validateApiKey("openai", "sk-test-key")).resolves.toBeUndefined()
    })

    it("anthropic 제공자 — 200 응답이면 오류 없이 완료되어야 한다", async () => {
      vi.mocked(global.fetch).mockResolvedValue(makeFetchResponse(200, true))

      await expect(validateApiKey("anthropic", "sk-ant-test-key")).resolves.toBeUndefined()
    })

    it("google 제공자 — 200 응답이면 오류 없이 완료되어야 한다", async () => {
      vi.mocked(global.fetch).mockResolvedValue(makeFetchResponse(200, true))

      await expect(validateApiKey("google", "google-test-key")).resolves.toBeUndefined()
    })
  })

  // ── 올바른 URL 및 헤더 전달 ────────────────────────────────────────────────

  describe("올바른 URL 및 헤더 전달", () => {
    it("openai 제공자 — 올바른 URL과 Bearer 헤더로 fetch를 호출해야 한다", async () => {
      vi.mocked(global.fetch).mockResolvedValue(makeFetchResponse(200, true))

      await validateApiKey("openai", "sk-openai-key")

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/models",
        expect.objectContaining({
          headers: { Authorization: "Bearer sk-openai-key" },
        }),
      )
    })

    it("anthropic 제공자 — 올바른 URL과 x-api-key 헤더로 fetch를 호출해야 한다", async () => {
      vi.mocked(global.fetch).mockResolvedValue(makeFetchResponse(200, true))

      await validateApiKey("anthropic", "sk-ant-key")

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.anthropic.com/v1/models?limit=1",
        expect.objectContaining({
          headers: {
            "x-api-key": "sk-ant-key",
            "anthropic-version": "2023-06-01",
          },
        }),
      )
    })

    it("google 제공자 — x-goog-api-key 헤더로 API 키를 전달해야 한다", async () => {
      vi.mocked(global.fetch).mockResolvedValue(makeFetchResponse(200, true))

      await validateApiKey("google", "google-api-key")

      expect(global.fetch).toHaveBeenCalledWith(
        "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",
        expect.objectContaining({
          headers: { "x-goog-api-key": "google-api-key" },
        }),
      )
    })
  })

  // ── 401 / 403 오류 ──────────────────────────────────────────────────────────

  describe("401 응답 — 유효하지 않은 API 키 오류", () => {
    it("openai 제공자 — 401이면 ApiKeyValidationError를 던져야 한다", async () => {
      vi.mocked(global.fetch).mockResolvedValue(makeFetchResponse(401, false))

      await expect(validateApiKey("openai", "sk-invalid")).rejects.toThrow(ApiKeyValidationError)
    })

    it("anthropic 제공자 — 401이면 ApiKeyValidationError를 던져야 한다", async () => {
      vi.mocked(global.fetch).mockResolvedValue(makeFetchResponse(401, false))

      await expect(validateApiKey("anthropic", "sk-ant-invalid")).rejects.toThrow(
        ApiKeyValidationError,
      )
    })

    it("google 제공자 — 401이면 ApiKeyValidationError를 던져야 한다", async () => {
      vi.mocked(global.fetch).mockResolvedValue(makeFetchResponse(401, false))

      await expect(validateApiKey("google", "google-invalid")).rejects.toThrow(ApiKeyValidationError)
    })

    it("401 응답 — 오류 메시지가 '유효하지 않은 API 키입니다.'여야 한다", async () => {
      vi.mocked(global.fetch).mockResolvedValue(makeFetchResponse(401, false))

      await expect(validateApiKey("openai", "sk-invalid")).rejects.toThrow(
        "유효하지 않은 API 키입니다.",
      )
    })
  })

  describe("403 응답 — 유효하지 않은 API 키 오류", () => {
    it("openai 제공자 — 403이면 ApiKeyValidationError를 던져야 한다", async () => {
      vi.mocked(global.fetch).mockResolvedValue(makeFetchResponse(403, false))

      await expect(validateApiKey("openai", "sk-forbidden")).rejects.toThrow(ApiKeyValidationError)
    })

    it("anthropic 제공자 — 403이면 ApiKeyValidationError를 던져야 한다", async () => {
      vi.mocked(global.fetch).mockResolvedValue(makeFetchResponse(403, false))

      await expect(validateApiKey("anthropic", "sk-ant-forbidden")).rejects.toThrow(
        ApiKeyValidationError,
      )
    })

    it("google 제공자 — 403이면 ApiKeyValidationError를 던져야 한다", async () => {
      vi.mocked(global.fetch).mockResolvedValue(makeFetchResponse(403, false))

      await expect(validateApiKey("google", "google-forbidden")).rejects.toThrow(
        ApiKeyValidationError,
      )
    })

    it("403 응답 — 오류 메시지가 '유효하지 않은 API 키입니다.'여야 한다", async () => {
      vi.mocked(global.fetch).mockResolvedValue(makeFetchResponse(403, false))

      await expect(validateApiKey("openai", "sk-forbidden")).rejects.toThrow(
        "유효하지 않은 API 키입니다.",
      )
    })
  })

  // ── 기타 HTTP 오류 (500 등) ─────────────────────────────────────────────────

  describe("기타 HTTP 오류 (500 등)", () => {
    it("500 응답이면 ApiKeyValidationError를 던져야 한다", async () => {
      vi.mocked(global.fetch).mockResolvedValue(makeFetchResponse(500, false))

      await expect(validateApiKey("openai", "sk-test")).rejects.toThrow(ApiKeyValidationError)
    })

    it("500 응답 — 재시도 안내 메시지를 포함해야 한다", async () => {
      vi.mocked(global.fetch).mockResolvedValue(makeFetchResponse(500, false))

      await expect(validateApiKey("openai", "sk-test")).rejects.toThrow(
        "API 키 검증에 실패했습니다. 잠시 후 다시 시도해주세요.",
      )
    })

    it("429 응답 — 재시도 안내 메시지를 포함한 ApiKeyValidationError를 던져야 한다", async () => {
      vi.mocked(global.fetch).mockResolvedValue(makeFetchResponse(429, false))

      await expect(validateApiKey("anthropic", "sk-ant-test")).rejects.toThrow(
        "API 키 검증에 실패했습니다. 잠시 후 다시 시도해주세요.",
      )
    })

    it("500 응답 오류는 401/403과 달리 '유효하지 않은 API 키입니다.' 메시지가 아니어야 한다", async () => {
      vi.mocked(global.fetch).mockResolvedValue(makeFetchResponse(500, false))

      await expect(validateApiKey("openai", "sk-test")).rejects.not.toThrow(
        "유효하지 않은 API 키입니다.",
      )
    })
  })

  // ── 네트워크 오류 (fetch 자체가 throw) ────────────────────────────────────

  describe("네트워크 오류 (fetch가 예외를 던지는 경우)", () => {
    it("fetch가 네트워크 오류를 던지면 ApiKeyValidationError를 던져야 한다", async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"))

      await expect(validateApiKey("openai", "sk-test")).rejects.toThrow(ApiKeyValidationError)
    })

    it("네트워크 오류 — 재시도 안내 메시지를 포함해야 한다", async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error("Failed to fetch"))

      await expect(validateApiKey("openai", "sk-test")).rejects.toThrow(
        "API 키 검증에 실패했습니다. 잠시 후 다시 시도해주세요.",
      )
    })

    it("fetch가 TypeError를 던져도 ApiKeyValidationError로 감싸야 한다", async () => {
      vi.mocked(global.fetch).mockRejectedValue(new TypeError("fetch is not a function"))

      await expect(validateApiKey("anthropic", "sk-ant-test")).rejects.toThrow(ApiKeyValidationError)
    })

    it("anthropic 제공자 — 네트워크 오류도 ApiKeyValidationError를 던져야 한다", async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error("Connection refused"))

      await expect(validateApiKey("anthropic", "sk-ant-test")).rejects.toThrow(ApiKeyValidationError)
    })

    it("google 제공자 — 네트워크 오류도 ApiKeyValidationError를 던져야 한다", async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error("DNS lookup failed"))

      await expect(validateApiKey("google", "google-test")).rejects.toThrow(ApiKeyValidationError)
    })
  })

  // ── 타임아웃 오류 ──────────────────────────────────────────────────────────

  describe("타임아웃 오류", () => {
    it("fetch 호출에 signal이 포함되어야 한다", async () => {
      vi.mocked(global.fetch).mockResolvedValue(makeFetchResponse(200, true))

      await validateApiKey("openai", "sk-test")

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      )
    })

    it("AbortError 발생 시 타임아웃 메시지를 포함한 ApiKeyValidationError를 던져야 한다", async () => {
      const abortError = new DOMException("The operation was aborted", "AbortError")
      vi.mocked(global.fetch).mockRejectedValue(abortError)

      await expect(validateApiKey("openai", "sk-test")).rejects.toThrow(
        "연결 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.",
      )
    })
  })
})
