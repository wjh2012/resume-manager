import { prisma } from "@/lib/prisma"
import type { z } from "zod"
import type {
  personalInfoSchema,
  educationSchema,
  experienceSchema,
  skillSchema,
  projectSchema,
  certificationSchema,
} from "@/lib/validations/resume"

export class ResumeNotFoundError extends Error {
  constructor() {
    super("이력서를 찾을 수 없습니다.")
  }
}

export class ResumeForbiddenError extends Error {
  constructor() {
    super("이 이력서에 대한 권한이 없습니다.")
  }
}

async function verifyOwnership(
  resumeId: string,
  userId: string,
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0] = prisma,
) {
  const record = await tx.resume.findUnique({
    where: { id: resumeId },
    select: { id: true, userId: true },
  })
  if (!record) throw new ResumeNotFoundError()
  if (record.userId !== userId) throw new ResumeForbiddenError()
}

// 이력서 생성
export async function createResume(userId: string, data: { title: string; template?: string }) {
  return prisma.resume.create({
    data: {
      userId,
      title: data.title,
      template: data.template ?? "classic",
    },
    select: { id: true },
  })
}

// 이력서 상세 조회 (모든 섹션 포함)
export async function getResume(id: string, userId: string) {
  const resume = await prisma.resume.findUnique({
    where: { id },
    include: {
      personalInfo: true,
      educations: { orderBy: { sortOrder: "asc" } },
      experiences: { orderBy: { sortOrder: "asc" } },
      skills: { orderBy: { sortOrder: "asc" } },
      projects: { orderBy: { sortOrder: "asc" } },
      certifications: { orderBy: { sortOrder: "asc" } },
    },
  })

  if (!resume) return null
  if (resume.userId !== userId) return null

  return resume
}

// 이력서 목록 조회
export async function listResumes(userId: string) {
  return prisma.resume.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      template: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  })
}

// 이력서 메타 정보 업데이트
export async function updateResume(
  id: string,
  userId: string,
  data: { title?: string; template?: string },
) {
  return prisma.$transaction(async (tx) => {
    await verifyOwnership(id, userId, tx)
    return tx.resume.update({
      where: { id },
      data,
      select: { id: true, title: true, template: true, updatedAt: true },
    })
  })
}

// 이력서 삭제
export async function deleteResume(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    await verifyOwnership(id, userId, tx)
    await tx.resume.delete({ where: { id } })
  })
}

// 개인정보 upsert
export async function upsertPersonalInfo(
  resumeId: string,
  userId: string,
  data: z.infer<typeof personalInfoSchema>,
) {
  return prisma.$transaction(async (tx) => {
    await verifyOwnership(resumeId, userId, tx)
    return tx.personalInfo.upsert({
      where: { resumeId },
      create: { resumeId, ...data },
      update: data,
    })
  })
}

// 학력 전체 교체
export async function replaceEducations(
  resumeId: string,
  userId: string,
  items: z.infer<typeof educationSchema>[],
) {
  return prisma.$transaction(async (tx) => {
    await verifyOwnership(resumeId, userId, tx)
    await tx.education.deleteMany({ where: { resumeId } })
    await tx.education.createMany({
      data: items.map((item, index) => ({
        resumeId,
        ...item,
        sortOrder: index,
      })),
    })
    return tx.education.findMany({
      where: { resumeId },
      orderBy: { sortOrder: "asc" },
    })
  })
}

// 경력 전체 교체
export async function replaceExperiences(
  resumeId: string,
  userId: string,
  items: z.infer<typeof experienceSchema>[],
) {
  return prisma.$transaction(async (tx) => {
    await verifyOwnership(resumeId, userId, tx)
    await tx.experience.deleteMany({ where: { resumeId } })
    await tx.experience.createMany({
      data: items.map((item, index) => ({
        resumeId,
        ...item,
        sortOrder: index,
      })),
    })
    return tx.experience.findMany({
      where: { resumeId },
      orderBy: { sortOrder: "asc" },
    })
  })
}

// 기술 전체 교체
export async function replaceSkills(
  resumeId: string,
  userId: string,
  items: z.infer<typeof skillSchema>[],
) {
  return prisma.$transaction(async (tx) => {
    await verifyOwnership(resumeId, userId, tx)
    await tx.skill.deleteMany({ where: { resumeId } })
    await tx.skill.createMany({
      data: items.map((item, index) => ({
        resumeId,
        ...item,
        sortOrder: index,
      })),
    })
    return tx.skill.findMany({
      where: { resumeId },
      orderBy: { sortOrder: "asc" },
    })
  })
}

// 프로젝트 전체 교체
export async function replaceProjects(
  resumeId: string,
  userId: string,
  items: z.infer<typeof projectSchema>[],
) {
  return prisma.$transaction(async (tx) => {
    await verifyOwnership(resumeId, userId, tx)
    await tx.project.deleteMany({ where: { resumeId } })
    await tx.project.createMany({
      data: items.map((item, index) => ({
        resumeId,
        ...item,
        url: item.url === "" ? null : item.url,
        sortOrder: index,
      })),
    })
    return tx.project.findMany({
      where: { resumeId },
      orderBy: { sortOrder: "asc" },
    })
  })
}

// 자격증 전체 교체
export async function replaceCertifications(
  resumeId: string,
  userId: string,
  items: z.infer<typeof certificationSchema>[],
) {
  return prisma.$transaction(async (tx) => {
    await verifyOwnership(resumeId, userId, tx)
    await tx.certification.deleteMany({ where: { resumeId } })
    await tx.certification.createMany({
      data: items.map((item, index) => ({
        resumeId,
        ...item,
        sortOrder: index,
      })),
    })
    return tx.certification.findMany({
      where: { resumeId },
      orderBy: { sortOrder: "asc" },
    })
  })
}
