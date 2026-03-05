import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlassCard from '@/components/shared/GlassCard'
import GlassNavbar from '@/components/shared/GlassNavbar'
import AmbientBackground from '@/components/shared/AmbientBackground'
import WalletAddress from '@/components/shared/WalletAddress'
import CountUp from '@/components/ui/CountUp'
import ScrollReveal from '@/components/ui/ScrollReveal'
import { getReputation } from '@/lib/api'
import { cn, getScoreColor } from '@/lib/utils'
import type { ReputationProfile } from '@/types'
import { Shield, Briefcase, BarChart3, CheckCircle2, AlertTriangle, XCircle, Award } from 'lucide-react'

export default function Reputation() {
    const { address } = useParams()
    const [profile, setProfile] = useState<ReputationProfile | null>(null)

    useEffect(() => {
        getReputation(address || '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18').then(setProfile)
    }, [address])

    if (!profile) return <div className="p-8 text-text-muted">Loading...</div>

    const isPublic = !!address

    const stats = [
        { icon: Briefcase, label: 'Total Jobs', value: profile.totalJobs },
        { icon: CheckCircle2, label: 'Successful', value: profile.successfulJobs, color: 'text-emerald-400' },
        { icon: AlertTriangle, label: 'Disputed', value: profile.disputedJobs, color: 'text-amber-400' },
        { icon: XCircle, label: 'Failed', value: profile.failedJobs, color: 'text-red-400' },
    ]

    const scoreColor = getScoreColor(profile.averageScore) === 'green' ? '#10B981' : getScoreColor(profile.averageScore) === 'amber' ? '#F59E0B' : '#EF4444'
    const radius = 55
    const circumference = 2 * Math.PI * radius

    const content = (
        <div className="max-w-2xl mx-auto">
            <ScrollReveal>
                {/* Profile header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-500/15 border border-violet-500/25 mb-4">
                        <Shield className="w-7 h-7 text-violet-400" />
                    </div>
                    <div className="mb-2">
                        <WalletAddress address={profile.address} truncate={false} className="justify-center text-base" />
                    </div>
                    <p className="text-sm text-text-muted font-body">Veylo Member</p>
                </div>
            </ScrollReveal>

            {/* Score ring */}
            <ScrollReveal delay={0.1}>
                <div className="flex justify-center mb-10">
                    <div className="relative inline-flex items-center justify-center">
                        <svg width="140" height="140" className="transform -rotate-90">
                            <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                            <motion.circle
                                cx="70" cy="70" r={radius}
                                fill="none"
                                stroke={scoreColor}
                                strokeWidth="6"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                initial={{ strokeDashoffset: circumference }}
                                animate={{ strokeDashoffset: circumference * (1 - profile.averageScore / 100) }}
                                transition={{ duration: 1.5, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={cn('text-3xl font-mono font-bold', getScoreColor(profile.averageScore) === 'green' ? 'text-emerald-400' : getScoreColor(profile.averageScore) === 'amber' ? 'text-amber-400' : 'text-red-400')}>
                                <CountUp end={profile.averageScore} delay={500} />
                            </span>
                            <span className="text-[10px] text-text-muted">avg score</span>
                        </div>
                    </div>
                </div>
            </ScrollReveal>

            {/* Stats */}
            <ScrollReveal delay={0.2}>
                <div className="grid grid-cols-4 gap-4 mb-8">
                    {stats.map((s) => (
                        <GlassCard key={s.label} className="p-4 text-center">
                            <s.icon className={cn('w-5 h-5 mx-auto mb-2', s.color || 'text-text-muted')} />
                            <p className="text-xl font-bold font-mono text-text-primary">
                                <CountUp end={s.value} delay={300} />
                            </p>
                            <p className="text-[11px] text-text-muted font-body mt-0.5">{s.label}</p>
                        </GlassCard>
                    ))}
                </div>
            </ScrollReveal>

            {/* Badges */}
            {profile.badges.length > 0 && (
                <ScrollReveal delay={0.3}>
                    <h2 className="font-display font-semibold text-base text-text-primary mb-3">Badges</h2>
                    <div className="flex flex-wrap gap-2 mb-8">
                        {profile.badges.map(badge => (
                            <span
                                key={badge}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs font-medium text-violet-400"
                            >
                                <Award className="w-3 h-3" />
                                {badge}
                            </span>
                        ))}
                    </div>
                </ScrollReveal>
            )}
        </div>
    )

    if (isPublic) {
        return (
            <div className="relative min-h-screen bg-background">
                <AmbientBackground />
                <GlassNavbar />
                <main className="relative z-10 pt-24 pb-16 px-6">
                    {content}
                </main>
            </div>
        )
    }

    return content
}
