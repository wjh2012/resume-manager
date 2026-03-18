"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { toast } from "sonner"
import { CoverLetterStatus } from "@prisma/client"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

type SaveStatus = "idle" | "saving" | "saved" | "error"

const STATUS_TEXT: Record<SaveStatus, string> = {
  idle: "",
  saving: "저장 중\u2026",
  saved: "저장됨",
  error: "저장 실패",
}

const STATUS_COLOR: Record<SaveStatus, string> = {
  idle: "text-muted-foreground",
  saving: "text-muted-foreground",
  saved: "text-muted-foreground",
  error: "text-destructive",
}

interface CoverLetterEditorProps {
  coverLetterId: string
  content: string
  onContentChange: (content: string) => void
}

export function CoverLetterEditor({
  coverLetterId,
  content,
  onContentChange,
}: CoverLetterEditorProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [isCompleting, setIsCompleting] = useState(false)
  const contentRef = useRef(content)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  contentRef.current = content

  const save = useCallback(async (text: string) => {
    setSaveStatus("saving")
    try {
      const res = await fetch(`/api/cover-letters/${coverLetterId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      })

      if (!res.ok) throw new Error()

      setSaveStatus("saved")
    } catch {
      setSaveStatus("error")
      // 실패 시 3초 후 자동 재시도 1회
      retryTimerRef.current = setTimeout(async () => {
        setSaveStatus("saving")
        try {
          const res = await fetch(`/api/cover-letters/${coverLetterId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: contentRef.current }),
          })
          if (!res.ok) throw new Error()
          setSaveStatus("saved")
        } catch {
          setSaveStatus("error")
        }
      }, 3000)
    }
  }, [coverLetterId])

  // debounce 자동 저장
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      save(contentRef.current)
    }, 1500)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [content, save])

  // beforeunload 경고
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === "saving") {
        e.preventDefault()
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [saveStatus])

  // cleanup
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [])

  const handleComplete = useCallback(async () => {
    setIsCompleting(true)
    try {
      const res = await fetch(`/api/cover-letters/${coverLetterId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: CoverLetterStatus.COMPLETED }),
      })
      if (!res.ok) throw new Error()
      toast.success("자기소개서가 완료 처리되었습니다.")
    } catch {
      toast.error("완료 처리에 실패했습니다.")
    } finally {
      setIsCompleting(false)
    }
  }, [coverLetterId])

  const charCount = content.length

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-3">
          <Link
            href="/cover-letters"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            목록
          </Link>
          <h2 className="text-sm font-medium">에디터</h2>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">{charCount.toLocaleString()}자</span>
          <span aria-live="polite" className={STATUS_COLOR[saveStatus]}>
            {STATUS_TEXT[saveStatus]}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={handleComplete}
            disabled={isCompleting}
          >
            완료
          </Button>
        </div>
      </div>
      <div className="flex-1 p-4">
        <Textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="자기소개서 내용을 작성하세요. AI 채팅에서 '에디터에 반영' 버튼을 눌러 내용을 추가할 수도 있습니다."
          className="h-full min-h-0 resize-none border-0 p-4 shadow-none focus-visible:ring-offset-0 focus-visible:ring-1"
        />
      </div>
    </div>
  )
}
