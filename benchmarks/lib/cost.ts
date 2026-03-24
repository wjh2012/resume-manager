/** Provider/모델별 토큰 가격 ($/1M tokens, Batch 가격 기준) */
const PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  "openai:gpt-5.4": { input: 1.25, output: 7.5 },
  "openai:gpt-5.4-nano": { input: 0.1, output: 0.625 },
  "openai:gpt-4o": { input: 1.25, output: 5.0 },
  "openai:gpt-4o-mini": { input: 0.075, output: 0.3 },
  // Anthropic
  "anthropic:haiku-4.5": { input: 0.5, output: 2.5 },
  "anthropic:sonnet-4.6": { input: 1.5, output: 7.5 },
  // Google
  "google:gemini-3.1-flash-lite": { input: 0.125, output: 0.75 },
  "google:gemini-3.1-pro": { input: 1.0, output: 6.0 },
};

/** API 모델명 → PRICING 키 정규화 */
const MODEL_ALIASES: Record<string, string> = {
  "claude-haiku-4-5-20251001": "haiku-4.5",
  "claude-sonnet-4-6": "sonnet-4.6",
  "gemini-3.1-flash-lite-preview": "gemini-3.1-flash-lite",
  "gemini-3.1-pro-preview": "gemini-3.1-pro",
};

function normalizeModel(model: string): string {
  return MODEL_ALIASES[model] ?? model;
}

/** 3사 모두 동일: Batch = 실시간 × 0.5 */
const BATCH_DISCOUNT = 0.5;

export interface CostResult {
  batchCost: number;
  realtimeCost: number;
  savings: number;
  inputTokens: number;
  outputTokens: number;
}

export function calculateCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
): CostResult {
  const key = `${provider}:${normalizeModel(model)}`;
  const price = PRICING[key];

  if (!price) {
    return { batchCost: 0, realtimeCost: 0, savings: 0, inputTokens, outputTokens };
  }

  const batchCost =
    (inputTokens / 1_000_000) * price.input +
    (outputTokens / 1_000_000) * price.output;
  const realtimeCost = batchCost / BATCH_DISCOUNT;
  const savings = realtimeCost - batchCost;

  return { batchCost, realtimeCost, savings, inputTokens, outputTokens };
}
