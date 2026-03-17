"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

type OAuthProvider = "kakao" | "google" | "github"

export default function LoginPage() {
  const supabase = createClient()

  const handleLogin = async (provider: OAuthProvider) => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    })
  }

  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Resume Manager</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            이력서 관리 서비스에 로그인하세요
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          {/* TODO: 카카오 비즈앱 전환 후 활성화 */}
          {/* <Button
            className="h-12 w-full cursor-pointer text-sm font-medium text-black"
            style={{ backgroundColor: "#FEE500" }}
            onClick={() => handleLogin("kakao")}
          >
            카카오로 시작하기
          </Button> */}

          <Button
            variant="outline"
            className="h-12 w-full cursor-pointer text-sm font-medium"
            onClick={() => handleLogin("google")}
          >
            Google로 시작하기
          </Button>

          <Button
            className="h-12 w-full cursor-pointer bg-black text-sm font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            onClick={() => handleLogin("github")}
          >
            GitHub로 시작하기
          </Button>
        </div>
      </div>
    </div>
  )
}
