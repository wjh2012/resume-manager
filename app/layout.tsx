import type { Metadata } from "next"
import { Geist_Mono } from "next/font/google"
import localFont from "next/font/local"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  weight: "45 920",
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: {
    default: "Resume Manager",
    template: "%s | Resume Manager",
  },
  description: "이력서, 자기소개서, 경력기술서 작성을 돕는 이력서 관리 서비스",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        pretendard.variable,
      )}
    >
      <body>
        <ThemeProvider>
          <TooltipProvider>
            <a
              href="#main-content"
              className="bg-background text-foreground fixed left-2 top-2 z-50 rounded-md px-4 py-2 text-sm font-medium opacity-0 focus:opacity-100"
            >
              본문으로 건너뛰기
            </a>
            {children}
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
