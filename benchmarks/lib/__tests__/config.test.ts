import { describe, it, expect } from "vitest";
import { resolveProvider } from "../config";

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
