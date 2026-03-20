import { prisma } from "@/lib/prisma"

export interface DashboardStats {
  documents: number
  coverLetters: number
  interviews: number
  insights: number
  resumes: number
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const [documents, coverLetters, interviews, insights, resumes] = await Promise.all([
    prisma.document.count({ where: { userId } }),
    prisma.coverLetter.count({ where: { userId } }),
    prisma.interviewSession.count({ where: { userId } }),
    prisma.insight.count({ where: { userId } }),
    prisma.resume.count({ where: { userId } }),
  ])
  return { documents, coverLetters, interviews, insights, resumes }
}

export interface RecentActivity {
  coverLetters: { id: string; title: string; updatedAt: Date }[]
  interviews: { id: string; title: string; status: string; updatedAt: Date }[]
  insights: { id: string; category: string; content: string; updatedAt: Date }[]
}

export async function getRecentActivity(userId: string): Promise<RecentActivity> {
  const [coverLetters, interviews, insights] = await Promise.all([
    prisma.coverLetter.findMany({
      where: { userId },
      select: { id: true, title: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 3,
    }),
    prisma.interviewSession.findMany({
      where: { userId },
      select: { id: true, title: true, status: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 3,
    }),
    prisma.insight.findMany({
      where: { userId },
      select: { id: true, category: true, content: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ])
  return { coverLetters, interviews, insights }
}
