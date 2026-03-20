"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import Link from "next/link"
import { Eye, EyeOff, Save, Loader2, ExternalLink } from "lucide-react"
import { BackToListLink } from "@/components/shared/back-to-list-link"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ResumeData } from "@/components/resumes/types"
import { ResumePreviewPanel } from "@/components/resumes/resume-preview-panel"
import { PersonalInfoEditor } from "@/components/resumes/section-editors/personal-info-editor"
import {
  EducationEditor,
  type EducationItem,
} from "@/components/resumes/section-editors/education-editor"
import {
  ExperienceEditor,
  type ExperienceItem,
} from "@/components/resumes/section-editors/experience-editor"
import {
  SkillEditor,
  type SkillItem,
} from "@/components/resumes/section-editors/skill-editor"
import {
  ProjectEditor,
  type ProjectItem,
} from "@/components/resumes/section-editors/project-editor"
import {
  CertificationEditor,
  type CertificationItem,
} from "@/components/resumes/section-editors/certification-editor"

type SaveStatus = "idle" | "saving" | "saved" | "error"

type TabValue =
  | "personal"
  | "education"
  | "experience"
  | "skill"
  | "project"
  | "certification"

interface PersonalInfoData {
  name: string
  email: string
  phone?: string
  address?: string
  bio?: string
}

// Convert ISO date string to "YYYY-MM" for month inputs
function toMonthString(date?: string | null): string {
  if (!date) return ""
  const match = date.match(/^(\d{4})-(\d{2})/)
  if (match) return `${match[1]}-${match[2]}`
  return ""
}

// Strip internal fields before sending to API
function stripInternalFields<T extends { _tempId: string }>(
  items: T[],
): Omit<T, "_tempId">[] {
  return items.map(({ _tempId, ...rest }) => {
    void _tempId
    return rest as Omit<T, "_tempId">
  })
}

interface ResumeEditorProps {
  resume: {
    id: string
    title: string
    template: string
    personalInfo: {
      name: string
      email: string
      phone: string | null
      address: string | null
      bio: string | null
    } | null
    educations: {
      id: string
      school: string
      degree: string | null
      field: string | null
      startDate: string | null
      endDate: string | null
      description: string | null
      sortOrder: number
    }[]
    experiences: {
      id: string
      company: string
      position: string
      startDate: string | null
      endDate: string | null
      isCurrent: boolean
      description: string | null
      sortOrder: number
    }[]
    skills: {
      id: string
      name: string
      level: string | null
      category: string | null
      sortOrder: number
    }[]
    projects: {
      id: string
      name: string
      role: string | null
      startDate: string | null
      endDate: string | null
      description: string | null
      url: string | null
      sortOrder: number
    }[]
    certifications: {
      id: string
      name: string
      issuer: string | null
      issueDate: string | null
      expiryDate: string | null
      sortOrder: number
    }[]
  }
}

export function ResumeEditor({ resume }: ResumeEditorProps) {
  const resumeId = resume.id

  // Meta state
  const [title, setTitle] = useState(resume.title)
  const [template, setTemplate] = useState(resume.template)

  // Section state
  const [personalInfo, setPersonalInfo] = useState<PersonalInfoData | null>(
    resume.personalInfo
      ? {
          name: resume.personalInfo.name,
          email: resume.personalInfo.email,
          phone: resume.personalInfo.phone ?? "",
          address: resume.personalInfo.address ?? "",
          bio: resume.personalInfo.bio ?? "",
        }
      : null,
  )

  const [educations, setEducations] = useState<EducationItem[]>(
    resume.educations.map((e) => ({
      _tempId: e.id || crypto.randomUUID(),
      school: e.school,
      degree: e.degree ?? "",
      field: e.field ?? "",
      startDate: toMonthString(e.startDate),
      endDate: toMonthString(e.endDate),
      description: e.description ?? "",
    })),
  )

  const [experiences, setExperiences] = useState<ExperienceItem[]>(
    resume.experiences.map((e) => ({
      _tempId: e.id || crypto.randomUUID(),
      company: e.company,
      position: e.position,
      startDate: toMonthString(e.startDate),
      endDate: toMonthString(e.endDate),
      isCurrent: e.isCurrent,
      description: e.description ?? "",
    })),
  )

  const [skills, setSkills] = useState<SkillItem[]>(
    resume.skills.map((s) => ({
      _tempId: s.id || crypto.randomUUID(),
      name: s.name,
      level: s.level ?? "",
      category: s.category ?? "",
    })),
  )

  const [projects, setProjects] = useState<ProjectItem[]>(
    resume.projects.map((p) => ({
      _tempId: p.id || crypto.randomUUID(),
      name: p.name,
      role: p.role ?? "",
      startDate: toMonthString(p.startDate),
      endDate: toMonthString(p.endDate),
      description: p.description ?? "",
      url: p.url ?? "",
    })),
  )

  const [certifications, setCertifications] = useState<CertificationItem[]>(
    resume.certifications.map((c) => ({
      _tempId: c.id || crypto.randomUUID(),
      name: c.name,
      issuer: c.issuer ?? "",
      issueDate: toMonthString(c.issueDate),
      expiryDate: toMonthString(c.expiryDate),
    })),
  )

  const [activeTab, setActiveTab] = useState<TabValue>("personal")
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [showPreview, setShowPreview] = useState(true)
  const dirty = useRef(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Save function
  const save = useCallback(
    async (tab?: TabValue) => {
      const currentTab = tab ?? activeTab
      setSaveStatus("saving")

      try {
        let url: string
        let body: unknown

        switch (currentTab) {
          case "personal":
            url = `/api/resumes/${resumeId}/personal-info`
            body = personalInfo ?? { name: "", email: "" }
            break
          case "education":
            url = `/api/resumes/${resumeId}/educations`
            body = { items: stripInternalFields(educations) }
            break
          case "experience":
            url = `/api/resumes/${resumeId}/experiences`
            body = { items: stripInternalFields(experiences) }
            break
          case "skill":
            url = `/api/resumes/${resumeId}/skills`
            body = { items: stripInternalFields(skills) }
            break
          case "project":
            url = `/api/resumes/${resumeId}/projects`
            body = { items: stripInternalFields(projects) }
            break
          case "certification":
            url = `/api/resumes/${resumeId}/certifications`
            body = { items: stripInternalFields(certifications) }
            break
        }

        const res = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })

        if (!res.ok) throw new Error("저장에 실패했습니다.")

        dirty.current = false
        setSaveStatus("saved")
      } catch {
        setSaveStatus("error")
        toast.error("저장에 실패했습니다.")
      }
    },
    [
      activeTab,
      resumeId,
      personalInfo,
      educations,
      experiences,
      skills,
      projects,
      certifications,
    ],
  )

  // Save meta (title/template)
  const saveMeta = useCallback(
    async (newTitle: string, newTemplate: string) => {
      try {
        const res = await fetch(`/api/resumes/${resumeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle, template: newTemplate }),
        })
        if (!res.ok) throw new Error("저장에 실패했습니다.")
      } catch {
        toast.error("메타 정보 저장에 실패했습니다.")
      }
    },
    [resumeId],
  )

  // Debounced auto-save
  const scheduleSave = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      if (dirty.current) void save()
    }, 1000)
  }, [save])

  // Mark dirty on section change
  function handleSectionChange<T>(setter: (val: T) => void) {
    return (val: T) => {
      setter(val)
      dirty.current = true
      setSaveStatus("idle")
      scheduleSave()
    }
  }

  // Tab change: save immediately if dirty
  function handleTabChange(newTab: string) {
    if (dirty.current) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      void save(activeTab)
    }
    setActiveTab(newTab as TabValue)
  }

  // Title change with debounced meta save
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function handleTitleChange(newTitle: string) {
    setTitle(newTitle)
    if (titleTimer.current) clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(() => {
      void saveMeta(newTitle, template)
    }, 1000)
  }

  // Template change
  function handleTemplateChange(newTemplate: string) {
    setTemplate(newTemplate)
    void saveMeta(title, newTemplate)
  }

  // Manual save
  function handleManualSave() {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    dirty.current = true
    void save()
  }

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      if (titleTimer.current) clearTimeout(titleTimer.current)
    }
  }, [])

  // Build preview data
  const previewData: ResumeData = {
    id: resumeId,
    title,
    template,
    personalInfo: personalInfo
      ? {
          name: personalInfo.name,
          email: personalInfo.email,
          phone: personalInfo.phone || null,
          address: personalInfo.address || null,
          bio: personalInfo.bio || null,
        }
      : null,
    educations: educations.map((e, i) => ({
      id: e._tempId,
      school: e.school,
      degree: e.degree || null,
      field: e.field || null,
      startDate: e.startDate || null,
      endDate: e.endDate || null,
      description: e.description || null,
      sortOrder: i,
    })),
    experiences: experiences.map((e, i) => ({
      id: e._tempId,
      company: e.company,
      position: e.position,
      startDate: e.startDate || null,
      endDate: e.endDate || null,
      isCurrent: e.isCurrent,
      description: e.description || null,
      sortOrder: i,
    })),
    skills: skills.map((s, i) => ({
      id: s._tempId,
      name: s.name,
      level: s.level || null,
      category: s.category || null,
      sortOrder: i,
    })),
    projects: projects.map((p, i) => ({
      id: p._tempId,
      name: p.name,
      role: p.role || null,
      startDate: p.startDate || null,
      endDate: p.endDate || null,
      description: p.description || null,
      url: p.url || null,
      sortOrder: i,
    })),
    certifications: certifications.map((c, i) => ({
      id: c._tempId,
      name: c.name,
      issuer: c.issuer || null,
      issueDate: c.issueDate || null,
      expiryDate: c.expiryDate || null,
      sortOrder: i,
    })),
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3">
        <BackToListLink href="/resumes" />
        <Input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="w-60 font-medium"
          placeholder="이력서 제목"
        />
        <Select value={template} onValueChange={handleTemplateChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="classic">클래식</SelectItem>
            <SelectItem value="modern">모던</SelectItem>
            <SelectItem value="minimal">미니멀</SelectItem>
          </SelectContent>
        </Select>

        {/* Save status */}
        <span className="text-muted-foreground text-sm">
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              저장 중...
            </span>
          )}
          {saveStatus === "saved" && "저장됨"}
          {saveStatus === "error" && <span className="text-destructive">저장 실패</span>}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? (
              <EyeOff className="mr-1.5 h-4 w-4" />
            ) : (
              <Eye className="mr-1.5 h-4 w-4" />
            )}
            미리보기
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/resumes/${resumeId}/preview`}>
              <ExternalLink className="mr-1.5 h-4 w-4" />
              전체 화면
            </Link>
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* Editor */}
        <div className="flex min-h-0 flex-1 flex-col">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="flex min-h-0 flex-1 flex-col">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="personal">개인정보</TabsTrigger>
              <TabsTrigger value="education">학력</TabsTrigger>
              <TabsTrigger value="experience">경력</TabsTrigger>
              <TabsTrigger value="skill">기술</TabsTrigger>
              <TabsTrigger value="project">프로젝트</TabsTrigger>
              <TabsTrigger value="certification">자격증</TabsTrigger>
            </TabsList>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
              <TabsContent value="personal" className="mt-0">
                <PersonalInfoEditor
                  data={personalInfo}
                  onChange={handleSectionChange(setPersonalInfo)}
                />
              </TabsContent>
              <TabsContent value="education" className="mt-0">
                <EducationEditor
                  items={educations}
                  onChange={handleSectionChange(setEducations)}
                />
              </TabsContent>
              <TabsContent value="experience" className="mt-0">
                <ExperienceEditor
                  items={experiences}
                  onChange={handleSectionChange(setExperiences)}
                />
              </TabsContent>
              <TabsContent value="skill" className="mt-0">
                <SkillEditor
                  items={skills}
                  onChange={handleSectionChange(setSkills)}
                />
              </TabsContent>
              <TabsContent value="project" className="mt-0">
                <ProjectEditor
                  items={projects}
                  onChange={handleSectionChange(setProjects)}
                />
              </TabsContent>
              <TabsContent value="certification" className="mt-0">
                <CertificationEditor
                  items={certifications}
                  onChange={handleSectionChange(setCertifications)}
                />
              </TabsContent>
            </div>
          </Tabs>

          {/* Bottom save button */}
          <div className="mt-4 flex justify-end">
            <Button onClick={handleManualSave} disabled={saveStatus === "saving"}>
              {saveStatus === "saving" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              저장
            </Button>
          </div>
        </div>

        {/* Preview panel */}
        {showPreview && (
          <div className="hidden w-[400px] shrink-0 lg:block">
            <ResumePreviewPanel
              data={previewData}
              template={template}
              onTemplateChange={handleTemplateChange}
            />
          </div>
        )}
      </div>
    </div>
  )
}
