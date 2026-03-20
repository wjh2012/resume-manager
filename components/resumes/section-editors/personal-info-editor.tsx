"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface PersonalInfoData {
  name: string
  email: string
  phone?: string
  address?: string
  bio?: string
}

interface PersonalInfoEditorProps {
  data: PersonalInfoData | null
  onChange: (data: PersonalInfoData) => void
}

export function PersonalInfoEditor({ data, onChange }: PersonalInfoEditorProps) {
  const current: PersonalInfoData = data ?? {
    name: "",
    email: "",
    phone: "",
    address: "",
    bio: "",
  }

  function handleChange(field: keyof PersonalInfoData, value: string) {
    onChange({ ...current, [field]: value })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">
          이름 <span className="text-destructive">*</span>
        </label>
        <Input
          value={current.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="홍길동"
        />
      </div>
      <div>
        <label className="text-sm font-medium">
          이메일 <span className="text-destructive">*</span>
        </label>
        <Input
          type="email"
          value={current.email}
          onChange={(e) => handleChange("email", e.target.value)}
          placeholder="example@email.com"
        />
      </div>
      <div>
        <label className="text-sm font-medium">전화번호</label>
        <Input
          value={current.phone ?? ""}
          onChange={(e) => handleChange("phone", e.target.value)}
          placeholder="010-1234-5678"
        />
      </div>
      <div>
        <label className="text-sm font-medium">주소</label>
        <Input
          value={current.address ?? ""}
          onChange={(e) => handleChange("address", e.target.value)}
          placeholder="서울특별시 강남구"
        />
      </div>
      <div>
        <label className="text-sm font-medium">자기소개</label>
        <Textarea
          value={current.bio ?? ""}
          onChange={(e) => handleChange("bio", e.target.value)}
          placeholder="간단한 자기소개를 입력하세요"
        />
      </div>
    </div>
  )
}
