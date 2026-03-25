// lib/ai/messages.ts
import type { UIMessage } from "ai"

/**
 * Extracts the plain-text content from the last message in a UIMessage array.
 * Prefers structured `parts` (text nodes) over the legacy `content` string.
 */
export function extractLastMessageContent(messages: UIMessage[]): string {
  const lastMessage = messages[messages.length - 1]
  return (
    lastMessage.parts
      ?.filter((p: { type: string }) => p.type === "text")
      .map((p: { text?: string }) => p.text ?? "")
      .join("") ||
    lastMessage.content ||
    ""
  )
}
