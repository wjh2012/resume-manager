import {
  FileCheck,
  FileText,
  Home,
  Lightbulb,
  MessageSquare,
  PenTool,
  Settings,
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
  { icon: FileCheck, label: "이력서", href: "/resumes" },
  { icon: Settings, label: "설정", href: "/settings" },
]

export function getPageTitle(pathname: string): string {
  const exact = navItems.find((item) => item.href === pathname)
  if (exact) return exact.label

  const match = navItems.find(
    (item) => item.href !== "/" && pathname.startsWith(item.href),
  )
  return match?.label ?? ""
}
