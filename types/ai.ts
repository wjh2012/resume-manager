export const AI_PROVIDERS = ["openai", "anthropic", "google"] as const
export type AIProvider = (typeof AI_PROVIDERS)[number]

export interface AIConfig {
  provider: AIProvider
  model: string
  apiKey: string
}

export const PROVIDER_MODELS: Record<AIProvider, { value: string; label: string; contextWindow: number }[]> = {
  openai: [
    { value: "gpt-5.4", label: "GPT-5.4", contextWindow: 1048576 },
    { value: "gpt-5.4-nano", label: "GPT-5.4 Nano", contextWindow: 1048576 },
    { value: "gpt-4o", label: "GPT-4o", contextWindow: 128000 },
    { value: "gpt-4o-mini", label: "GPT-4o Mini", contextWindow: 128000 },
  ],
  anthropic: [
    { value: "claude-sonnet-4-6-20250627", label: "Claude Sonnet 4.6", contextWindow: 200000 },
    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", contextWindow: 200000 },
  ],
  google: [
    { value: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite", contextWindow: 1048576 },
    { value: "gemini-3.1-pro", label: "Gemini 3.1 Pro", contextWindow: 2097152 },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", contextWindow: 1048576 },
  ],
}

export interface BuildContextOptions {
  selectedDocumentIds?: string[]
  selectedExternalDocumentIds?: string[]
  includeCareerNotes?: boolean
}
