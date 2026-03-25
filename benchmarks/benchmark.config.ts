import type { BenchmarkConfig } from "./lib/config";

export default {
  suites: ["tool-calling"],
  providers: ["openai"],
  models: ["gpt-5.4-nano", "gpt-5.4"],
  personas: ["all"],
  batch: false,
} satisfies BenchmarkConfig;
