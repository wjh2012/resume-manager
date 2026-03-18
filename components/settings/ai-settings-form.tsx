"use client"

import { useState } from "react"
import { toast } from "sonner"
import { PROVIDER_MODELS, type AIProvider } from "@/types/ai"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AiSettingsFormProps {
  initialSettings: {
    provider: AIProvider
    model: string
    hasApiKey: boolean
  }
}

const PROVIDER_LABELS: Record<AIProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
}

export function AiSettingsForm({ initialSettings }: AiSettingsFormProps) {
  const [provider, setProvider] = useState<AIProvider>(initialSettings.provider)
  const [model, setModel] = useState(initialSettings.model)
  const [apiKey, setApiKey] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const models = PROVIDER_MODELS[provider]

  const handleProviderChange = (value: string) => {
    const newProvider = value as AIProvider
    setProvider(newProvider)
    setModel(PROVIDER_MODELS[newProvider][0].value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const body: { provider: string; model: string; apiKey?: string } = {
        provider,
        model,
      }

      // API 키 미입력 시 요청에서 제외 (기존 키 유지)
      if (apiKey.trim()) {
        body.apiKey = apiKey.trim()
      }

      const res = await fetch("/api/settings/ai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "설정 저장에 실패했습니다.")
      }

      setApiKey("")
      toast.success("AI 설정이 저장되었습니다.")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "설정 저장에 실패했습니다."
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI 제공자 설정</CardTitle>
        <CardDescription>
          자기소개서 작성, 모의면접 등에 사용할 AI 모델을 설정합니다
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">제공자</label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PROVIDER_LABELS) as AIProvider[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {PROVIDER_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">모델</label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">API 키</label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                initialSettings.hasApiKey
                  ? "설정됨 (변경하려면 새 키를 입력하세요)"
                  : "API 키를 입력하세요"
              }
            />
          </div>

          <Button type="submit" disabled={isSaving}>
            {isSaving ? "저장 중..." : "저장"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
