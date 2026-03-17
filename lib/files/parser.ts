import type { DocumentType } from "@/lib/validations/document"

// PDF 파서 (unpdf 기반, pdf.js v5.4)
async function parsePdf(buffer: ArrayBuffer): Promise<string> {
  const { extractText } = await import("unpdf")
  const { text } = await extractText(buffer)
  const content = Array.isArray(text) ? text.join("\n") : text
  return content.trim()
}

// DOCX 파서 (mammoth)
async function parseDocx(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth")
  const result = await mammoth.extractRawText({ arrayBuffer: buffer })
  return result.value.trim()
}

// TXT 파서 (UTF-8)
async function parseTxt(buffer: ArrayBuffer): Promise<string> {
  const decoder = new TextDecoder("utf-8")
  return decoder.decode(buffer).trim()
}

// 파일 타입에 따라 텍스트 추출
export async function parseFile(
  buffer: ArrayBuffer,
  type: DocumentType,
): Promise<string> {
  switch (type) {
    case "pdf":
      return parsePdf(buffer)
    case "docx":
      return parseDocx(buffer)
    case "txt":
      return parseTxt(buffer)
  }
}
