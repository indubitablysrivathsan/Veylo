import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import SpotlightCard from '@/components/ui/SpotlightCard'
import DeadlineCountdown from '@/components/shared/DeadlineCountdown'
import EmptyState from '@/components/shared/EmptyState'
import { getJobs } from '@/lib/api'
import { formatINR, formatAddress } from '@/lib/utils'
import type { Job } from '@/types'
import { Search, ArrowRight, SortAsc } from 'lucide-react'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } } }

type SortOption = 'newest' | 'highest' | 'closest'

export default function Marketplace() {
    const [jobs, setJobs] = useState<Job[]>([])
    const [search, setSearch] = useState('')
    const [sort, setSort] = useState<SortOption>('newest')
    const [error, setError] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        getJobs('CREATED,FUNDED')
            .then(setJobs)
            .catch(err => setError(err instanceof Error ? err.message : 'Failed to load jobs'))
    }, [])

    const filtered = jobs
        .filter(j => {
            const q = search.toLowerCase()
            return j.description.toLowerCase().includes(q) || (j.title || '').toLowerCase().includes(q)
        })
        .sort((a, b) => {
            if (sort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            if (sort === 'closest') return (new Date(a.deadline || '9999').getTime()) - (new Date(b.deadline || '9999').getTime())
            return 0 // highest pay would need escrow amount field
        })

    const sortOptions: { value: SortOption; label: string }[] = [
        { value: 'newest', label: 'Newest' },
        { value: 'highest', label: 'Highest Pay' },
        { value: 'closest', label: 'Closest Deadline' },
    ]

    return (
        <div>
            <h1 className="font-display font-bold text-2xl text-text-primary mb-1">Job Marketplace</h1>
            <p className="text-sm text-text-muted font-body mb-8">Browse open jobs and find work</p>

            {/* Filter bar */}
            <div className="glass p-4 flex items-center gap-4 mb-8">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <Search className="w-4 h-4 text-text-muted" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by description..."
                        className="flex-1 bg-transparent text-sm text-text-primary font-body placeholder:text-text-muted focus:outline-none"
                    />
                </div>
                <div className="flex items-center gap-1">
                    <SortAsc className="w-3.5 h-3.5 text-text-muted" />
                    {sortOptions.map(o => (
                        <button
                            key={o.value}
                            onClick={() => setSort(o.value)}
                            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${sort === o.value ? 'bg-violet-500/15 text-violet-400' : 'text-text-muted hover:text-text-secondary'
                                }`}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400 font-body">
                    <p>{error}</p>
                </div>
            )}

            {/* Job grid */}
            {filtered.length === 0 ? (
                <EmptyState icon={Search} title="No jobs found" description={search ? 'Try adjusting your search.' : 'No open jobs at the moment.'} />
            ) : (
                <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map((job) => (
                        <motion.div key={job.id} variants={item}>
                            <SpotlightCard className="p-6 h-full">
                                {job.title && <h3 className="font-display font-semibold text-sm text-text-primary mb-1">{job.title}</h3>}
                                <p className="text-sm text-text-secondary mb-3 leading-relaxed">{job.description.slice(0, 80)}...</p>
                                <p className="font-mono text-xl font-bold text-violet-400 mb-3">{formatINR(job.paymentAmountINR || 25000)}</p>
                                <div className="space-y-2 mb-4">
                                    <DeadlineCountdown deadline={job.deadline} />
                                    <p className="text-xs text-text-muted font-mono">{formatAddress(job.clientAddress)}</p>
                                </div>
                                <button
                                    onClick={() => navigate(`/freelancer/job/${job.id}`)}
                                    className="flex items-center gap-1.5 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors"
                                >
                                    View Details <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </SpotlightCard>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </div>
    )
}
