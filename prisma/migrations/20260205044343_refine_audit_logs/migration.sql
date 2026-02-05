/*
  Warnings:

  - Added the required column `source` to the `AuditLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "source" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT;
