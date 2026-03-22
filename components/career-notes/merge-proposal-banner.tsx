"use client"

import { AlertCircle } from "lucide-react"

interface MergeProposalBannerProps {
  count: number
  onViewProposals: () => void
}

export function MergeProposalBanner({ count, onViewProposals }: MergeProposalBannerProps) {
  if (count === 0) return null

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="text-sm text-amber-800 dark:text-amber-200">
          {count}개의 병합 제안이 있습니다
        </span>
      </div>
      <button
        onClick={onViewProposals}
        className="text-sm font-medium text-amber-700 underline-offset-4 hover:underline dark:text-amber-300"
      >
        확인하기
      </button>
    </div>
  )
}
