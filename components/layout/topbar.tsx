"use client"

import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

const pageTitles: Record<string, string> = {
  "/": "대시보드",
  "/documents": "참고자료",
  "/cover-letters": "자기소개서",
  "/interviews": "모의면접",
  "/insights": "인사이트",
  "/resumes": "이력서",
  "/settings": "설정",
}

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname]
  // /documents/[id] 같은 하위 경로 매칭
  const base = Object.keys(pageTitles).find(
    (key) => key !== "/" && pathname.startsWith(key),
  )
  return base ? pageTitles[base] : ""
}

export function Topbar() {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <header className="flex h-14 items-center gap-2 border-b px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      {title && <h1 className="text-sm font-medium">{title}</h1>}
      <div className="flex-1" />
    </header>
  )
}
