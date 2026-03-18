"use client"

import { createBrowserClient } from "@supabase/ssr"

function getEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} 환경변수를 설정하세요.`)
  return value
}

export function createClient() {
  return createBrowserClient(
    getEnvVar("NEXT_PUBLIC_SUPABASE_URL"),
    getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  )
}
