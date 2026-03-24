import { describe, it, expect } from "vitest";
import { evaluateToolCalling } from "../evaluate";

describe("evaluateToolCalling", () => {
  it("정확한 도구 호출 → pass", () => {
    const result = evaluateToolCalling(
      [{ name: "saveCareerNote", args: {} }],
      { required: ["saveCareerNote"], allowed: ["readDocument"] },
      "제안된 내용을 저장했습니다",
    );
    expect(result.pass).toBe(true);
    expect(result.toolCallsCorrect).toBe(true);
  });

  it("필요한 도구 미호출 → underCall", () => {
    const result = evaluateToolCalling(
      [],
      { required: ["readDocument"], allowed: [] },
      "문서를 확인하겠습니다",
    );
    expect(result.pass).toBe(false);
    expect(result.underCall).toBe(true);
  });

  it("불필요한 도구 호출 → overCall", () => {
    const result = evaluateToolCalling(
      [{ name: "readDocument", args: {} }],
      { required: [], allowed: [] },
      "관련 문서를 읽어보겠습니다",
    );
    expect(result.pass).toBe(false);
    expect(result.overCall).toBe(true);
  });

  it("orderedPairs 순서 위반 → fail", () => {
    const result = evaluateToolCalling(
      [
        { name: "saveCareerNote", args: {} },
        { name: "readCareerNote", args: {} },
      ],
      {
        required: ["readCareerNote", "saveCareerNote"],
        allowed: [],
        orderedPairs: [["readCareerNote", "saveCareerNote"]],
      },
      "기존 노트를 확인 후 저장했습니다",
    );
    expect(result.pass).toBe(false);
  });

  it("orderedPairs 순서 준수 → pass", () => {
    const result = evaluateToolCalling(
      [
        { name: "readCareerNote", args: {} },
        { name: "saveCareerNote", args: {} },
      ],
      {
        required: ["readCareerNote", "saveCareerNote"],
        allowed: [],
        orderedPairs: [["readCareerNote", "saveCareerNote"]],
      },
      "기존 노트를 확인 후 저장했습니다",
    );
    expect(result.pass).toBe(true);
  });

  it("제안 감지", () => {
    const result = evaluateToolCalling(
      [],
      { required: ["saveCareerNote"], allowed: [] },
      "이 경험을 커리어노트에 저장할까요?",
    );
    expect(result.proposalDetected).toBe(true);
  });
});
