import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

function getEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} 환경변수를 설정하세요.`)
  return value
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    getEnvVar("NEXT_PUBLIC_SUPABASE_URL"),
    getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // setAll은 Server Component에서 호출될 수 있으나
            // 미들웨어에서 세션을 갱신하므로 무시해도 안전하다
          }
        },
      },
    },
  )
}
