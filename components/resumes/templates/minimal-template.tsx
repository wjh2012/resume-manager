import type { ResumeData } from "@/components/resumes/types"

function formatDate(date?: string | null): string {
  if (!date) return ""
  const match = date.match(/^(\d{4})-(\d{2})/)
  if (match) return `${match[1]}.${match[2]}`
  return date
}

function DateRange({
  start,
  end,
  isCurrent,
}: {
  start?: string | null
  end?: string | null
  isCurrent?: boolean
}) {
  const s = formatDate(start)
  const e = isCurrent ? "현재" : formatDate(end)
  if (!s && !e) return null
  return (
    <span className="text-xs text-gray-400">
      {s}
      {s && e ? " - " : ""}
      {e}
    </span>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-[10px] font-medium tracking-[0.2em] text-gray-400 uppercase">
      {children}
    </h2>
  )
}

export function MinimalTemplate({ data }: { data: ResumeData }) {
  const { personalInfo, experiences, educations, skills, projects, certifications } = data

  const contactParts: string[] = []
  if (personalInfo?.email) contactParts.push(personalInfo.email)
  if (personalInfo?.phone) contactParts.push(personalInfo.phone)
  if (personalInfo?.address) contactParts.push(personalInfo.address)

  return (
    <div className="aspect-[210/297] w-full bg-white p-10 text-gray-900 print:p-0">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-wide text-gray-800">
          {personalInfo?.name ?? "이름"}
        </h1>
        {contactParts.length > 0 && (
          <p className="mt-2 text-xs text-gray-400">{contactParts.join(" · ")}</p>
        )}
        {personalInfo?.bio && (
          <p className="mt-3 text-sm leading-relaxed text-gray-500">{personalInfo.bio}</p>
        )}
      </div>

      {/* 경력 */}
      {experiences.length > 0 && (
        <section className="mb-7">
          <SectionTitle>경력</SectionTitle>
          <div className="space-y-4">
            {experiences.map((exp) => (
              <div key={exp.id} className="border-b border-gray-100 pb-4 last:border-0">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium text-gray-800">{exp.position}</p>
                  <DateRange start={exp.startDate} end={exp.endDate} isCurrent={exp.isCurrent} />
                </div>
                <p className="text-xs text-gray-400">{exp.company}</p>
                {exp.description && (
                  <p className="mt-2 text-xs whitespace-pre-line leading-relaxed text-gray-600">
                    {exp.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 학력 */}
      {educations.length > 0 && (
        <section className="mb-7">
          <SectionTitle>학력</SectionTitle>
          <div className="space-y-4">
            {educations.map((edu) => (
              <div key={edu.id} className="border-b border-gray-100 pb-4 last:border-0">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium text-gray-800">
                    {[edu.degree, edu.field].filter(Boolean).join(" ") || edu.school}
                  </p>
                  <DateRange start={edu.startDate} end={edu.endDate} />
                </div>
                {(edu.degree || edu.field) && (
                  <p className="text-xs text-gray-400">{edu.school}</p>
                )}
                {edu.description && (
                  <p className="mt-2 text-xs whitespace-pre-line leading-relaxed text-gray-600">
                    {edu.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 기술 */}
      {skills.length > 0 && (
        <section className="mb-7">
          <SectionTitle>기술</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill.id}
                className="text-xs text-gray-600"
              >
                {skill.name}
                {skill !== skills[skills.length - 1] && (
                  <span className="ml-2 text-gray-300">|</span>
                )}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 프로젝트 */}
      {projects.length > 0 && (
        <section className="mb-7">
          <SectionTitle>프로젝트</SectionTitle>
          <div className="space-y-4">
            {projects.map((proj) => (
              <div key={proj.id} className="border-b border-gray-100 pb-4 last:border-0">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium text-gray-800">{proj.name}</p>
                  <DateRange start={proj.startDate} end={proj.endDate} />
                </div>
                {proj.role && <p className="text-xs text-gray-400">{proj.role}</p>}
                {proj.description && (
                  <p className="mt-2 text-xs whitespace-pre-line leading-relaxed text-gray-600">
                    {proj.description}
                  </p>
                )}
                {proj.url && (
                  <p className="mt-1 text-[10px] text-gray-400">{proj.url}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 자격증 */}
      {certifications.length > 0 && (
        <section className="mb-7">
          <SectionTitle>자격증</SectionTitle>
          <div className="space-y-2">
            {certifications.map((cert) => (
              <div key={cert.id} className="flex items-baseline justify-between">
                <p className="text-sm text-gray-700">
                  {cert.name}
                  {cert.issuer && (
                    <span className="ml-2 text-xs text-gray-400">{cert.issuer}</span>
                  )}
                </p>
                {cert.issueDate && (
                  <span className="text-xs text-gray-400">{formatDate(cert.issueDate)}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
