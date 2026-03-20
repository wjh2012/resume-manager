import { redirect } from "next/navigation"
import {
  FileText,
  PenTool,
  MessageSquare,
  Lightbulb,
  FileCheck,
} from "lucide-react"
import { getAuthUser } from "@/lib/supabase/user"
import { getDashboardStats, getRecentActivity } from "@/lib/dashboard/service"
import { StatCard } from "@/components/dashboard/stat-card"
import { QuickActionCard } from "@/components/dashboard/quick-action-card"
import { RecentActivitySection } from "@/components/dashboard/recent-activity"

export default async function DashboardPage() {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const [stats, activity] = await Promise.all([
    getDashboardStats(user.id),
    getRecentActivity(user.id),
  ])

  return (
    <div className="space-y-8">
      {/* 통계 카드 */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">전체 현황</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatCard icon={FileText} value={stats.documents} label="업로드한 문서" href="/documents" />
          <StatCard icon={PenTool} value={stats.coverLetters} label="자기소개서" href="/cover-letters" />
          <StatCard icon={MessageSquare} value={stats.interviews} label="모의면접" href="/interviews" />
          <StatCard icon={Lightbulb} value={stats.insights} label="인사이트" href="/insights" />
          <StatCard icon={FileCheck} value={stats.resumes} label="이력서" href="/resumes" />
        </div>
      </section>

      {/* 빠른 접근 */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">빠른 시작</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <QuickActionCard
            icon={PenTool}
            title="새 자기소개서 작성"
            description="AI와 함께 자기소개서를 작성합니다"
            href="/cover-letters/new"
          />
          <QuickActionCard
            icon={MessageSquare}
            title="모의면접 시작"
            description="AI 면접관과 실전 연습을 합니다"
            href="/interviews/new"
          />
          <QuickActionCard
            icon={FileCheck}
            title="이력서 작성"
            description="이력서를 작성하고 PDF로 내보냅니다"
            href="/resumes/new"
          />
        </div>
      </section>

      {/* 최근 활동 */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">최근 활동</h2>
        <RecentActivitySection activity={activity} />
      </section>
    </div>
  )
}
