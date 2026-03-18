"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, Loader2, Zap } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
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

type KeyStatus = "idle" | "validating" | "valid" | "invalid"

export function AiSettingsForm({ initialSettings }: AiSettingsFormProps) {
  const [provider, setProvider] = useState<AIProvider>(initialSettings.provider)
  const [model, setModel] = useState(initialSettings.model)
  const [apiKey, setApiKey] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [keyStatus, setKeyStatus] = useState<KeyStatus>("idle")

  const models = PROVIDER_MODELS[provider]
  const hasNewApiKey = apiKey.trim().length > 0
  // 새 키를 입력했으면 검증 통과해야 저장 가능, 키 미입력이면 바로 저장 가능
  const canSave = !hasNewApiKey || keyStatus === "valid"

  const handleProviderChange = (value: string) => {
    const newProvider = value as AIProvider
    setProvider(newProvider)
    setModel(PROVIDER_MODELS[newProvider][0].value)
    // 제공자 변경 시 검증 초기화
    if (hasNewApiKey) {
      setKeyStatus("idle")
    }
  }

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value)
    // 키 변경 시 검증 초기화
    if (keyStatus !== "idle") {
      setKeyStatus("idle")
    }
  }

  const handleValidate = async () => {
    if (!apiKey.trim()) return
    setKeyStatus("validating")

    try {
      const res = await fetch("/api/settings/ai/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: apiKey.trim() }),
      })

      const data = await res.json()

      if (res.ok && data.valid) {
        setKeyStatus("valid")
        toast.success("API 키가 유효합니다.")
      } else {
        setKeyStatus("invalid")
        toast.error(data.error || "유효하지 않은 API 키입니다.")
      }
    } catch {
      setKeyStatus("invalid")
      toast.error("API 키 검증에 실패했습니다.")
    }
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
      setKeyStatus("idle")
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
            <Select key={provider} value={model} onValueChange={setModel}>
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
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">API 키</label>
              {initialSettings.hasApiKey && (
                <Badge variant="secondary">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  설정됨
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                type="password"
                value={apiKey}
                onChange={handleApiKeyChange}
                placeholder={
                  initialSettings.hasApiKey
                    ? "변경하려면 새 키를 입력하세요"
                    : "API 키를 입력하세요"
                }
                className="flex-1"
              />
              <Button
                type="button"
                variant={keyStatus === "valid" ? "outline" : "secondary"}
                disabled={!hasNewApiKey || keyStatus === "validating"}
                onClick={handleValidate}
              >
                {keyStatus === "validating" && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                )}
                {keyStatus === "valid" && (
                  <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-500" />
                )}
                {keyStatus !== "validating" && keyStatus !== "valid" && (
                  <Zap className="mr-1.5 h-4 w-4" />
                )}
                {keyStatus === "validating"
                  ? "검증 중"
                  : keyStatus === "valid"
                    ? "검증 완료"
                    : "연결 테스트"}
              </Button>
            </div>
            {keyStatus === "invalid" && (
              <p className="text-sm text-destructive">
                API 키 검증에 실패했습니다. 키를 확인 후 다시 시도해주세요.
              </p>
            )}
          </div>

          <Button type="submit" disabled={!canSave || isSaving}>
            {isSaving ? "저장 중..." : "저장"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
