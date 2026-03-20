import { describe, it, expect } from "vitest"
import {
  createResumeSchema,
  updateResumeSchema,
  personalInfoSchema,
  educationSchema,
  experienceSchema,
  skillSchema,
  projectSchema,
  certificationSchema,
  educationsSchema,
  experiencesSchema,
  skillsSchema,
  projectsSchema,
  certificationsSchema,
} from "@/lib/validations/resume"

// ────────────────────────────────────────────────────────────
// createResumeSchema
// ────────────────────────────────────────────────────────────
describe("createResumeSchema", () => {
  describe("유효한 데이터", () => {
    it("title과 template이 모두 있으면 통과해야 한다", () => {
      const result = createResumeSchema.safeParse({ title: "내 이력서", template: "modern" })
      expect(result.success).toBe(true)
    })

    it("template을 생략하면 기본값 'classic'으로 통과해야 한다", () => {
      const result = createResumeSchema.safeParse({ title: "내 이력서" })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.template).toBe("classic")
      }
    })

    it("template이 'modern'이면 통과해야 한다", () => {
      const result = createResumeSchema.safeParse({ title: "내 이력서", template: "modern" })
      expect(result.success).toBe(true)
    })

    it("template이 'minimal'이면 통과해야 한다", () => {
      const result = createResumeSchema.safeParse({ title: "내 이력서", template: "minimal" })
      expect(result.success).toBe(true)
    })

    it("title이 정확히 100자이면 통과해야 한다", () => {
      const result = createResumeSchema.safeParse({ title: "가".repeat(100) })
      expect(result.success).toBe(true)
    })
  })

  describe("title 유효성", () => {
    it("title이 없으면 실패해야 한다", () => {
      const result = createResumeSchema.safeParse({ template: "classic" })
      expect(result.success).toBe(false)
    })

    it("title이 빈 문자열이면 실패해야 한다", () => {
      const result = createResumeSchema.safeParse({ title: "" })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain("제목을 입력해주세요.")
      }
    })

    it("title이 101자이면 실패해야 한다", () => {
      const result = createResumeSchema.safeParse({ title: "가".repeat(101) })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain("제목은 100자 이하로 입력해주세요.")
      }
    })
  })

  describe("template 유효성", () => {
    it("허용되지 않은 template 값이면 실패해야 한다", () => {
      const result = createResumeSchema.safeParse({ title: "이력서", template: "fancy" })
      expect(result.success).toBe(false)
    })
  })
})

// ────────────────────────────────────────────────────────────
// updateResumeSchema
// ────────────────────────────────────────────────────────────
describe("updateResumeSchema", () => {
  it("빈 객체도 통과해야 한다 (모든 필드가 선택적)", () => {
    const result = updateResumeSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("title만 있어도 통과해야 한다", () => {
    const result = updateResumeSchema.safeParse({ title: "수정된 이력서" })
    expect(result.success).toBe(true)
  })

  it("template만 있어도 통과해야 한다", () => {
    const result = updateResumeSchema.safeParse({ template: "modern" })
    expect(result.success).toBe(true)
  })

  it("title과 template 모두 있으면 통과해야 한다", () => {
    const result = updateResumeSchema.safeParse({ title: "수정된 이력서", template: "minimal" })
    expect(result.success).toBe(true)
  })

  it("title이 빈 문자열이면 실패해야 한다", () => {
    const result = updateResumeSchema.safeParse({ title: "" })
    expect(result.success).toBe(false)
  })

  it("template이 유효하지 않은 값이면 실패해야 한다", () => {
    const result = updateResumeSchema.safeParse({ template: "unknown" })
    expect(result.success).toBe(false)
  })
})

// ────────────────────────────────────────────────────────────
// personalInfoSchema
// ────────────────────────────────────────────────────────────
describe("personalInfoSchema", () => {
  describe("유효한 데이터", () => {
    it("name과 email만 있어도 통과해야 한다", () => {
      const result = personalInfoSchema.safeParse({ name: "홍길동", email: "hong@example.com" })
      expect(result.success).toBe(true)
    })

    it("모든 필드가 있어도 통과해야 한다", () => {
      const result = personalInfoSchema.safeParse({
        name: "홍길동",
        email: "hong@example.com",
        phone: "010-1234-5678",
        address: "서울특별시",
        bio: "안녕하세요.",
      })
      expect(result.success).toBe(true)
    })

    it("선택 필드(phone, address, bio)는 생략해도 통과해야 한다", () => {
      const result = personalInfoSchema.safeParse({ name: "홍길동", email: "hong@example.com" })
      expect(result.success).toBe(true)
    })
  })

  describe("필수 필드 유효성", () => {
    it("name이 없으면 실패해야 한다", () => {
      const result = personalInfoSchema.safeParse({ email: "hong@example.com" })
      expect(result.success).toBe(false)
    })

    it("name이 빈 문자열이면 실패해야 한다", () => {
      const result = personalInfoSchema.safeParse({ name: "", email: "hong@example.com" })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain("이름을 입력해주세요.")
      }
    })

    it("email 형식이 잘못되면 실패해야 한다", () => {
      const result = personalInfoSchema.safeParse({ name: "홍길동", email: "not-an-email" })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain("올바른 이메일 형식이 아닙니다.")
      }
    })
  })
})

// ────────────────────────────────────────────────────────────
// educationSchema — optionalDate transform
// ────────────────────────────────────────────────────────────
describe("educationSchema", () => {
  describe("유효한 데이터", () => {
    it("school만 있어도 통과해야 한다", () => {
      const result = educationSchema.safeParse({ school: "서울대학교" })
      expect(result.success).toBe(true)
    })

    it("모든 필드가 있어도 통과해야 한다", () => {
      const result = educationSchema.safeParse({
        school: "서울대학교",
        degree: "학사",
        field: "컴퓨터공학",
        startDate: "2018-03-01",
        endDate: "2022-02-28",
        description: "졸업",
      })
      expect(result.success).toBe(true)
    })
  })

  describe("school 유효성", () => {
    it("school이 없으면 실패해야 한다", () => {
      const result = educationSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it("school이 빈 문자열이면 실패해야 한다", () => {
      const result = educationSchema.safeParse({ school: "" })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain("학교명을 입력해주세요.")
      }
    })
  })

  describe("optionalDate transform (startDate / endDate)", () => {
    it("undefined이면 null로 변환해야 한다", () => {
      const result = educationSchema.safeParse({ school: "서울대학교" })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.startDate).toBeNull()
        expect(result.data.endDate).toBeNull()
      }
    })

    it("빈 문자열이면 null로 변환해야 한다", () => {
      const result = educationSchema.safeParse({ school: "서울대학교", startDate: "", endDate: "" })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.startDate).toBeNull()
        expect(result.data.endDate).toBeNull()
      }
    })

    it("유효한 날짜 문자열이면 Date 객체로 변환해야 한다", () => {
      const result = educationSchema.safeParse({ school: "서울대학교", startDate: "2024-03-15" })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.startDate).toBeInstanceOf(Date)
        expect(isNaN((result.data.startDate as Date).getTime())).toBe(false)
      }
    })

    it("'invalid' 문자열이면 Zod 에러를 반환해야 한다", () => {
      const result = educationSchema.safeParse({ school: "서울대학교", startDate: "invalid" })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain("올바른 날짜 형식이 아닙니다.")
      }
    })
  })
})

// ────────────────────────────────────────────────────────────
// experienceSchema
// ────────────────────────────────────────────────────────────
describe("experienceSchema", () => {
  describe("유효한 데이터", () => {
    it("company와 position이 있으면 통과해야 한다", () => {
      const result = experienceSchema.safeParse({ company: "카카오", position: "백엔드 개발자" })
      expect(result.success).toBe(true)
    })

    it("isCurrent를 생략하면 기본값 false여야 한다", () => {
      const result = experienceSchema.safeParse({ company: "카카오", position: "개발자" })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isCurrent).toBe(false)
      }
    })

    it("isCurrent가 true이면 통과해야 한다", () => {
      const result = experienceSchema.safeParse({
        company: "카카오",
        position: "개발자",
        isCurrent: true,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isCurrent).toBe(true)
      }
    })
  })

  describe("필수 필드 유효성", () => {
    it("company가 없으면 실패해야 한다", () => {
      const result = experienceSchema.safeParse({ position: "개발자" })
      expect(result.success).toBe(false)
    })

    it("company가 빈 문자열이면 실패해야 한다", () => {
      const result = experienceSchema.safeParse({ company: "", position: "개발자" })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain("회사명을 입력해주세요.")
      }
    })

    it("position이 없으면 실패해야 한다", () => {
      const result = experienceSchema.safeParse({ company: "카카오" })
      expect(result.success).toBe(false)
    })

    it("position이 빈 문자열이면 실패해야 한다", () => {
      const result = experienceSchema.safeParse({ company: "카카오", position: "" })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain("직위를 입력해주세요.")
      }
    })
  })
})

// ────────────────────────────────────────────────────────────
// skillSchema
// ────────────────────────────────────────────────────────────
describe("skillSchema", () => {
  describe("유효한 데이터", () => {
    it("name만 있어도 통과해야 한다", () => {
      const result = skillSchema.safeParse({ name: "TypeScript" })
      expect(result.success).toBe(true)
    })

    it("level과 category가 모두 있어도 통과해야 한다", () => {
      const result = skillSchema.safeParse({
        name: "TypeScript",
        level: "advanced",
        category: "language",
      })
      expect(result.success).toBe(true)
    })

    it.each(["beginner", "intermediate", "advanced", "expert"] as const)(
      "level '%s'은 유효해야 한다",
      (level) => {
        const result = skillSchema.safeParse({ name: "TS", level })
        expect(result.success).toBe(true)
      },
    )

    it.each(["language", "framework", "tool", "other"] as const)(
      "category '%s'은 유효해야 한다",
      (category) => {
        const result = skillSchema.safeParse({ name: "TS", category })
        expect(result.success).toBe(true)
      },
    )
  })

  describe("필수 필드 유효성", () => {
    it("name이 없으면 실패해야 한다", () => {
      const result = skillSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it("name이 빈 문자열이면 실패해야 한다", () => {
      const result = skillSchema.safeParse({ name: "" })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain("기술명을 입력해주세요.")
      }
    })
  })

  describe("enum 유효성", () => {
    it("level이 허용되지 않은 값이면 실패해야 한다", () => {
      const result = skillSchema.safeParse({ name: "TS", level: "master" })
      expect(result.success).toBe(false)
    })

    it("category가 허용되지 않은 값이면 실패해야 한다", () => {
      const result = skillSchema.safeParse({ name: "TS", category: "database" })
      expect(result.success).toBe(false)
    })
  })
})

// ────────────────────────────────────────────────────────────
// projectSchema
// ────────────────────────────────────────────────────────────
describe("projectSchema", () => {
  describe("유효한 데이터", () => {
    it("name만 있어도 통과해야 한다", () => {
      const result = projectSchema.safeParse({ name: "포트폴리오 사이트" })
      expect(result.success).toBe(true)
    })

    it("유효한 URL이 있으면 통과해야 한다", () => {
      const result = projectSchema.safeParse({
        name: "포트폴리오",
        url: "https://example.com",
      })
      expect(result.success).toBe(true)
    })

    it("url이 빈 문자열이어도 통과해야 한다", () => {
      const result = projectSchema.safeParse({ name: "포트폴리오", url: "" })
      expect(result.success).toBe(true)
    })

    it("url을 생략해도 통과해야 한다", () => {
      const result = projectSchema.safeParse({ name: "포트폴리오" })
      expect(result.success).toBe(true)
    })
  })

  describe("url 유효성", () => {
    it("url 형식이 잘못되면 실패해야 한다", () => {
      const result = projectSchema.safeParse({ name: "포트폴리오", url: "not-a-url" })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain("올바른 URL 형식이 아닙니다.")
      }
    })
  })
})

// ────────────────────────────────────────────────────────────
// certificationSchema
// ────────────────────────────────────────────────────────────
describe("certificationSchema", () => {
  describe("유효한 데이터", () => {
    it("name만 있어도 통과해야 한다", () => {
      const result = certificationSchema.safeParse({ name: "정보처리기사" })
      expect(result.success).toBe(true)
    })

    it("모든 필드가 있으면 통과해야 한다", () => {
      const result = certificationSchema.safeParse({
        name: "정보처리기사",
        issuer: "한국산업인력공단",
        issueDate: "2023-05-01",
        expiryDate: "2026-05-01",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.issueDate).toBeInstanceOf(Date)
        expect(result.data.expiryDate).toBeInstanceOf(Date)
      }
    })
  })

  describe("name 유효성", () => {
    it("name이 없으면 실패해야 한다", () => {
      const result = certificationSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it("name이 빈 문자열이면 실패해야 한다", () => {
      const result = certificationSchema.safeParse({ name: "" })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain("자격증명을 입력해주세요.")
      }
    })
  })

  describe("optionalDate transform (issueDate / expiryDate)", () => {
    it("빈 문자열은 null로 변환해야 한다", () => {
      const result = certificationSchema.safeParse({
        name: "정보처리기사",
        issueDate: "",
        expiryDate: "",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.issueDate).toBeNull()
        expect(result.data.expiryDate).toBeNull()
      }
    })

    it("잘못된 날짜 문자열이면 Zod 에러를 반환해야 한다", () => {
      const result = certificationSchema.safeParse({ name: "정보처리기사", issueDate: "not-a-date" })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain("올바른 날짜 형식이 아닙니다.")
      }
    })
  })
})

// ────────────────────────────────────────────────────────────
// 배열 래퍼 스키마
// ────────────────────────────────────────────────────────────
describe("배열 래퍼 스키마", () => {
  it("educationsSchema: 유효한 항목 배열이면 통과해야 한다", () => {
    const result = educationsSchema.safeParse({
      items: [{ school: "서울대학교" }, { school: "연세대학교" }],
    })
    expect(result.success).toBe(true)
  })

  it("educationsSchema: 빈 배열이어도 통과해야 한다", () => {
    const result = educationsSchema.safeParse({ items: [] })
    expect(result.success).toBe(true)
  })

  it("experiencesSchema: 유효한 항목 배열이면 통과해야 한다", () => {
    const result = experiencesSchema.safeParse({
      items: [{ company: "카카오", position: "개발자" }],
    })
    expect(result.success).toBe(true)
  })

  it("experiencesSchema: 빈 배열이어도 통과해야 한다", () => {
    const result = experiencesSchema.safeParse({ items: [] })
    expect(result.success).toBe(true)
  })

  it("skillsSchema: 유효한 항목 배열이면 통과해야 한다", () => {
    const result = skillsSchema.safeParse({ items: [{ name: "TypeScript" }] })
    expect(result.success).toBe(true)
  })

  it("skillsSchema: 빈 배열이어도 통과해야 한다", () => {
    const result = skillsSchema.safeParse({ items: [] })
    expect(result.success).toBe(true)
  })

  it("projectsSchema: 유효한 항목 배열이면 통과해야 한다", () => {
    const result = projectsSchema.safeParse({ items: [{ name: "포트폴리오" }] })
    expect(result.success).toBe(true)
  })

  it("projectsSchema: 빈 배열이어도 통과해야 한다", () => {
    const result = projectsSchema.safeParse({ items: [] })
    expect(result.success).toBe(true)
  })

  it("certificationsSchema: 유효한 항목 배열이면 통과해야 한다", () => {
    const result = certificationsSchema.safeParse({ items: [{ name: "정보처리기사" }] })
    expect(result.success).toBe(true)
  })

  it("certificationsSchema: 빈 배열이어도 통과해야 한다", () => {
    const result = certificationsSchema.safeParse({ items: [] })
    expect(result.success).toBe(true)
  })

  it("배열 항목 중 하나라도 유효하지 않으면 실패해야 한다", () => {
    const result = educationsSchema.safeParse({
      items: [{ school: "서울대학교" }, { school: "" }],
    })
    expect(result.success).toBe(false)
  })
})
