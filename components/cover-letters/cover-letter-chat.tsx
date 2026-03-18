"use client"

import { useState, useCallback, useRef, useMemo } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { ArrowDown, ClipboardPaste, FileText } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useChatScroll } from "@/hooks/use-chat-scroll"
import { ChatMessage, ChatInput, ChatLoading } from "@/components/chat"

interface DocumentItem {
  id: string
  title: string
  type: string
}

interface CoverLetterChatProps {
  coverLetterId: string
  conversationId: string
  initialMessages: UIMessage[]
  documents: DocumentItem[]
  initialSelectedDocIds: string[]
  onAppendToEditor: (text: string) => void
}

function extractTextFromMessage(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("")
}

export function CoverLetterChat({
  coverLetterId,
  conversationId,
  initialMessages,
  documents,
  initialSelectedDocIds,
  onAppendToEditor,
}: CoverLetterChatProps) {
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(initialSelectedDocIds)
  const [isUpdatingDocs, setIsUpdatingDocs] = useState(false)
  const [input, setInput] = useState("")

  // useRef로 최신 selectedDocIds를 body에 반영
  const selectedDocIdsRef = useRef(selectedDocIds)
  selectedDocIdsRef.current = selectedDocIds

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat/cover-letter",
        body: () => ({
          conversationId,
          coverLetterId,
          selectedDocumentIds: selectedDocIdsRef.current,
        }),
      }),
    [conversationId, coverLetterId],
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

  const { scrollRef, isAtBottom, scrollToBottom } = useChatScroll([
    messages.length,
    isLoading,
  ])

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput("")
  }, [input, isLoading, sendMessage])

  const handleDocToggle = useCallback(
    async (docId: string) => {
      const newIds = selectedDocIds.includes(docId)
        ? selectedDocIds.filter((id) => id !== docId)
        : [...selectedDocIds, docId]

      setIsUpdatingDocs(true)
      try {
        const res = await fetch(`/api/cover-letters/${coverLetterId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentIds: newIds }),
        })

        if (!res.ok) throw new Error()

        setSelectedDocIds(newIds)
      } catch {
        toast.error("참고 문서 변경에 실패했습니다.")
      } finally {
        setIsUpdatingDocs(false)
      }
    },
    [selectedDocIds, coverLetterId],
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h2 className="text-sm font-medium">AI 채팅</h2>
        {documents.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                <FileText aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
                참고 문서 ({selectedDocIds.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-2">
              <div className="space-y-1">
                {documents.map((doc) => (
                  <label
                    key={doc.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                  >
                    <Checkbox
                      checked={selectedDocIds.includes(doc.id)}
                      onCheckedChange={() => handleDocToggle(doc.id)}
                      disabled={isUpdatingDocs}
                    />
                    <span className="line-clamp-1">{doc.title}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* 메시지 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 p-4">
          {messages.length === 0 && (
            <div className="flex h-[50vh] items-center justify-center">
              <p className="text-muted-foreground text-center text-sm">
                자기소개서 작성에 대해 질문하거나,
                <br />
                초안 작성을 요청해보세요.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id}>
              <ChatMessage message={message} />
              {message.role === "assistant" && extractTextFromMessage(message) && (
                <div className="mt-1 flex justify-start pl-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground h-7 text-xs"
                    onClick={() => onAppendToEditor(extractTextFromMessage(message))}
                  >
                    <ClipboardPaste aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
                    에디터에 반영
                  </Button>
                </div>
              )}
            </div>
          ))}

          {isLoading && <ChatLoading />}
        </div>
      </div>

      {/* 하단 스크롤 버튼 */}
      <div className="relative">
        <div
          className={cn(
            "absolute -top-12 left-1/2 -translate-x-1/2 transition-opacity",
            isAtBottom ? "pointer-events-none opacity-0" : "opacity-100",
          )}
        >
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full shadow-md"
            onClick={scrollToBottom}
          >
            <ArrowDown className="h-4 w-4" />
            <span className="sr-only">맨 아래로 스크롤</span>
          </Button>
        </div>

        {/* 입력 영역 */}
        <div className="border-t bg-background p-4">
          <div className="mx-auto max-w-3xl">
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              placeholder="자기소개서에 대해 질문하세요..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}
