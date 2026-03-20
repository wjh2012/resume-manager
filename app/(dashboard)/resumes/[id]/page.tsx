import { redirect, notFound } from "next/navigation"
import { getAuthUser } from "@/lib/supabase/user"
import { getResume } from "@/lib/resumes/service"
import { ResumeEditor } from "@/components/resumes/resume-editor"

// Convert Date | null to string | null
function dateToString(d: Date | null): string | null {
  return d ? d.toISOString() : null
}

export default async function ResumeEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const { id } = await params
  const resume = await getResume(id, user.id)
  if (!resume) notFound()

  const serialized = {
    id: resume.id,
    title: resume.title,
    template: resume.template,
    personalInfo: resume.personalInfo
      ? {
          name: resume.personalInfo.name,
          email: resume.personalInfo.email,
          phone: resume.personalInfo.phone,
          address: resume.personalInfo.address,
          bio: resume.personalInfo.bio,
        }
      : null,
    educations: resume.educations.map((e) => ({
      id: e.id,
      school: e.school,
      degree: e.degree,
      field: e.field,
      startDate: dateToString(e.startDate),
      endDate: dateToString(e.endDate),
      description: e.description,
      sortOrder: e.sortOrder,
    })),
    experiences: resume.experiences.map((e) => ({
      id: e.id,
      company: e.company,
      position: e.position,
      startDate: dateToString(e.startDate),
      endDate: dateToString(e.endDate),
      isCurrent: e.isCurrent,
      description: e.description,
      sortOrder: e.sortOrder,
    })),
    skills: resume.skills.map((s) => ({
      id: s.id,
      name: s.name,
      level: s.level,
      category: s.category,
      sortOrder: s.sortOrder,
    })),
    projects: resume.projects.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      startDate: dateToString(p.startDate),
      endDate: dateToString(p.endDate),
      description: p.description,
      url: p.url,
      sortOrder: p.sortOrder,
    })),
    certifications: resume.certifications.map((c) => ({
      id: c.id,
      name: c.name,
      issuer: c.issuer,
      issueDate: dateToString(c.issueDate),
      expiryDate: dateToString(c.expiryDate),
      sortOrder: c.sortOrder,
    })),
  }

  return (
    <div className="h-full">
      <ResumeEditor resume={serialized} />
    </div>
  )
}
