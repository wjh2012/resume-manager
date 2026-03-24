import { describe, it, expect, afterEach } from "vitest";
import { saveJson } from "../report";
import { readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("saveJson", () => {
  const testDir = join(tmpdir(), "benchmark-report-test");
  const testFile = join(testDir, "nested", "result.json");

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("중첩 디렉터리를 자동 생성하고 JSON 파일을 저장한다", () => {
    const data = { suite: "tool-calling", passRate: "80.0%" };
    saveJson(data, testFile);
    const saved = JSON.parse(readFileSync(testFile, "utf-8"));
    expect(saved).toEqual(data);
  });

  it("pretty-print JSON (2-space indent)을 저장한다", () => {
    saveJson({ a: 1 }, testFile);
    const raw = readFileSync(testFile, "utf-8");
    expect(raw).toContain("\n  ");
  });
});
