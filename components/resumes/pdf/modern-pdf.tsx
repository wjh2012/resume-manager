import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer"
import type { ResumeData } from "@/components/resumes/types"
import { formatDate } from "@/components/resumes/date-utils"

function dateRange(start?: string | null, end?: string | null, isCurrent?: boolean): string {
  const s = formatDate(start)
  const e = isCurrent ? "현재" : formatDate(end)
  if (!s && !e) return ""
  if (s && e) return `${s} - ${e}`
  return s || e
}

const SKILL_LEVEL_WIDTH: Record<string, string> = {
  beginner: "25%",
  intermediate: "50%",
  advanced: "75%",
  expert: "90%",
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Pretendard",
    fontSize: 10,
    flexDirection: "row",
  },
  sidebar: {
    width: "38%",
    backgroundColor: "#1e293b",
    padding: 20,
    color: "#ffffff",
  },
  main: {
    width: "62%",
    padding: 24,
    color: "#111827",
  },
  sidebarContact: {
    marginBottom: 16,
  },
  contactText: {
    fontSize: 8,
    color: "#cbd5e1",
    marginBottom: 3,
  },
  sidebarSection: {
    marginBottom: 16,
  },
  sidebarSectionTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: "#60a5fa",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  skillItem: {
    marginBottom: 6,
  },
  skillHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  skillName: {
    fontSize: 8,
    fontWeight: 700,
  },
  skillCategory: {
    fontSize: 7,
    color: "#94a3b8",
  },
  skillBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#475569",
  },
  skillBarFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3b82f6",
  },
  certItem: {
    marginBottom: 5,
  },
  certName: {
    fontSize: 8,
    fontWeight: 700,
  },
  certSub: {
    fontSize: 7,
    color: "#94a3b8",
    marginTop: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 700,
    color: "#111827",
  },
  bio: {
    fontSize: 8,
    color: "#4b5563",
    marginTop: 6,
    lineHeight: 1.5,
  },
  headerBlock: {
    marginBottom: 16,
  },
  mainSection: {
    marginBottom: 14,
  },
  mainSectionTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: "#3b82f6",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  timelineWrap: {
    borderLeftWidth: 2,
    borderLeftColor: "#bfdbfe",
    paddingLeft: 10,
  },
  timelineItem: {
    marginBottom: 8,
    position: "relative",
  },
  timelineDot: {
    position: "absolute",
    left: -14,
    top: 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3b82f6",
  },
  expPosition: {
    fontSize: 10,
    fontWeight: 700,
  },
  expCompany: {
    fontSize: 8,
    color: "#6b7280",
    marginTop: 1,
  },
  dateText: {
    fontSize: 7,
    color: "#9ca3af",
    marginTop: 1,
  },
  description: {
    fontSize: 8,
    color: "#374151",
    marginTop: 3,
  },
  eduItem: {
    marginBottom: 6,
  },
  eduTitle: {
    fontSize: 10,
    fontWeight: 700,
  },
  eduSchool: {
    fontSize: 8,
    color: "#6b7280",
    marginTop: 1,
  },
  projRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  projName: {
    fontSize: 10,
    fontWeight: 700,
  },
  projRole: {
    fontSize: 8,
    color: "#6b7280",
    marginTop: 1,
  },
  projItem: {
    marginBottom: 8,
  },
  urlText: {
    fontSize: 7,
    color: "#2563eb",
    marginTop: 2,
  },
})

export function ModernPdfTemplate({ data }: { data: ResumeData }) {
  const { personalInfo, experiences, educations, skills, projects, certifications } = data

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Sidebar */}
        <View style={styles.sidebar}>
          {/* Contact */}
          <View style={styles.sidebarContact}>
            {personalInfo?.email && (
              <Text style={styles.contactText}>{personalInfo.email}</Text>
            )}
            {personalInfo?.phone && (
              <Text style={styles.contactText}>{personalInfo.phone}</Text>
            )}
            {personalInfo?.address && (
              <Text style={styles.contactText}>{personalInfo.address}</Text>
            )}
          </View>

          {/* Skills */}
          {skills.length > 0 && (
            <View style={styles.sidebarSection}>
              <Text style={styles.sidebarSectionTitle}>기술</Text>
              {skills.map((skill) => (
                <View key={skill.id} style={styles.skillItem}>
                  <View style={styles.skillHeader}>
                    <Text style={styles.skillName}>{skill.name}</Text>
                    {skill.category && (
                      <Text style={styles.skillCategory}>{skill.category}</Text>
                    )}
                  </View>
                  <View style={styles.skillBarBg}>
                    <View
                      style={[
                        styles.skillBarFill,
                        { width: SKILL_LEVEL_WIDTH[skill.level ?? ""] ?? "50%" },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Certifications */}
          {certifications.length > 0 && (
            <View style={styles.sidebarSection}>
              <Text style={styles.sidebarSectionTitle}>자격증</Text>
              {certifications.map((cert) => (
                <View key={cert.id} style={styles.certItem}>
                  <Text style={styles.certName}>{cert.name}</Text>
                  {cert.issuer && <Text style={styles.certSub}>{cert.issuer}</Text>}
                  {cert.issueDate && (
                    <Text style={styles.certSub}>{formatDate(cert.issueDate)}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Main Content */}
        <View style={styles.main}>
          {/* Header */}
          <View style={styles.headerBlock}>
            <Text style={styles.name}>{personalInfo?.name ?? "이름"}</Text>
            {personalInfo?.bio && <Text style={styles.bio}>{personalInfo.bio}</Text>}
          </View>

          {/* Experience - Timeline */}
          {experiences.length > 0 && (
            <View style={styles.mainSection}>
              <Text style={styles.mainSectionTitle}>경력</Text>
              <View style={styles.timelineWrap}>
                {experiences.map((exp) => (
                  <View key={exp.id} style={styles.timelineItem}>
                    <View style={styles.timelineDot} />
                    <Text style={styles.expPosition}>{exp.position}</Text>
                    <Text style={styles.expCompany}>{exp.company}</Text>
                    <Text style={styles.dateText}>
                      {dateRange(exp.startDate, exp.endDate, exp.isCurrent)}
                    </Text>
                    {exp.description && (
                      <Text style={styles.description}>{exp.description}</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Education */}
          {educations.length > 0 && (
            <View style={styles.mainSection}>
              <Text style={styles.mainSectionTitle}>학력</Text>
              {educations.map((edu) => {
                const title = [edu.degree, edu.field].filter(Boolean).join(" ") || edu.school
                const showSchool = !!(edu.degree || edu.field)
                return (
                  <View key={edu.id} style={styles.eduItem}>
                    <Text style={styles.eduTitle}>{title}</Text>
                    {showSchool && <Text style={styles.eduSchool}>{edu.school}</Text>}
                    <Text style={styles.dateText}>
                      {dateRange(edu.startDate, edu.endDate)}
                    </Text>
                    {edu.description && (
                      <Text style={styles.description}>{edu.description}</Text>
                    )}
                  </View>
                )
              })}
            </View>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <View style={styles.mainSection}>
              <Text style={styles.mainSectionTitle}>프로젝트</Text>
              {projects.map((proj) => (
                <View key={proj.id} style={styles.projItem}>
                  <View style={styles.projRow}>
                    <Text style={styles.projName}>{proj.name}</Text>
                    <Text style={styles.dateText}>
                      {dateRange(proj.startDate, proj.endDate)}
                    </Text>
                  </View>
                  {proj.role && <Text style={styles.projRole}>{proj.role}</Text>}
                  {proj.description && (
                    <Text style={styles.description}>{proj.description}</Text>
                  )}
                  {proj.url && <Text style={styles.urlText}>{proj.url}</Text>}
                </View>
              ))}
            </View>
          )}
        </View>
      </Page>
    </Document>
  )
}
