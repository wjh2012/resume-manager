"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

type OAuthProvider = "kakao" | "google" | "github"

const ERROR_MESSAGES: Record<string, string> = {
  no_email: "이메일 정보를 가져올 수 없습니다. 다른 계정으로 시도해주세요.",
}

function LoginContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null)

  const errorParam = searchParams.get("error")
  const errorMessage = errorParam ? ERROR_MESSAGES[errorParam] : null

  const handleLogin = async (provider: OAuthProvider) => {
    if (loadingProvider) return
    setLoadingProvider(provider)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    })
    if (error) {
      setLoadingProvider(null)
      toast.error("로그인 중 오류가 발생했습니다. 다시 시도해주세요.")
    }
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

        {errorMessage && (
          <p className="text-destructive text-center text-sm">{errorMessage}</p>
        )}

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
            disabled={loadingProvider !== null}
          >
            {loadingProvider === "google" ? "로그인 중..." : "Google로 시작하기"}
          </Button>

          <Button
            className="h-12 w-full cursor-pointer bg-black text-sm font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            onClick={() => handleLogin("github")}
            disabled={loadingProvider !== null}
          >
            {loadingProvider === "github" ? "로그인 중..." : "GitHub로 시작하기"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <div className="flex w-full max-w-sm flex-col items-center gap-8 px-4">
            <div className="text-center space-y-2">
              <Skeleton className="mx-auto h-8 w-48" />
              <Skeleton className="mx-auto h-5 w-56" />
            </div>
            <div className="flex w-full flex-col gap-3">
              <Skeleton className="h-12 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
            </div>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
