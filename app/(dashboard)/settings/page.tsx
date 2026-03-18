import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAiSettings } from "@/lib/settings/service"
import { AiSettingsForm } from "@/components/settings/ai-settings-form"

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const settings = await getAiSettings(user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="text-muted-foreground mt-1">
          AI 제공자 및 모델을 설정합니다
        </p>
      </div>

      <AiSettingsForm initialSettings={settings} />
    </div>
  )
}
