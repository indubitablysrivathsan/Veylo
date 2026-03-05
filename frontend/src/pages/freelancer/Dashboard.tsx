import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlassCard from '@/components/shared/GlassCard'
import StatusBadge from '@/components/shared/StatusBadge'
import DeadlineCountdown from '@/components/shared/DeadlineCountdown'
import EmptyState from '@/components/shared/EmptyState'
import SpotlightCard from '@/components/ui/SpotlightCard'
import CountUp from '@/components/ui/CountUp'
import AnimatedList from '@/components/ui/AnimatedList'
import { getJobs } from '@/lib/api'
import { formatINR } from '@/lib/utils'
import type { Job } from '@/types'
import { Briefcase, Coins, BarChart3, Shield, FolderCode, Search } from 'lucide-react'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } } }

export default function FreelancerDashboard() {
    const [jobs, setJobs] = useState<Job[]>([])
    const navigate = useNavigate()

    useEffect(() => { getJobs().then(setJobs) }, [])

    const myJobs = jobs.filter(j => j.freelancerAddress)
    const availableJobs = jobs.filter(j => j.state === 'FUNDED' && !j.freelancerAddress).slice(0, 3)
    const activeCount = myJobs.filter(j => j.state !== 'CLOSED').length

    const stats = [
        { icon: Briefcase, label: 'Active Jobs', value: activeCount },
        { icon: Coins, label: 'Total Earned', value: 120000, prefix: '₹', decimals: 0 },
        { icon: BarChart3, label: 'Avg Score', value: 91, suffix: '%' },
        { icon: Shield, label: 'Reputation', value: 91 },
    ]

    return (
        <div>
            <h1 className="font-display font-bold text-2xl text-text-primary mb-1">Dashboard</h1>
            <p className="text-sm text-text-muted font-body mb-8">Your freelancer overview</p>

            {/* Stats */}
            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-4 gap-4 mb-8">
                {stats.map((s) => (
                    <motion.div key={s.label} variants={item}>
                        <GlassCard className="p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <s.icon className="w-4 h-4 text-text-muted" />
                                <span className="text-xs text-text-muted font-body">{s.label}</span>
                            </div>
                            <p className="text-2xl font-bold font-mono text-text-primary">
                                <CountUp end={s.value} decimals={s.decimals || 0} suffix={s.suffix || ''} />
                            </p>
                        </GlassCard>
                    </motion.div>
                ))}
            </motion.div>

            {/* Available jobs */}
            <h2 className="font-display font-semibold text-base text-text-primary mb-4">Available Jobs</h2>
            {availableJobs.length === 0 ? (
                <EmptyState icon={Search} title="No open jobs" description="Check back later for new opportunities." className="mb-8" />
            ) : (
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {availableJobs.map((job, i) => (
                        <motion.div key={job.id} variants={item} initial="hidden" animate="show" transition={{ delay: i * 0.07 }}>
                            <SpotlightCard className="p-6 h-full cursor-pointer" onClick={() => navigate(`/freelancer/job/${job.id}`)}>
                                <p className="text-sm font-medium text-text-primary mb-2">{job.description.slice(0, 60)}...</p>
                                <p className="font-mono text-lg font-bold text-violet-400 mb-3">{formatINR(job.paymentAmountINR || 25000)}</p>
                                <DeadlineCountdown deadline={job.deadline} />
                            </SpotlightCard>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Active jobs */}
            <h2 className="font-display font-semibold text-base text-text-primary mb-4">My Active Jobs</h2>
            {myJobs.length === 0 ? (
                <EmptyState icon={FolderCode} title="No active jobs" description="Browse the marketplace to find work." action={{ label: 'Browse Jobs', onClick: () => navigate('/freelancer/marketplace') }} />
            ) : (
                <GlassCard className="divide-y divide-white/[0.06]">
                    <AnimatedList stagger={0.05}>
                        {myJobs.map((job) => (
                            <button
                                key={job.id}
                                onClick={() => navigate(`/freelancer/job/${job.id}`)}
                                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-text-primary truncate">{job.description.slice(0, 60)}...</p>
                                </div>
                                <div className="flex items-center gap-4 ml-4">
                                    <DeadlineCountdown deadline={job.deadline} />
                                    <StatusBadge status={job.state} />
                                </div>
                            </button>
                        ))}
                    </AnimatedList>
                </GlassCard>
            )}
        </div>
    )
}
