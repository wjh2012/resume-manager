"use client"

import { useState, useCallback } from "react"
import type { UIMessage } from "ai"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { CoverLetterEditor } from "./cover-letter-editor"
import { CoverLetterChat } from "./cover-letter-chat"

interface DocumentItem {
  id: string
  title: string
  type: string
}

interface CoverLetterWorkspaceProps {
  coverLetterId: string
  conversationId: string
  initialContent: string
  initialMessages: UIMessage[]
  documents: DocumentItem[]
  selectedDocumentIds: string[]
}

export function CoverLetterWorkspace({
  coverLetterId,
  conversationId,
  initialContent,
  initialMessages,
  documents,
  selectedDocumentIds,
}: CoverLetterWorkspaceProps) {
  const [content, setContent] = useState(initialContent)

  const handleAppendToEditor = useCallback((text: string) => {
    setContent((prev) => (prev ? prev + "\n\n" + text : text))
  }, [])

  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full">
      <ResizablePanel defaultSize={50} minSize={30} className="overflow-hidden">
        <CoverLetterEditor
          coverLetterId={coverLetterId}
          content={content}
          onContentChange={setContent}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50} minSize={30} className="overflow-hidden">
        <CoverLetterChat
          coverLetterId={coverLetterId}
          conversationId={conversationId}
          initialMessages={initialMessages}
          documents={documents}
          initialSelectedDocIds={selectedDocumentIds}
          onAppendToEditor={handleAppendToEditor}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
