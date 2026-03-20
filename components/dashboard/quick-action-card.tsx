import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface QuickActionCardProps {
  icon: LucideIcon
  title: string
  description: string
  href: string
}

export function QuickActionCard({ icon: Icon, title, description, href }: QuickActionCardProps) {
  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-sm">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <Icon aria-hidden="true" className="text-primary h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
