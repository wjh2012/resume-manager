export const AI_PROVIDERS = ["openai", "anthropic", "google"] as const
export type AIProvider = (typeof AI_PROVIDERS)[number]

export interface AIConfig {
  provider: AIProvider
  model: string
  apiKey: string
}

export const PROVIDER_MODELS: Record<AIProvider, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-5.4", label: "GPT-5.4" },
    { value: "gpt-5.4-nano", label: "GPT-5.4 Nano" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  ],
  anthropic: [
    { value: "claude-sonnet-4-6-20250627", label: "Claude Sonnet 4.6" },
    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  ],
  google: [
    { value: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" },
    { value: "gemini-3.1-pro", label: "Gemini 3.1 Pro" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  ],
}

export interface BuildContextOptions {
  selectedDocumentIds?: string[]
  selectedExternalDocumentIds?: string[]
  includeCareerNotes?: boolean
}
