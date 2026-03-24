import { describe, it, expect } from "vitest";
import { parseArgs } from "../cli";

describe("parseArgs", () => {
  it("기본값", () => {
    const opts = parseArgs([]);
    expect(opts.suite).toBe("all");
    expect(opts.provider).toBe("all");
    expect(opts.model).toBeUndefined();
    expect(opts.batch).toBe(false);
  });

  it("모든 옵션 파싱", () => {
    const opts = parseArgs([
      "--suite", "chat-pipeline",
      "--provider", "openai",
      "--model", "gpt-5.4",
      "--batch",
    ]);
    expect(opts.suite).toBe("chat-pipeline");
    expect(opts.provider).toBe("openai");
    expect(opts.model).toBe("gpt-5.4");
    expect(opts.batch).toBe(true);
  });

  it("--batch 플래그만 단독 사용", () => {
    const opts = parseArgs(["--batch"]);
    expect(opts.batch).toBe(true);
    expect(opts.suite).toBe("all");
  });
});
