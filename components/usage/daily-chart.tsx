"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

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
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} />
            <YAxis />
            <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString("ko-KR")} />
            <Line type="monotone" dataKey="totalTokens" stroke="hsl(var(--primary))" name="토큰" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
