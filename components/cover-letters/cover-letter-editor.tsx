"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Textarea } from "@/components/ui/textarea"

type SaveStatus = "idle" | "saving" | "saved" | "error"

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

  const charCount = content.length

  const statusText: Record<SaveStatus, string> = {
    idle: "",
    saving: "저장 중...",
    saved: "저장됨",
    error: "저장 실패",
  }

  const statusColor: Record<SaveStatus, string> = {
    idle: "text-muted-foreground",
    saving: "text-muted-foreground",
    saved: "text-muted-foreground",
    error: "text-destructive",
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h2 className="text-sm font-medium">에디터</h2>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">{charCount.toLocaleString()}자</span>
          {saveStatus !== "idle" && (
            <span className={statusColor[saveStatus]}>
              {statusText[saveStatus]}
            </span>
          )}
        </div>
      </div>
      <div className="flex-1 p-4">
        <Textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="자기소개서 내용을 작성하세요. AI 채팅에서 '에디터에 반영' 버튼을 눌러 내용을 추가할 수도 있습니다."
          className="h-full min-h-0 resize-none border-0 p-0 shadow-none focus-visible:ring-0"
        />
      </div>
    </div>
  )
}
