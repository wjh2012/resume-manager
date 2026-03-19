// components/interviews/interview-chat.tsx
"use client"

import { useEffect, useRef, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { ChevronLeft, Lightbulb, Loader2, Square } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { useChatScroll } from "@/hooks/use-chat-scroll"
import { ChatMessage, ChatInput, ChatLoading } from "@/components/chat"

interface InterviewChatProps {
  sessionId: string
  conversationId: string
  title: string
  companyName?: string | null
  position?: string | null
  initialMessages: UIMessage[]
  isCompleted: boolean
}

export function InterviewChat({
  sessionId,
  conversationId,
  title,
  companyName,
  position,
  initialMessages,
  isCompleted,
}: InterviewChatProps) {
  const router = useRouter()
  const [isCompleting, setIsCompleting] = useState(false)
  const [completed, setCompleted] = useState(isCompleted)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractOnComplete, setExtractOnComplete] = useState(true)
  const hasSentInitialRef = useRef(false)
  const [input, setInput] = useState("")

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat/interview",
        body: () => ({ conversationId, interviewSessionId: sessionId }),
      }),
    [conversationId, sessionId],
  )

  const { messages, sendMessage, status } = useChat({
    id: conversationId,
    transport,
    messages: initialMessages,
    onError: (error) => {
      toast.error(error.message || "응답 생성에 실패했습니다.")
    },
  })

  const isLoading = status === "submitted" || status === "streaming"

  // 메시지가 없으면 면접 시작 메시지 자동 전송
  useEffect(() => {
    if (hasSentInitialRef.current) return
    if (initialMessages.length > 0) return
    if (completed) return
    hasSentInitialRef.current = true
    sendMessage({ text: "면접을 시작합니다." })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { scrollRef, isAtBottom, scrollToBottom } = useChatScroll([messages.length, isLoading])

  const handleSend = () => {
    if (!input.trim() || isLoading || completed) return
    sendMessage({ text: input.trim() })
    setInput("")
  }

  const handleExtractInsights = async () => {
    setIsExtracting(true)
    try {
      const res = await fetch("/api/insights/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "인사이트 추출에 실패했습니다.")
      }
      toast.success(`${data.insights.length}개의 인사이트가 추출되었습니다.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "인사이트 추출에 실패했습니다."
      toast.error(message)
    } finally {
      setIsExtracting(false)
    }
  }

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      const res = await fetch(`/api/interviews/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "종료에 실패했습니다.")
      }

      setCompleted(true)
      toast.success("면접이 종료되었습니다.")
      router.refresh()
      if (extractOnComplete) {
        await handleExtractInsights()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "종료에 실패했습니다."
      toast.error(message)
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/interviews"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            목록
          </Link>
          <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold">{title}</h1>
            <Badge variant={completed ? "secondary" : "default"}>
              {completed ? "종료됨" : "진행중"}
            </Badge>
          </div>
          {(companyName || position) && (
            <p className="text-sm text-muted-foreground">
              {[companyName, position].filter(Boolean).join(" · ")}
            </p>
          )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={isExtracting || messages.length === 0}
                aria-label="인사이트 추출"
              >
                {isExtracting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Lightbulb className="h-3.5 w-3.5" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>인사이트 추출</AlertDialogTitle>
                <AlertDialogDescription>
                  이 대화에서 인사이트를 추출합니다. 이미 추출된 인사이트가 있으면 수동 편집 내용을 포함하여 모두 삭제 후 다시 추출됩니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={handleExtractInsights}>추출하기</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {!completed && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isCompleting}>
                <Square className="mr-2 h-3.5 w-3.5" />
                면접 종료
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>면접을 종료하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>
                  종료 후에는 채팅을 계속할 수 없습니다. 면접 기록은 유지됩니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex items-center space-x-2 mt-4">
                <Checkbox
                  id="extract-insights"
                  checked={extractOnComplete}
                  onCheckedChange={(checked) => setExtractOnComplete(checked === true)}
                />
                <label htmlFor="extract-insights" className="text-sm">
                  면접 종료 후 인사이트 자동 추출
                </label>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={handleComplete}>종료</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          )}
        </div>
      </div>

      {/* 채팅 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {isLoading && <ChatLoading />}
        </div>
      </div>

      {/* 스크롤 버튼 */}
      {!isAtBottom && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
          <Button size="sm" variant="outline" onClick={scrollToBottom}>
            아래로
          </Button>
        </div>
      )}

      {/* 입력 영역 */}
      <div className="border-t px-6 py-4">
        <div className="mx-auto max-w-3xl">
          {completed ? (
            <p className="text-center text-sm text-muted-foreground">
              종료된 면접입니다. 새 면접을 시작하려면 목록으로 돌아가세요.
            </p>
          ) : (
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={handleSend}
              isLoading={isLoading}
              placeholder="답변을 입력하세요..."
            />
          )}
        </div>
      </div>
    </div>
  )
}
