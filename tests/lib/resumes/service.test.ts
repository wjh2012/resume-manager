import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    resume: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    education: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from "@/lib/prisma"
import {
  createResume,
  getResume,
  listResumes,
  updateResume,
  deleteResume,
  replaceEducations,
  ResumeNotFoundError,
  ResumeForbiddenError,
} from "@/lib/resumes/service"

const mockPrisma = vi.mocked(prisma)

const USER_ID = "a0000000-0000-4000-8000-000000000001"
const RESUME_ID = "b0000000-0000-4000-8000-000000000001"
const OTHER_USER_ID = "c0000000-0000-4000-8000-000000000001"

// ─────────────────────────────────────────────────────────────────────────────
describe("createResume()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("userId, title, template으로 이력서를 생성해야 한다", async () => {
    mockPrisma.resume.create.mockResolvedValue({ id: RESUME_ID } as never)

    const result = await createResume(USER_ID, { title: "내 이력서", template: "modern" })

    expect(mockPrisma.resume.create).toHaveBeenCalledWith({
      data: { userId: USER_ID, title: "내 이력서", template: "modern" },
      select: { id: true },
    })
    expect(result).toEqual({ id: RESUME_ID })
  })

  it("template을 생략하면 'classic'으로 생성해야 한다", async () => {
    mockPrisma.resume.create.mockResolvedValue({ id: RESUME_ID } as never)

    await createResume(USER_ID, { title: "내 이력서" })

    expect(mockPrisma.resume.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ template: "classic" }),
      }),
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("getResume()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("존재하지 않는 이력서이면 null을 반환해야 한다", async () => {
    mockPrisma.resume.findUnique.mockResolvedValue(null)

    const result = await getResume(RESUME_ID, USER_ID)

    expect(result).toBeNull()
  })

  it("다른 사용자의 이력서이면 null을 반환해야 한다", async () => {
    mockPrisma.resume.findUnique.mockResolvedValue({
      id: RESUME_ID,
      userId: OTHER_USER_ID,
    } as never)

    const result = await getResume(RESUME_ID, USER_ID)

    expect(result).toBeNull()
  })

  it("소유자이면 이력서를 반환해야 한다", async () => {
    const mockResume = {
      id: RESUME_ID,
      userId: USER_ID,
      title: "내 이력서",
      personalInfo: null,
      educations: [],
      experiences: [],
      skills: [],
      projects: [],
      certifications: [],
    }
    mockPrisma.resume.findUnique.mockResolvedValue(mockResume as never)

    const result = await getResume(RESUME_ID, USER_ID)

    expect(result).toEqual(mockResume)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("listResumes()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("사용자의 이력서 목록을 updatedAt 내림차순으로 반환해야 한다", async () => {
    const mockList = [
      { id: RESUME_ID, title: "이력서 A", template: "classic", createdAt: new Date(), updatedAt: new Date() },
    ]
    mockPrisma.resume.findMany.mockResolvedValue(mockList as never)

    const result = await listResumes(USER_ID)

    expect(mockPrisma.resume.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID },
        orderBy: { updatedAt: "desc" },
      }),
    )
    expect(result).toEqual(mockList)
  })

  it("이력서가 없으면 빈 배열을 반환해야 한다", async () => {
    mockPrisma.resume.findMany.mockResolvedValue([] as never)

    const result = await listResumes(USER_ID)

    expect(result).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("updateResume()", () => {
  let mockTx: {
    resume: {
      findUnique: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockTx = {
      resume: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    }
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockTx))
  })

  it("소유자이면 이력서 메타 정보를 업데이트해야 한다", async () => {
    mockTx.resume.findUnique.mockResolvedValue({ id: RESUME_ID, userId: USER_ID })
    const updatedResume = {
      id: RESUME_ID,
      title: "수정된 이력서",
      template: "modern",
      updatedAt: new Date(),
    }
    mockTx.resume.update.mockResolvedValue(updatedResume)

    const result = await updateResume(RESUME_ID, USER_ID, { title: "수정된 이력서", template: "modern" })

    expect(mockTx.resume.update).toHaveBeenCalledWith({
      where: { id: RESUME_ID },
      data: { title: "수정된 이력서", template: "modern" },
      select: { id: true, title: true, template: true, updatedAt: true },
    })
    expect(result).toEqual(updatedResume)
  })

  it("이력서가 없으면 ResumeNotFoundError를 던져야 한다", async () => {
    mockTx.resume.findUnique.mockResolvedValue(null)

    await expect(updateResume(RESUME_ID, USER_ID, { title: "수정" })).rejects.toThrow(
      ResumeNotFoundError,
    )
  })

  it("소유권이 없으면 ResumeForbiddenError를 던져야 한다", async () => {
    mockTx.resume.findUnique.mockResolvedValue({ id: RESUME_ID, userId: OTHER_USER_ID })

    await expect(updateResume(RESUME_ID, USER_ID, { title: "수정" })).rejects.toThrow(
      ResumeForbiddenError,
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("deleteResume()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("소유자이면 이력서를 삭제해야 한다", async () => {
    let capturedTx: { resume: { findUnique: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> } } | null =
      null

    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        resume: {
          findUnique: vi.fn().mockResolvedValue({ id: RESUME_ID, userId: USER_ID }),
          delete: vi.fn().mockResolvedValue(undefined),
        },
      }
      capturedTx = tx
      return fn(tx)
    })

    await expect(deleteResume(RESUME_ID, USER_ID)).resolves.toBeUndefined()
    expect(capturedTx!.resume.delete).toHaveBeenCalledWith({ where: { id: RESUME_ID } })
  })

  it("이력서가 없으면 ResumeNotFoundError를 던져야 한다", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        resume: {
          findUnique: vi.fn().mockResolvedValue(null),
          delete: vi.fn(),
        },
      }
      return fn(tx)
    })

    await expect(deleteResume(RESUME_ID, USER_ID)).rejects.toThrow(ResumeNotFoundError)
  })

  it("소유권이 없으면 ResumeForbiddenError를 던져야 한다", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        resume: {
          findUnique: vi.fn().mockResolvedValue({ id: RESUME_ID, userId: OTHER_USER_ID }),
          delete: vi.fn(),
        },
      }
      return fn(tx)
    })

    await expect(deleteResume(RESUME_ID, USER_ID)).rejects.toThrow(ResumeForbiddenError)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("replaceEducations()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("기존 학력을 삭제하고 새 항목을 sortOrder와 함께 생성해야 한다", async () => {
    const educationItems = [
      { school: "서울대학교", degree: "학사", field: "컴퓨터공학", startDate: null, endDate: null, description: undefined },
      { school: "연세대학교", degree: "석사", field: "AI", startDate: null, endDate: null, description: undefined },
    ]
    const createdEducations = educationItems.map((item, i) => ({ id: `edu-${i}`, ...item, sortOrder: i, resumeId: RESUME_ID }))

    let capturedTx: {
      resume: { findUnique: ReturnType<typeof vi.fn> }
      education: {
        deleteMany: ReturnType<typeof vi.fn>
        createMany: ReturnType<typeof vi.fn>
        findMany: ReturnType<typeof vi.fn>
      }
    } | null = null

    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        resume: {
          findUnique: vi.fn().mockResolvedValue({ id: RESUME_ID, userId: USER_ID }),
        },
        education: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
          findMany: vi.fn().mockResolvedValue(createdEducations),
        },
      }
      capturedTx = tx
      return fn(tx)
    })

    const result = await replaceEducations(RESUME_ID, USER_ID, educationItems)

    expect(capturedTx!.education.deleteMany).toHaveBeenCalledWith({ where: { resumeId: RESUME_ID } })
    expect(capturedTx!.education.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ resumeId: RESUME_ID, school: "서울대학교", sortOrder: 0 }),
        expect.objectContaining({ resumeId: RESUME_ID, school: "연세대학교", sortOrder: 1 }),
      ],
    })
    expect(capturedTx!.education.findMany).toHaveBeenCalledWith({
      where: { resumeId: RESUME_ID },
      orderBy: { sortOrder: "asc" },
    })
    expect(result).toEqual(createdEducations)
  })

  it("빈 배열을 전달하면 기존 항목을 모두 삭제하고 빈 배열을 반환해야 한다", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        resume: {
          findUnique: vi.fn().mockResolvedValue({ id: RESUME_ID, userId: USER_ID }),
        },
        education: {
          deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
          findMany: vi.fn().mockResolvedValue([]),
        },
      }
      return fn(tx)
    })

    const result = await replaceEducations(RESUME_ID, USER_ID, [])

    expect(result).toEqual([])
  })

  it("소유권이 없으면 ResumeForbiddenError를 던져야 한다", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        resume: {
          findUnique: vi.fn().mockResolvedValue({ id: RESUME_ID, userId: OTHER_USER_ID }),
        },
        education: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
          findMany: vi.fn(),
        },
      }
      return fn(tx)
    })

    await expect(
      replaceEducations(RESUME_ID, USER_ID, []),
    ).rejects.toThrow(ResumeForbiddenError)
  })

  it("이력서가 없으면 ResumeNotFoundError를 던져야 한다", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        resume: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
        education: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
          findMany: vi.fn(),
        },
      }
      return fn(tx)
    })

    await expect(
      replaceEducations(RESUME_ID, USER_ID, []),
    ).rejects.toThrow(ResumeNotFoundError)
  })
})
