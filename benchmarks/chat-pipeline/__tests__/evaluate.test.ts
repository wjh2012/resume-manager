import { describe, it, expect } from "vitest";
import { evaluateChatPipeline } from "../evaluate";

describe("evaluateChatPipeline", () => {
  it("올바른 문서 선택", () => {
    const result = evaluateChatPipeline(
      [
        { name: "readDocument", args: { documentId: "sd-1-doc-2" } },
        { name: "readDocument", args: { documentId: "sd-1-doc-3" } },
      ],
      "Stars 450개 이상, npm 다운로드 2K+",
      ["sd-1-doc-2", "sd-1-doc-3"],
      ["Stars 450", "npm 2K"],
    );
    expect(result.documentSelectionCorrect).toBe(true);
    expect(result.responseQualityMetrics.keyFactsFound).toContain("Stars 450");
  });

  it("문서 미선택", () => {
    const result = evaluateChatPipeline(
      [],
      "일반적인 응답",
      ["sd-1-doc-2"],
      ["Stars 450"],
    );
    expect(result.documentSelectionCorrect).toBe(false);
  });

  it("keyFact 누락 감지", () => {
    const result = evaluateChatPipeline(
      [{ name: "readDocument", args: { documentId: "sd-1-doc-2" } }],
      "Stars 450개 달성",
      ["sd-1-doc-2"],
      ["Stars 450", "npm 2K"],
    );
    expect(result.responseQualityMetrics.keyFactsMissed).toContain("npm 2K");
  });

  it("toolCallCount 집계", () => {
    const result = evaluateChatPipeline(
      [
        { name: "readDocument", args: { documentId: "sd-1-doc-2" } },
        { name: "readCareerNote", args: { careerNoteId: "sd-1-note-1" } },
        { name: "readDocument", args: { documentId: "sd-1-doc-3" } },
      ],
      "응답 텍스트",
      ["sd-1-doc-2"],
      [],
    );
    expect(result.toolCallCount).toBe(3);
  });

  it("readCareerNote로 careerNote ID 선택 인식", () => {
    const result = evaluateChatPipeline(
      [{ name: "readCareerNote", args: { careerNoteId: "sd-1-note-1" } }],
      "응답 텍스트",
      ["sd-1-note-1"],
      [],
    );
    expect(result.documentSelectionCorrect).toBe(true);
  });

  it("expectedDocIds가 비어있으면 항상 correct", () => {
    const result = evaluateChatPipeline([], "응답 텍스트", [], ["fact1"]);
    expect(result.documentSelectionCorrect).toBe(true);
  });

  it("keyFacts 대소문자 무관 매치", () => {
    const result = evaluateChatPipeline(
      [],
      "DEPLOY-EZ 프로젝트 관련 내용",
      [],
      ["deploy-ez"],
    );
    expect(result.responseQualityMetrics.keyFactsFound).toContain("deploy-ez");
    expect(result.responseQualityMetrics.keyFactsMissed).toHaveLength(0);
  });
});
