-- CreateTable
CREATE TABLE "Job" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "clientAddress" TEXT NOT NULL,
    "freelancerAddress" TEXT,
    "requirementsHash" TEXT NOT NULL,
    "testSuiteHash" TEXT,
    "testSuiteJson" JSONB,
    "state" TEXT NOT NULL DEFAULT 'CREATED',
    "outcome" TEXT NOT NULL DEFAULT 'NONE',
    "amountWei" TEXT,
    "repoUrl" TEXT,
    "submissionHash" TEXT,
    "deadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createTxHash" TEXT,
    "fundTxHash" TEXT,
    "validateTxHash" TEXT,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationReport" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "verdict" TEXT NOT NULL,
    "executionScore" INTEGER,
    "testsPassed" INTEGER,
    "testsTotal" INTEGER,
    "structureScore" INTEGER,
    "lintScore" INTEGER,
    "semanticScore" INTEGER,
    "semanticReasoning" TEXT,
    "reportHash" TEXT NOT NULL,
    "reportJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValidationReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reputation" (
    "address" TEXT NOT NULL,
    "totalJobs" INTEGER NOT NULL DEFAULT 0,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "averageScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "successfulJobs" INTEGER NOT NULL DEFAULT 0,
    "disputedJobs" INTEGER NOT NULL DEFAULT 0,
    "failedJobs" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reputation_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "badgeName" TEXT NOT NULL,
    "tokenId" INTEGER,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlashRecord" (
    "address" TEXT NOT NULL,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "totalSlashes" INTEGER NOT NULL DEFAULT 0,
    "cooldownUntil" TIMESTAMP(3),
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SlashRecord_pkey" PRIMARY KEY ("address")
);

-- CreateIndex
CREATE UNIQUE INDEX "Badge_address_badgeName_key" ON "Badge"("address", "badgeName");

-- AddForeignKey
ALTER TABLE "ValidationReport" ADD CONSTRAINT "ValidationReport_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
