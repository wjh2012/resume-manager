import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { extractUserInfo } from "@/lib/supabase/user"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const { name, email, avatarUrl } = extractUserInfo(data.user)

      await prisma.user.upsert({
        where: { id: data.user.id },
        update: { email, name, avatarUrl },
        create: { id: data.user.id, email, name, avatarUrl },
      })

      return NextResponse.redirect(origin)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
