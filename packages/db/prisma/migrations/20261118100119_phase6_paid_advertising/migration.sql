-- AlterTable
ALTER TABLE "ConnectedAccount" ADD COLUMN     "managerCustomerId" TEXT;

-- AlterTable
ALTER TABLE "OAuthToken" ADD COLUMN     "refreshTokenEncrypted" TEXT;

-- CreateTable
CREATE TABLE "AdCampaign" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "connectedAccountId" TEXT NOT NULL,
    "campaignId" TEXT,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dailyBudgetMicros" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "providerCampaignBudgetResourceName" TEXT,
    "providerCampaignResourceName" TEXT,
    "providerStatus" TEXT,
    "failureReason" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdApproval" (
    "id" TEXT NOT NULL,
    "adCampaignId" TEXT NOT NULL,
    "approvedByUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdCampaign_organizationId_idx" ON "AdCampaign"("organizationId");

-- CreateIndex
CREATE INDEX "AdCampaign_brandId_idx" ON "AdCampaign"("brandId");

-- CreateIndex
CREATE INDEX "AdApproval_adCampaignId_idx" ON "AdApproval"("adCampaignId");

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "ConnectedAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdApproval" ADD CONSTRAINT "AdApproval_adCampaignId_fkey" FOREIGN KEY ("adCampaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
