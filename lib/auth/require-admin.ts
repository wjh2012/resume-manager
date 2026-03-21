import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

type AdminResult =
  | { ok: true; user: { id: string; role: string } }
  | { ok: false; status: 401 }
  | { ok: false; status: 403 }

export async function requireAdmin(): Promise<AdminResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { ok: false, status: 401 }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  })

  if (!dbUser || dbUser.role !== "ADMIN") return { ok: false, status: 403 }

  return { ok: true, user: dbUser }
}
