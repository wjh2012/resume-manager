import {
  BarChart3,
  BookOpen,
  DollarSign,
  FileCheck,
  FileText,
  Home,
  Lightbulb,
  MessageSquare,
  PenTool,
  Settings,
  Shield,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  icon: LucideIcon
  label: string
  href: string
}

export const navItems: NavItem[] = [
  { icon: Home, label: "대시보드", href: "/" },
  { icon: FileText, label: "참고자료", href: "/documents" },
  { icon: PenTool, label: "자기소개서", href: "/cover-letters" },
  { icon: MessageSquare, label: "모의면접", href: "/interviews" },
  { icon: Lightbulb, label: "인사이트", href: "/insights" },
  { icon: BookOpen, label: "커리어노트", href: "/career-notes" },
  { icon: FileCheck, label: "이력서", href: "/resumes" },
  { icon: BarChart3, label: "사용량", href: "/usage" },
  { icon: Settings, label: "설정", href: "/settings" },
]

export const adminNavItems: NavItem[] = [
  { icon: BarChart3, label: "사용량 모니터링", href: "/admin/usage" },
  { icon: DollarSign, label: "모델 단가", href: "/admin/model-pricing" },
  { icon: Shield, label: "Quota 관리", href: "/admin/quotas" },
]

const allNavItems = [...navItems, ...adminNavItems]

export function getPageTitle(pathname: string): string {
  const exact = allNavItems.find((item) => item.href === pathname)
  if (exact) return exact.label

  const match = allNavItems.find(
    (item) => item.href !== "/" && pathname.startsWith(item.href),
  )
  return match?.label ?? ""
}
