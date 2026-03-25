import type { BenchmarkConfig } from "./lib/config";

export default {
  suites: ["tool-calling"],
  providers: ["openai"],
  models: ["gpt-5.4", "gpt-5.4-nano"],
  personas: ["all"],
  batch: true,
} satisfies BenchmarkConfig;
