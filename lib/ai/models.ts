import type { AIProvider } from "@/types/ai"

export class ApiKeyValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ApiKeyValidationError"
  }
}

const VALIDATION_ENDPOINTS: Record<
  AIProvider,
  (apiKey: string) => { url: string; headers: Record<string, string> }
> = {
  openai: (apiKey) => ({
    url: "https://api.openai.com/v1/models",
    headers: { Authorization: `Bearer ${apiKey}` },
  }),
  anthropic: (apiKey) => ({
    url: "https://api.anthropic.com/v1/models?limit=1",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
  }),
  google: (apiKey) => ({
    url: `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=1`,
    headers: {},
  }),
}

export async function validateApiKey(
  provider: AIProvider,
  apiKey: string,
): Promise<void> {
  const { url, headers } = VALIDATION_ENDPOINTS[provider](apiKey)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    })

    if (response.ok) return

    if (response.status === 401 || response.status === 403) {
      throw new ApiKeyValidationError("유효하지 않은 API 키입니다.")
    }

    throw new ApiKeyValidationError(
      "API 키 검증에 실패했습니다. 잠시 후 다시 시도해주세요.",
    )
  } catch (error) {
    if (error instanceof ApiKeyValidationError) throw error
    throw new ApiKeyValidationError(
      "API 키 검증에 실패했습니다. 잠시 후 다시 시도해주세요.",
    )
  } finally {
    clearTimeout(timeout)
  }
}
