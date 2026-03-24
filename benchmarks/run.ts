import "dotenv/config";
import * as path from "node:path";
import {
  parseArgs,
  resolveProvider,
  mergeWithCli,
  validatePersonas,
  loadConfig,
  openaiProvider,
  anthropicProvider,
  googleProvider,
} from "./lib";
import type { BenchmarkProvider, BenchmarkConfig, CliOverrides } from "./lib";
import { runToolCalling } from "./tool-calling/run";
import { runChatPipeline } from "./chat-pipeline/run";

const PROVIDERS: Record<string, BenchmarkProvider> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  google: googleProvider,
};

const SUITES: Record<string, (provider: BenchmarkProvider, model: string, batch: boolean, personaId: string) => Promise<unknown>> = {
  "tool-calling": runToolCalling,
  "chat-pipeline": runChatPipeline,
};

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-5.4-nano",
  anthropic: "claude-haiku-4-5-20251001",
  google: "gemini-3.1-flash-lite-preview",
};

async function main() {
  const cliOpts = parseArgs(process.argv.slice(2));

  // Config 로드 + CLI 머지
  let config: BenchmarkConfig;

  if (cliOpts.configPath) {
    const configPath = path.resolve(cliOpts.configPath);
    const fileConfig = await loadConfig(configPath);

    // CLI에서 명시적으로 설정된 값만 override로 전달
    const argv = process.argv;
    const overrides: CliOverrides = {};
    if (argv.includes("--suite")) overrides.suites = cliOpts.suites as BenchmarkConfig["suites"];
    if (argv.includes("--provider")) overrides.providers = cliOpts.providers as BenchmarkConfig["providers"];
    if (argv.includes("--model")) overrides.models = cliOpts.models;
    if (argv.includes("--persona")) overrides.personas = cliOpts.personas;
    if (argv.includes("--batch")) overrides.batch = cliOpts.batch;

    config = mergeWithCli(fileConfig, overrides);
  } else {
    // config 없이 CLI만 사용
    config = {
      suites: cliOpts.suites as BenchmarkConfig["suites"],
      providers: cliOpts.providers as BenchmarkConfig["providers"],
      models: cliOpts.models,
      personas: cliOpts.personas.length > 0 ? cliOpts.personas : ["sd-1"],
      batch: cliOpts.batch,
    };
  }

  // 페르소나 유효성 검증 + "all" 확장
  const personas = validatePersonas(config.personas);

  // Suite 목록 resolve
  const suitesValue = config.suites;
  const suiteNames =
    suitesValue === "all" || (Array.isArray(suitesValue) && suitesValue.includes("all" as never))
      ? Object.keys(SUITES)
      : Array.isArray(suitesValue) ? suitesValue : [suitesValue];

  // Providers 필터 resolve
  const providersValue = config.providers;
  const allowedProviders =
    !providersValue || providersValue === "all" || (Array.isArray(providersValue) && providersValue.includes("all" as never))
      ? null // 제한 없음
      : new Set(Array.isArray(providersValue) ? providersValue : [providersValue]);

  // Models resolve: 명시된 모델이 없으면, 허용된 provider들의 기본 모델 사용
  let models = config.models;
  if (models.length === 0) {
    if (allowedProviders) {
      models = [...allowedProviders].map((p) => DEFAULT_MODELS[p]).filter(Boolean);
    } else {
      models = Object.values(DEFAULT_MODELS);
    }
  }

  // 실행 루프: suite × model × persona
  for (const suiteName of suiteNames) {
    const suite = SUITES[suiteName];
    if (!suite) {
      console.error(`Unknown suite: ${suiteName}`);
      process.exit(1);
    }

    for (const model of models) {
      const providerName = resolveProvider(model);
      if (!providerName) {
        console.warn(`⚠ Unknown model prefix, skipping: ${model}`);
        continue;
      }

      if (allowedProviders && !allowedProviders.has(providerName)) {
        console.warn(`⚠ Provider "${providerName}" not in allowed list, skipping model: ${model}`);
        continue;
      }

      const provider = PROVIDERS[providerName];
      if (!provider) {
        console.error(`Unknown provider: ${providerName}`);
        continue;
      }

      for (const personaId of personas) {
        console.log(`\n▶ Running ${suiteName} | ${providerName}/${model} | persona: ${personaId} | ${config.batch ? "batch" : "realtime"}\n`);
        await suite(provider, model, config.batch, personaId);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
