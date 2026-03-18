import { redirect } from "next/navigation"
import Link from "next/link"
import { FileText, Upload, Sparkles } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { countDocuments } from "@/lib/documents/service"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const documentCount = await countDocuments(user.id)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-balance">
          Resume Manager에 오신 것을 환영합니다
        </h1>
        <p className="text-muted-foreground mt-2">
          이력서와 경력 문서를 관리하고 AI의 도움을 받아보세요.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="animate-fade-in-up">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary rounded-lg p-2">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <CardDescription>업로드된 문서</CardDescription>
                <CardTitle className="text-2xl">{documentCount}</CardTitle>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Link href="/documents" className="animate-fade-in-up" style={{ animationDelay: "50ms" }}>
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary rounded-lg p-2">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">문서 업로드</CardTitle>
                  <CardDescription>PDF, DOCX, TXT 파일 업로드</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Card className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-muted text-muted-foreground rounded-lg p-2">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">AI 어시스턴트</CardTitle>
                <CardDescription>곧 출시 예정</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
