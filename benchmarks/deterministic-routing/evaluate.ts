import type { RoutingClassification } from "./schema";
import type { RoutingExpectation } from "./scenarios";

export interface RoutingEvaluation {
  pass: boolean;
  details: {
    documentsToReadCorrect: boolean;
    careerNotesToReadCorrect: boolean;
    saveCareerNoteCorrect: boolean;
  };
  actual: RoutingClassification;
}

export function evaluateRouting(
  actual: RoutingClassification,
  expected: RoutingExpectation,
): RoutingEvaluation {
  let documentsToReadCorrect = true;
  let careerNotesToReadCorrect = true;
  let saveCareerNoteCorrect = true;

  // exact 필드 비교
  if (expected.exact) {
    if (expected.exact.documentsToRead !== undefined) {
      documentsToReadCorrect = arraysEqual(
        actual.documentsToRead,
        expected.exact.documentsToRead,
      );
    }
    if (expected.exact.careerNotesToRead !== undefined) {
      careerNotesToReadCorrect = arraysEqual(
        actual.careerNotesToRead,
        expected.exact.careerNotesToRead,
      );
    }
    if (expected.exact.saveCareerNote !== undefined) {
      saveCareerNoteCorrect = actual.saveCareerNote === expected.exact.saveCareerNote;
    }
  }

  // atLeast 필드 비교 (최소 조건)
  if (expected.atLeast) {
    if (expected.atLeast.saveCareerNote !== undefined) {
      saveCareerNoteCorrect = actual.saveCareerNote === expected.atLeast.saveCareerNote;
    }
    if (expected.atLeast.documentsToRead !== undefined) {
      documentsToReadCorrect = expected.atLeast.documentsToRead.every(
        (id) => actual.documentsToRead.includes(id),
      );
    }
    if (expected.atLeast.careerNotesToRead !== undefined) {
      careerNotesToReadCorrect = expected.atLeast.careerNotesToRead.every(
        (id) => actual.careerNotesToRead.includes(id),
      );
    }
  }

  // nonEmpty 필드 비교: 해당 배열이 비어있으면 fail
  if (expected.nonEmpty) {
    for (const field of expected.nonEmpty) {
      if (actual[field].length === 0) {
        if (field === "documentsToRead") documentsToReadCorrect = false;
        if (field === "careerNotesToRead") careerNotesToReadCorrect = false;
      }
    }
  }

  const pass = documentsToReadCorrect && careerNotesToReadCorrect && saveCareerNoteCorrect;

  return {
    pass,
    details: { documentsToReadCorrect, careerNotesToReadCorrect, saveCareerNoteCorrect },
    actual,
  };
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}
