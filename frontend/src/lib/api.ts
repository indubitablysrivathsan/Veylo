import type { Job, User, ValidationReport, AmbiguityResult, TestSuite, ReputationProfile } from '@/types'
import { API_BASE_URL } from '@/lib/constants'

// ── Helpers ────────────────────────────────────────
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        ...options,
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error || `API error ${res.status}`)
    }
    return res.json()
}

/** Normalize a job from backend shape to frontend shape */
function normalizeJob(raw: Record<string, unknown>): Job {
    return {
        ...(raw as unknown as Job),
        testSuite: (raw.testSuiteJson as TestSuite | null) ?? (raw.testSuite as TestSuite | null) ?? null,
        testSuiteJson: (raw.testSuiteJson as TestSuite | null) ?? null,
        validationReport: (raw.validationReport as ValidationReport | null) ?? null,
        outcome: (raw.outcome as string) ?? 'NONE',
        paymentAmountINR: (raw.paymentAmountINR as number | null) ?? null,
        validatedAt: (raw.validatedAt as string | null) ?? null,
        closedAt: (raw.closedAt as string | null) ?? null,
        fundTxHash: (raw.fundTxHash as string | null) ?? null,
        validateTxHash: (raw.validateTxHash as string | null) ?? null,
    }
}

// ── Jobs ───────────────────────────────────────────
export async function createJob(data: {
    title?: string
    description: string
    clientAddress: string
    deadline?: string
    testSuite?: TestSuite
    paymentAmountINR?: number
    requirementsHash?: string
    testSuiteHash?: string
    techStack?: string
    expectedDeliverable?: string
}): Promise<Job> {
    const raw = await apiFetch<Record<string, unknown>>('/jobs', {
        method: 'POST',
        body: JSON.stringify(data),
    })
    return normalizeJob(raw)
}

export async function fundJob(jobId: number): Promise<{ success: boolean }> {
    await apiFetch(`/jobs/${jobId}/fund`, { method: 'POST' })
    return { success: true }
}

export async function getJobs(state?: string): Promise<Job[]> {
    const query = state ? `?state=${state}` : ''
    const raw = await apiFetch<Record<string, unknown>[]>(`/jobs${query}`)
    return raw.map(normalizeJob)
}

export async function getJobById(id: number): Promise<Job> {
    const raw = await apiFetch<Record<string, unknown>>(`/jobs/${id}`)
    const job = normalizeJob(raw)

    // If job has been validated, fetch the report separately
    if (job.state === 'VALIDATED' && !job.validationReport) {
        try {
            const report = await apiFetch<ValidationReport>(`/validation/${id}`)
            job.validationReport = report
        } catch {
            // No report available yet
        }
    }

    return job
}

export async function acceptJob(jobId: number, freelancerAddress: string): Promise<{ success: boolean }> {
    await apiFetch(`/jobs/${jobId}/accept`, {
        method: 'PUT',
        body: JSON.stringify({ freelancerAddress }),
    })
    return { success: true }
}

// ── Submission ─────────────────────────────────────
export async function submitWork(jobId: number, repoUrl: string): Promise<{ success: boolean }> {
    await apiFetch(`/jobs/${jobId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ repoUrl }),
    })
    return { success: true }
}

// ── Validation ─────────────────────────────────────
export async function runValidation(jobId: number): Promise<{ started: boolean }> {
    await apiFetch('/validation/run', {
        method: 'POST',
        body: JSON.stringify({ jobId }),
    })
    return { started: true }
}

export async function getValidation(jobId: number): Promise<ValidationReport | null> {
    try {
        return await apiFetch<ValidationReport>(`/validation/${jobId}`)
    } catch {
        return null
    }
}

export async function generateTests(description: string): Promise<TestSuite> {
    const result = await apiFetch<{ testSuite: TestSuite }>('/validation/generate-tests', {
        method: 'POST',
        body: JSON.stringify({ description }),
    })
    return result.testSuite
}

export async function checkAmbiguity(description: string): Promise<AmbiguityResult> {
    return apiFetch<AmbiguityResult>('/validation/check-ambiguity', {
        method: 'POST',
        body: JSON.stringify({ description }),
    })
}

// ── Reputation ─────────────────────────────────────
export async function getReputation(address: string): Promise<ReputationProfile> {
    return apiFetch<ReputationProfile>(`/reputation/${address}`)
}

export async function getReputationBadges(address: string): Promise<string[]> {
    const result = await apiFetch<{ badges: string[] }>(`/reputation/${address}/badges`)
    return result.badges
}

// ── Auth API ──────────────────────────────────────────
export async function authRegister(email: string, password: string, name: string, role: string): Promise<{ token: string; user: User }> {
    return apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name, role }),
    })
}

export async function authLogin(email: string, password: string): Promise<{ token: string; user: User }> {
    return apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    })
}

export async function authLogout(): Promise<void> {
    try {
        await apiFetch('/auth/logout', { method: 'POST' })
    } catch {
        // Ignore logout errors
    }
}

export async function authMe(): Promise<User> {
    return apiFetch('/auth/me')
}

export async function authGoogle(profile: { email: string; name: string; googleId: string }): Promise<{ token: string; user: User }> {
    return apiFetch('/auth/google', {
        method: 'POST',
        body: JSON.stringify(profile),
    })
}
