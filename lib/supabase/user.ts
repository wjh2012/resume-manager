import { cache } from "react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

export interface UserInfo {
  name: string | null
  email: string | null
  avatarUrl: string | null
  role?: "ADMIN" | "USER"
}

export function extractUserInfo(user: User): UserInfo {
  return {
    name:
      user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    email: user.email ?? null,
    avatarUrl:
      user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
  }
}

// React.cache()로 래핑 — 같은 요청 내 여러 번 호출해도 실제 1회만 실행
export const getAuthUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})
