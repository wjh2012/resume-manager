import { z } from "zod"

// 날짜 필드: 빈 문자열/undefined → null, 유효한 날짜 → Date, 잘못된 값 → 에러
const optionalDate = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (!v || v.trim() === "") return null
    const d = new Date(v)
    if (isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "올바른 날짜 형식이 아닙니다." })
      return z.NEVER
    }
    return d
  })

export const personalInfoSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요."),
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
  phone: z.string().optional(),
  address: z.string().optional(),
  bio: z.string().optional(),
})

export const educationSchema = z.object({
  school: z.string().min(1, "학교명을 입력해주세요."),
  degree: z.string().optional(),
  field: z.string().optional(),
  startDate: optionalDate,
  endDate: optionalDate,
  description: z.string().optional(),
})

export const experienceSchema = z.object({
  company: z.string().min(1, "회사명을 입력해주세요."),
  position: z.string().min(1, "직위를 입력해주세요."),
  startDate: optionalDate,
  endDate: optionalDate,
  isCurrent: z.boolean().default(false),
  description: z.string().optional(),
})

export const skillSchema = z.object({
  name: z.string().min(1, "기술명을 입력해주세요."),
  level: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
  category: z.enum(["language", "framework", "tool", "other"]).optional(),
})

export const projectSchema = z.object({
  name: z.string().min(1, "프로젝트명을 입력해주세요."),
  role: z.string().optional(),
  startDate: optionalDate,
  endDate: optionalDate,
  description: z.string().optional(),
  url: z.string().url("올바른 URL 형식이 아닙니다.").optional().or(z.literal("")),
})

export const certificationSchema = z.object({
  name: z.string().min(1, "자격증명을 입력해주세요."),
  issuer: z.string().optional(),
  issueDate: optionalDate,
  expiryDate: optionalDate,
})

export const createResumeSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요.").max(100, "제목은 100자 이하로 입력해주세요."),
  template: z.enum(["classic", "modern", "minimal"]).default("classic"),
})

export const updateResumeSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요.").max(100).optional(),
  template: z.enum(["classic", "modern", "minimal"]).optional(),
})

// 배열 섹션용 래퍼
export const educationsSchema = z.object({ items: z.array(educationSchema) })
export const experiencesSchema = z.object({ items: z.array(experienceSchema) })
export const skillsSchema = z.object({ items: z.array(skillSchema) })
export const projectsSchema = z.object({ items: z.array(projectSchema) })
export const certificationsSchema = z.object({ items: z.array(certificationSchema) })
