"use client"

import Link from "next/link"
import { Pencil, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const CATEGORY_CONFIG = {
  strength: { label: "강점", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  experience: { label: "경험", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  motivation: { label: "동기", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  skill: { label: "기술", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  other: { label: "기타", className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
} as const

export interface InsightCardData {
  id: string
  category: string
  title: string
  content: string
  createdAt: string
  conversation: {
    id: string
    type: string
    coverLetterId: string | null
    interviewSessionId: string | null
  } | null
}

interface InsightCardProps {
  insight: InsightCardData
  onEdit: (insight: InsightCardData) => void
  onDelete: (id: string) => void
  isDeleting: boolean
}

function getSourceLink(conversation: InsightCardData["conversation"]) {
  if (!conversation) return null
  if (conversation.type === "COVER_LETTER" && conversation.coverLetterId) {
    return { href: `/cover-letters/${conversation.coverLetterId}`, label: "자기소개서" }
  }
  if (conversation.type === "INTERVIEW" && conversation.interviewSessionId) {
    return { href: `/interviews/${conversation.interviewSessionId}`, label: "면접" }
  }
  return null
}

export function InsightCard({ insight, onEdit, onDelete, isDeleting }: InsightCardProps) {
  const config = CATEGORY_CONFIG[insight.category as keyof typeof CATEGORY_CONFIG] ?? CATEGORY_CONFIG.other
  const source = getSourceLink(insight.conversation)

  return (
    <Card className="group relative">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={config.className}>
              {config.label}
            </Badge>
            {source && (
              <Link
                href={source.href}
                className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
              >
                {source.label}에서 추출
              </Link>
            )}
          </div>
        </div>
        <h3 className="text-sm font-semibold leading-tight">{insight.title}</h3>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm whitespace-pre-wrap">
          {insight.content}
        </p>
      </CardContent>
      <div
        className="absolute right-2 top-2 flex gap-1"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100"
          aria-label="인사이트 수정"
          onClick={() => onEdit(insight)}
          disabled={isDeleting}
        >
          <Pencil aria-hidden="true" className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100"
              aria-label="인사이트 삭제"
              disabled={isDeleting}
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>인사이트 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                이 인사이트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(insight.id)}>
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  )
}
