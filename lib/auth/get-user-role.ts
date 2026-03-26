import { cache } from "react"
import { prisma } from "@/lib/prisma"

/**
 * React.cache()로 래핑된 user role 조회.
 * 같은 RSC 렌더 패스 내에서 여러 번 호출해도 실제 DB 쿼리는 1회만 실행.
 */
export const getUserRole = cache(async (userId: string): Promise<"ADMIN" | "USER"> => {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  return (dbUser?.role ?? "USER") as "ADMIN" | "USER"
})
