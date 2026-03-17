"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  FileCheck,
  FileText,
  Home,
  Lightbulb,
  MessageSquare,
  PenTool,
  Settings,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { UserMenu } from "@/components/layout/user-menu"
import type { UserInfo } from "@/lib/supabase/user"

const navItems = [
  { icon: Home, label: "대시보드", href: "/" },
  { icon: FileText, label: "참고자료", href: "/documents" },
  { icon: PenTool, label: "자기소개서", href: "/cover-letters" },
  { icon: MessageSquare, label: "모의면접", href: "/interviews" },
  { icon: Lightbulb, label: "인사이트", href: "/insights" },
  { icon: FileCheck, label: "이력서", href: "/resumes" },
  { icon: Settings, label: "설정", href: "/settings" },
]

interface AppSidebarProps {
  user: UserInfo
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="text-lg font-bold">
          Resume Manager
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href)
                    }
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UserMenu user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
