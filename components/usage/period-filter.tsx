"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PeriodFilterProps {
  value: string
  onChange: (period: string) => void
}

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList>
        <TabsTrigger value="7d">7일</TabsTrigger>
        <TabsTrigger value="30d">30일</TabsTrigger>
        <TabsTrigger value="90d">90일</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
