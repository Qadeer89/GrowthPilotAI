-- AlterTable
ALTER TABLE "SocialPost" ADD COLUMN     "videoProjectId" TEXT;

-- CreateIndex
CREATE INDEX "SocialPost_videoProjectId_idx" ON "SocialPost"("videoProjectId");

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_videoProjectId_fkey" FOREIGN KEY ("videoProjectId") REFERENCES "VideoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
