import type { ProviderName } from "./providers/types";
import { ALL_PERSONAS } from "../fixtures/mock-data";

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

export interface CliOverrides {
  suites?: BenchmarkConfig["suites"];
  providers?: BenchmarkConfig["providers"];
  models?: string[];
  personas?: string[];
  batch?: boolean;
}

export function mergeWithCli(config: BenchmarkConfig, cli: CliOverrides): BenchmarkConfig {
  return {
    suites: cli.suites ?? config.suites,
    providers: cli.providers ?? config.providers,
    models: cli.models ?? config.models,
    personas: cli.personas ?? config.personas,
    batch: cli.batch ?? config.batch,
  };
}

export function validatePersonas(personas: string[]): string[] {
  if (personas.length === 1 && personas[0] === "all") {
    return ALL_PERSONAS.map((p) => p.id);
  }

  const validIds = new Set(ALL_PERSONAS.map((p) => p.id));
  const invalid = personas.filter((id) => !validIds.has(id));
  if (invalid.length > 0) {
    throw new Error(`Unknown persona ID(s): ${invalid.join(", ")}`);
  }
  return personas;
}

export async function loadConfig(configPath: string): Promise<BenchmarkConfig> {
  const mod = await import(configPath);
  const config = mod.default;

  if (!config || typeof config !== "object") {
    throw new Error(`Config file must export a default object: ${configPath}`);
  }

  const errors: string[] = [];

  if (!Array.isArray(config.models)) {
    errors.push("models is required and must be an array of strings");
  }
  if (!Array.isArray(config.personas)) {
    errors.push("personas is required and must be an array of strings");
  }
  if (typeof config.batch !== "boolean") {
    errors.push("batch is required and must be a boolean");
  }
  if (config.suites !== "all" && !Array.isArray(config.suites)) {
    errors.push('suites is required and must be "all" or an array');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid config (${configPath}):\n  - ${errors.join("\n  - ")}`);
  }

  return config as BenchmarkConfig;
}
