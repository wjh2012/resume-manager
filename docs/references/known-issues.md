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

## AI / 임베딩

### 임베딩 모델 OpenAI 고정

- **상태**: 미해결
- **증상**: `OPENAI_API_KEY` 환경 변수가 없으면 문서 업로드 및 RAG 컨텍스트 빌드 시 `AI_LoadAPIKeyError` 발생
- **원인**: `lib/ai/embedding.ts`가 `text-embedding-3-small` (OpenAI)로 하드코딩. 서버 전용 `OPENAI_API_KEY` env var 필요
- **제한사항**: 임베딩 벡터 차원이 OpenAI 1536으로 고정되어 있어 다른 모델(Google text-embedding-004: 768차원 등)로 교체 시 기존 벡터 데이터 마이그레이션 필요
- **해결 조건**: 서버 `.env`에 `OPENAI_API_KEY` 설정 필수. 임베딩 모델 교체는 pgvector 스키마 및 기존 데이터 마이그레이션과 함께 검토

## 자기소개서 API

### ~~PUT /api/cover-letters/[id] 이중 스키마 판별~~

- **상태**: ~~해결됨~~ (feature/cover-letters)
- **증상**: `{ content: "hello", documentIds: ["..."] }` body가 `updateSelectedDocumentsSchema`에 먼저 매칭되어 내용 저장 요청이 문서 업데이트로 오처리될 수 있음
- **해결**: `PATCH /api/cover-letters/[id]/documents` 별도 엔드포인트로 분리. PUT에서 `updateSelectedDocuments` 분기 제거
- **출처**: [PR #17 @claude 리뷰](https://github.com/wjh2012/resume-manager/pull/17)

### ~~스트리밍 중 에러 시 메시지 히스토리 불일치~~

- **상태**: ~~해결됨~~ (feature/cover-letters)
- **증상**: 스트리밍 도중 에러 발생 시 USER 메시지는 저장되지만 ASSISTANT 메시지는 누락
- **해결**: USER 메시지 저장을 `onFinish`로 이동하여 USER+ASSISTANT를 `$transaction`으로 원자적 저장
- **출처**: [PR #17 @claude 리뷰](https://github.com/wjh2012/resume-manager/pull/17)

## 자기소개서 작업공간

### 에디터 부분 삽입 미지원

- **상태**: 미해결
- **증상**: "에디터에 반영" 버튼 클릭 시 AI 응답이 에디터 끝에 단순 추가됨
- **개선 방향**: git diff처럼 변경 구간을 `-`/`+`로 시각적으로 표시하고 사용자가 수락/거절할 수 있는 인라인 패치 UI 구현
- **구현 참고**:
  - `diff-match-patch` 또는 `fast-diff` 라이브러리로 기존 텍스트와 AI 제안 텍스트를 비교
  - 변경 구간을 배경색으로 하이라이트 (삭제: 빨강, 추가: 초록)
  - 수락 시 변경사항 적용, 거절 시 원본 유지
  - textarea 한계로 인라인 하이라이트가 어렵다면 contenteditable 또는 CodeMirror/ProseMirror 기반 에디터로 교체 필요
  - textarea 유지 시 `selectionStart`/`selectionEnd`로 커서 위치 삽입은 가능

## UI / 렌더링

### Radix UI Hydration ID Mismatch

- **상태**: 미해결
- **증상**: 대시보드 레이아웃 진입 시 콘솔에 React hydration 경고. SSR에서 생성된 `radix-_R_...` ID와 클라이언트에서 생성된 ID가 불일치
- **영향 범위**: `UserMenu` (DropdownMenuTrigger), AI 설정 폼 (SelectTrigger × 2). 기능 동작에는 영향 없음
- **원인**: Radix UI 내부 ID 카운터가 SSR/클라이언트 컴포넌트 트리 순서 차이로 달라짐
- **해결 조건**: Radix UI 업그레이드 또는 SSR/클라이언트 렌더 트리 구조 일치 확인

## 스토리지

### Storage 고아 파일 가능성

- **상태**: 문서 삭제 시 Storage 파일 삭제 실패하면 DB 레코드만 삭제되고 Storage에 파일이 남음
- **원인**: Storage 삭제 실패를 catch 후 무시하고 DB 삭제를 진행하는 설계 (DB 삭제가 더 중요)
- **해결 조건**: 고아 파일이 누적되면 cron 기반 정리 작업 도입
