import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface StatCardProps {
  icon: LucideIcon
  value: number
  label: string
  href: string
}

export function StatCard({ icon: Icon, value, label, href }: StatCardProps) {
  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-sm">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <Icon aria-hidden="true" className="text-muted-foreground h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-muted-foreground text-sm">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
