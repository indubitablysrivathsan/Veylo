import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlassCard from '@/components/shared/GlassCard'
import StatusBadge from '@/components/shared/StatusBadge'
import HashDisplay from '@/components/shared/HashDisplay'
import DeadlineCountdown from '@/components/shared/DeadlineCountdown'
import ScoreDisplay from '@/components/shared/ScoreDisplay'
import ScoreBar from '@/components/shared/ScoreBar'
import { getJobById, submitWork as submitWorkApi, acceptJob } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { cn, formatDate } from '@/lib/utils'
import { SCORE_WEIGHTS } from '@/lib/constants'
import type { Job, TestCase } from '@/types'
import { Lock, FileText, Send, ExternalLink, Download, Play, CheckCircle2 } from 'lucide-react'

export default function FreelancerJobDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { state: auth } = useAuth()
    const [job, setJob] = useState<Job | null>(null)
    const [repoUrl, setRepoUrl] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [accepting, setAccepting] = useState(false)
    const [accepted, setAccepted] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (id) getJobById(Number(id)).then(setJob)
    }, [id])

    if (!job) return <div className="p-8 text-text-muted">Loading...</div>

    const report = job.validationReport
    const isOpen = (job.state === 'CREATED' || job.state === 'FUNDED') && !job.freelancerAddress
    const canSubmit = ((job.state === 'CREATED' || job.state === 'FUNDED') && (job.freelancerAddress || accepted))

    const handleAcceptJob = async () => {
        setAccepting(true)
        setError('')
        try {
            await acceptJob(job.id, auth.user?.email || 'freelancer')
            setAccepted(true)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to accept job')
        } finally {
            setAccepting(false)
        }
    }

    const handleSubmit = async () => {
        setSubmitting(true)
        setError('')
        try {
            await submitWorkApi(job.id, repoUrl)
            setSubmitted(true)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit work')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDownloadTestSuite = () => {
        if (!job.testSuite) return
        const blob = new Blob([JSON.stringify(job.testSuite, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `test-suite-job-${job.id}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="max-w-3xl">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="font-display font-bold text-xl text-text-primary">{job.title || job.description.slice(0, 70)}...</h1>
                        <StatusBadge status={job.state} />
                    </div>
                    <p className="font-mono text-xs text-text-muted">Job #{job.id}</p>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400 font-body">
                    <p>{error}</p>
                </div>
            )}

            {/* Locked requirements */}
            <GlassCard className="p-6 mb-6">
                <h2 className="font-display font-semibold text-base text-text-primary mb-3">Requirements</h2>
                <p className="text-sm text-text-secondary font-body leading-relaxed whitespace-pre-wrap mb-4">{job.description}</p>
                <div className="flex items-center gap-4">
                    <HashDisplay hash={job.requirementsHash} label="Requirements Hash" />
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <Lock className="w-3 h-3" /> Locked on-chain
                    </div>
                </div>
                <div className="mt-3">
                    <DeadlineCountdown deadline={job.deadline} />
                </div>
            </GlassCard>

            {/* Test Suite */}
            {job.testSuite && (
                <GlassCard className="p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-display font-semibold text-base text-text-primary">Test Suite</h2>
                        <button
                            onClick={handleDownloadTestSuite}
                            className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                        >
                            <Download className="w-3 h-3" /> Download JSON
                        </button>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-text-muted font-mono mb-4">
                        <span>{job.testSuite.language}</span>
                        <span>{job.testSuite.testCommand}</span>
                    </div>
                    {job.testSuite.required_files && (
                        <div className="mb-4">
                            <p className="text-xs text-text-muted mb-2 font-body">Required Files</p>
                            <div className="flex flex-wrap gap-2">
                                {job.testSuite.required_files.map(f => (
                                    <span key={f} className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.04] border border-white/[0.06] text-xs font-mono text-text-secondary">
                                        <FileText className="w-3 h-3" /> {f}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {job.testSuite.testCases && (
                        <div className="space-y-2">
                            {job.testSuite.testCases.map((tc: TestCase) => (
                                <div key={tc.id} className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded uppercase font-medium',
                                            tc.type === 'unit' ? 'bg-violet-500/15 text-violet-400' :
                                                tc.type === 'integration' ? 'bg-blue-500/15 text-blue-400' :
                                                    'bg-amber-500/15 text-amber-400'
                                        )}>{tc.type}</span>
                                        <span className="text-xs text-text-primary font-body">{tc.description}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                                        <div><span className="text-text-muted">Input:</span> <span className="text-text-secondary">{tc.input}</span></div>
                                        <div><span className="text-text-muted">Expected:</span> <span className="text-text-secondary">{tc.expectedOutput}</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </GlassCard>
            )}

            {/* Accept Job */}
            {isOpen && !accepted && (
                <GlassCard variant="elevated" className="p-6 mb-6">
                    <h2 className="font-display font-semibold text-base text-text-primary mb-2">Accept This Job</h2>
                    <p className="text-sm text-text-secondary font-body mb-4">Review the requirements and test suite above. By accepting, you commit to delivering work that passes the validation pipeline.</p>
                    <button
                        onClick={handleAcceptJob}
                        disabled={accepting}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-medium transition-colors"
                    >
                        <CheckCircle2 className="w-4 h-4" /> {accepting ? 'Accepting...' : 'Accept Job'}
                    </button>
                </GlassCard>
            )}

            {accepted && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <GlassCard className="p-4 mb-6 border-emerald-500/20">
                        <p className="text-sm text-emerald-400 font-body flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Job accepted. You can now submit your work below.</p>
                    </GlassCard>
                </motion.div>
            )}

            {/* Submit work */}
            {(canSubmit || job.state === 'CREATED' || job.state === 'FUNDED') && !submitted && (
                <GlassCard variant="elevated" className="p-6 mb-6">
                    <h2 className="font-display font-semibold text-base text-text-primary mb-4">Submit Work</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs text-text-secondary mb-1.5 font-body">Repository URL</label>
                            <input
                                value={repoUrl}
                                onChange={e => setRepoUrl(e.target.value)}
                                placeholder="https://github.com/username/repo"
                                className="w-full px-4 py-2.5 rounded-lg bg-white/[0.035] border border-white/[0.07] text-text-primary text-sm font-mono placeholder:text-text-muted focus:outline-none focus:border-violet-500/40 transition-colors"
                            />
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={!repoUrl || submitting}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-medium transition-colors"
                        >
                            <Send className="w-4 h-4" /> {submitting ? 'Submitting...' : 'Submit Work'}
                        </button>
                    </div>
                </GlassCard>
            )}

            {submitted && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <GlassCard className="p-6 mb-6 border-emerald-500/20">
                        <p className="text-sm text-emerald-400 font-body">Work submitted successfully.</p>
                    </GlassCard>
                </motion.div>
            )}

            {/* Validation results */}
            {report && (
                <GlassCard className="p-6 mb-6">
                    <h2 className="font-display font-semibold text-base text-text-primary mb-4">Validation Results</h2>
                    <div className="flex items-center gap-6 mb-5">
                        <ScoreDisplay score={report.overallScore} size="lg" />
                        <StatusBadge status={report.verdict} />
                    </div>
                    <div className="space-y-2.5">
                        <ScoreBar label="Execution" weight={SCORE_WEIGHTS.execution} score={report.execution?.score ?? 0} />
                        <ScoreBar label="Repo Viability" weight={SCORE_WEIGHTS.repoViability} score={report.repoViability?.score ?? 0} />
                        <ScoreBar label="Lint" weight={SCORE_WEIGHTS.lint} score={report.lint?.score ?? 0} />
                        <ScoreBar label="Semantic" weight={SCORE_WEIGHTS.semantic} score={report.semantic?.score ?? 0} />
                    </div>
                </GlassCard>
            )}

            {/* View pipeline link */}
            {(job.state === 'WORK_SUBMITTED' || job.state === 'VALIDATED') && (
                <button
                    onClick={() => navigate(`/freelancer/job/${job.id}/validation`)}
                    className="flex items-center gap-2 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors"
                >
                    <Play className="w-4 h-4" /> View Validation Pipeline
                </button>
            )}
        </div>
    )
}
