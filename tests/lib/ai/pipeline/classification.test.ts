import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("ai", () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
  Output: { object: vi.fn((opts: unknown) => opts) },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: { findMany: vi.fn() },
    externalDocument: { findMany: vi.fn() },
    careerNote: { findMany: vi.fn() },
  },
}))

vi.mock("@/lib/ai/pipeline/classify", () => ({
  classify: vi.fn(),
}))

vi.mock("@/lib/ai/pipeline/compress", () => ({
  compressMessages: vi.fn(),
}))

import { streamText } from "ai"
import { prisma } from "@/lib/prisma"
import { classify } from "@/lib/ai/pipeline/classify"
import { compressMessages } from "@/lib/ai/pipeline/compress"
import { handleClassification } from "@/lib/ai/pipeline/classification"

const mockClassify = vi.mocked(classify)
const mockCompress = vi.mocked(compressMessages)
const mockStreamText = vi.mocked(streamText)

describe("handleClassification", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("분류 결과에 따라 문서를 조회하고 streamText를 tools 없이 호출한다", async () => {
    mockClassify.mockResolvedValue({
      classification: {
        documentsToRead: ["doc-1"],
        compareCareerNotes: false,
        needsCompression: false,
      },
      usage: { inputTokens: 100, outputTokens: 20 },
    })
    vi.mocked(prisma.document.findMany).mockResolvedValue([
      { id: "doc-1", title: "이력서", extractedText: "내용" },
    ] as never)
    mockStreamText.mockReturnValue({ toUIMessageStreamResponse: vi.fn() } as never)

    await handleClassification({
      model: {} as never,
      system: "시스템 프롬프트",
      modelMessages: [] as never,
      userId: "user-1",
      context: "요약",
      selectedDocumentIds: ["doc-1", "doc-2"],
      selectedExternalDocumentIds: [],
      includeCareerNotes: false,
      schema: {} as never,
      onFinish: vi.fn(),
    })

    expect(mockStreamText).toHaveBeenCalledWith(
      expect.not.objectContaining({ tools: expect.anything() })
    )
    // system prompt should contain document text
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("이력서"),
      })
    )
  })

  it("needsCompression이 true이면 compressMessages를 호출한다", async () => {
    mockClassify.mockResolvedValue({
      classification: {
        documentsToRead: [],
        compareCareerNotes: false,
        needsCompression: true,
      },
      usage: { inputTokens: 100, outputTokens: 20 },
    })
    mockCompress.mockResolvedValue({
      messages: [{ role: "user", content: "요약" }] as never,
      usage: { inputTokens: 50, outputTokens: 10 },
    })
    mockStreamText.mockReturnValue({ toUIMessageStreamResponse: vi.fn() } as never)

    const { preStageUsages } = await handleClassification({
      model: {} as never,
      system: "프롬프트",
      modelMessages: [{ role: "user", content: "긴 대화" }] as never,
      userId: "user-1",
      context: "",
      selectedDocumentIds: [],
      includeCareerNotes: false,
      schema: {} as never,
      onFinish: vi.fn(),
    })

    expect(mockCompress).toHaveBeenCalledOnce()
    expect(preStageUsages).toHaveLength(2) // classify + compress
  })

  it("compareCareerNotes가 true이면 커리어노트를 조회한다", async () => {
    mockClassify.mockResolvedValue({
      classification: {
        documentsToRead: [],
        compareCareerNotes: true,
        needsCompression: false,
      },
      usage: { inputTokens: 100, outputTokens: 20 },
    })
    vi.mocked(prisma.careerNote.findMany).mockResolvedValue([
      { id: "note-1", title: "노트", content: "내용", metadata: {} },
    ] as never)
    mockStreamText.mockReturnValue({ toUIMessageStreamResponse: vi.fn() } as never)

    await handleClassification({
      model: {} as never,
      system: "프롬프트",
      modelMessages: [] as never,
      userId: "user-1",
      context: "",
      selectedDocumentIds: [],
      selectedExternalDocumentIds: [],
      includeCareerNotes: true,
      schema: {} as never,
      onFinish: vi.fn(),
    })

    expect(prisma.careerNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", status: "CONFIRMED" },
      })
    )
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("노트"),
      })
    )
  })

  it("includeCareerNotes가 false이면 compareCareerNotes: true여도 커리어노트를 조회하지 않는다", async () => {
    mockClassify.mockResolvedValue({
      classification: {
        documentsToRead: [],
        compareCareerNotes: true,
        needsCompression: false,
      },
      usage: { inputTokens: 100, outputTokens: 20 },
    })
    mockStreamText.mockReturnValue({ toUIMessageStreamResponse: vi.fn() } as never)

    await handleClassification({
      model: {} as never,
      system: "프롬프트",
      modelMessages: [] as never,
      userId: "user-1",
      context: "",
      selectedDocumentIds: [],
      selectedExternalDocumentIds: [],
      includeCareerNotes: false,
      schema: {} as never,
      onFinish: vi.fn(),
    })

    expect(prisma.careerNote.findMany).not.toHaveBeenCalled()
  })

  it("selectedExternalDocumentIds 범위 밖의 외부 문서는 조회하지 않는다", async () => {
    mockClassify.mockResolvedValue({
      classification: {
        documentsToRead: [],
        externalDocumentsToRead: ["ext-1", "ext-999"],
        compareCareerNotes: false,
        needsCompression: false,
      },
      usage: { inputTokens: 100, outputTokens: 20 },
    })
    vi.mocked(prisma.externalDocument.findMany).mockResolvedValue([
      { id: "ext-1", title: "채용공고", content: "내용" },
    ] as never)
    mockStreamText.mockReturnValue({ toUIMessageStreamResponse: vi.fn() } as never)

    await handleClassification({
      model: {} as never,
      system: "프롬프트",
      modelMessages: [] as never,
      userId: "user-1",
      context: "",
      selectedDocumentIds: [],
      selectedExternalDocumentIds: ["ext-1"],
      includeCareerNotes: false,
      schema: {} as never,
      onFinish: vi.fn(),
    })

    // ext-999는 selectedExternalDocumentIds에 없으므로 필터링됨 → ext-1만 조회
    expect(prisma.externalDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { in: ["ext-1"] },
          userId: "user-1",
        },
      })
    )
    // 시스템 프롬프트에 ext-1의 내용이 포함됨
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("채용공고"),
      })
    )
  })
})
