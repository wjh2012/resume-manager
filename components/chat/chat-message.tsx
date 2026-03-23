"use client"

import { memo } from "react"
import type { UIMessage } from "ai"
import { isToolUIPart, getToolName } from "ai"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

const remarkPlugins = [remarkGfm]

function extractTitleFromOutput(output: unknown): string {
  if (typeof output !== "string") return ""
  const match = output.match(/^\[(.+?)\]/)
  return match?.[1] ?? ""
}

function getToolLabel(
  toolName: string,
  input: Record<string, unknown> | undefined,
  output: unknown,
  done: boolean,
) {
  const title = (input?.title as string) || extractTitleFromOutput(output) || ""
  const isUpdate = !!input?.careerNoteId

  switch (toolName) {
    case "readDocument":
      return done && title ? `문서를 읽었습니다: ${title}` : title ? `문서를 읽고 있습니다: ${title}...` : "문서를 읽고 있습니다..."
    case "readCareerNote":
      return done && title ? `커리어노트를 읽었습니다: ${title}` : title ? `커리어노트를 읽고 있습니다: ${title}...` : "커리어노트를 읽고 있습니다..."
    case "saveCareerNote":
      if (done) return isUpdate ? `커리어노트를 갱신했습니다: ${title}` : `커리어노트를 저장했습니다: ${title}`
      return isUpdate ? `커리어노트를 갱신하고 있습니다: ${title}` : `커리어노트를 저장하고 있습니다: ${title}`
    default:
      return done ? "완료" : "처리 중..."
  }
}

/** Tool parts that are still waiting for output */
function isActiveToolPart(part: UIMessage["parts"][number]): boolean {
  return (
    isToolUIPart(part) &&
    part.state !== "output-available" &&
    part.state !== "output-error" &&
    part.state !== "output-denied"
  )
}

function isCompletedToolPart(part: UIMessage["parts"][number]): boolean {
  return isToolUIPart(part) && part.state === "output-available"
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
  const activeTools = message.parts.filter(isActiveToolPart)
  const completedTools = message.parts.filter(isCompletedToolPart)

  if (activeTools.length === 0 && completedTools.length === 0) return null

  return (
    <div className="mt-1.5 space-y-0.5">
      {completedTools.map((part) => {
        if (!isToolUIPart(part)) return null
        const toolName = getToolName(part)
        const input = "input" in part ? (part.input as Record<string, unknown>) : undefined
        const output = "output" in part ? part.output : undefined
        const label = getToolLabel(toolName, input, output, true)
        return (
          <div
            key={part.toolCallId}
            className="text-muted-foreground text-xs"
          >
            ✓ {label}
          </div>
        )
      })}
      {activeTools.map((part) => {
        if (!isToolUIPart(part)) return null
        const toolName = getToolName(part)
        const input = "input" in part ? (part.input as Record<string, unknown>) : undefined
        const label = getToolLabel(toolName, input, undefined, false)
        return (
          <div
            key={part.toolCallId}
            className="text-muted-foreground animate-pulse text-sm"
          >
            {label}
          </div>
        )
      })}
    </div>
  )
}

export const ChatMessage = memo(function ChatMessage({
  message,
}: ChatMessageProps) {
  const isUser = message.role === "user"
  const text = extractTextFromParts(message)
  const hasActiveTools = message.parts.some(isActiveToolPart)
  const hasCompletedTools = message.parts.some(isCompletedToolPart)

  if (!text && !hasActiveTools && !hasCompletedTools) return null

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
