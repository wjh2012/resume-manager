import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { RecentActivity } from "@/lib/dashboard/service"

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  })
}

function interviewStatusLabel(status: string): string {
  return status === "COMPLETED" ? "완료" : "진행 중"
}

interface RecentActivitySectionProps {
  activity: RecentActivity
}

export function RecentActivitySection({ activity }: RecentActivitySectionProps) {
  const hasAny =
    activity.coverLetters.length > 0 ||
    activity.interviews.length > 0 ||
    activity.insights.length > 0

  if (!hasAny) {
    return (
      <p className="text-muted-foreground py-8 text-center">
        아직 활동이 없습니다
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* 최근 자기소개서 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">최근 자기소개서</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activity.coverLetters.length === 0 ? (
            <p className="text-muted-foreground text-sm">없음</p>
          ) : (
            activity.coverLetters.map((cl) => (
              <Link
                key={cl.id}
                href={`/cover-letters/${cl.id}`}
                className="hover:bg-muted flex items-center justify-between rounded-md px-2 py-1.5 transition-colors"
              >
                <span className="truncate text-sm font-medium">{cl.title}</span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {formatDate(cl.updatedAt)}
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      {/* 최근 모의면접 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">최근 모의면접</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activity.interviews.length === 0 ? (
            <p className="text-muted-foreground text-sm">없음</p>
          ) : (
            activity.interviews.map((iv) => (
              <Link
                key={iv.id}
                href={`/interviews/${iv.id}`}
                className="hover:bg-muted flex items-center justify-between rounded-md px-2 py-1.5 transition-colors"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium">{iv.title}</span>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {interviewStatusLabel(iv.status)}
                  </Badge>
                </div>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {formatDate(iv.updatedAt)}
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      {/* 최근 인사이트 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">최근 인사이트</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activity.insights.length === 0 ? (
            <p className="text-muted-foreground text-sm">없음</p>
          ) : (
            activity.insights.map((ins) => (
              <div key={ins.id} className="space-y-1 rounded-md px-2 py-1.5">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {ins.category}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {formatDate(ins.updatedAt)}
                  </span>
                </div>
                <p className="text-muted-foreground line-clamp-1 text-sm">
                  {ins.content}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
