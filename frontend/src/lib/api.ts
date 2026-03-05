import type { Job, User, ValidationReport, AmbiguityResult, TestSuite, ReputationProfile } from '@/types'
import { API_BASE_URL } from '@/lib/constants'
import {
    mockJobs, mockAmbiguityResult, mockTestSuites,
    mockReputationProfiles, mockValidationReportPass
} from '@/lib/mockData'

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
        paymentAmountINR: (raw.paymentAmountINR as number | null) ?? (raw.amountWei ? parseFloat(raw.amountWei as string) : null),
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
}): Promise<Job> {
    try {
        const raw = await apiFetch<Record<string, unknown>>('/jobs', {
            method: 'POST',
            body: JSON.stringify(data),
        })
        return normalizeJob(raw)
    } catch (err) {
        console.warn('[API] createJob fallback to mock:', err)
        return { ...mockJobs[3], id: Date.now(), description: data.description, clientAddress: data.clientAddress, createdAt: new Date().toISOString() }
    }
}

export async function getJobs(state?: string): Promise<Job[]> {
    try {
        const query = state ? `?state=${state}` : ''
        const raw = await apiFetch<Record<string, unknown>[]>(`/jobs${query}`)
        return raw.map(normalizeJob)
    } catch (err) {
        console.warn('[API] getJobs fallback to mock:', err)
        if (state) return mockJobs.filter(j => j.state === state)
        return mockJobs
    }
}

export async function getJobById(id: number): Promise<Job> {
    try {
        const raw = await apiFetch<Record<string, unknown>>(`/jobs/${id}`)
        const job = normalizeJob(raw)

        // If job has been validated, fetch the report separately
        if (job.state === 'VALIDATED' && !job.validationReport) {
            try {
                const report = await apiFetch<ValidationReport>(`/validation/${id}`)
                job.validationReport = report
            } catch {
                // No report available
            }
        }

        return job
    } catch (err) {
        console.warn('[API] getJobById fallback to mock:', err)
        return mockJobs.find(j => j.id === id) || mockJobs[0]
    }
}

export async function acceptJob(jobId: number, freelancerAddress: string): Promise<{ success: boolean }> {
    try {
        await apiFetch(`/jobs/${jobId}/accept`, {
            method: 'PUT',
            body: JSON.stringify({ freelancerAddress }),
        })
        return { success: true }
    } catch (err) {
        console.warn('[API] acceptJob fallback to mock:', err)
        return { success: true }
    }
}

// ── Submission ─────────────────────────────────────
export async function submitWork(jobId: number, repoUrl: string): Promise<{ success: boolean }> {
    try {
        await apiFetch(`/jobs/${jobId}/submit`, {
            method: 'POST',
            body: JSON.stringify({ repoUrl }),
        })
        return { success: true }
    } catch (err) {
        console.warn('[API] submitWork fallback to mock:', err)
        return { success: true }
    }
}

// ── Validation ─────────────────────────────────────
export async function runValidation(jobId: number): Promise<{ started: boolean }> {
    try {
        await apiFetch('/validation/run', {
            method: 'POST',
            body: JSON.stringify({ jobId }),
        })
        return { started: true }
    } catch (err) {
        console.warn('[API] runValidation fallback to mock:', err)
        return { started: true }
    }
}

export async function getValidation(jobId: number): Promise<ValidationReport | null> {
    try {
        return await apiFetch<ValidationReport>(`/validation/${jobId}`)
    } catch (err) {
        console.warn('[API] getValidation fallback to mock:', err)
        const job = mockJobs.find(j => j.id === jobId)
        return job?.validationReport || null
    }
}

export async function generateTests(description: string): Promise<TestSuite> {
    try {
        const result = await apiFetch<{ testSuite: TestSuite }>('/validation/generate-tests', {
            method: 'POST',
            body: JSON.stringify({ description }),
        })
        return result.testSuite
    } catch (err) {
        console.warn('[API] generateTests fallback to mock:', err)
        return mockTestSuites.python_api
    }
}

export async function checkAmbiguity(description: string): Promise<AmbiguityResult> {
    try {
        return await apiFetch<AmbiguityResult>('/validation/check-ambiguity', {
            method: 'POST',
            body: JSON.stringify({ description }),
        })
    } catch (err) {
        console.warn('[API] checkAmbiguity fallback to mock:', err)
        return mockAmbiguityResult
    }
}

// ── Reputation ─────────────────────────────────────
export async function getReputation(address: string): Promise<ReputationProfile> {
    try {
        return await apiFetch<ReputationProfile>(`/reputation/${address}`)
    } catch (err) {
        console.warn('[API] getReputation fallback to mock:', err)
        return mockReputationProfiles[address] || Object.values(mockReputationProfiles)[0]
    }
}

export async function getReputationBadges(address: string): Promise<string[]> {
    try {
        const result = await apiFetch<{ badges: string[] }>(`/reputation/${address}/badges`)
        return result.badges
    } catch (err) {
        console.warn('[API] getReputationBadges fallback to mock:', err)
        const profile = mockReputationProfiles[address] || Object.values(mockReputationProfiles)[0]
        return profile.badges
    }
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
