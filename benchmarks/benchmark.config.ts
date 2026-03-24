import type { BenchmarkConfig } from "./lib/config";

export default {
  suites: ["tool-calling"],
  providers: ["openai", "anthropic"],
  models: ["gpt-5.4-nano", "claude-haiku-4-5-20251001"],
  personas: ["sd-1", "jd-3"],
  batch: false,
} satisfies BenchmarkConfig;
