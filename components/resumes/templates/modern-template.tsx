import type { ResumeData } from "@/components/resumes/types"
import { formatDate } from "@/components/resumes/date-utils"

function DateRange({
  start,
  end,
  isCurrent,
  className,
}: {
  start?: string | null
  end?: string | null
  isCurrent?: boolean
  className?: string
}) {
  const s = formatDate(start)
  const e = isCurrent ? "현재" : formatDate(end)
  if (!s && !e) return null
  return (
    <span className={className ?? "text-xs text-gray-500"}>
      {s}
      {s && e ? " - " : ""}
      {e}
    </span>
  )
}

const SKILL_LEVEL_WIDTH: Record<string, string> = {
  beginner: "w-1/4",
  intermediate: "w-1/2",
  advanced: "w-3/4",
  expert: "w-[90%]",
}

export function ModernTemplate({ data }: { data: ResumeData }) {
  const { personalInfo, experiences, educations, skills, projects, certifications } = data

  return (
    <div className="flex aspect-[210/297] w-full overflow-hidden bg-white text-gray-900">
      {/* Sidebar */}
      <div className="flex w-[38%] flex-col bg-slate-800 p-6 text-white">
        {/* Personal Info */}
        <div className="mb-6">
          {personalInfo?.email && (
            <p className="text-xs text-slate-300">{personalInfo.email}</p>
          )}
          {personalInfo?.phone && (
            <p className="mt-1 text-xs text-slate-300">{personalInfo.phone}</p>
          )}
          {personalInfo?.address && (
            <p className="mt-1 text-xs text-slate-300">{personalInfo.address}</p>
          )}
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-xs font-bold tracking-wider text-blue-400 uppercase">
              기술
            </h3>
            <div className="space-y-2.5">
              {skills.map((skill) => (
                <div key={skill.id}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-xs font-medium">{skill.name}</span>
                    {skill.category && (
                      <span className="text-[10px] text-slate-400">{skill.category}</span>
                    )}
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-600">
                    <div
                      className={`h-full rounded-full bg-blue-500 ${SKILL_LEVEL_WIDTH[skill.level ?? ""] ?? "w-1/2"}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {certifications.length > 0 && (
          <div>
            <h3 className="mb-3 text-xs font-bold tracking-wider text-blue-400 uppercase">
              자격증
            </h3>
            <div className="space-y-2">
              {certifications.map((cert) => (
                <div key={cert.id}>
                  <p className="text-xs font-medium">{cert.name}</p>
                  {cert.issuer && (
                    <p className="text-[10px] text-slate-400">{cert.issuer}</p>
                  )}
                  {cert.issueDate && (
                    <p className="text-[10px] text-slate-400">{formatDate(cert.issueDate)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex w-[62%] flex-col p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {personalInfo?.name ?? "이름"}
          </h1>
          {personalInfo?.bio && (
            <p className="mt-2 text-xs leading-relaxed text-gray-600">{personalInfo.bio}</p>
          )}
        </div>

        {/* Experience - Timeline style */}
        {experiences.length > 0 && (
          <section className="mb-5">
            <h2 className="mb-3 text-xs font-bold tracking-wider text-blue-500 uppercase">
              경력
            </h2>
            <div className="space-y-3 border-l-2 border-blue-200 pl-4">
              {experiences.map((exp) => (
                <div key={exp.id} className="relative">
                  <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-blue-500" />
                  <p className="text-sm font-semibold">{exp.position}</p>
                  <p className="text-xs text-gray-500">{exp.company}</p>
                  <DateRange
                    start={exp.startDate}
                    end={exp.endDate}
                    isCurrent={exp.isCurrent}
                    className="text-[10px] text-gray-400"
                  />
                  {exp.description && (
                    <p className="mt-1 text-xs whitespace-pre-line text-gray-700">{exp.description}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {educations.length > 0 && (
          <section className="mb-5">
            <h2 className="mb-3 text-xs font-bold tracking-wider text-blue-500 uppercase">
              학력
            </h2>
            <div className="space-y-2">
              {educations.map((edu) => (
                <div key={edu.id}>
                  <p className="text-sm font-semibold">
                    {[edu.degree, edu.field].filter(Boolean).join(" ") || edu.school}
                  </p>
                  {(edu.degree || edu.field) && (
                    <p className="text-xs text-gray-500">{edu.school}</p>
                  )}
                  <DateRange
                    start={edu.startDate}
                    end={edu.endDate}
                    className="text-[10px] text-gray-400"
                  />
                  {edu.description && (
                    <p className="mt-1 text-xs whitespace-pre-line text-gray-700">{edu.description}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <section className="mb-5">
            <h2 className="mb-3 text-xs font-bold tracking-wider text-blue-500 uppercase">
              프로젝트
            </h2>
            <div className="space-y-3">
              {projects.map((proj) => (
                <div key={proj.id}>
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-semibold">{proj.name}</p>
                    <DateRange
                      start={proj.startDate}
                      end={proj.endDate}
                      className="text-[10px] text-gray-400"
                    />
                  </div>
                  {proj.role && (
                    <p className="text-xs text-gray-500">{proj.role}</p>
                  )}
                  {proj.description && (
                    <p className="mt-1 text-xs whitespace-pre-line text-gray-700">{proj.description}</p>
                  )}
                  {proj.url && (
                    <p className="mt-0.5 text-[10px] text-blue-600">{proj.url}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
