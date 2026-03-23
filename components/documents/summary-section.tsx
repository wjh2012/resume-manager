"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

interface SummarySectionProps {
  documentId: string
  initialSummary: string | null
}

export function SummarySection({
  documentId,
  initialSummary,
}: SummarySectionProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerateSummary = useCallback(async () => {
    setIsGenerating(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/summary`, {
        method: "POST",
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "요약 생성에 실패했습니다.")
      }

      toast.success("요약이 생성되었습니다.")
      router.refresh()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "요약 생성에 실패했습니다."
      toast.error(message)
    } finally {
      setIsGenerating(false)
    }
  }, [documentId, router])

  return (
    <div className="shrink-0 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">요약</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerateSummary}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />
          )}
          {initialSummary ? "요약 재생성" : "요약 생성"}
        </Button>
      </div>
      <div className="mt-2">
        {initialSummary ? (
          <p className="text-sm leading-relaxed">{initialSummary}</p>
        ) : (
          <p className="text-muted-foreground text-sm">
            요약이 생성되지 않았습니다.
          </p>
        )}
      </div>
    </div>
  )
}
