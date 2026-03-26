import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"

type AdminResult =
  | { ok: true; user: { id: string; role: "ADMIN" } }
  | { ok: false; status: 401 }
  | { ok: false; status: 403 }

export async function requireAdmin(): Promise<AdminResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { ok: false, status: 401 }

  const role = await getUserRole(user.id)

  if (role !== "ADMIN") return { ok: false, status: 403 }

  return { ok: true, user: { id: user.id, role } }
}
