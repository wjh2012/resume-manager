"use client"

import Link from "next/link"
import { BookOpen, Pencil, Trash2 } from "lucide-react"

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

const METADATA_LABELS: Record<string, string> = {
  where: "환경",
  role: "역할",
  what: "행동",
  result: "성과",
  challenge: "도전",
  motivation: "동기",
  feeling: "느낀 점",
  lesson: "배운 점",
}

export interface CareerNoteCardData {
  id: string
  title: string
  content: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any
  status: string
  createdAt: string
  updatedAt: string
  sources: Array<{
    conversationId: string
    conversation: {
      id: string
      type: string
      coverLetterId: string | null
      interviewSessionId: string | null
    } | null
  }>
}

interface CareerNoteCardProps {
  note: CareerNoteCardData
  onEdit: (note: CareerNoteCardData) => void
  onDelete: (id: string) => void
  isDeleting: boolean
}

function getSourceLink(conversation: CareerNoteCardData["sources"][number]["conversation"]) {
  if (!conversation) return null
  if (conversation.type === "COVER_LETTER" && conversation.coverLetterId) {
    return { href: `/cover-letters/${conversation.coverLetterId}`, label: "자기소개서" }
  }
  if (conversation.type === "INTERVIEW" && conversation.interviewSessionId) {
    return { href: `/interviews/${conversation.interviewSessionId}`, label: "면접" }
  }
  return null
}

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + "..."
}

export function CareerNoteCard({ note, onEdit, onDelete, isDeleting }: CareerNoteCardProps) {
  const meta = note.metadata as Record<string, string | undefined> | null
  const metadataTags = meta
    ? Object.entries(METADATA_LABELS)
        .filter(([key]) => meta[key])
        .map(([key, label]) => ({ key, label, value: meta[key]! }))
    : []

  const sourceLinks = note.sources
    .map((s) => getSourceLink(s.conversation))
    .filter((link): link is NonNullable<typeof link> => link !== null)

  // Deduplicate source links by href
  const uniqueSourceLinks = sourceLinks.filter(
    (link, index, self) => self.findIndex((l) => l.href === link.href) === index,
  )

  return (
    <Card className="group relative">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen aria-hidden="true" className="text-muted-foreground h-4 w-4" />
            {uniqueSourceLinks.map((source) => (
              <Link
                key={source.href}
                href={source.href}
                className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
              >
                {source.label}에서 추출
              </Link>
            ))}
          </div>
        </div>
        <h3 className="text-sm font-semibold leading-tight">{note.title}</h3>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-3 text-sm whitespace-pre-wrap">
          {truncate(note.content, 200)}
        </p>
        {metadataTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {metadataTags.map((tag) => (
              <Badge key={tag.key} variant="outline" className="text-xs">
                {tag.label}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <div className="absolute right-2 top-2 flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
          aria-label="커리어노트 수정"
          onClick={(e) => { e.stopPropagation(); onEdit(note) }}
          onKeyDown={(e) => e.stopPropagation()}
          disabled={isDeleting}
        >
          <Pencil aria-hidden="true" className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="커리어노트 삭제"
              disabled={isDeleting}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>커리어노트 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                이 커리어노트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(note.id)}>
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  )
}
