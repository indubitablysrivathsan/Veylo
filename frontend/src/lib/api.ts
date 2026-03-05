import type { Job, ValidationReport, AmbiguityResult, TestSuite, ReputationProfile } from '@/types'
import { mockJobs, mockAmbiguityResult, mockTestSuites, mockReputationProfiles, mockValidationReportPass } from '@/lib/mockData'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

// ── Jobs ───────────────────────────────────────────
export async function createJob(data: {
    description: string
    clientAddress: string
    deadline?: string
    testSuite?: TestSuite
}): Promise<Job> {
    await delay(800)
    return { ...mockJobs[3], id: Date.now(), description: data.description, clientAddress: data.clientAddress, createdAt: new Date().toISOString() }
}

export async function getJobs(state?: string): Promise<Job[]> {
    await delay(400)
    if (state) return mockJobs.filter(j => j.state === state)
    return mockJobs
}

export async function getJobById(id: number): Promise<Job> {
    await delay(300)
    return mockJobs.find(j => j.id === id) || mockJobs[0]
}

export async function acceptJob(jobId: number, freelancerAddress: string): Promise<{ success: boolean }> {
    await delay(600)
    return { success: true }
}

// ── Submission ─────────────────────────────────────
export async function submitWork(jobId: number, repoUrl: string): Promise<{ success: boolean }> {
    await delay(1000)
    return { success: true }
}

// ── Validation ─────────────────────────────────────
export async function runValidation(jobId: number): Promise<{ started: boolean }> {
    await delay(500)
    return { started: true }
}

export async function getValidation(jobId: number): Promise<ValidationReport | null> {
    await delay(300)
    const job = mockJobs.find(j => j.id === jobId)
    return job?.validationReport || null
}

export async function generateTests(description: string): Promise<TestSuite> {
    await delay(1200)
    return mockTestSuites.python_api
}

export async function checkAmbiguity(description: string): Promise<AmbiguityResult> {
    await delay(1000)
    return mockAmbiguityResult
}

// ── Reputation ─────────────────────────────────────
export async function getReputation(address: string): Promise<ReputationProfile> {
    await delay(300)
    return mockReputationProfiles[address] || Object.values(mockReputationProfiles)[0]
}

export async function getReputationBadges(address: string): Promise<string[]> {
    await delay(200)
    const profile = mockReputationProfiles[address] || Object.values(mockReputationProfiles)[0]
    return profile.badges
}
