// benchmarks/lib/index.ts
// Central re-export hub for benchmark library utilities

// Cost calculation
export { calculateCost, type CostResult } from "./cost";

// CLI argument parsing
export { parseArgs, type BenchmarkOptions } from "./cli";

// Config loading and merging
export {
  type BenchmarkConfig,
  type CliOverrides,
  resolveProvider,
  mergeWithCli,
  validatePersonas,
  loadConfig,
} from "./config";

// JSON result saving
export { saveJson } from "./report";

// Provider types and interfaces
export {
  type BenchmarkMessage,
  type BenchmarkToolDef,
  type BenchmarkToolCall,
  type BenchmarkRequest,
  type BenchmarkResponse,
  type BenchmarkProvider,
  type ProviderName,
} from "./providers/types";

// Provider implementations
export { openaiProvider } from "./providers/openai";
export { anthropicProvider } from "./providers/anthropic";
export { googleProvider } from "./providers/google";
