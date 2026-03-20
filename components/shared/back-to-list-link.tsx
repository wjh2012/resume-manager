import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export function BackToListLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
    >
      <ChevronLeft className="h-3.5 w-3.5" />
      목록
    </Link>
  )
}
