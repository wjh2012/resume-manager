/*
  Warnings:

  - You are about to drop the column `suggestedContent` on the `career_note_merge_proposals` table. All the data in the column will be lost.
  - You are about to drop the column `suggestedMetadata` on the `career_note_merge_proposals` table. All the data in the column will be lost.
  - You are about to drop the column `suggestedTitle` on the `career_note_merge_proposals` table. All the data in the column will be lost.
  - Added the required column `suggested_content` to the `career_note_merge_proposals` table without a default value. This is not possible if the table is not empty.
  - Added the required column `suggested_title` to the `career_note_merge_proposals` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "career_note_merge_proposals" DROP COLUMN "suggestedContent",
DROP COLUMN "suggestedMetadata",
DROP COLUMN "suggestedTitle",
ADD COLUMN     "suggested_content" TEXT NOT NULL,
ADD COLUMN     "suggested_metadata" JSONB,
ADD COLUMN     "suggested_title" VARCHAR(200) NOT NULL;
