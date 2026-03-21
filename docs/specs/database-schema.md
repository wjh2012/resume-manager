# 데이터베이스 스키마

## 관계도

```
User ─┬─ AiSettings (1:1)
      ├─ Document (1:N) ──── DocumentChunk (1:N)
      │                 ├─── InterviewDocument (N:M) ──── InterviewSession
      │                 └─── CoverLetterDocument (N:M) ── CoverLetter
      ├─ Resume (1:N) ──┬─ PersonalInfo (1:1)
      │                  ├─ Education (1:N)
      │                  ├─ Experience (1:N)
      │                  ├─ Skill (1:N)
      │                  ├─ Project (1:N)
      │                  └─ Certification (1:N)
      ├─ CoverLetter (1:N)
      ├─ InterviewSession (1:N)
      ├─ Conversation (1:N) ── Message (1:N)
      ├─ Insight (1:N)
      ├─ TokenUsageLog (1:N)
      └─ Quota (1:N)

ModelPricing (독립 — User와 무관)
```

## Enum 정의

```prisma
enum CoverLetterStatus {
  DRAFT
  COMPLETED
}

enum InterviewSessionStatus {
  ACTIVE
  COMPLETED
}

enum ConversationType {
  COVER_LETTER
  INTERVIEW
  GENERAL
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}

enum UsageFeature {
  COVER_LETTER
  INTERVIEW
  INSIGHT
  EMBEDDING
}

enum LimitType {
  TOKENS
  COST
  REQUESTS
}

enum LimitPeriod {
  DAILY
  MONTHLY
}

enum UserRole {
  USER
  ADMIN
}
```

## Prisma 스키마

### User

Supabase Auth와 연동. `id`는 Supabase Auth의 UUID를 그대로 사용한다.

```prisma
model User {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique
  name      String?
  avatarUrl String?  @map("avatar_url")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  role      UserRole @default(USER)

  aiSettings       AiSettings?
  documents        Document[]
  resumes          Resume[]
  coverLetters     CoverLetter[]
  interviewSessions InterviewSession[]
  conversations    Conversation[]
  insights         Insight[]
  tokenUsageLogs   TokenUsageLog[]
  quotas           Quota[]

  @@map("users")
}
```

### AiSettings

사용자별 AI 제공자 설정. API 키는 암호화하여 저장한다.

```prisma
model AiSettings {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @unique @map("user_id") @db.Uuid
  provider  String   @default("openai") // "openai" | "anthropic" | "google"
  model     String   @default("gpt-4o")
  apiKey    String?  @map("api_key") // 암호화 저장
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("ai_settings")
}
```

### Document & DocumentChunk

업로드된 문서 + RAG용 청크/임베딩.

```prisma
model Document {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @map("user_id") @db.Uuid
  title         String
  type          String   // "pdf" | "docx" | "txt"
  originalUrl   String   @map("original_url") // Supabase Storage 경로
  extractedText String?  @map("extracted_text") @db.Text
  fileSize      Int      @map("file_size") // bytes
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  user                 User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  chunks               DocumentChunk[]
  interviewDocuments   InterviewDocument[]
  coverLetterDocuments CoverLetterDocument[]

  @@map("documents")
}

model DocumentChunk {
  id         String @id @default(uuid()) @db.Uuid
  documentId String @map("document_id") @db.Uuid
  content    String @db.Text
  chunkIndex Int    @map("chunk_index")
  embedding  Unsupported("vector(1536)")? // pgvector

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@index([documentId])
  @@map("document_chunks")
}
```

> **참고**: `Unsupported("vector(1536)")`는 Prisma에서 pgvector 타입을 지원하기 위한 방법이다. 임베딩 차원은 사용하는 모델에 따라 달라질 수 있다 (OpenAI text-embedding-3-small: 1536).

### Resume & 하위 모델

```prisma
model Resume {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  title     String
  template  String   @default("classic") // "classic" | "modern" | "minimal"
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  personalInfo   PersonalInfo?
  educations     Education[]
  experiences    Experience[]
  skills         Skill[]
  projects       Project[]
  certifications Certification[]

  @@map("resumes")
}

model PersonalInfo {
  id       String  @id @default(uuid()) @db.Uuid
  resumeId String  @unique @map("resume_id") @db.Uuid
  name     String
  email    String
  phone    String?
  address  String?
  bio      String? @db.Text // 간단한 자기소개

  resume Resume @relation(fields: [resumeId], references: [id], onDelete: Cascade)

  @@map("personal_infos")
}

model Education {
  id           String    @id @default(uuid()) @db.Uuid
  resumeId     String    @map("resume_id") @db.Uuid
  school       String
  degree       String?   // 학위
  field        String?   // 전공
  startDate    DateTime? @map("start_date")
  endDate      DateTime? @map("end_date")
  description  String?   @db.Text
  sortOrder    Int       @default(0) @map("sort_order")

  resume Resume @relation(fields: [resumeId], references: [id], onDelete: Cascade)

  @@map("educations")
}

model Experience {
  id          String    @id @default(uuid()) @db.Uuid
  resumeId    String    @map("resume_id") @db.Uuid
  company     String
  position    String
  startDate   DateTime? @map("start_date")
  endDate     DateTime? @map("end_date")
  isCurrent   Boolean   @default(false) @map("is_current")
  description String?   @db.Text
  sortOrder   Int       @default(0) @map("sort_order")

  resume Resume @relation(fields: [resumeId], references: [id], onDelete: Cascade)

  @@map("experiences")
}

model Skill {
  id       String @id @default(uuid()) @db.Uuid
  resumeId String @map("resume_id") @db.Uuid
  name     String
  level    String? // "beginner" | "intermediate" | "advanced" | "expert"
  category String? // "language" | "framework" | "tool" | "other"
  sortOrder Int   @default(0) @map("sort_order")

  resume Resume @relation(fields: [resumeId], references: [id], onDelete: Cascade)

  @@map("skills")
}

model Project {
  id          String    @id @default(uuid()) @db.Uuid
  resumeId    String    @map("resume_id") @db.Uuid
  name        String
  role        String?
  startDate   DateTime? @map("start_date")
  endDate     DateTime? @map("end_date")
  description String?   @db.Text
  url         String?
  sortOrder   Int       @default(0) @map("sort_order")

  resume Resume @relation(fields: [resumeId], references: [id], onDelete: Cascade)

  @@map("projects")
}

model Certification {
  id         String    @id @default(uuid()) @db.Uuid
  resumeId   String    @map("resume_id") @db.Uuid
  name       String
  issuer     String?   // 발급기관
  issueDate  DateTime? @map("issue_date")
  expiryDate DateTime? @map("expiry_date")
  sortOrder  Int       @default(0) @map("sort_order")

  resume Resume @relation(fields: [resumeId], references: [id], onDelete: Cascade)

  @@map("certifications")
}
```

### CoverLetter

```prisma
model CoverLetter {
  id              String   @id @default(uuid()) @db.Uuid
  userId          String   @map("user_id") @db.Uuid
  title           String
  companyName     String   @map("company_name")
  position        String   // 지원 직무
  jobPostingText  String?  @map("job_posting_text") @db.Text // 채용공고 원문
  content         String?  @db.Text // 최종 자기소개서 내용
  status          CoverLetterStatus @default(DRAFT)
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  user                 User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  conversations        Conversation[]
  coverLetterDocuments CoverLetterDocument[]

  @@map("cover_letters")
}
```

### CoverLetterDocument

자기소개서 작성 시 선택한 참고 문서를 영구 저장하는 조인 테이블. `InterviewDocument`와 동일 패턴.

```prisma
model CoverLetterDocument {
  id            String @id @default(uuid()) @db.Uuid
  coverLetterId String @map("cover_letter_id") @db.Uuid
  documentId    String @map("document_id") @db.Uuid

  coverLetter CoverLetter @relation(fields: [coverLetterId], references: [id], onDelete: Cascade)
  document    Document    @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([coverLetterId, documentId])
  @@map("cover_letter_documents")
}
```

### InterviewSession & InterviewDocument

```prisma
model InterviewSession {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  title        String
  companyName  String?  @map("company_name")
  position     String?
  status       InterviewSessionStatus @default(ACTIVE)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  user               User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  interviewDocuments InterviewDocument[]
  conversations      Conversation[]

  @@map("interview_sessions")
}

model InterviewDocument {
  id                 String @id @default(uuid()) @db.Uuid
  interviewSessionId String @map("interview_session_id") @db.Uuid
  documentId         String @map("document_id") @db.Uuid

  interviewSession InterviewSession @relation(fields: [interviewSessionId], references: [id], onDelete: Cascade)
  document         Document         @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([interviewSessionId, documentId])
  @@map("interview_documents")
}
```

### Conversation & Message

`Conversation`은 자기소개서 작성과 모의면접 모두에서 사용하는 다형성 모델이다.

```prisma
model Conversation {
  id                 String   @id @default(uuid()) @db.Uuid
  userId             String   @map("user_id") @db.Uuid
  type               ConversationType
  coverLetterId      String?  @map("cover_letter_id") @db.Uuid
  interviewSessionId String?  @map("interview_session_id") @db.Uuid
  title              String?
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  user             User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  coverLetter      CoverLetter?      @relation(fields: [coverLetterId], references: [id], onDelete: Cascade)
  interviewSession InterviewSession? @relation(fields: [interviewSessionId], references: [id], onDelete: Cascade)
  messages         Message[]
  insights         Insight[]

  @@map("conversations")
}

model Message {
  id             String   @id @default(uuid()) @db.Uuid
  conversationId String   @map("conversation_id") @db.Uuid
  role           MessageRole
  content        String   @db.Text
  createdAt      DateTime @default(now()) @map("created_at")

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@map("messages")
}
```

### Insight

```prisma
model Insight {
  id             String   @id @default(uuid()) @db.Uuid
  userId         String   @map("user_id") @db.Uuid
  conversationId String?  @map("conversation_id") @db.Uuid
  category       String   // "strength" | "experience" | "motivation" | "skill" | "other"
  title          String
  content        String   @db.Text
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  conversation Conversation? @relation(fields: [conversationId], references: [id])

  @@map("insights")
}
```

### TokenUsageLog

AI API 호출별 토큰 사용 기록.

```prisma
model TokenUsageLog {
  id               String       @id @default(uuid()) @db.Uuid
  userId           String       @map("user_id") @db.Uuid
  provider         String
  model            String
  feature          UsageFeature
  promptTokens     Int          @map("prompt_tokens")
  completionTokens Int          @map("completion_tokens")
  totalTokens      Int          @map("total_tokens")
  estimatedCost    Decimal?     @map("estimated_cost") @db.Decimal(10, 6)
  isServerKey      Boolean      @map("is_server_key")
  metadata         Json?
  createdAt        DateTime     @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([createdAt])
  @@map("token_usage_logs")
}
```

### ModelPricing

모델별 토큰 단가. Append-only — 새 가격 등록 시 기존 레코드 유지.

```prisma
model ModelPricing {
  id              String   @id @default(uuid()) @db.Uuid
  provider        String
  model           String
  inputPricePerM  Decimal  @map("input_price_per_m") @db.Decimal(10, 6)
  outputPricePerM Decimal  @map("output_price_per_m") @db.Decimal(10, 6)
  effectiveFrom   DateTime @map("effective_from")
  createdAt       DateTime @default(now()) @map("created_at")

  @@unique([provider, model, effectiveFrom])
  @@map("model_pricing")
}
```

### Quota

사용자별 사용 한도. 한 사용자에 여러 Quota 설정 가능.

```prisma
model Quota {
  id         String      @id @default(uuid()) @db.Uuid
  userId     String      @map("user_id") @db.Uuid
  limitType  LimitType   @map("limit_type")
  limitValue Decimal     @map("limit_value") @db.Decimal(12, 2)
  period     LimitPeriod
  isActive   Boolean     @default(true) @map("is_active")
  createdAt  DateTime    @default(now()) @map("created_at")
  updatedAt  DateTime    @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("quotas")
}
```

## pgvector 설정

Supabase에서 pgvector 확장을 활성화해야 한다.

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

`document_chunks` 테이블의 `embedding` 컬럼에 벡터 인덱스를 생성한다.

```sql
CREATE INDEX ON document_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## 주의사항

- `DocumentChunk.embedding`은 Prisma의 `Unsupported` 타입을 사용하므로, 벡터 관련 쿼리는 `$queryRaw`로 직접 SQL을 작성해야 한다.
- 임베딩 차원(1536)은 OpenAI text-embedding-3-small 기준이다. 다른 모델을 사용할 경우 차원이 달라질 수 있으므로, 마이그레이션 시 조정이 필요하다.
- `User.id`는 Supabase Auth의 UUID를 사용한다. Supabase Auth 트리거로 `users` 테이블에 자동 삽입하거나, 최초 로그인 시 upsert한다.
