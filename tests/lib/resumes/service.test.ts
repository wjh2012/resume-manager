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
    experience: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    skill: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    project: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    certification: {
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
  replaceExperiences,
  replaceSkills,
  replaceProjects,
  replaceCertifications,
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

// ─────────────────────────────────────────────────────────────────────────────
describe("replaceExperiences()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("기존 경력을 삭제하고 새 항목을 sortOrder와 함께 생성해야 한다", async () => {
    const experienceItems = [
      { company: "카카오", position: "백엔드 개발자", startDate: null, endDate: null, isCurrent: false, description: undefined },
      { company: "네이버", position: "프론트엔드 개발자", startDate: null, endDate: null, isCurrent: false, description: undefined },
    ]
    const createdExperiences = experienceItems.map((item, i) => ({ id: `exp-${i}`, ...item, sortOrder: i, resumeId: RESUME_ID }))

    let capturedTx: {
      resume: { findUnique: ReturnType<typeof vi.fn> }
      experience: {
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
        experience: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
          findMany: vi.fn().mockResolvedValue(createdExperiences),
        },
      }
      capturedTx = tx
      return fn(tx)
    })

    const result = await replaceExperiences(RESUME_ID, USER_ID, experienceItems)

    expect(capturedTx!.experience.deleteMany).toHaveBeenCalledWith({ where: { resumeId: RESUME_ID } })
    expect(capturedTx!.experience.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ resumeId: RESUME_ID, company: "카카오", sortOrder: 0 }),
        expect.objectContaining({ resumeId: RESUME_ID, company: "네이버", sortOrder: 1 }),
      ],
    })
    expect(capturedTx!.experience.findMany).toHaveBeenCalledWith({
      where: { resumeId: RESUME_ID },
      orderBy: { sortOrder: "asc" },
    })
    expect(result).toEqual(createdExperiences)
  })

  it("빈 배열을 전달하면 기존 항목을 모두 삭제하고 빈 배열을 반환해야 한다", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        resume: {
          findUnique: vi.fn().mockResolvedValue({ id: RESUME_ID, userId: USER_ID }),
        },
        experience: {
          deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
          findMany: vi.fn().mockResolvedValue([]),
        },
      }
      return fn(tx)
    })

    const result = await replaceExperiences(RESUME_ID, USER_ID, [])

    expect(result).toEqual([])
  })

  it("이력서가 없으면 ResumeNotFoundError를 던져야 한다", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        resume: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
        experience: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
          findMany: vi.fn(),
        },
      }
      return fn(tx)
    })

    await expect(
      replaceExperiences(RESUME_ID, USER_ID, []),
    ).rejects.toThrow(ResumeNotFoundError)
  })

  it("소유권이 없으면 ResumeForbiddenError를 던져야 한다", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        resume: {
          findUnique: vi.fn().mockResolvedValue({ id: RESUME_ID, userId: OTHER_USER_ID }),
        },
        experience: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
          findMany: vi.fn(),
        },
      }
      return fn(tx)
    })

    await expect(
      replaceExperiences(RESUME_ID, USER_ID, []),
    ).rejects.toThrow(ResumeForbiddenError)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("replaceSkills()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("기존 기술을 삭제하고 새 항목을 sortOrder와 함께 생성해야 한다", async () => {
    const skillItems = [
      { name: "TypeScript", level: undefined, category: undefined },
      { name: "React", level: "advanced" as const, category: "framework" as const },
    ]
    const createdSkills = skillItems.map((item, i) => ({ id: `skill-${i}`, ...item, sortOrder: i, resumeId: RESUME_ID }))

    let capturedTx: {
      resume: { findUnique: ReturnType<typeof vi.fn> }
      skill: {
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
        skill: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
          findMany: vi.fn().mockResolvedValue(createdSkills),
        },
      }
      capturedTx = tx
      return fn(tx)
    })

    const result = await replaceSkills(RESUME_ID, USER_ID, skillItems)

    expect(capturedTx!.skill.deleteMany).toHaveBeenCalledWith({ where: { resumeId: RESUME_ID } })
    expect(capturedTx!.skill.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ resumeId: RESUME_ID, name: "TypeScript", sortOrder: 0 }),
        expect.objectContaining({ resumeId: RESUME_ID, name: "React", sortOrder: 1 }),
      ],
    })
    expect(capturedTx!.skill.findMany).toHaveBeenCalledWith({
      where: { resumeId: RESUME_ID },
      orderBy: { sortOrder: "asc" },
    })
    expect(result).toEqual(createdSkills)
  })

  it("빈 배열을 전달하면 기존 항목을 모두 삭제하고 빈 배열을 반환해야 한다", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        resume: {
          findUnique: vi.fn().mockResolvedValue({ id: RESUME_ID, userId: USER_ID }),
        },
        skill: {
          deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
          findMany: vi.fn().mockResolvedValue([]),
        },
      }
      return fn(tx)
    })

    const result = await replaceSkills(RESUME_ID, USER_ID, [])

    expect(result).toEqual([])
  })

  it("이력서가 없으면 ResumeNotFoundError를 던져야 한다", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        resume: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
        skill: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
          findMany: vi.fn(),
        },
      }
      return fn(tx)
    })

    await expect(
      replaceSkills(RESUME_ID, USER_ID, []),
    ).rejects.toThrow(ResumeNotFoundError)
  })

  it("소유권이 없으면 ResumeForbiddenError를 던져야 한다", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        resume: {
          findUnique: vi.fn().mockResolvedValue({ id: RESUME_ID, userId: OTHER_USER_ID }),
        },
        skill: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
          findMany: vi.fn(),
        },
      }
      return fn(tx)
    })

    await expect(
      replaceSkills(RESUME_ID, USER_ID, []),
    ).rejects.toThrow(ResumeForbiddenError)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("replaceProjects()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("기존 프로젝트를 삭제하고 새 항목을 sortOrder와 함께 생성해야 한다", async () => {
    const projectItems = [
      { name: "이력서 관리 서비스", role: "풀스택", startDate: null, endDate: null, description: undefined, url: "" },
      { name: "AI 챗봇", role: "백엔드", startDate: null, endDate: null, description: undefined, url: "https://example.com" },
    ]
    const createdProjects = projectItems.map((item, i) => ({ id: `proj-${i}`, ...item, sortOrder: i, resumeId: RESUME_ID }))

    let capturedTx: {
      resume: { findUnique: ReturnType<typeof vi.fn> }
      project: {
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
        project: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
          findMany: vi.fn().mockResolvedValue(createdProjects),
        },
      }
      capturedTx = tx
      return fn(tx)
    })

    const result = await replaceProjects(RESUME_ID, USER_ID, projectItems)

    expect(capturedTx!.project.deleteMany).toHaveBeenCalledWith({ where: { resumeId: RESUME_ID } })
    expect(capturedTx!.project.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ resumeId: RESUME_ID, name: "이력서 관리 서비스", sortOrder: 0, url: null }),
        expect.objectContaining({ resumeId: RESUME_ID, name: "AI 챗봇", sortOrder: 1, url: "https://example.com" }),
      ],
    })
    expect(capturedTx!.project.findMany).toHaveBeenCalledWith({
      where: { resumeId: RESUME_ID },
      orderBy: { sortOrder: "asc" },
    })
    expect(result).toEqual(createdProjects)
  })

  it("빈 배열을 전달하면 기존 항목을 모두 삭제하고 빈 배열을 반환해야 한다", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        resume: {
          findUnique: vi.fn().mockResolvedValue({ id: RESUME_ID, userId: USER_ID }),
        },
        project: {
          deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
          findMany: vi.fn().mockResolvedValue([]),
        },
      }
      return fn(tx)
    })

    const result = await replaceProjects(RESUME_ID, USER_ID, [])

    expect(result).toEqual([])
  })

  it("이력서가 없으면 ResumeNotFoundError를 던져야 한다", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        resume: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
        project: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
          findMany: vi.fn(),
        },
      }
      return fn(tx)
    })

    await expect(
      replaceProjects(RESUME_ID, USER_ID, []),
    ).rejects.toThrow(ResumeNotFoundError)
  })

  it("소유권이 없으면 ResumeForbiddenError를 던져야 한다", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        resume: {
          findUnique: vi.fn().mockResolvedValue({ id: RESUME_ID, userId: OTHER_USER_ID }),
        },
        project: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
          findMany: vi.fn(),
        },
      }
      return fn(tx)
    })

    await expect(
      replaceProjects(RESUME_ID, USER_ID, []),
    ).rejects.toThrow(ResumeForbiddenError)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("replaceCertifications()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("기존 자격증을 삭제하고 새 항목을 sortOrder와 함께 생성해야 한다", async () => {
    const certificationItems = [
      { name: "정보처리기사", issuer: "한국산업인력공단", issueDate: null, expiryDate: null },
      { name: "AWS Solutions Architect", issuer: "Amazon", issueDate: null, expiryDate: null },
    ]
    const createdCertifications = certificationItems.map((item, i) => ({ id: `cert-${i}`, ...item, sortOrder: i, resumeId: RESUME_ID }))

    let capturedTx: {
      resume: { findUnique: ReturnType<typeof vi.fn> }
      certification: {
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
        certification: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
          findMany: vi.fn().mockResolvedValue(createdCertifications),
        },
      }
      capturedTx = tx
      return fn(tx)
    })

    const result = await replaceCertifications(RESUME_ID, USER_ID, certificationItems)

    expect(capturedTx!.certification.deleteMany).toHaveBeenCalledWith({ where: { resumeId: RESUME_ID } })
    expect(capturedTx!.certification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ resumeId: RESUME_ID, name: "정보처리기사", sortOrder: 0 }),
        expect.objectContaining({ resumeId: RESUME_ID, name: "AWS Solutions Architect", sortOrder: 1 }),
      ],
    })
    expect(capturedTx!.certification.findMany).toHaveBeenCalledWith({
      where: { resumeId: RESUME_ID },
      orderBy: { sortOrder: "asc" },
    })
    expect(result).toEqual(createdCertifications)
  })

  it("빈 배열을 전달하면 기존 항목을 모두 삭제하고 빈 배열을 반환해야 한다", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        resume: {
          findUnique: vi.fn().mockResolvedValue({ id: RESUME_ID, userId: USER_ID }),
        },
        certification: {
          deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
          findMany: vi.fn().mockResolvedValue([]),
        },
      }
      return fn(tx)
    })

    const result = await replaceCertifications(RESUME_ID, USER_ID, [])

    expect(result).toEqual([])
  })

  it("이력서가 없으면 ResumeNotFoundError를 던져야 한다", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        resume: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
        certification: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
          findMany: vi.fn(),
        },
      }
      return fn(tx)
    })

    await expect(
      replaceCertifications(RESUME_ID, USER_ID, []),
    ).rejects.toThrow(ResumeNotFoundError)
  })

  it("소유권이 없으면 ResumeForbiddenError를 던져야 한다", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        resume: {
          findUnique: vi.fn().mockResolvedValue({ id: RESUME_ID, userId: OTHER_USER_ID }),
        },
        certification: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
          findMany: vi.fn(),
        },
      }
      return fn(tx)
    })

    await expect(
      replaceCertifications(RESUME_ID, USER_ID, []),
    ).rejects.toThrow(ResumeForbiddenError)
  })
})
