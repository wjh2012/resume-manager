import { prisma } from "@/lib/prisma"
import type { BuildContextOptions } from "@/types/ai"

export async function buildContext(
  userId: string,
  opts: BuildContextOptions,
): Promise<string> {
  return ""
}
