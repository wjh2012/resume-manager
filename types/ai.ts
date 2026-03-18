export const AI_PROVIDERS = ["openai", "anthropic", "google"] as const
export type AIProvider = (typeof AI_PROVIDERS)[number]

export interface AIConfig {
  provider: AIProvider
  model: string
  apiKey: string
}

export const PROVIDER_MODELS: Record<AIProvider, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  ],
  anthropic: [
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  ],
  google: [
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  ],
}

export interface BuildContextOptions {
  query: string
  selectedDocumentIds?: string[]
  limitToDocumentIds?: string[]
  includeInsights?: boolean
  maxChunks?: number
}
