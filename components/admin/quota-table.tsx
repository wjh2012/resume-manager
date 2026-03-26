"use client"

import { useState } from "react"
import { toast } from "sonner"
import type { QuotaEntry } from "@/types/admin"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface QuotaTableProps {
  data: QuotaEntry[]
  onChanged: () => void
}

const LIMIT_LABELS: Record<string, string> = {
  TOKENS: "토큰",
  COST: "비용",
  REQUESTS: "요청 횟수",
}

const PERIOD_LABELS: Record<string, string> = {
  DAILY: "일간",
  MONTHLY: "월간",
}

export function QuotaTable({ data, onChanged }: QuotaTableProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<QuotaEntry | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState("")
  const [editIsActive, setEditIsActive] = useState(true)
  const [editKey, setEditKey] = useState(0)

  function openEdit(quota: QuotaEntry) {
    setEditTarget(quota)
    setEditIsActive(quota.isActive)
    setEditKey((k) => k + 1)
    setEditError("")
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editTarget) return
    setEditSubmitting(true)
    setEditError("")

    const form = new FormData(e.currentTarget)
    const body = {
      limitValue: Number(form.get("limitValue")),
      isActive: editIsActive,
    }

    try {
      const res = await fetch(`/api/admin/quotas/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "수정에 실패했습니다.")
      }
      setEditTarget(null)
      onChanged()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "오류가 발생했습니다.")
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    const form = new FormData(e.currentTarget)
    const body = {
      userId: form.get("userId") as string,
      limitType: form.get("limitType") as string,
      limitValue: Number(form.get("limitValue")),
      period: form.get("period") as string,
      isActive: true,
    }

    try {
      const res = await fetch("/api/admin/quotas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "생성에 실패했습니다.")
      }
      setOpen(false)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/quotas/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "삭제에 실패했습니다.")
      }
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제에 실패했습니다.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Quota 목록</CardTitle>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError(""); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Quota 추가
            </Button>
          </DialogTrigger>
          <DialogContent key={String(open)}>
            <DialogHeader>
              <DialogTitle>Quota 추가</DialogTitle>
              <DialogDescription>사용자별 사용량 한도를 설정합니다.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userId">사용자 ID</Label>
                <Input
                  id="userId"
                  name="userId"
                  required
                  placeholder="UUID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="limitType">제한 유형</Label>
                <Select name="limitType" required>
                  <SelectTrigger>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOKENS">토큰</SelectItem>
                    <SelectItem value="COST">비용</SelectItem>
                    <SelectItem value="REQUESTS">요청 횟수</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="limitValue">제한 값</Label>
                <Input
                  id="limitValue"
                  name="limitValue"
                  type="number"
                  min="1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period">기간</Label>
                <Select name="period" required>
                  <SelectTrigger>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">일간</SelectItem>
                    <SelectItem value="MONTHLY">월간</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "생성 중..." : "생성"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이메일</TableHead>
              <TableHead>이름</TableHead>
              <TableHead>제한 유형</TableHead>
              <TableHead className="text-right">제한 값</TableHead>
              <TableHead>기간</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground"
                >
                  등록된 Quota가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              data.map((quota) => (
                <TableRow key={quota.id}>
                  <TableCell>{quota.user.email}</TableCell>
                  <TableCell>{quota.user.name ?? "-"}</TableCell>
                  <TableCell>
                    {LIMIT_LABELS[quota.limitType] ?? quota.limitType}
                  </TableCell>
                  <TableCell className="text-right">
                    {quota.limitValue.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {PERIOD_LABELS[quota.period] ?? quota.period}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        quota.isActive
                          ? "text-green-600 dark:text-green-400"
                          : "text-muted-foreground"
                      }
                    >
                      {quota.isActive ? "활성" : "비활성"}
                    </span>
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(quota)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={deletingId === quota.id}
                      onClick={() => handleDelete(quota.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog open={editTarget !== null} onOpenChange={(v) => { if (!v) { setEditTarget(null); setEditError(""); } }}>
        <DialogContent key={editKey}>
          <DialogHeader>
            <DialogTitle>Quota 수정</DialogTitle>
            <DialogDescription>
              {editTarget?.user.email} — {LIMIT_LABELS[editTarget?.limitType ?? ""] ?? editTarget?.limitType} ({PERIOD_LABELS[editTarget?.period ?? ""] ?? editTarget?.period})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-limitValue">제한 값</Label>
              <Input
                id="edit-limitValue"
                name="limitValue"
                type="number"
                min="1"
                required
                defaultValue={editTarget?.limitValue}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="edit-isActive"
                checked={editIsActive}
                onCheckedChange={setEditIsActive}
              />
              <Label htmlFor="edit-isActive">활성</Label>
            </div>
            {editError && (
              <p className="text-sm text-destructive">{editError}</p>
            )}
            <Button type="submit" disabled={editSubmitting} className="w-full">
              {editSubmitting ? "수정 중..." : "수정"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
