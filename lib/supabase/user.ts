import type { User } from "@supabase/supabase-js"

export interface UserInfo {
  name: string | null
  email: string
  avatarUrl: string | null
}

export function extractUserInfo(user: User): UserInfo {
  return {
    name:
      user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    email: user.email ?? "",
    avatarUrl:
      user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
  }
}
