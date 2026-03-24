import { describe, it, expect } from "vitest";
import { calculateCost } from "../cost";

describe("calculateCost", () => {
  it("OpenAI gpt-5.4 배치 비용 계산", () => {
    const result = calculateCost("openai", "gpt-5.4", 1_000_000, 1_000_000);
    expect(result.batchCost).toBeCloseTo(1.25 + 7.5); // $8.75
    expect(result.realtimeCost).toBeCloseTo(8.75 / 0.5); // $17.50
    expect(result.savings).toBeCloseTo(8.75);
  });

  it("Anthropic sonnet-4.6 배치 비용 계산", () => {
    const result = calculateCost("anthropic", "sonnet-4.6", 500_000, 200_000);
    expect(result.batchCost).toBeCloseTo(2.25);
    expect(result.realtimeCost).toBeCloseTo(4.50);
  });

  it("Google gemini-3.1-flash-lite 배치 비용 계산", () => {
    const result = calculateCost("google", "gemini-3.1-flash-lite", 1_000_000, 1_000_000);
    expect(result.batchCost).toBeCloseTo(0.125 + 0.75);
    expect(result.realtimeCost).toBeCloseTo(0.875 / 0.5);
  });

  it("모델 별칭으로 조회 (API 긴 이름 → PRICING 짧은 키)", () => {
    const result = calculateCost("anthropic", "claude-haiku-4-5-20251001", 1_000_000, 1_000_000);
    expect(result.batchCost).toBeCloseTo(0.5 + 2.5);
  });

  it("알 수 없는 모델은 비용 0 반환", () => {
    const result = calculateCost("openai", "unknown-model", 1_000, 1_000);
    expect(result.batchCost).toBe(0);
    expect(result.realtimeCost).toBe(0);
  });

  it("토큰 수 보존", () => {
    const result = calculateCost("openai", "gpt-5.4", 3552, 755);
    expect(result.inputTokens).toBe(3552);
    expect(result.outputTokens).toBe(755);
  });
});
