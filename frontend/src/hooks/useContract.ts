export function useContract() {
    const createJob = async (reqHash: string, testHash: string, freelancerAddr: string, deadline: number) => {
        console.log('[Contract] createJob', { reqHash, testHash, freelancerAddr, deadline })
        return { hash: '0x' + '0'.repeat(64) }
    }

    const fundJob = async (jobId: number, amount: string) => {
        console.log('[Contract] fundJob', { jobId, amount })
        return { hash: '0x' + '0'.repeat(64) }
    }

    const submitWork = async (jobId: number, repoUrl: string, submissionHash: string) => {
        console.log('[Contract] submitWork', { jobId, repoUrl, submissionHash })
        return { hash: '0x' + '0'.repeat(64) }
    }

    const claimTimeout = async (jobId: number) => {
        console.log('[Contract] claimTimeout', { jobId })
        return { hash: '0x' + '0'.repeat(64) }
    }

    const getJob = async (jobId: number) => {
        console.log('[Contract] getJob', { jobId })
        return null
    }

    return { createJob, fundJob, submitWork, claimTimeout, getJob }
}
