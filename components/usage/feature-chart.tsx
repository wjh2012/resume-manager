"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

const FEATURE_LABELS: Record<string, string> = {
  COVER_LETTER: "자기소개서",
  INTERVIEW: "모의면접",
  INSIGHT: "인사이트",
  EMBEDDING: "임베딩",
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"]

interface FeatureChartProps {
  data: { feature: string; totalTokens: number; count: number }[]
}

export function FeatureChart({ data }: FeatureChartProps) {
  const chartData = data.map((d) => ({ name: FEATURE_LABELS[d.feature] ?? d.feature, value: d.totalTokens }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>기능별 사용 비중</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
