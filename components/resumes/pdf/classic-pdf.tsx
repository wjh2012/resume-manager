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

const styles = StyleSheet.create({
  page: {
    fontFamily: "Pretendard",
    fontSize: 10,
    padding: 30,
    color: "#111827",
  },
  header: {
    textAlign: "center",
    marginBottom: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: 700,
  },
  contact: {
    fontSize: 8,
    color: "#4b5563",
    marginTop: 4,
  },
  bio: {
    fontSize: 9,
    color: "#374151",
    marginTop: 6,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 3,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemTitle: {
    fontSize: 10,
    fontWeight: 700,
  },
  itemSub: {
    fontWeight: 400,
    color: "#4b5563",
  },
  dateText: {
    fontSize: 8,
    color: "#6b7280",
  },
  description: {
    fontSize: 9,
    color: "#374151",
    marginTop: 3,
  },
  itemSpacing: {
    marginBottom: 8,
  },
  skillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  skillBadge: {
    fontSize: 8,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    color: "#1f2937",
  },
  certRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  certName: {
    fontSize: 10,
  },
  certIssuer: {
    color: "#4b5563",
  },
  urlText: {
    fontSize: 8,
    color: "#2563eb",
    marginTop: 2,
  },
})

export function ClassicPdfTemplate({ data }: { data: ResumeData }) {
  const { personalInfo, experiences, educations, skills, projects, certifications } = data

  const contactParts: string[] = []
  if (personalInfo?.email) contactParts.push(personalInfo.email)
  if (personalInfo?.phone) contactParts.push(personalInfo.phone)
  if (personalInfo?.address) contactParts.push(personalInfo.address)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{personalInfo?.name ?? "이름"}</Text>
          {contactParts.length > 0 && (
            <Text style={styles.contact}>{contactParts.join(" · ")}</Text>
          )}
          {personalInfo?.bio && <Text style={styles.bio}>{personalInfo.bio}</Text>}
        </View>

        {/* 경력 */}
        {experiences.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>경력</Text>
            {experiences.map((exp) => (
              <View key={exp.id} style={styles.itemSpacing}>
                <View style={styles.row}>
                  <Text style={styles.itemTitle}>
                    {exp.position}
                    {exp.company && (
                      <Text style={styles.itemSub}> · {exp.company}</Text>
                    )}
                  </Text>
                  <Text style={styles.dateText}>
                    {dateRange(exp.startDate, exp.endDate, exp.isCurrent)}
                  </Text>
                </View>
                {exp.description && <Text style={styles.description}>{exp.description}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* 학력 */}
        {educations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>학력</Text>
            {educations.map((edu) => {
              const title = [edu.degree, edu.field].filter(Boolean).join(" ") || edu.school
              const showSchool = !!(edu.degree || edu.field)
              return (
                <View key={edu.id} style={styles.itemSpacing}>
                  <View style={styles.row}>
                    <Text style={styles.itemTitle}>
                      {title}
                      {showSchool && <Text style={styles.itemSub}> · {edu.school}</Text>}
                    </Text>
                    <Text style={styles.dateText}>
                      {dateRange(edu.startDate, edu.endDate)}
                    </Text>
                  </View>
                  {edu.description && <Text style={styles.description}>{edu.description}</Text>}
                </View>
              )
            })}
          </View>
        )}

        {/* 기술 */}
        {skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>기술</Text>
            <View style={styles.skillsWrap}>
              {skills.map((skill) => (
                <Text key={skill.id} style={styles.skillBadge}>
                  {skill.name}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* 프로젝트 */}
        {projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>프로젝트</Text>
            {projects.map((proj) => (
              <View key={proj.id} style={styles.itemSpacing}>
                <View style={styles.row}>
                  <Text style={styles.itemTitle}>
                    {proj.name}
                    {proj.role && <Text style={styles.itemSub}> · {proj.role}</Text>}
                  </Text>
                  <Text style={styles.dateText}>
                    {dateRange(proj.startDate, proj.endDate)}
                  </Text>
                </View>
                {proj.description && <Text style={styles.description}>{proj.description}</Text>}
                {proj.url && <Text style={styles.urlText}>{proj.url}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* 자격증 */}
        {certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>자격증</Text>
            {certifications.map((cert) => (
              <View key={cert.id} style={styles.certRow}>
                <Text style={styles.certName}>
                  {cert.name}
                  {cert.issuer && <Text style={styles.certIssuer}> · {cert.issuer}</Text>}
                </Text>
                {cert.issueDate && (
                  <Text style={styles.dateText}>{formatDate(cert.issueDate)}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  )
}
