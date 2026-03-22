-- CreateEnum
CREATE TYPE "CareerNoteStatus" AS ENUM ('CONFIRMED', 'PENDING');

-- CreateEnum
CREATE TYPE "MergeProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterEnum
ALTER TYPE "UsageFeature" ADD VALUE 'CAREER_NOTE';

-- CreateTable
CREATE TABLE "career_notes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "status" "CareerNoteStatus" NOT NULL DEFAULT 'CONFIRMED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "career_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_note_sources" (
    "career_note_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,

    CONSTRAINT "career_note_sources_pkey" PRIMARY KEY ("career_note_id","conversation_id")
);

-- CreateTable
CREATE TABLE "career_note_merge_proposals" (
    "id" UUID NOT NULL,
    "source_note_id" UUID,
    "target_note_id" UUID NOT NULL,
    "suggestedTitle" VARCHAR(200) NOT NULL,
    "suggestedContent" TEXT NOT NULL,
    "suggestedMetadata" JSONB,
    "status" "MergeProposalStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "career_note_merge_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "career_notes_user_id_status_idx" ON "career_notes"("user_id", "status");

-- CreateIndex
CREATE INDEX "career_notes_user_id_created_at_idx" ON "career_notes"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "career_note_merge_proposals_source_note_id_idx" ON "career_note_merge_proposals"("source_note_id");

-- CreateIndex
CREATE INDEX "career_note_merge_proposals_target_note_id_idx" ON "career_note_merge_proposals"("target_note_id");

-- AddForeignKey
ALTER TABLE "career_notes" ADD CONSTRAINT "career_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_note_sources" ADD CONSTRAINT "career_note_sources_career_note_id_fkey" FOREIGN KEY ("career_note_id") REFERENCES "career_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_note_sources" ADD CONSTRAINT "career_note_sources_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_note_merge_proposals" ADD CONSTRAINT "career_note_merge_proposals_source_note_id_fkey" FOREIGN KEY ("source_note_id") REFERENCES "career_notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_note_merge_proposals" ADD CONSTRAINT "career_note_merge_proposals_target_note_id_fkey" FOREIGN KEY ("target_note_id") REFERENCES "career_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
