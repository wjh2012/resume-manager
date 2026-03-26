import type { ResumeData } from "@/components/resumes/types"
import { formatDate } from "@/components/resumes/date-utils"

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
    <span className="text-xs text-gray-500 print:text-gray-600">
      {s}
      {s && e ? " - " : ""}
      {e}
    </span>
  )
}

export function ClassicTemplate({ data }: { data: ResumeData }) {
  const { personalInfo, experiences, educations, skills, projects, certifications } = data

  const contactParts: string[] = []
  if (personalInfo?.email) contactParts.push(personalInfo.email)
  if (personalInfo?.phone) contactParts.push(personalInfo.phone)
  if (personalInfo?.address) contactParts.push(personalInfo.address)

  return (
    <div className="aspect-[210/297] w-full bg-white p-8 text-gray-900 print:p-0">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">{personalInfo?.name ?? "이름"}</h1>
        {contactParts.length > 0 && (
          <p className="mt-1 text-sm text-gray-600">{contactParts.join(" · ")}</p>
        )}
        {personalInfo?.bio && (
          <p className="mt-2 text-sm text-gray-700">{personalInfo.bio}</p>
        )}
      </div>

      {/* 경력 */}
      {experiences.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 border-b border-gray-300 pb-1 text-sm font-bold">경력</h2>
          <div className="space-y-3">
            {experiences.map((exp) => (
              <div key={exp.id}>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold">
                    {exp.position}
                    {exp.company && (
                      <span className="font-normal text-gray-600"> · {exp.company}</span>
                    )}
                  </p>
                  <DateRange start={exp.startDate} end={exp.endDate} isCurrent={exp.isCurrent} />
                </div>
                {exp.description && (
                  <p className="mt-1 text-xs whitespace-pre-line text-gray-700">{exp.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 학력 */}
      {educations.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 border-b border-gray-300 pb-1 text-sm font-bold">학력</h2>
          <div className="space-y-3">
            {educations.map((edu) => (
              <div key={edu.id}>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold">
                    {[edu.degree, edu.field].filter(Boolean).join(" ") || edu.school}
                    {(edu.degree || edu.field) && (
                      <span className="font-normal text-gray-600"> · {edu.school}</span>
                    )}
                  </p>
                  <DateRange start={edu.startDate} end={edu.endDate} />
                </div>
                {edu.description && (
                  <p className="mt-1 text-xs whitespace-pre-line text-gray-700">{edu.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 기술 */}
      {skills.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 border-b border-gray-300 pb-1 text-sm font-bold">기술</h2>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <span
                key={skill.id}
                className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-800 print:border print:border-gray-300 print:bg-transparent"
              >
                {skill.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 프로젝트 */}
      {projects.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 border-b border-gray-300 pb-1 text-sm font-bold">프로젝트</h2>
          <div className="space-y-3">
            {projects.map((proj) => (
              <div key={proj.id}>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold">
                    {proj.name}
                    {proj.role && (
                      <span className="font-normal text-gray-600"> · {proj.role}</span>
                    )}
                  </p>
                  <DateRange start={proj.startDate} end={proj.endDate} />
                </div>
                {proj.description && (
                  <p className="mt-1 text-xs whitespace-pre-line text-gray-700">{proj.description}</p>
                )}
                {proj.url && (
                  <p className="mt-0.5 text-xs text-blue-600">{proj.url}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 자격증 */}
      {certifications.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 border-b border-gray-300 pb-1 text-sm font-bold">자격증</h2>
          <div className="space-y-2">
            {certifications.map((cert) => (
              <div key={cert.id} className="flex items-baseline justify-between">
                <p className="text-sm">
                  {cert.name}
                  {cert.issuer && (
                    <span className="text-gray-600"> · {cert.issuer}</span>
                  )}
                </p>
                {cert.issueDate && (
                  <span className="text-xs text-gray-500">{formatDate(cert.issueDate)}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
