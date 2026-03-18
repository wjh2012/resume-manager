# Known Issues & 제한사항

스펙과 다르거나 외부 의존성으로 인해 보류된 사항을 기록한다.

---

## 인증

### 카카오 로그인 비활성화

- **상태**: 주석 처리 (`app/(auth)/login/page.tsx`)
- **원인**: 카카오 비즈니스 계정이 없으면 OAuth에서 이메일을 받아올 수 없음. 이메일 없이는 `users` 테이블 upsert가 불가하므로 비활성화.
- **해결 조건**: 카카오 비즈앱 전환 후 활성화

## 보안

### API 키 검증 엔드포인트 Rate Limiting 미적용

- **상태**: `POST /api/settings/ai/validate` 엔드포인트에 Rate Limiting 없음
- **원인**: Redis/Upstash 등 외부 인프라 의존. 인증된 사용자만 호출 가능하나, 반복 호출 시 외부 API(OpenAI/Anthropic/Google)에 과도한 요청 발생 가능
- **해결 조건**: Rate Limiting 인프라 도입 후 userId 기반 분당 호출 제한 적용

### AiSettings.apiKey 평문 저장

- **상태**: `prisma/schema.prisma`의 `apiKey` 필드가 평문으로 저장됨
- **원인**: Phase 2 AI 설정 기능에서 사용 예정이나 아직 암호화 미적용
- **해결 조건**: 프로덕션 배포 전 암호화 적용 필수

## 스토리지

### Storage 고아 파일 가능성

- **상태**: 문서 삭제 시 Storage 파일 삭제 실패하면 DB 레코드만 삭제되고 Storage에 파일이 남음
- **원인**: Storage 삭제 실패를 catch 후 무시하고 DB 삭제를 진행하는 설계 (DB 삭제가 더 중요)
- **해결 조건**: 고아 파일이 누적되면 cron 기반 정리 작업 도입
