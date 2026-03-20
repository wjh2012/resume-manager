export interface ResumeData {
  id: string
  title: string
  template: string
  personalInfo: {
    name: string
    email: string
    phone?: string | null
    address?: string | null
    bio?: string | null
  } | null
  educations: {
    id: string
    school: string
    degree?: string | null
    field?: string | null
    startDate?: string | null
    endDate?: string | null
    description?: string | null
    sortOrder: number
  }[]
  experiences: {
    id: string
    company: string
    position: string
    startDate?: string | null
    endDate?: string | null
    isCurrent: boolean
    description?: string | null
    sortOrder: number
  }[]
  skills: {
    id: string
    name: string
    level?: string | null
    category?: string | null
    sortOrder: number
  }[]
  projects: {
    id: string
    name: string
    role?: string | null
    startDate?: string | null
    endDate?: string | null
    description?: string | null
    url?: string | null
    sortOrder: number
  }[]
  certifications: {
    id: string
    name: string
    issuer?: string | null
    issueDate?: string | null
    expiryDate?: string | null
    sortOrder: number
  }[]
}
