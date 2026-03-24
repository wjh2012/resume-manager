import "dotenv/config";
import { parseArgs, openaiProvider, anthropicProvider, googleProvider } from "./lib";
import type { BenchmarkProvider } from "./lib";
import { runToolCalling } from "./tool-calling/run";
import { runChatPipeline } from "./chat-pipeline/run";

const PROVIDERS: Record<string, BenchmarkProvider> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  google: googleProvider,
};

const SUITES: Record<string, (provider: BenchmarkProvider, model: string, batch: boolean) => Promise<unknown>> = {
  "tool-calling": runToolCalling,
  "chat-pipeline": runChatPipeline,
};

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const providerNames = opts.provider === "all"
    ? Object.keys(PROVIDERS)
    : [opts.provider];

  const suiteNames = opts.suite === "all"
    ? Object.keys(SUITES)
    : [opts.suite];

  for (const suiteName of suiteNames) {
    const suite = SUITES[suiteName];
    if (!suite) {
      console.error(`Unknown suite: ${suiteName}`);
      process.exit(1);
    }

    for (const providerName of providerNames) {
      const provider = PROVIDERS[providerName];
      if (!provider) {
        console.error(`Unknown provider: ${providerName}`);
        process.exit(1);
      }

      const model = opts.model ?? getDefaultModel(providerName);
      console.log(`\n▶ Running ${suiteName} with ${providerName}/${model} (${opts.batch ? "batch" : "realtime"})\n`);
      await suite(provider, model, opts.batch);
    }
  }
}

function getDefaultModel(provider: string): string {
  switch (provider) {
    case "openai": return "gpt-5.4-nano";
    case "anthropic": return "claude-haiku-4-5-20251001";
    case "google": return "gemini-3.1-flash-lite-preview";
    default: throw new Error(`Unknown provider: ${provider}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
