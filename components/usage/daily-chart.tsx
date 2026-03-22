"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartConfig = {
  totalTokens: {
    label: "토큰",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

interface DailyChartProps {
  data: { date: string; totalTokens: number; totalCost: number; count: number }[]
}

export function DailyChart({ data }: DailyChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>일별 토큰 사용량</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <LineChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(d) =>
                new Date(d).toLocaleDateString("ko-KR", {
                  month: "short",
                  day: "numeric",
                })
              }
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(d) =>
                    new Date(d).toLocaleDateString("ko-KR")
                  }
                />
              }
            />
            <Line
              type="monotone"
              dataKey="totalTokens"
              stroke="var(--color-totalTokens)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
