import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlassCard from '@/components/shared/GlassCard'
import PipelineStageRow from '@/components/shared/PipelineStageIndicator'
import ScoreDisplay from '@/components/shared/ScoreDisplay'
import ScoreBar from '@/components/shared/ScoreBar'
import StatusBadge from '@/components/shared/StatusBadge'
import CountUp from '@/components/ui/CountUp'
import { useValidationPipeline } from '@/hooks/useValidationPipeline'
import { cn, getScoreColor } from '@/lib/utils'
import { SCORE_WEIGHTS } from '@/lib/constants'
import { RotateCcw, FileText } from 'lucide-react'

export default function ValidationView() {
    const { id } = useParams()
    const navigate = useNavigate()
    const jobId = id ? Number(id) : null
    const { pipelineState, isRunning, startPipeline } = useValidationPipeline(jobId, true)
    const { stages, isComplete, finalReport } = pipelineState

    const verdictLabels: Record<string, string> = {
        PASS: 'Payment Auto-Released',
        DISPUTE: 'Review Window Open',
        FAIL: 'Refund Triggered',
    }

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="font-display font-bold text-xl text-text-primary">Validation Pipeline</h1>
                    <p className="text-xs text-text-muted font-mono mt-1">Job #{id}</p>
                </div>
                {!isRunning && (
                    <button
                        onClick={startPipeline}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.07] text-text-secondary text-xs font-medium hover:bg-white/[0.03] transition-colors"
                    >
                        <RotateCcw className="w-3.5 h-3.5" /> Replay
                    </button>
                )}
            </div>

            {/* Pipeline stages */}
            <GlassCard variant="elevated" className="p-7 mb-6">
                <div className="space-y-0">
                    {stages.map((stage, i) => (
                        <PipelineStageRow
                            key={stage.id}
                            stage={stage}
                            isActive={i === pipelineState.currentStage}
                            isLast={i === stages.length - 1}
                            index={i}
                        />
                    ))}
                </div>
            </GlassCard>

            {/* Score reveal */}
            {isComplete && finalReport && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                    <GlassCard variant="elevated" className="p-8 text-center mb-6">
                        {/* Radial ring + score */}
                        <div className="relative inline-flex items-center justify-center mb-5">
                            <svg width="140" height="140" className="transform -rotate-90">
                                <circle cx="70" cy="70" r="62" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                                <motion.circle
                                    cx="70" cy="70" r="62"
                                    fill="none"
                                    stroke={getScoreColor(finalReport.overallScore) === 'green' ? '#10B981' : getScoreColor(finalReport.overallScore) === 'amber' ? '#F59E0B' : '#EF4444'}
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                    strokeDasharray={`${2 * Math.PI * 62}`}
                                    initial={{ strokeDashoffset: 2 * Math.PI * 62 }}
                                    animate={{ strokeDashoffset: 2 * Math.PI * 62 * (1 - finalReport.overallScore / 100) }}
                                    transition={{ duration: 1.5, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <ScoreDisplay score={finalReport.overallScore} size="lg" suffix="" />
                            </div>
                        </div>

                        {/* Score bars */}
                        <div className="max-w-md mx-auto space-y-2.5 mb-6">
                            <ScoreBar label="Execution" weight={SCORE_WEIGHTS.execution} score={finalReport.execution.score} />
                            <ScoreBar label="Structure" weight={SCORE_WEIGHTS.structure} score={finalReport.structure.score} />
                            <ScoreBar label="Lint" weight={SCORE_WEIGHTS.lint} score={finalReport.lint.score} />
                            <ScoreBar label="Semantic" weight={SCORE_WEIGHTS.semantic} score={finalReport.semantic.score} />
                        </div>

                        {/* Verdict */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 1.2, duration: 0.4 }}
                        >
                            <StatusBadge status={finalReport.verdict} className="text-sm px-4 py-1.5" />
                            <p className="text-xs text-text-muted mt-2 font-body">
                                {verdictLabels[finalReport.verdict]}
                            </p>
                        </motion.div>
                    </GlassCard>
                </motion.div>
            )}
        </div>
    )
}
