import { describe, it, expect } from "vitest";
import { parseArgs } from "../cli";

describe("parseArgs", () => {
  it("기본값", () => {
    const opts = parseArgs([]);
    expect(opts.suites).toEqual(["all"]);
    expect(opts.providers).toEqual(["all"]);
    expect(opts.models).toEqual([]);
    expect(opts.personas).toEqual([]);
    expect(opts.batch).toBe(false);
    expect(opts.configPath).toBeUndefined();
  });

  it("모든 옵션 파싱", () => {
    const opts = parseArgs([
      "--suite", "chat-pipeline",
      "--provider", "openai",
      "--model", "gpt-5.4,claude-haiku-4-5",
      "--persona", "sd-1,jd-3",
      "--config", "benchmarks/benchmark.config.ts",
      "--batch",
    ]);
    expect(opts.suites).toEqual(["chat-pipeline"]);
    expect(opts.providers).toEqual(["openai"]);
    expect(opts.models).toEqual(["gpt-5.4", "claude-haiku-4-5"]);
    expect(opts.personas).toEqual(["sd-1", "jd-3"]);
    expect(opts.configPath).toBe("benchmarks/benchmark.config.ts");
    expect(opts.batch).toBe(true);
  });

  it("--batch 플래그만 단독 사용", () => {
    const opts = parseArgs(["--batch"]);
    expect(opts.batch).toBe(true);
    expect(opts.suites).toEqual(["all"]);
  });

  it("--model 단일 값", () => {
    const opts = parseArgs(["--model", "gpt-5.4-nano"]);
    expect(opts.models).toEqual(["gpt-5.4-nano"]);
  });

  it("--persona all", () => {
    const opts = parseArgs(["--persona", "all"]);
    expect(opts.personas).toEqual(["all"]);
  });
});
