"use client"

import { useState, useCallback, useSyncExternalStore } from "react"
import type { UIMessage } from "ai"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CoverLetterEditor } from "./cover-letter-editor"
import { CoverLetterChat } from "./cover-letter-chat"
import type { ExternalDocumentItem } from "@/lib/external-documents/types"

const mobileMql =
  typeof window !== "undefined"
    ? window.matchMedia("(max-width: 767px)")
    : null

function subscribeMobile(cb: () => void) {
  mobileMql?.addEventListener("change", cb)
  return () => mobileMql?.removeEventListener("change", cb)
}

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
  externalDocuments: ExternalDocumentItem[]
  selectedExternalDocumentIds: string[]
}

export function CoverLetterWorkspace({
  coverLetterId,
  conversationId,
  initialContent,
  initialMessages,
  documents,
  selectedDocumentIds,
  externalDocuments,
  selectedExternalDocumentIds,
}: CoverLetterWorkspaceProps) {
  const [content, setContent] = useState(initialContent)
  const isMobile = useSyncExternalStore(
    subscribeMobile,
    () => window.innerWidth < 768,
    () => false,
  )

  const handleAppendToEditor = useCallback((text: string) => {
    setContent((prev) => (prev ? prev + "\n\n" + text : text))
  }, [])

  const editor = (
    <CoverLetterEditor
      coverLetterId={coverLetterId}
      content={content}
      onContentChange={setContent}
    />
  )

  const chat = (
    <CoverLetterChat
      coverLetterId={coverLetterId}
      conversationId={conversationId}
      initialMessages={initialMessages}
      documents={documents}
      initialSelectedDocIds={selectedDocumentIds}
      externalDocuments={externalDocuments}
      initialSelectedExtDocIds={selectedExternalDocumentIds}
      onAppendToEditor={handleAppendToEditor}
    />
  )

  if (isMobile) {
    return (
      <Tabs defaultValue="editor" className="flex h-full flex-col">
        <TabsList className="w-full shrink-0">
          <TabsTrigger value="editor" className="flex-1">에디터</TabsTrigger>
          <TabsTrigger value="chat" className="flex-1">AI 채팅</TabsTrigger>
        </TabsList>
        <TabsContent value="editor" className="mt-0 min-h-0 flex-1 overflow-hidden">
          {editor}
        </TabsContent>
        <TabsContent value="chat" className="mt-0 min-h-0 flex-1 overflow-hidden">
          {chat}
        </TabsContent>
      </Tabs>
    )
  }

  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full">
      <ResizablePanel defaultSize={50} minSize={30} className="overflow-hidden">
        {editor}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50} minSize={30} className="overflow-hidden">
        {chat}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
