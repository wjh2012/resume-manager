import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  variant?: "stat"
  icon: LucideIcon
  value: number
  label: string
  href: string
}

interface ActionCardProps {
  variant: "action"
  icon: LucideIcon
  title: string
  description: string
  href: string
}

type DashboardCardProps = StatCardProps | ActionCardProps

export function DashboardCard(props: DashboardCardProps) {
  const { icon: Icon, href } = props
  const isAction = props.variant === "action"

  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-sm">
        <CardContent className="flex items-center gap-4 p-6">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", isAction ? "bg-primary/10" : "bg-muted")}>
            <Icon aria-hidden="true" className={cn("h-5 w-5", isAction ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div>
            {isAction ? (
              <>
                <p className="font-semibold">{props.title}</p>
                <p className="text-muted-foreground text-sm">{props.description}</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold">{props.value}</p>
                <p className="text-muted-foreground text-sm">{props.label}</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// Backward-compatible exports
export const StatCard = (props: Omit<StatCardProps, "variant">) =>
  DashboardCard({ ...props, variant: "stat" })
export const QuickActionCard = (props: Omit<ActionCardProps, "variant">) =>
  DashboardCard({ ...props, variant: "action" })
