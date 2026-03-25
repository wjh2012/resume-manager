import { describe, it, expect } from "vitest";
import { buildScenarios } from "../scenarios";

describe("buildScenarios", () => {
  it("sd-1 기준 4개 시나리오 생성", () => {
    const scenarios = buildScenarios("sd-1");
    expect(scenarios).toHaveLength(4);
    expect(scenarios.map((s) => s.id)).toEqual(["tc-1", "tc-2", "tc-3", "tc-4"]);
  });

  it("tc-1 새 경험: saveCareerNote true 기대", () => {
    const scenarios = buildScenarios("sd-1");
    const tc1 = scenarios.find((s) => s.id === "tc-1")!;
    expect(tc1.expected.exact?.saveCareerNote).toBe(true);
  });

  it("tc-4 단순 질문: 모든 필드 빈값/false 기대", () => {
    const scenarios = buildScenarios("sd-1");
    const tc4 = scenarios.find((s) => s.id === "tc-4")!;
    expect(tc4.expected.exact).toEqual({
      documentsToRead: [],
      careerNotesToRead: [],
      saveCareerNote: false,
    });
  });

  it("알 수 없는 페르소나 → 에러", () => {
    expect(() => buildScenarios("unknown")).toThrow();
  });
});
