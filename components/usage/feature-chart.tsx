"use client"

import { Pie, PieChart } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"

const FALLBACK_COLOR = "var(--chart-5)"

// UsageFeature enum과 동기화 필요
const chartConfig = {
  value: { label: "토큰" },
  COVER_LETTER: { label: "자기소개서", color: "var(--chart-1)" },
  INTERVIEW: { label: "모의면접", color: "var(--chart-2)" },
  INSIGHT: { label: "인사이트", color: "var(--chart-3)" },
  DOCUMENT_SUMMARY: { label: "문서 요약", color: "var(--chart-4)" },
  CAREER_NOTE: { label: "커리어노트", color: "var(--chart-5)" },
} satisfies ChartConfig

interface FeatureChartProps {
  data: { feature: string; totalTokens: number; count: number }[]
}

export function FeatureChart({ data }: FeatureChartProps) {
  const chartData = data.map((d) => ({
    feature: d.feature,
    value: d.totalTokens,
    fill: chartConfig[d.feature as keyof typeof chartConfig]
      ? `var(--color-${d.feature})`
      : FALLBACK_COLOR,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>기능별 사용 비중</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px] pb-0 [&_.recharts-pie-label-text]:fill-foreground"
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie data={chartData} dataKey="value" label nameKey="feature" />
            <ChartLegend content={<ChartLegendContent nameKey="feature" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
