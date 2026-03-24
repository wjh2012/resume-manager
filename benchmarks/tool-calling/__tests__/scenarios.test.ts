import { describe, it, expect } from "vitest";
import { buildScenarios } from "../scenarios";

describe("buildScenarios", () => {
  it("sd-1으로 4개 시나리오 생성", () => {
    const scenarios = buildScenarios("sd-1");
    expect(scenarios).toHaveLength(4);
    expect(scenarios.map((s) => s.id)).toEqual(["tc-1", "tc-2", "tc-3", "tc-4"]);
    expect(scenarios[0].persona.id).toBe("sd-1");
  });

  it("다른 페르소나로도 생성 가능", () => {
    const scenarios = buildScenarios("jd-3");
    expect(scenarios).toHaveLength(4);
    expect(scenarios[0].persona.id).toBe("jd-3");
    expect(scenarios[0].messages.length).toBeGreaterThan(0);
  });

  it("존재하지 않는 페르소나는 에러", () => {
    expect(() => buildScenarios("invalid-99")).toThrow("Unknown persona");
  });
});
