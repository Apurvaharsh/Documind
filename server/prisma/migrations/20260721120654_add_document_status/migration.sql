-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('QUEUED', 'PROCESSING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "status" "DocumentStatus" NOT NULL DEFAULT 'QUEUED';
