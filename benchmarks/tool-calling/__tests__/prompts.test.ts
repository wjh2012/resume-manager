import { describe, it, expect } from "vitest";
import { classifyMessage } from "../prompts";

describe("classifyMessage", () => {
  it("수치 변경 감지", () => {
    const result = classifyMessage("스타 수가 400개가 아니라 450개야", ["스타 400개"]);
    expect(result.classification).toBe("number-change");
    expect(result.hint).toContain("readCareerNote");
  });

  it("새 경험 감지", () => {
    const result = classifyMessage("작년에 API 서버를 구현했는데 트래픽 300만건 처리했어", []);
    expect(result.classification).toBe("new-experience");
    expect(result.hint).toContain("saveCareerNote");
  });

  it("초안 요청 감지", () => {
    const result = classifyMessage("자기소개서 첫 문단 써줘", []);
    expect(result.classification).toBe("draft-request");
    expect(result.hint).toContain("readDocument");
  });

  it("일반 질문", () => {
    const result = classifyMessage("이력서 작성할 때 팁 알려줘", []);
    expect(result.classification).toBe("general");
    expect(result.hint).toBe("");
  });
});
