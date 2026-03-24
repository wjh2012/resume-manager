import { describe, it, expect } from "vitest";
import { buildScenarios } from "../scenarios";

describe("buildScenarios", () => {
  it("sd-1으로 6개 시나리오 생성 (3 sizes × 2 strategies)", () => {
    const scenarios = buildScenarios("sd-1");
    expect(scenarios).toHaveLength(6);
    expect(scenarios.map((s) => s.id)).toEqual([
      "small-multistep", "small-classification",
      "medium-multistep", "medium-classification",
      "large-multistep", "large-classification",
    ]);
  });

  it("다른 페르소나로도 생성 가능", () => {
    const scenarios = buildScenarios("jd-3");
    expect(scenarios).toHaveLength(6);
    expect(scenarios[0].persona.id).toBe("jd-3");
  });

  it("존재하지 않는 페르소나는 에러", () => {
    expect(() => buildScenarios("invalid-99")).toThrow("Unknown persona");
  });
});
