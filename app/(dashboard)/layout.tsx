import { redirect } from "next/navigation"
import { getAuthUser, extractUserInfo } from "@/lib/supabase/user"
import { getUserRole } from "@/lib/auth/get-user-role"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Topbar } from "@/components/layout/topbar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthUser()

  if (!user) {
    redirect("/login")
  }

  const role = await getUserRole(user.id)
  const userInfo = { ...extractUserInfo(user), role }

  // !min-h-0: SidebarProvider 기본 min-h-svh를 해제하여 자식이 뷰포트를 넘지 않도록 제약
  return (
    <SidebarProvider className="h-svh !min-h-0">
      <AppSidebar user={userInfo} />
      <SidebarInset>
        <Topbar />
        <main id="main-content" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
