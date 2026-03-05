import { Link } from 'react-router-dom'
import GlassNavbar from '@/components/shared/GlassNavbar'
import Aurora from '@/components/ui/Aurora'
import BlurText from '@/components/ui/BlurText'
import ScrollReveal from '@/components/ui/ScrollReveal'
import SpotlightCard from '@/components/ui/SpotlightCard'
import CountUp from '@/components/ui/CountUp'
import { ArrowRight, ShieldCheck, Link2, Zap, ClipboardCheck, FlaskConical, Lock, Hammer, ScanSearch, CircleDollarSign, Github } from 'lucide-react'
import { SCORE_WEIGHTS } from '@/lib/constants'

const steps = [
    { num: '01', title: 'Define Requirements', desc: 'AI flags ambiguous language before you lock anything.', icon: ClipboardCheck },
    { num: '02', title: 'Generate Test Suite', desc: 'Requirements become executable, auditable validation criteria.', icon: FlaskConical },
    { num: '03', title: 'Lock and Fund', desc: 'Both hashes stored on-chain. Escrow funded. Nothing changes now.', icon: Lock },
    { num: '04', title: 'Build and Submit', desc: 'Freelancer sees the exact tests. Submits a repo URL.', icon: Hammer },
    { num: '05', title: 'Validate', desc: 'Four layers run in a sandboxed environment. A score is computed.', icon: ScanSearch },
    { num: '06', title: 'Settle', desc: 'Score above threshold — payment auto-released. Below — refund triggered.', icon: CircleDollarSign },
]

const differentiators = [
    {
        icon: ShieldCheck,
        title: 'Deterministic Outcome',
        text: 'Validation runs across execution, repo viability, static analysis, and AI reasoning. The score is a weighted formula, not a judgment.',
    },
    {
        icon: Link2,
        title: 'Immutable Agreement',
        text: 'Requirements and test criteria are hashed on-chain at job creation. Nothing can be changed retroactively.',
    },
    {
        icon: Zap,
        title: 'Trustless Settlement',
        text: 'The smart contract holds funds and releases them based solely on the validation score. Neither party controls the outcome.',
    },
]

const layers = [
    { label: 'Execution', weight: SCORE_WEIGHTS.execution, color: 'bg-emerald-500' },
    { label: 'Repo Viability', weight: SCORE_WEIGHTS.repoViability, color: 'bg-violet-500' },
    { label: 'Lint', weight: SCORE_WEIGHTS.lint, color: 'bg-amber-500' },
    { label: 'Semantic', weight: SCORE_WEIGHTS.semantic, color: 'bg-blue-500' },
]

export default function Landing() {
    return (
        <div className="relative min-h-screen bg-background overflow-hidden">
            <Aurora />
            <GlassNavbar />

            {/* Hero */}
            <section className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-6 pt-16">
                <h1 className="font-display font-extrabold text-5xl md:text-[56px] leading-tight text-text-primary mb-5 max-w-3xl">
                    <BlurText text="Autonomous Freelance Contracts" stagger={0.05} />
                </h1>
                <p className="text-lg text-text-secondary max-w-xl mb-8 font-body">
                    Requirements locked. Validation automated. Payment released by math.
                </p>
                <div className="flex items-center gap-4">
                    <Link
                        to="/auth"
                        className="flex items-center gap-2 px-6 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
                    >
                        Start as Client <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                        to="/auth"
                        className="px-6 py-3 rounded-lg border border-white/[0.11] text-text-secondary hover:text-text-primary hover:bg-white/[0.04] font-medium transition-all"
                    >
                        Start as Freelancer
                    </Link>
                </div>
            </section>

            {/* How it Works */}
            <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
                <ScrollReveal>
                    <h2 className="font-display font-bold text-3xl text-text-primary text-center mb-3">How it Works</h2>
                    <p className="text-text-secondary text-center mb-14 font-body">Six steps. Fully autonomous.</p>
                </ScrollReveal>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {steps.map((step, i) => (
                        <ScrollReveal key={step.num} staggerIndex={i}>
                            <div className="glass p-6 h-full">
                                <div className="flex items-start gap-4">
                                    <span className="font-mono text-2xl font-bold text-violet-500/60">{step.num}</span>
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <step.icon className="w-4 h-4 text-violet-400" />
                                            <h3 className="font-display font-semibold text-[15px] text-text-primary">{step.title}</h3>
                                        </div>
                                        <p className="text-sm text-text-secondary font-body leading-relaxed">{step.desc}</p>
                                    </div>
                                </div>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>
            </section>

            {/* Differentiators */}
            <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
                <ScrollReveal>
                    <h2 className="font-display font-bold text-3xl text-text-primary text-center mb-3">Why Veylo</h2>
                    <p className="text-text-secondary text-center mb-14 font-body">Built differently from the ground up.</p>
                </ScrollReveal>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {differentiators.map((d, i) => (
                        <ScrollReveal key={d.title} staggerIndex={i}>
                            <SpotlightCard className="p-7 h-full">
                                <d.icon className="w-8 h-8 text-violet-400 mb-4" strokeWidth={1.5} />
                                <h3 className="font-display font-semibold text-base text-text-primary mb-2">{d.title}</h3>
                                <p className="text-sm text-text-secondary font-body leading-relaxed">{d.text}</p>
                            </SpotlightCard>
                        </ScrollReveal>
                    ))}
                </div>
            </section>

            {/* Scoring */}
            <section className="relative z-10 max-w-3xl mx-auto px-6 py-24">
                <ScrollReveal>
                    <h2 className="font-display font-bold text-3xl text-text-primary text-center mb-3">Transparent Scoring</h2>
                    <p className="text-text-secondary text-center mb-10 font-body">Every score is a weighted composition of four validation layers.</p>
                </ScrollReveal>
                <ScrollReveal delay={0.15}>
                    <div className="glass p-7">
                        <p className="font-mono text-sm text-text-secondary mb-6 text-center leading-relaxed">
                            Final = 0.50 &times; Execution + 0.10 &times; Repo Viability + 0.20 &times; Lint + 0.20 &times; Semantic
                        </p>
                        <div className="space-y-3 mb-6">
                            {layers.map((l, i) => (
                                <div key={l.label} className="flex items-center gap-3">
                                    <span className="text-xs text-text-secondary font-body w-20 text-right">{l.label}</span>
                                    <div className="flex-1 h-3 rounded-full bg-white/[0.04] overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${l.color}`}
                                            style={{ width: `${l.weight * 250}%`, transition: 'width 1s' }}
                                        />
                                    </div>
                                    <span className="font-mono text-xs text-text-secondary w-10">
                                        <CountUp end={l.weight * 100} suffix="%" delay={i * 100} />
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center justify-between text-xs font-body">
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Pass: 75+</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Review: 50–74</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Fail: Below 50</span>
                        </div>
                    </div>
                </ScrollReveal>
            </section>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/[0.06] py-8 px-6">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <p className="text-xs text-text-muted font-body">Veylo — Trustless payment verification for remote work.</p>
                    <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-text-secondary transition-colors">
                        <Github className="w-4 h-4" />
                    </a>
                </div>
            </footer>
        </div>
    )
}
