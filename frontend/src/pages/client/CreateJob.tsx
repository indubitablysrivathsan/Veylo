import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import GlassCard from '@/components/shared/GlassCard'
import { checkAmbiguity, generateTests, createJob } from '@/lib/api'
import { useWallet } from '@/hooks/useWallet'
import { cn, formatEth, formatUsd } from '@/lib/utils'
import type { AmbiguityResult, TestSuite, TestCase } from '@/types'
import {
    ClipboardCheck, ScanSearch, FlaskConical, Coins,
    ArrowRight, ArrowLeft, Check, X, AlertTriangle,
    FileText, ChevronRight, Lock,
} from 'lucide-react'

const STEPS = [
    { label: 'Requirements', icon: ClipboardCheck },
    { label: 'Ambiguity Review', icon: ScanSearch },
    { label: 'Test Suite', icon: FlaskConical },
    { label: 'Fund Escrow', icon: Coins },
]

export default function CreateJob() {
    const [step, setStep] = useState(0)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [deadline, setDeadline] = useState('')
    const [escrow, setEscrow] = useState('0.50')
    const [loading, setLoading] = useState(false)
    const [ambiguity, setAmbiguity] = useState<AmbiguityResult | null>(null)
    const [testSuite, setTestSuite] = useState<TestSuite | null>(null)
    const [reqHash, setReqHash] = useState('')
    const [testHash, setTestHash] = useState('')
    const navigate = useNavigate()
    const { state: wallet } = useWallet()

    const analyzeRequirements = async () => {
        setLoading(true)
        const result = await checkAmbiguity(description)
        setAmbiguity(result)
        setLoading(false)
        setStep(1)
    }

    const handleGenerateTests = async () => {
        setLoading(true)
        const suite = await generateTests(description)
        setTestSuite(suite)
        setLoading(false)
        setStep(2)
    }

    const approveAndLock = async () => {
        const encoder = new TextEncoder()
        const descBuf = await crypto.subtle.digest('SHA-256', encoder.encode(description))
        const testBuf = await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify(testSuite)))
        const rh = '0x' + Array.from(new Uint8Array(descBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
        const th = '0x' + Array.from(new Uint8Array(testBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
        setReqHash(rh)
        setTestHash(th)

        setLoading(true)
        await createJob({ description, clientAddress: wallet.address || '', deadline: deadline || undefined, testSuite: testSuite || undefined })
        setLoading(false)
        setStep(3)
    }

    const fundEscrow = () => {
        navigate('/client')
    }

    const slideVariants = {
        enter: { opacity: 0, x: 20 },
        center: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 },
    }

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="font-display font-bold text-2xl text-text-primary mb-6">Create Job</h1>

            {/* Stepper */}
            <div className="flex items-center gap-2 mb-8">
                {STEPS.map((s, i) => (
                    <div key={s.label} className="flex items-center">
                        <div className={cn(
                            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                            i === step ? 'bg-violet-500/15 text-violet-400 border border-violet-500/25' :
                                i < step ? 'bg-emerald-500/10 text-emerald-400' : 'text-text-muted',
                        )}>
                            <span className="font-mono">{i + 1}</span>
                            <span className="hidden md:inline font-body">{s.label}</span>
                        </div>
                        {i < STEPS.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-text-muted mx-1" />}
                    </div>
                ))}
            </div>

            {/* Step content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                    {step === 0 && (
                        <GlassCard variant="elevated" className="p-7 space-y-5">
                            <div>
                                <label className="block text-xs text-text-secondary mb-1.5 font-body">Job Title</label>
                                <input
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Python REST API for Fibonacci Sequence"
                                    className="w-full px-4 py-2.5 rounded-lg bg-white/[0.035] border border-white/[0.07] text-text-primary text-sm font-body placeholder:text-text-muted focus:outline-none focus:border-violet-500/40 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-text-secondary mb-1.5 font-body">Description & Requirements</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    rows={6}
                                    placeholder="Be specific about inputs, outputs, constraints, and acceptance criteria."
                                    className="w-full px-4 py-3 rounded-lg bg-white/[0.035] border border-white/[0.07] text-text-primary text-sm font-body placeholder:text-text-muted focus:outline-none focus:border-violet-500/40 transition-colors resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-text-secondary mb-1.5 font-body">Deadline</label>
                                    <input
                                        type="date"
                                        value={deadline}
                                        onChange={e => setDeadline(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-lg bg-white/[0.035] border border-white/[0.07] text-text-primary text-sm font-body focus:outline-none focus:border-violet-500/40 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-text-secondary mb-1.5 font-body">Escrow (ETH)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={escrow}
                                        onChange={e => setEscrow(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-lg bg-white/[0.035] border border-white/[0.07] text-text-primary text-sm font-mono focus:outline-none focus:border-violet-500/40 transition-colors"
                                    />
                                    <p className="text-[11px] text-text-muted mt-1 font-body">{formatUsd(escrow)}</p>
                                </div>
                            </div>
                            <button
                                onClick={analyzeRequirements}
                                disabled={!description || loading}
                                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-medium transition-colors"
                            >
                                {loading ? 'Analyzing...' : 'Analyze Requirements'} <ArrowRight className="w-4 h-4" />
                            </button>
                        </GlassCard>
                    )}

                    {step === 1 && ambiguity && (
                        <GlassCard variant="elevated" className="p-7 space-y-5">
                            <h2 className="font-display font-semibold text-base text-text-primary">Ambiguity Review</h2>
                            {ambiguity.isClean ? (
                                <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                    <Check className="w-5 h-5 text-emerald-400" />
                                    <p className="text-sm text-emerald-400 font-body">Requirements are clear and measurable.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {ambiguity.warnings?.map((w, i) => (
                                        <div key={i} className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-2">
                                            <div className="flex items-start gap-2">
                                                <AlertTriangle className={cn('w-4 h-4 mt-0.5 flex-shrink-0', w.severity === 'high' ? 'text-red-400' : w.severity === 'medium' ? 'text-amber-400' : 'text-text-muted')} />
                                                <div>
                                                    <p className="text-sm text-amber-400 font-body">"{w.originalText}"</p>
                                                    <p className="text-xs text-text-muted font-body mt-1">{w.reason}</p>
                                                    <p className="text-xs text-emerald-400 font-body mt-1">{w.suggestion}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex gap-3">
                                <button onClick={() => setStep(0)} className="px-4 py-2.5 rounded-lg border border-white/[0.07] text-text-secondary text-sm font-medium hover:bg-white/[0.03] transition-colors">
                                    <ArrowLeft className="w-4 h-4 inline mr-1.5" /> Back
                                </button>
                                <button
                                    onClick={handleGenerateTests}
                                    disabled={loading}
                                    className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-medium transition-colors"
                                >
                                    {loading ? 'Generating...' : 'Generate Test Suite'} <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </GlassCard>
                    )}

                    {step === 2 && testSuite && (
                        <GlassCard variant="elevated" className="p-7 space-y-5">
                            <h2 className="font-display font-semibold text-base text-text-primary">Review Test Suite</h2>
                            {testSuite.required_files && testSuite.required_files.length > 0 && (
                                <div>
                                    <h3 className="text-xs text-text-muted mb-2 font-body">Required Files</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {testSuite.required_files.map(f => (
                                            <span key={f} className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.04] border border-white/[0.06] text-xs font-mono text-text-secondary">
                                                <FileText className="w-3 h-3" /> {f}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {testSuite.testCases && (
                                <div className="space-y-2">
                                    <h3 className="text-xs text-text-muted font-body">Test Cases ({testSuite.testCases.length})</h3>
                                    {testSuite.testCases.map((tc: TestCase) => (
                                        <div key={tc.id} className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.05] space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wider',
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
                            <div className="flex gap-3">
                                <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-lg border border-white/[0.07] text-text-secondary text-sm font-medium hover:bg-white/[0.03] transition-colors">
                                    <ArrowLeft className="w-4 h-4 inline mr-1.5" /> Back
                                </button>
                                <button
                                    onClick={approveAndLock}
                                    disabled={loading}
                                    className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-medium transition-colors"
                                >
                                    <Lock className="w-4 h-4" /> {loading ? 'Locking...' : 'Approve and Lock'}
                                </button>
                            </div>
                        </GlassCard>
                    )}

                    {step === 3 && (
                        <GlassCard variant="elevated" className="p-7 space-y-5">
                            <h2 className="font-display font-semibold text-base text-text-primary">Fund Escrow</h2>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-text-muted font-body">Title</span>
                                    <span className="text-text-primary">{title}</span>
                                </div>
                                <div className="gradient-divider" />
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-text-muted font-body">Requirements Hash</span>
                                    <span className="font-mono text-xs text-text-secondary">{reqHash.slice(0, 14)}...</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-text-muted font-body">Test Suite Hash</span>
                                    <span className="font-mono text-xs text-text-secondary">{testHash.slice(0, 14)}...</span>
                                </div>
                                <div className="gradient-divider" />
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-text-muted font-body">Escrow Amount</span>
                                    <span className="font-mono font-semibold text-text-primary">{formatEth(escrow)}</span>
                                </div>
                            </div>
                            <button
                                onClick={fundEscrow}
                                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
                            >
                                <Coins className="w-4 h-4" /> Fund Escrow
                            </button>
                        </GlassCard>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}
