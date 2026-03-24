export type PersonaCategory =
  | "university-admission"
  | "office-entry"
  | "junior-developer"
  | "mid-developer"
  | "senior-developer"

export interface MockPersona {
  id: string
  name: string
  category: PersonaCategory
  label: string
}

export interface MockDocument {
  id: string
  personaId: string
  title: string
  summary: string
  extractedText: string
}

export interface MockExternalDocument {
  id: string
  personaId: string
  title: string
  summary: string
  extractedText: string
}

export interface MockCareerNote {
  id: string
  personaId: string
  title: string
  summary: string
  content: string
  metadata?: Record<string, string>
}

export type ConvMessage = { role: "user" | "assistant"; content: string }
