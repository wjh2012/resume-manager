"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface ModelChartProps {
  data: { model: string; totalTokens: number; totalCost: number }[]
}

export function ModelChart({ data }: ModelChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>모델별 사용량</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="model" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="totalTokens" fill="hsl(var(--primary))" name="토큰" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
