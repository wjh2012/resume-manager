# Known Issues & 제한사항

스펙과 다르거나 외부 의존성으로 인해 보류된 사항을 기록한다.

---

## 인증

### 카카오 로그인 비활성화

- **상태**: 주석 처리 (`app/(auth)/login/page.tsx`)
- **원인**: 카카오 비즈니스 계정이 없으면 OAuth에서 이메일을 받아올 수 없음. 이메일 없이는 `users` 테이블 upsert가 불가하므로 비활성화.
- **해결 조건**: 카카오 비즈앱 전환 후 활성화

## ~~접근성~~

### ~~icon button aria-label 누락~~

- **상태**: ~~해결됨~~ (feature/a11y-fixes)
- **원인**: shadcn/ui 아이콘 버튼에 `aria-label`이 누락되어 스크린리더에서 기능 식별 불가
- **해결**: 모든 아이콘 버튼에 `aria-label` 추가, 장식용 아이콘에 `aria-hidden="true"` 적용

## 보안

### API 키 검증 엔드포인트 Rate Limiting 미적용

- **상태**: `POST /api/settings/ai/validate` 엔드포인트에 Rate Limiting 없음
- **원인**: Redis/Upstash 등 외부 인프라 의존. 인증된 사용자만 호출 가능하나, 반복 호출 시 외부 API(OpenAI/Anthropic/Google)에 과도한 요청 발생 가능
- **해결 조건**: Rate Limiting 인프라 도입 후 userId 기반 분당 호출 제한 적용

### AiSettings.apiKey 평문 저장

- **상태**: `prisma/schema.prisma`의 `apiKey` 필드가 평문으로 저장됨
- **원인**: Phase 2 AI 설정 기능에서 사용 예정이나 아직 암호화 미적용
- **해결 조건**: 프로덕션 배포 전 암호화 적용 필수

## AI / RAG

### ~~RAG 컨텍스트 중복 콘텐츠 가능~~

- **상태**: ~~해결됨~~ (feature/cover-letters)
- **원인**: `buildContext()`에서 `selectedDocumentIds`와 벡터 검색 결과가 중복될 수 있었음
- **해결**: `selectedDocumentIds`를 벡터 검색에서 자동 제외 (`excludeDocumentIds`). JSDoc 보강

### ~~벡터 검색 유사도 임계값 없음~~

- **상태**: ~~해결됨~~ (feature/cover-letters)
- **원인**: `searchSimilarChunks()`가 거리 값과 무관하게 상위 `maxChunks`개를 반환
- **해결**: 코사인 거리 `< 0.7` 임계값 WHERE 조건 추가 (`threshold` 파라미터, 기본값 0.7)

### ~~DB 모델값 검증 없음~~

- **상태**: ~~해결됨~~ (feature/cover-letters)
- **원인**: `getLanguageModel()`에서 provider만 검증하고 model은 검증 없이 SDK에 전달
- **해결**: `PROVIDER_MODELS`에서 model 존재 여부 검증, 미지원 모델 시 에러 throw

## 스토리지

### Storage 고아 파일 가능성

- **상태**: 문서 삭제 시 Storage 파일 삭제 실패하면 DB 레코드만 삭제되고 Storage에 파일이 남음
- **원인**: Storage 삭제 실패를 catch 후 무시하고 DB 삭제를 진행하는 설계 (DB 삭제가 더 중요)
- **해결 조건**: 고아 파일이 누적되면 cron 기반 정리 작업 도입
