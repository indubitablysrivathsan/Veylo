// ── Job Types ──────────────────────────────────────
export type JobState = 'CREATED' | 'FUNDED' | 'WORK_SUBMITTED' | 'VALIDATED' | 'CLOSED'

export interface TestCase {
    id: string
    description: string
    input: string
    expectedOutput: string
    type: 'unit' | 'integration' | 'edge_case'
}

export interface TestSuite {
    language: string
    testCommand: string
    required_files?: string[]
    required_dirs?: string[]
    testCases?: TestCase[]
}

export interface AmbiguityWarning {
    originalText: string
    reason: string
    suggestion: string
    severity: 'high' | 'medium' | 'low'
}

export interface AmbiguityResult {
    warnings: AmbiguityWarning[]
    isClean: boolean
}

export interface ValidationReport {
    overallScore: number
    verdict: 'PASS' | 'DISPUTE' | 'FAIL'
    execution: {
        score: number
        testsPassed: number
        testsTotal: number
        timedOut: boolean
    }
    repoViability: {
        score: number
        passed: number
        total: number
        details: { path: string; found: boolean }[]
    }
    lint: {
        score: number
        errorCount: number
        warningCount: number
    }
    semantic: {
        score: number
        reasoning: string
        missingRequirements: string[]
        strengths: string[]
    }
    metadata: {
        language: string
        durationMs: number
        timestamp: string
    }
    reportHash: string
}

export interface Job {
    id: number
    title?: string
    description: string
    clientAddress: string
    freelancerAddress: string | null
    deadline: string | null
    requirementsHash: string
    testSuiteHash: string | null
    testSuiteJson: TestSuite | null
    testSuite: TestSuite | null
    state: JobState
    outcome: string
    paymentAmountINR: number | null
    repoUrl: string | null
    submissionHash: string | null
    validationReport: ValidationReport | null
    createTxHash: string | null
    fundTxHash: string | null
    validateTxHash: string | null
    submittedAt: string | null
    validatedAt: string | null
    closedAt: string | null
    createdAt: string
}

// ── Pipeline ──────────────────────────────────────
export type PipelineStageStatus = 'pending' | 'running' | 'complete' | 'failed'

export interface PipelineStage {
    id: string
    name: string
    description: string
    status: PipelineStageStatus
    score: number | null
    details: string | null
}

export interface ValidationPipelineState {
    stages: PipelineStage[]
    currentStage: number
    isComplete: boolean
    finalReport: ValidationReport | null
}

// ── Reputation ─────────────────────────────────────
export interface ReputationProfile {
    address: string
    totalJobs: number
    averageScore: number
    successfulJobs: number
    disputedJobs: number
    failedJobs: number
    badges: string[]
}

// ── Auth ───────────────────────────────────────────
export type UserRole = 'client' | 'freelancer' | null

export interface User {
    id: number
    email: string
    name: string | null
    role: UserRole
    oauthProvider: string | null
    createdAt?: string
}

// ── App State ──────────────────────────────────────
export interface AppState {
    role: UserRole
    user: User | null
}

// ── Activity Feed ──────────────────────────────────
export interface ActivityItem {
    id: string
    message: string
    timestamp: string
    type: 'info' | 'success' | 'warning' | 'error'
    jobId?: number
}
