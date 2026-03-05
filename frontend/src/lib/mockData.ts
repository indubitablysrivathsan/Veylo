import type { Job, TestSuite, AmbiguityResult, ValidationReport, ReputationProfile, PipelineStage, ActivityItem } from '@/types'

// ── Test Suites ───────────────────────────────────
export const mockTestSuites: Record<string, TestSuite> = {
    python_api: {
        language: 'python',
        testCommand: 'pytest tests/ -v',
        required_files: ['app.py', 'requirements.txt', 'tests/test_api.py'],
        required_dirs: ['tests'],
        testCases: [
            { id: 'tc-1', description: 'GET /fibonacci/10 returns correct sequence', input: 'GET /fibonacci/10', expectedOutput: '[0, 1, 1, 2, 3, 5, 8, 13, 21, 34]', type: 'unit' },
            { id: 'tc-2', description: 'GET /fibonacci/0 returns empty array', input: 'GET /fibonacci/0', expectedOutput: '[]', type: 'edge_case' },
            { id: 'tc-3', description: 'GET /fibonacci/-1 returns 400 error', input: 'GET /fibonacci/-1', expectedOutput: '{"error": "Invalid input"}', type: 'edge_case' },
            { id: 'tc-4', description: 'GET /fibonacci/1 returns [0]', input: 'GET /fibonacci/1', expectedOutput: '[0]', type: 'unit' },
            { id: 'tc-5', description: 'Server responds under 200ms for n=100', input: 'GET /fibonacci/100', expectedOutput: 'Response time < 200ms', type: 'integration' },
            { id: 'tc-6', description: 'API returns JSON content-type header', input: 'GET /fibonacci/5', expectedOutput: 'Content-Type: application/json', type: 'integration' },
        ],
    },
    js_frontend: {
        language: 'javascript',
        testCommand: 'npx vitest run',
        required_files: ['src/App.tsx', 'src/components/Dashboard.tsx', 'package.json'],
        required_dirs: ['src', 'src/components'],
        testCases: [
            { id: 'tc-1', description: 'Dashboard renders chart component', input: 'render(<Dashboard />)', expectedOutput: 'Chart component visible', type: 'unit' },
            { id: 'tc-2', description: 'Filter updates data table', input: 'click(filter)', expectedOutput: 'Table rows filtered', type: 'integration' },
            { id: 'tc-3', description: 'Empty state shown when no data', input: 'render(<Dashboard data={[]} />)', expectedOutput: 'Empty state message', type: 'edge_case' },
        ],
    },
    data_script: {
        language: 'python',
        testCommand: 'python -m pytest tests/ -v',
        required_files: ['normalize.py', 'tests/test_normalize.py'],
        testCases: [
            { id: 'tc-1', description: 'Normalizes CSV headers to snake_case', input: '"First Name,Last Name"', expectedOutput: '"first_name,last_name"', type: 'unit' },
            { id: 'tc-2', description: 'Handles empty input file', input: '""', expectedOutput: 'Empty output with headers', type: 'edge_case' },
            { id: 'tc-3', description: 'Removes duplicate rows', input: '3 identical rows', expectedOutput: '1 unique row', type: 'unit' },
        ],
    },
}

// ── Ambiguity Results ──────────────────────────────
export const mockAmbiguityResult: AmbiguityResult = {
    isClean: false,
    warnings: [
        {
            originalText: 'The API should be fast',
            reason: '"Fast" is subjective and unmeasurable. Different users have different expectations.',
            suggestion: 'Specify: "All endpoints must respond within 200ms under normal load (< 100 concurrent requests)."',
            severity: 'high',
        },
        {
            originalText: 'Handle edge cases appropriately',
            reason: '"Appropriately" is undefined. The validator needs specific expected behavior.',
            suggestion: 'List each edge case: negative input returns 400, zero returns empty array, non-integer returns 422.',
            severity: 'medium',
        },
        {
            originalText: 'Clean, readable code',
            reason: '"Clean" and "readable" are opinion-based and cannot be tested deterministically.',
            suggestion: 'Replace with: "Code must pass pylint with score >= 8.0 and have no functions exceeding 30 lines."',
            severity: 'low',
        },
    ],
}

// ── Validation Reports ─────────────────────────────
export const mockValidationReportPass: ValidationReport = {
    overallScore: 83,
    verdict: 'PASS',
    execution: { score: 88, testsPassed: 5, testsTotal: 6, timedOut: false },
    structure: {
        score: 100, passed: 4, total: 4, details: [
            { path: 'app.py', found: true },
            { path: 'requirements.txt', found: true },
            { path: 'tests/test_api.py', found: true },
            { path: 'tests/', found: true },
        ]
    },
    lint: { score: 72, errorCount: 3, warningCount: 8 },
    semantic: {
        score: 79,
        reasoning: 'The submission implements all core Fibonacci functionality correctly. The REST API follows conventions with proper status codes. Error handling exists for negative inputs but the zero-input edge case returns an incorrect response format. Code organization is clean with separation of concerns.',
        missingRequirements: ['Zero-input edge case returns wrong format', 'No rate limiting configured'],
        strengths: ['Clean REST API design', 'Comprehensive error handling for negative inputs', 'Good test coverage in submitted tests'],
    },
    metadata: { language: 'python', durationMs: 14320, timestamp: '2026-02-26T14:30:00Z' },
    reportHash: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
}

export const mockValidationReportFail: ValidationReport = {
    overallScore: 41,
    verdict: 'FAIL',
    execution: { score: 33, testsPassed: 2, testsTotal: 6, timedOut: true },
    structure: {
        score: 75, passed: 3, total: 4, details: [
            { path: 'app.py', found: true },
            { path: 'requirements.txt', found: true },
            { path: 'tests/test_api.py', found: false },
            { path: 'tests/', found: true },
        ]
    },
    lint: { score: 28, errorCount: 14, warningCount: 22 },
    semantic: {
        score: 38,
        reasoning: 'The submission is incomplete. Only 2 of 6 tests pass. The test file is missing from the repository. The API handles the basic case but fails on edge cases. Significant linting issues indicate rushed development. Response format does not match specification.',
        missingRequirements: ['Test file not included', 'Edge case handling missing', 'Response format mismatch', 'Performance requirement not met'],
        strengths: ['Basic Fibonacci calculation works'],
    },
    metadata: { language: 'python', durationMs: 32100, timestamp: '2026-02-27T09:15:00Z' },
    reportHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
}

// ── Jobs ───────────────────────────────────────────
export const mockJobs: Job[] = [
    {
        id: 1,
        description: 'Build a Python REST API that generates Fibonacci sequences. The API should accept a number n via GET /fibonacci/:n and return the first n Fibonacci numbers as a JSON array. Must include proper error handling for invalid inputs, type validation, and respond within 200ms.',
        clientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
        freelancerAddress: '0x8Ba1f109551bD432803012645Ac136ddd64DBA72',
        deadline: '2026-03-15T00:00:00Z',
        requirementsHash: '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
        testSuiteHash: '0xf1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0f1e2',
        testSuiteJson: mockTestSuites.python_api,
        testSuite: mockTestSuites.python_api,
        state: 'VALIDATED',
        outcome: 'PAID',
        amountWei: '500000000000000000',
        repoUrl: 'https://github.com/dev/fibonacci-api',
        submissionHash: '0xd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5',
        validationReport: mockValidationReportPass,
        createTxHash: '0xe7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8',
        fundTxHash: null,
        validateTxHash: null,
        submittedAt: '2026-02-26T10:00:00Z',
        validatedAt: '2026-02-26T14:30:00Z',
        closedAt: null,
        createdAt: '2026-02-20T08:00:00Z',
    },
    {
        id: 2,
        description: 'Create a React dashboard for sales analytics. Must include interactive charts (bar, line, pie), data filtering, date range selection, and export to CSV functionality. Use TypeScript and include unit tests for all components.',
        clientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
        freelancerAddress: '0x8Ba1f109551bD432803012645Ac136ddd64DBA72',
        deadline: '2026-03-20T00:00:00Z',
        requirementsHash: '0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
        testSuiteHash: '0xe2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0f1e2d3',
        testSuiteJson: mockTestSuites.js_frontend,
        testSuite: mockTestSuites.js_frontend,
        state: 'WORK_SUBMITTED',
        outcome: 'NONE',
        amountWei: '750000000000000000',
        repoUrl: 'https://github.com/dev/sales-dashboard',
        submissionHash: '0xc5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
        validationReport: null,
        createTxHash: '0xf8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9',
        fundTxHash: null,
        validateTxHash: null,
        submittedAt: '2026-03-01T14:00:00Z',
        validatedAt: null,
        closedAt: null,
        createdAt: '2026-02-22T11:00:00Z',
    },
    {
        id: 3,
        description: 'Data processing pipeline for CSV normalization. Script should read CSV files, normalize headers to snake_case, remove duplicate rows, handle missing values with configurable defaults, and output cleaned CSV. Include comprehensive test coverage.',
        clientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
        freelancerAddress: null,
        deadline: '2026-03-25T00:00:00Z',
        requirementsHash: '0xc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4',
        testSuiteHash: '0xd3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0f1e2d3c4',
        testSuiteJson: mockTestSuites.data_script,
        testSuite: mockTestSuites.data_script,
        state: 'FUNDED',
        outcome: 'NONE',
        amountWei: '1000000000000000000',
        repoUrl: null,
        submissionHash: null,
        validationReport: null,
        createTxHash: '0xa9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
        fundTxHash: null,
        validateTxHash: null,
        submittedAt: null,
        validatedAt: null,
        closedAt: null,
        createdAt: '2026-02-25T09:00:00Z',
    },
    {
        id: 4,
        description: 'Node.js authentication service with JWT. Must support user registration, login, token refresh, password reset via email, and role-based access control. Include rate limiting on auth endpoints and comprehensive logging.',
        clientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
        freelancerAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        deadline: '2026-04-01T00:00:00Z',
        requirementsHash: '0xd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5',
        testSuiteHash: null,
        testSuiteJson: null,
        testSuite: null,
        state: 'CREATED',
        outcome: 'NONE',
        amountWei: null,
        repoUrl: null,
        submissionHash: null,
        validationReport: null,
        createTxHash: null,
        fundTxHash: null,
        validateTxHash: null,
        submittedAt: null,
        validatedAt: null,
        closedAt: null,
        createdAt: '2026-03-01T15:00:00Z',
    },
    {
        id: 5,
        description: 'Smart contract audit report generator. Build a tool that analyzes Solidity contracts for common vulnerabilities (reentrancy, overflow, access control), generates a structured PDF report with severity ratings, and provides fix recommendations.',
        clientAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        freelancerAddress: '0x8Ba1f109551bD432803012645Ac136ddd64DBA72',
        deadline: '2026-03-10T00:00:00Z',
        requirementsHash: '0xe5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6',
        testSuiteHash: '0xc4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0f1e2d3c4b5',
        testSuiteJson: null,
        testSuite: null,
        state: 'CLOSED',
        outcome: 'REFUNDED',
        amountWei: '500000000000000000',
        repoUrl: 'https://github.com/dev/sol-audit',
        submissionHash: '0xf6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7',
        validationReport: mockValidationReportFail,
        createTxHash: '0xb0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1',
        fundTxHash: null,
        validateTxHash: null,
        submittedAt: '2026-03-08T18:00:00Z',
        validatedAt: '2026-03-08T18:30:00Z',
        closedAt: '2026-03-08T19:00:00Z',
        createdAt: '2026-02-18T07:00:00Z',
    },
]

// ── Pipeline Stages ────────────────────────────────
export const mockPipelineStages: PipelineStage[] = [
    { id: 'clone', name: 'Repository Clone', description: 'Cloning submission repository', status: 'pending', score: null, details: '24 files cloned' },
    { id: 'deps', name: 'Dependency Installation', description: 'Installing project dependencies', status: 'pending', score: null, details: '12 packages installed' },
    { id: 'structure', name: 'Structural Validation', description: 'Checking required files and dirs', status: 'pending', score: 100, details: '4/4 required paths found' },
    { id: 'execution', name: 'Test Execution', description: 'Running test suite in sandbox', status: 'pending', score: 88, details: '5/6 tests passed' },
    { id: 'lint', name: 'Static Analysis', description: 'Running linter and code quality', status: 'pending', score: 72, details: '3 errors, 8 warnings' },
    { id: 'semantic', name: 'Semantic AI Analysis', description: 'Qwen2.5-Coder evaluating compliance', status: 'pending', score: 79, details: '82% spec compliance' },
    { id: 'aggregate', name: 'Score Aggregation', description: 'Computing weighted final score', status: 'pending', score: 83, details: 'Final: 83.4' },
    { id: 'commit', name: 'Blockchain Commit', description: 'Recording report hash on-chain', status: 'pending', score: null, details: 'Tx: 0xe7f8...a9b0' },
]

// ── Reputation Profiles ────────────────────────────
export const mockReputationProfiles: Record<string, ReputationProfile> = {
    '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18': {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
        totalJobs: 12,
        averageScore: 79,
        successfulJobs: 9,
        disputedJobs: 2,
        failedJobs: 1,
        badges: ['First Job', 'Reliable', 'Veteran'],
    },
    '0x8Ba1f109551bD432803012645Ac136ddd64DBA72': {
        address: '0x8Ba1f109551bD432803012645Ac136ddd64DBA72',
        totalJobs: 8,
        averageScore: 91,
        successfulJobs: 7,
        disputedJobs: 1,
        failedJobs: 0,
        badges: ['First Job', 'Reliable', 'Elite'],
    },
}

// ── Activity Items ─────────────────────────────────
export const mockActivityItems: ActivityItem[] = [
    { id: 'a1', message: 'Validation complete for "Python REST API for Fibonacci Sequence" — score 83', timestamp: '2026-02-26T14:30:00Z', type: 'success', jobId: 1 },
    { id: 'a2', message: 'Work submitted for "React Dashboard for Sales Analytics"', timestamp: '2026-03-01T14:00:00Z', type: 'info', jobId: 2 },
    { id: 'a3', message: 'Escrow funded for "Data Processing Pipeline for CSV Normalization"', timestamp: '2026-02-25T09:30:00Z', type: 'info', jobId: 3 },
    { id: 'a4', message: 'Validation failed for "Smart Contract Audit Report Generator" — score 41', timestamp: '2026-03-08T18:30:00Z', type: 'error', jobId: 5 },
    { id: 'a5', message: 'New job created: "Node.js Authentication Service with JWT"', timestamp: '2026-03-01T15:00:00Z', type: 'info', jobId: 4 },
]
