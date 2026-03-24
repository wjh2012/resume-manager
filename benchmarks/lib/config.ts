import type { ProviderName } from "./providers/types";

export interface BenchmarkConfig {
  suites: "all" | Array<"tool-calling" | "chat-pipeline">;
  providers?: "all" | Array<"openai" | "anthropic" | "google">;
  models: string[];
  personas: string[];
  batch: boolean;
}

const MODEL_PREFIX_MAP: Array<{ prefix: string; provider: ProviderName }> = [
  { prefix: "gpt-", provider: "openai" },
  { prefix: "o1-", provider: "openai" },
  { prefix: "o3-", provider: "openai" },
  { prefix: "o4-", provider: "openai" },
  { prefix: "claude-", provider: "anthropic" },
  { prefix: "gemini-", provider: "google" },
];

export function resolveProvider(model: string): ProviderName | null {
  const match = MODEL_PREFIX_MAP.find((m) => model.startsWith(m.prefix));
  return match?.provider ?? null;
}
