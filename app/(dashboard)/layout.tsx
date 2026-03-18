import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { extractUserInfo } from "@/lib/supabase/user"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Topbar } from "@/components/layout/topbar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <SidebarProvider>
      <AppSidebar user={extractUserInfo(user)} />
      <SidebarInset>
        <Topbar />
        <main id="main-content" className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
