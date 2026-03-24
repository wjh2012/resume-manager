-- CreateTable
CREATE TABLE "external_documents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "source_type" TEXT NOT NULL,
    "file_type" TEXT,
    "original_url" TEXT,
    "file_size" INTEGER,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cover_letter_external_docs" (
    "cover_letter_id" UUID NOT NULL,
    "external_document_id" UUID NOT NULL,

    CONSTRAINT "cover_letter_external_docs_pkey" PRIMARY KEY ("cover_letter_id","external_document_id")
);

-- CreateTable
CREATE TABLE "interview_external_docs" (
    "interview_session_id" UUID NOT NULL,
    "external_document_id" UUID NOT NULL,

    CONSTRAINT "interview_external_docs_pkey" PRIMARY KEY ("interview_session_id","external_document_id")
);

-- AddForeignKey
ALTER TABLE "external_documents" ADD CONSTRAINT "external_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cover_letter_external_docs" ADD CONSTRAINT "cover_letter_external_docs_cover_letter_id_fkey" FOREIGN KEY ("cover_letter_id") REFERENCES "cover_letters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cover_letter_external_docs" ADD CONSTRAINT "cover_letter_external_docs_external_document_id_fkey" FOREIGN KEY ("external_document_id") REFERENCES "external_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_external_docs" ADD CONSTRAINT "interview_external_docs_interview_session_id_fkey" FOREIGN KEY ("interview_session_id") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_external_docs" ADD CONSTRAINT "interview_external_docs_external_document_id_fkey" FOREIGN KEY ("external_document_id") REFERENCES "external_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: jobPostingText → ExternalDocument
DO $$
DECLARE
  r RECORD;
  new_ext_id UUID;
BEGIN
  FOR r IN
    SELECT "id" AS cover_letter_id, "user_id", "company_name", "job_posting_text", "created_at"
    FROM "cover_letters"
    WHERE "job_posting_text" IS NOT NULL AND "job_posting_text" != ''
  LOOP
    new_ext_id := gen_random_uuid();

    INSERT INTO "external_documents" ("id", "user_id", "title", "category", "source_type", "content", "created_at", "updated_at")
    VALUES (
      new_ext_id,
      r."user_id",
      COALESCE(NULLIF(r."company_name", ''), '(미지정)') || ' 채용공고',
      '채용공고',
      'text',
      r."job_posting_text",
      r."created_at",
      NOW()
    );

    INSERT INTO "cover_letter_external_docs" ("cover_letter_id", "external_document_id")
    VALUES (r.cover_letter_id, new_ext_id);
  END LOOP;
END $$;

-- AlterTable
ALTER TABLE "cover_letters" DROP COLUMN "job_posting_text";
