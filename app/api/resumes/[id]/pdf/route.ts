export const runtime = "nodejs"

import { createElement } from "react"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getResume } from "@/lib/resumes/service"
import { UUID_RE } from "@/lib/utils"
import { renderToBuffer } from "@react-pdf/renderer"
// Import font registration (side effect)
import "@/components/resumes/pdf/font-register"
import { ClassicPdfTemplate } from "@/components/resumes/pdf/classic-pdf"
import { ModernPdfTemplate } from "@/components/resumes/pdf/modern-pdf"
import { MinimalPdfTemplate } from "@/components/resumes/pdf/minimal-pdf"
import type { ResumeData } from "@/components/resumes/types"
import { dateToString } from "@/components/resumes/date-utils"

const TEMPLATES: Record<string, React.FC<{ data: ResumeData }>> = {
  classic: ClassicPdfTemplate,
  modern: ModernPdfTemplate,
  minimal: MinimalPdfTemplate,
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // 1. Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  // 2. UUID validation
  const { id } = await params

  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: "잘못된 이력서 ID 형식입니다." },
      { status: 400 },
    )
  }

  // 3. Fetch resume
  const resume = await getResume(id, user.id)

  if (!resume) {
    return NextResponse.json(
      { error: "이력서를 찾을 수 없습니다." },
      { status: 404 },
    )
  }

  // 4. Get template from query
  const { searchParams } = new URL(request.url)
  const templateName = searchParams.get("template") ?? "classic"
  const TemplateComponent = TEMPLATES[templateName] ?? TEMPLATES.classic

  // 5. Serialize dates
  const serialized: ResumeData = {
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

  // 6. Render PDF
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(createElement(TemplateComponent, { data: serialized }) as any)

    const encodedTitle = encodeURIComponent(resume.title)
    return new Response(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="resume.pdf"; filename*=UTF-8''${encodedTitle}.pdf`,
      },
    })
  } catch (error) {
    console.error("[GET /api/resumes/[id]/pdf]", error)
    return NextResponse.json(
      { error: "PDF 생성에 실패했습니다." },
      { status: 500 },
    )
  }
}
