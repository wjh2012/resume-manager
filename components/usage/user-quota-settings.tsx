"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Trash2, Plus } from "lucide-react"
import { toast } from "sonner"
import type { UserQuotaWithUsage } from "@/types/token-usage"

interface UserQuotaSettingsProps {
  quotas: UserQuotaWithUsage[]
  onRefresh: () => void
}

const LIMIT_LABELS: Record<string, string> = {
  TOKENS: "월간 토큰 제한",
  COST: "월간 비용 제한 ($)",
}

export function UserQuotaSettings({ quotas, onRefresh }: UserQuotaSettingsProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const tokenQuota = quotas.find((q) => q.limitType === "TOKENS")
  const costQuota = quotas.find((q) => q.limitType === "COST")

  async function handleCreate(limitType: "TOKENS" | "COST", limitValue: number) {
    setLoading(limitType)
    try {
      const res = await fetch("/api/user-quotas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limitType, limitValue }),
      })
      if (res.ok) {
        toast.success("자기 제한이 추가되었습니다.")
        onRefresh()
      } else {
        const { error } = await res.json()
        toast.error(error ?? "자기 제한 생성에 실패했습니다.")
      }
    } finally {
      setLoading(null)
    }
  }

  async function handleUpdate(id: string, data: { limitValue?: number; isActive?: boolean }) {
    setLoading(id)
    try {
      const res = await fetch(`/api/user-quotas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        toast.success("자기 제한이 수정되었습니다.")
        onRefresh()
      } else {
        const { error } = await res.json()
        toast.error(error ?? "자기 제한 수정에 실패했습니다.")
      }
    } finally {
      setLoading(null)
    }
  }

  async function handleDelete(id: string) {
    setLoading(id)
    try {
      const res = await fetch(`/api/user-quotas/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("자기 제한이 삭제되었습니다.")
        onRefresh()
      } else {
        const { error } = await res.json()
        toast.error(error ?? "자기 제한 삭제에 실패했습니다.")
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>자기 제한 설정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <QuotaRow
          label={LIMIT_LABELS.TOKENS}
          quota={tokenQuota}
          limitType="TOKENS"
          loading={loading}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
        <QuotaRow
          label={LIMIT_LABELS.COST}
          quota={costQuota}
          limitType="COST"
          loading={loading}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      </CardContent>
    </Card>
  )
}

interface QuotaRowProps {
  label: string
  quota: UserQuotaWithUsage | undefined
  limitType: "TOKENS" | "COST"
  loading: string | null
  onCreate: (limitType: "TOKENS" | "COST", limitValue: number) => void
  onUpdate: (id: string, data: { limitValue?: number; isActive?: boolean }) => void
  onDelete: (id: string) => void
}

function QuotaRow({ label, quota, limitType, loading, onCreate, onUpdate, onDelete }: QuotaRowProps) {
  const [editValue, setEditValue] = useState("")

  if (!quota) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Input
          type="number"
          placeholder="제한값 입력"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-36"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={!editValue || loading === limitType}
          onClick={() => {
            onCreate(limitType, Number(editValue))
            setEditValue("")
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          추가
        </Button>
      </div>
    )
  }

  const pct = quota.limitValue > 0 ? Math.min((quota.currentUsage / quota.limitValue) * 100, 100) : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex items-center gap-2">
          <Switch
            checked={quota.isActive}
            disabled={loading === quota.id}
            onCheckedChange={(checked) => onUpdate(quota.id, { isActive: checked })}
          />
          <Button
            size="icon"
            variant="ghost"
            disabled={loading === quota.id}
            onClick={() => onDelete(quota.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {quota.isActive && (
        <>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{quota.currentUsage.toLocaleString()} / {quota.limitValue.toLocaleString()}</span>
          </div>
          <Progress value={pct} />
        </>
      )}
      <div className="flex items-center gap-2">
        <Input
          key={quota.limitValue}
          type="number"
          defaultValue={quota.limitValue}
          className="w-36"
          onBlur={(e) => {
            const val = Number(e.target.value)
            if (val > 0 && val !== quota.limitValue) {
              onUpdate(quota.id, { limitValue: val })
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur()
            }
          }}
        />
      </div>
    </div>
  )
}
