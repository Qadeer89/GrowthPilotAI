-- CreateTable
CREATE TABLE "AnalystQuery" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" JSONB NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalystQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationRecommendation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "relatedAdCampaignId" TEXT,
    "type" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "dataQuality" TEXT NOT NULL,
    "proposedChange" JSONB,
    "status" TEXT NOT NULL DEFAULT 'awaiting_approval',
    "measurement" JSONB,
    "failureReason" TEXT,
    "approvedByUserId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptimizationRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalystQuery_organizationId_idx" ON "AnalystQuery"("organizationId");

-- CreateIndex
CREATE INDEX "OptimizationRecommendation_organizationId_idx" ON "OptimizationRecommendation"("organizationId");

-- CreateIndex
CREATE INDEX "OptimizationRecommendation_relatedAdCampaignId_idx" ON "OptimizationRecommendation"("relatedAdCampaignId");

-- AddForeignKey
ALTER TABLE "AnalystQuery" ADD CONSTRAINT "AnalystQuery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalystQuery" ADD CONSTRAINT "AnalystQuery_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationRecommendation" ADD CONSTRAINT "OptimizationRecommendation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationRecommendation" ADD CONSTRAINT "OptimizationRecommendation_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationRecommendation" ADD CONSTRAINT "OptimizationRecommendation_relatedAdCampaignId_fkey" FOREIGN KEY ("relatedAdCampaignId") REFERENCES "AdCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
