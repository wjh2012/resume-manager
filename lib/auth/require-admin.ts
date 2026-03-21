import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  })

  if (!dbUser || dbUser.role !== "ADMIN") return null
  return dbUser
}
