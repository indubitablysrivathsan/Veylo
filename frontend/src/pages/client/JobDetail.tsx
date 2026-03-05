import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlassCard from '@/components/shared/GlassCard'
import StatusBadge from '@/components/shared/StatusBadge'
import HashDisplay from '@/components/shared/HashDisplay'

import DeadlineCountdown from '@/components/shared/DeadlineCountdown'
import ScoreDisplay from '@/components/shared/ScoreDisplay'
import ScoreBar from '@/components/shared/ScoreBar'
import { getJobById, runValidation } from '@/lib/api'
import { cn, formatDate, formatDuration } from '@/lib/utils'
import { SCORE_WEIGHTS } from '@/lib/constants'
import type { Job, TestCase } from '@/types'
import {
    FileText, ExternalLink, Check, Circle, Play,
    AlertTriangle, Clock, Lock,
} from 'lucide-react'

const stateSteps: { state: string; label: string }[] = [
    { state: 'CREATED', label: 'Created' },
    { state: 'FUNDED', label: 'Funded' },
    { state: 'WORK_SUBMITTED', label: 'Submitted' },
    { state: 'VALIDATED', label: 'Validated' },
    { state: 'CLOSED', label: 'Closed' },
]

export default function ClientJobDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [job, setJob] = useState<Job | null>(null)
    const [tab, setTab] = useState<'requirements' | 'tests' | 'submission' | 'validation' | 'chain'>('requirements')

    useEffect(() => {
        if (id) getJobById(Number(id)).then(setJob)
    }, [id])

    if (!job) return <div className="p-8 text-text-muted">Loading...</div>

    const stateIndex = stateSteps.findIndex(s => s.state === job.state)
    const report = job.validationReport
    const tabs = [
        { key: 'requirements' as const, label: 'Requirements' },
        { key: 'tests' as const, label: 'Test Suite' },
        { key: 'submission' as const, label: 'Submission' },
        { key: 'validation' as const, label: 'Validation' },
        { key: 'chain' as const, label: 'On-Chain' },
    ]

    return (
        <div className="max-w-4xl">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="font-display font-bold text-xl text-text-primary">{job.description.slice(0, 70)}...</h1>
                        <StatusBadge status={job.state} />
                    </div>
                    <p className="font-mono text-xs text-text-muted">Job #{job.id}</p>
                </div>
            </div>

            {/* Contract info */}
            <GlassCard className="p-6 mb-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <HashDisplay hash={job.requirementsHash} label="Requirements Hash" />
                        {job.testSuiteHash && <HashDisplay hash={job.testSuiteHash} label="Test Suite Hash" />}
                        <DeadlineCountdown deadline={job.deadline} />
                    </div>
                    <div className="space-y-3">
                        {job.freelancerAddress ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-text-muted">Freelancer</span>
                                <span className="font-mono text-xs text-text-secondary">{job.freelancerAddress}</span>
                            </div>
                        ) : (
                            <p className="text-xs text-text-muted">Awaiting freelancer</p>
                        )}
                        {job.submissionHash && <HashDisplay hash={job.submissionHash} label="Submission Hash" />}
                    </div>
                </div>
            </GlassCard>

            {/* State timeline */}
            <div className="flex items-center gap-1 mb-8 px-2">
                {stateSteps.map((s, i) => {
                    const isPast = i < stateIndex
                    const isCurrent = i === stateIndex
                    return (
                        <div key={s.state} className="flex items-center flex-1">
                            <div className={cn(
                                'w-7 h-7 rounded-full flex items-center justify-center border text-xs',
                                isPast ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' :
                                    isCurrent ? 'bg-violet-500/20 border-violet-500/40 text-violet-400' :
                                        'bg-white/5 border-white/10 text-text-muted',
                            )}>
                                {isPast ? <Check className="w-3 h-3" /> : <Circle className="w-2 h-2" />}
                            </div>
                            {i < stateSteps.length - 1 && (
                                <div className={cn('flex-1 h-0.5 mx-1', isPast ? 'bg-emerald-500/30' : 'bg-white/[0.07]')} />
                            )}
                        </div>
                    )
                })}
            </div>
            <div className="flex items-center gap-1 mb-8 px-2">
                {stateSteps.map((s, i) => (
                    <div key={s.label} className="flex-1 text-center">
                        <span className={cn('text-[10px]', i <= stateIndex ? 'text-text-secondary' : 'text-text-muted')}>{s.label}</span>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-white/[0.06] pb-px">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={cn(
                            'px-4 py-2 text-sm font-body font-medium transition-colors relative',
                            tab === t.key ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary',
                        )}
                    >
                        {t.label}
                        {tab === t.key && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full" />}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <GlassCard className="p-6">
                {tab === 'requirements' && (
                    <div className="space-y-4">
                        <p className="text-sm text-text-secondary font-body leading-relaxed whitespace-pre-wrap">{job.description}</p>
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                            <Lock className="w-3 h-3" /> Locked on-chain
                        </div>
                    </div>
                )}

                {tab === 'tests' && job.testSuite && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-4 text-xs text-text-muted mb-4">
                            <span className="font-mono">{job.testSuite.language}</span>
                            <span className="font-mono">{job.testSuite.testCommand}</span>
                        </div>
                        {job.testSuite.testCases?.map((tc: TestCase) => (
                            <div key={tc.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded uppercase font-medium',
                                        tc.type === 'unit' ? 'bg-violet-500/15 text-violet-400' :
                                            tc.type === 'integration' ? 'bg-blue-500/15 text-blue-400' :
                                                'bg-amber-500/15 text-amber-400'
                                    )}>{tc.type}</span>
                                    <span className="text-xs text-text-primary">{tc.description}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {tab === 'submission' && (
                    <div className="space-y-3">
                        {job.repoUrl ? (
                            <>
                                <a href={job.repoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-violet-400 hover:underline">
                                    <ExternalLink className="w-3.5 h-3.5" /> {job.repoUrl}
                                </a>
                                {job.submissionHash && <HashDisplay hash={job.submissionHash} label="Submission Hash" />}
                                {job.submittedAt && <p className="text-xs text-text-muted">Submitted {formatDate(job.submittedAt)}</p>}
                            </>
                        ) : (
                            <p className="text-sm text-text-muted">No submission yet</p>
                        )}
                    </div>
                )}

                {tab === 'validation' && report && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-6">
                            <ScoreDisplay score={report.overallScore} size="lg" />
                            <StatusBadge status={report.verdict} />
                        </div>
                        <div className="space-y-2.5">
                            <ScoreBar label="Execution" weight={SCORE_WEIGHTS.execution} score={report.execution?.score ?? 0} />
                            <ScoreBar label="Repo Viability" weight={SCORE_WEIGHTS.repoViability} score={report.repoViability?.score ?? 0} />
                            <ScoreBar label="Lint" weight={SCORE_WEIGHTS.lint} score={report.lint?.score ?? 0} />
                            <ScoreBar label="Semantic" weight={SCORE_WEIGHTS.semantic} score={report.semantic?.score ?? 0} />
                        </div>
                        {report.semantic?.reasoning && (
                            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                                <p className="text-xs text-text-secondary font-body leading-relaxed">{report.semantic.reasoning}</p>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'chain' && (
                    <div className="space-y-3">
                        {job.createTxHash && <HashDisplay hash={job.createTxHash} label="Create Tx" link />}
                        {report && <HashDisplay hash={report.reportHash} label="Report Hash" />}
                        {report && (
                            <div className="flex items-center gap-4 text-xs text-text-muted">
                                <span>{report.metadata.language}</span>
                                <span>{formatDuration(report.metadata.durationMs)}</span>
                                <span>{formatDate(report.metadata.timestamp)}</span>
                            </div>
                        )}
                    </div>
                )}
            </GlassCard>

            {/* Action panel */}
            {job.state === 'WORK_SUBMITTED' && (
                <div className="mt-6">
                    <button
                        onClick={() => navigate(`/client/job/${job.id}/validation`)}
                        className="flex items-center gap-2 px-5 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
                    >
                        <Play className="w-4 h-4" /> Run Validation
                    </button>
                </div>
            )}
        </div>
    )
}
