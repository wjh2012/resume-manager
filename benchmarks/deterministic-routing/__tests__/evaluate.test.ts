import { describe, it, expect } from "vitest";
import { evaluateRouting } from "../evaluate";

describe("evaluateRouting", () => {
  it("tc-1: saveCareerNote true → pass", () => {
    const result = evaluateRouting(
      { documentsToRead: [], careerNotesToRead: [], saveCareerNote: true },
      { exact: { documentsToRead: [], careerNotesToRead: [], saveCareerNote: true } },
    );
    expect(result.pass).toBe(true);
  });

  it("tc-1: saveCareerNote false → fail", () => {
    const result = evaluateRouting(
      { documentsToRead: [], careerNotesToRead: [], saveCareerNote: false },
      { exact: { documentsToRead: [], careerNotesToRead: [], saveCareerNote: true } },
    );
    expect(result.pass).toBe(false);
    expect(result.details.saveCareerNoteCorrect).toBe(false);
  });

  it("tc-2: atLeast saveCareerNote true → pass", () => {
    const result = evaluateRouting(
      { documentsToRead: [], careerNotesToRead: ["note-1"], saveCareerNote: true },
      { atLeast: { saveCareerNote: true }, exact: { documentsToRead: [] } },
    );
    expect(result.pass).toBe(true);
  });

  it("nonEmpty: documentsToRead 비어있으면 fail", () => {
    const result = evaluateRouting(
      { documentsToRead: [], careerNotesToRead: [], saveCareerNote: false },
      { atLeast: { saveCareerNote: false }, nonEmpty: ["documentsToRead"] },
    );
    expect(result.pass).toBe(false);
    expect(result.details.documentsToReadCorrect).toBe(false);
  });

  it("nonEmpty: documentsToRead 있으면 pass", () => {
    const result = evaluateRouting(
      { documentsToRead: ["doc-1"], careerNotesToRead: [], saveCareerNote: false },
      { atLeast: { saveCareerNote: false }, nonEmpty: ["documentsToRead"] },
    );
    expect(result.pass).toBe(true);
  });

  it("tc-4: 모두 비어있음 → pass", () => {
    const result = evaluateRouting(
      { documentsToRead: [], careerNotesToRead: [], saveCareerNote: false },
      { exact: { documentsToRead: [], careerNotesToRead: [], saveCareerNote: false } },
    );
    expect(result.pass).toBe(true);
  });

  it("tc-4: 불필요한 도구 분류 → fail", () => {
    const result = evaluateRouting(
      { documentsToRead: ["doc-1"], careerNotesToRead: [], saveCareerNote: false },
      { exact: { documentsToRead: [], careerNotesToRead: [], saveCareerNote: false } },
    );
    expect(result.pass).toBe(false);
  });
});
