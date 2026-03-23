/*
  Warnings:

  - The values [EMBEDDING] on the enum `UsageFeature` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `document_chunks` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UsageFeature_new" AS ENUM ('COVER_LETTER', 'INTERVIEW', 'INSIGHT', 'DOCUMENT_SUMMARY', 'CAREER_NOTE');
ALTER TABLE "token_usage_logs" ALTER COLUMN "feature" TYPE "UsageFeature_new" USING ("feature"::text::"UsageFeature_new");
ALTER TYPE "UsageFeature" RENAME TO "UsageFeature_old";
ALTER TYPE "UsageFeature_new" RENAME TO "UsageFeature";
DROP TYPE "public"."UsageFeature_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "document_chunks" DROP CONSTRAINT "document_chunks_document_id_fkey";

-- AlterTable
ALTER TABLE "career_notes" ADD COLUMN     "summary" TEXT;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "summary" TEXT;

-- DropTable
DROP TABLE "document_chunks";
