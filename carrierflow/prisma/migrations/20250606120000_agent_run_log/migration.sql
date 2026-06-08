-- CreateTable
CREATE TABLE "AgentRunLog" (
    "id" TEXT NOT NULL,
    "agentConfigKey" TEXT NOT NULL,
    "promptVersionId" TEXT,
    "applicationId" TEXT,
    "latencyMs" INTEGER,
    "confidence" DOUBLE PRECISION,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentRunLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AgentRunLog" ADD CONSTRAINT "AgentRunLog_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "AgentPromptVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
