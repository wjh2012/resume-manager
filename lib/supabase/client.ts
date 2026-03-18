"use client"

import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL 환경변수를 설정하세요.")
  if (!supabaseAnonKey) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수를 설정하세요.")

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
