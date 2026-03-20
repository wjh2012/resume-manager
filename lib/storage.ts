import { createClient } from "@/lib/supabase/server"
import { randomUUID } from "crypto"

const BUCKET = "documents"

// Supabase Storage에 파일 업로드
export async function uploadFile(
  userId: string,
  fileName: string,
  file: Blob,
): Promise<string> {
  const supabase = await createClient()
  const rawExt = fileName.slice(fileName.lastIndexOf(".")).toLowerCase()
  // 경로 조작 문자 제거 (.. / \ 등)
  const ext = rawExt.replace(/[^a-z0-9.]/g, "")
  const path = `${userId}/${Date.now()}-${randomUUID()}${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
  })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  return path
}

// Supabase Storage에서 파일 삭제
export async function deleteFile(path: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.storage.from(BUCKET).remove([path])

  if (error) throw new Error(`Storage delete failed: ${error.message}`)
}
