import { z } from "zod"

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const DOCUMENT_TYPES = ["pdf", "docx", "txt"] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

const MIME_MAP: Record<string, DocumentType> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "text/plain": "txt",
}

const EXTENSION_MAP: Record<string, DocumentType> = {
  ".pdf": "pdf",
  ".docx": "docx",
  ".txt": "txt",
}

// MIME + 확장자 이중 검증으로 파일 타입 판별
export function resolveDocumentType(file: File): DocumentType | null {
  const byMime = MIME_MAP[file.type]
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
  const byExt = EXTENSION_MAP[ext]

  if (byMime && byExt && byMime === byExt) return byMime
  // MIME이 빈 문자열인 경우 확장자로 판별
  if (!file.type && byExt) return byExt
  if (byMime) return byMime

  return null
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  pdf: "PDF",
  docx: "DOCX",
  txt: "TXT",
}

export const documentUploadSchema = z.object({
  title: z.string().min(1).max(200),
})

// Magic bytes로 파일 내용의 실제 타입을 검증
const MAGIC_BYTES: { type: DocumentType; bytes: number[] }[] = [
  { type: "pdf", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { type: "docx", bytes: [0x50, 0x4b, 0x03, 0x04] }, // PK (ZIP)
]

export function verifyMagicBytes(
  buffer: ArrayBuffer,
  expectedType: DocumentType,
): boolean {
  // TXT는 바이너리 시그니처가 없으므로 항상 통과
  if (expectedType === "txt") return true

  if (buffer.byteLength < 4) return false

  const header = new Uint8Array(buffer, 0, 4)
  const magic = MAGIC_BYTES.find((m) => m.type === expectedType)
  if (!magic) return true

  return magic.bytes.every((byte, i) => header[i] === byte)
}
