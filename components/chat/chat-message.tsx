"use client"

import { memo } from "react"
import type { UIMessage } from "ai"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

const remarkPlugins = [remarkGfm]

const TOOL_LOADING_LABELS: Record<string, string> = {
  readDocument: "문서를 읽고 있습니다...",
  readCareerNote: "커리어노트를 읽고 있습니다...",
  saveCareerNote: "커리어노트를 저장하고 있습니다...",
}

interface ChatMessageProps {
  message: UIMessage
}

function extractTextFromParts(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("")
}

function ToolInvocationIndicators({ message }: { message: UIMessage }) {
  const activeTools = message.parts.filter(
    (part) =>
      part.type === "tool-invocation" &&
      part.toolInvocation.state === "call",
  )

  if (activeTools.length === 0) return null

  return (
    <>
      {activeTools.map((part) => {
        if (part.type !== "tool-invocation") return null
        const { toolName } = part.toolInvocation
        const label = TOOL_LOADING_LABELS[toolName] ?? "처리 중..."
        return (
          <div
            key={part.toolInvocation.toolCallId}
            className="text-muted-foreground animate-pulse text-sm"
          >
            {label}
          </div>
        )
      })}
    </>
  )
}

export const ChatMessage = memo(function ChatMessage({
  message,
}: ChatMessageProps) {
  const isUser = message.role === "user"
  const text = extractTextFromParts(message)
  const hasActiveTools = message.parts.some(
    (part) =>
      part.type === "tool-invocation" &&
      part.toolInvocation.state === "call",
  )

  if (!text && !hasActiveTools) return null

  return (
    <div
      className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm">{text}</p>
        ) : (
          <>
            {text && (
              <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                <ReactMarkdown remarkPlugins={remarkPlugins}>{text}</ReactMarkdown>
              </div>
            )}
            <ToolInvocationIndicators message={message} />
          </>
        )}
      </div>
    </div>
  )
})
