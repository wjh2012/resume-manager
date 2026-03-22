import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth/require-admin"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const result = await requireAdmin()
  if (!result.ok) redirect("/")
  return <>{children}</>
}
