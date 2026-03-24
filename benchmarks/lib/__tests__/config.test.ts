import { describe, it, expect } from "vitest";
import { resolveProvider, mergeWithCli, validatePersonas, loadConfig } from "../config";
import type { BenchmarkConfig } from "../config";

describe("resolveProvider", () => {
  it("gpt- prefix → openai", () => {
    expect(resolveProvider("gpt-5.4-nano")).toBe("openai");
  });

  it("o1- prefix → openai", () => {
    expect(resolveProvider("o1-mini")).toBe("openai");
  });

  it("o3- prefix → openai", () => {
    expect(resolveProvider("o3-mini")).toBe("openai");
  });

  it("o4- prefix → openai", () => {
    expect(resolveProvider("o4-mini")).toBe("openai");
  });

  it("claude- prefix → anthropic", () => {
    expect(resolveProvider("claude-haiku-4-5-20251001")).toBe("anthropic");
  });

  it("gemini- prefix → google", () => {
    expect(resolveProvider("gemini-3.1-flash-lite-preview")).toBe("google");
  });

  it("알 수 없는 prefix → null", () => {
    expect(resolveProvider("unknown-model")).toBeNull();
  });
});

describe("mergeWithCli", () => {
  const baseConfig: BenchmarkConfig = {
    suites: ["tool-calling"],
    providers: ["openai"],
    models: ["gpt-5.4-nano"],
    personas: ["sd-1"],
    batch: false,
  };

  it("CLI 옵션이 config를 override", () => {
    const cliOverrides = {
      suites: ["chat-pipeline"] as Array<"tool-calling" | "chat-pipeline">,
      models: ["claude-haiku-4-5-20251001"],
      batch: true,
    };
    const merged = mergeWithCli(baseConfig, cliOverrides);
    expect(merged.suites).toEqual(["chat-pipeline"]);
    expect(merged.models).toEqual(["claude-haiku-4-5-20251001"]);
    expect(merged.batch).toBe(true);
    expect(merged.providers).toEqual(["openai"]);
    expect(merged.personas).toEqual(["sd-1"]);
  });

  it("CLI override가 없으면 config 값 유지", () => {
    const merged = mergeWithCli(baseConfig, {});
    expect(merged).toEqual(baseConfig);
  });
});

describe("validatePersonas", () => {
  it("유효한 페르소나 ID는 통과", () => {
    expect(() => validatePersonas(["sd-1", "jd-3"])).not.toThrow();
  });

  it("잘못된 페르소나 ID는 에러", () => {
    expect(() => validatePersonas(["sd-1", "invalid-99"])).toThrow("invalid-99");
  });

  it('"all"은 전체 페르소나 ID 배열로 변환', () => {
    const result = validatePersonas(["all"]);
    expect(result.length).toBeGreaterThanOrEqual(25);
    expect(result).toContain("sd-1");
    expect(result).toContain("ua-1");
  });

  it('"all"과 다른 ID 혼합 시 에러', () => {
    expect(() => validatePersonas(["all", "sd-1"])).toThrow("all");
  });
});

describe("loadConfig", () => {
  it("models 누락 시 에러", async () => {
    const configPath = `data:text/javascript,export default ${JSON.stringify({
      suites: "all", personas: ["sd-1"], batch: false,
    })}`;
    await expect(loadConfig(configPath)).rejects.toThrow("models is required");
  });

  it("batch가 boolean이 아니면 에러", async () => {
    const configPath = `data:text/javascript,export default ${JSON.stringify({
      suites: "all", models: [], personas: [], batch: "yes",
    })}`;
    await expect(loadConfig(configPath)).rejects.toThrow("batch is required");
  });

  it("default export가 없으면 에러", async () => {
    const configPath = "data:text/javascript,export const foo = 1";
    await expect(loadConfig(configPath)).rejects.toThrow("must export a default object");
  });
});
