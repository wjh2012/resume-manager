import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface QuotaProgressProps {
  quotas: {
    id: string
    limitType: string
    limitValue: number
    period: string
    currentUsage: number
  }[]
}

const LIMIT_LABELS: Record<string, string> = {
  TOKENS: "토큰",
  COST: "비용 ($)",
  REQUESTS: "요청 횟수",
}

const PERIOD_LABELS: Record<string, string> = {
  DAILY: "일간",
  MONTHLY: "월간",
}

export function QuotaProgress({ quotas }: QuotaProgressProps) {
  if (quotas.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>사용 한도</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {quotas.map((q) => {
          const pct = q.limitValue > 0 ? Math.min((q.currentUsage / q.limitValue) * 100, 100) : 0
          return (
            <div key={q.id}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{PERIOD_LABELS[q.period]} {LIMIT_LABELS[q.limitType]}</span>
                <span>{q.currentUsage.toLocaleString()} / {q.limitValue.toLocaleString()}</span>
              </div>
              <Progress value={pct} />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
