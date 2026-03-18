"use client"

import type { ReactNode } from "react"
import type { UIMessage } from "ai"
import { ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useChatScroll } from "@/hooks/use-chat-scroll"
import { ChatMessage } from "./chat-message"
import { ChatLoading } from "./chat-loading"

interface ChatContainerProps {
  messages: UIMessage[]
  isLoading: boolean
  children: ReactNode
}

export function ChatContainer({
  messages,
  isLoading,
  children,
}: ChatContainerProps) {
  const { scrollRef, isAtBottom, scrollToBottom } = useChatScroll([
    messages.length,
    isLoading,
  ])

  return (
    <div className="flex h-full flex-col">
      {/* 메시지 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 p-4">
          {messages.length === 0 && (
            <div className="flex h-[50vh] items-center justify-center">
              <p className="text-muted-foreground text-sm">
                메시지를 입력하여 대화를 시작하세요.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
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
          </Button>
        </div>

        {/* 입력 영역 */}
        <div className="border-t bg-background p-4">
          <div className="mx-auto max-w-3xl">{children}</div>
        </div>
      </div>
    </div>
  )
}
