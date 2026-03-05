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
    structure: {
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
    description: string
    clientAddress: string
    freelancerAddress: string | null
    deadline: string | null
    requirementsHash: string
    testSuiteHash: string | null
    testSuite: TestSuite | null
    state: JobState
    repoUrl: string | null
    submissionHash: string | null
    validationReport: ValidationReport | null
    createTxHash: string | null
    submittedAt: string | null
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

// ── App State ──────────────────────────────────────
export interface WalletState {
    address: string | null
    chainId: number | null
    balance: string | null
    isConnecting: boolean
}

export type UserRole = 'client' | 'freelancer' | null

export interface AppState {
    role: UserRole
}

// ── Activity Feed ──────────────────────────────────
export interface ActivityItem {
    id: string
    message: string
    timestamp: string
    type: 'info' | 'success' | 'warning' | 'error'
    jobId?: number
}
