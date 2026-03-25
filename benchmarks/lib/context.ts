/**
 * 벤치마크 공통: 참고자료 context 빌더 + 채용공고 텍스트 헬퍼
 */

import {
  ALL_DOCUMENTS,
  ALL_CAREER_NOTES,
  ALL_EXTERNAL_DOCUMENTS,
} from "../fixtures/mock-data"

// ---------------------------------------------------------------------------
// 참고자료 context 빌더
// ---------------------------------------------------------------------------

export function buildContext(personaId?: string): string {
  const docs = personaId
    ? ALL_DOCUMENTS.filter((d) => d.personaId === personaId)
    : ALL_DOCUMENTS;
  const notes = personaId
    ? ALL_CAREER_NOTES.filter((n) => n.personaId === personaId)
    : ALL_CAREER_NOTES;

  const docsSummary = docs.map(
    (d) => `[문서: ${d.title}] (ID: ${d.id})\n${d.summary}`
  ).join("\n\n---\n\n")

  const notesSummary = notes.map(
    (n) => `[커리어노트: ${n.title}] (ID: ${n.id})\n${n.summary}`
  ).join("\n\n---\n\n")

  return docsSummary + "\n\n---\n\n" + notesSummary
}

// ---------------------------------------------------------------------------
// 채용공고 텍스트
// ---------------------------------------------------------------------------

export function getJobPostingText(personaId?: string): string {
  const doc = personaId
    ? ALL_EXTERNAL_DOCUMENTS.find((d) => d.personaId === personaId)
    : ALL_EXTERNAL_DOCUMENTS.find((d) => d.id === "sd-1-ext-1");
  if (!doc) {
    console.warn(`⚠ No external document found for persona: ${personaId ?? "default"}`);
    return "";
  }
  return doc.extractedText;
}
