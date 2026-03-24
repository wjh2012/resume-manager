/**
 * 벤치마크 공통 목업 데이터 — Re-export 허브
 *
 * 모든 페르소나 데이터는 personas/ 하위 카테고리 파일에 정의.
 * 이 파일은 전체 데이터를 통합 re-export한다.
 */

export type {
  PersonaCategory,
  MockPersona,
  MockDocument,
  MockExternalDocument,
  MockCareerNote,
  ConvMessage,
} from "./types"

import * as ua from "./personas/university-admission"
import * as oe from "./personas/office-entry"
import * as jd from "./personas/junior-developer"
import * as md from "./personas/mid-developer"
import * as sd from "./personas/senior-developer"

import type { MockPersona, MockDocument, MockExternalDocument, MockCareerNote, ConvMessage } from "./types"

export const ALL_PERSONAS: MockPersona[] = [
  ...ua.PERSONAS,
  ...oe.PERSONAS,
  ...jd.PERSONAS,
  ...md.PERSONAS,
  ...sd.PERSONAS,
]

export const ALL_DOCUMENTS: MockDocument[] = [
  ...ua.DOCUMENTS,
  ...oe.DOCUMENTS,
  ...jd.DOCUMENTS,
  ...md.DOCUMENTS,
  ...sd.DOCUMENTS,
]

export const ALL_EXTERNAL_DOCUMENTS: MockExternalDocument[] = [
  ...ua.EXTERNAL_DOCUMENTS,
  ...oe.EXTERNAL_DOCUMENTS,
  ...jd.EXTERNAL_DOCUMENTS,
  ...md.EXTERNAL_DOCUMENTS,
  ...sd.EXTERNAL_DOCUMENTS,
]

export const ALL_CAREER_NOTES: MockCareerNote[] = [
  ...ua.CAREER_NOTES,
  ...oe.CAREER_NOTES,
  ...jd.CAREER_NOTES,
  ...md.CAREER_NOTES,
  ...sd.CAREER_NOTES,
]

export const ALL_CONV_STYLES: Record<string, Record<string, ConvMessage[]>> = {
  ...ua.CONV_STYLES,
  ...oe.CONV_STYLES,
  ...jd.CONV_STYLES,
  ...md.CONV_STYLES,
  ...sd.CONV_STYLES,
}

// 카테고리별 개별 re-export
export { ua, oe, jd, md, sd }
