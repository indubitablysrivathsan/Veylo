import { cn, getStatusColor, getVerdictColor } from '@/lib/utils'
import type { JobState } from '@/types'

interface StatusBadgeProps {
    status: JobState | string
    className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
    const stateColors: Record<string, string> = {
        CREATED: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
        FUNDED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        WORK_SUBMITTED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        VALIDATED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        CLOSED: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        PAID: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
        REFUNDED: 'bg-red-500/15 text-red-400 border-red-500/25',
        DISPUTED: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
    }

    const color = stateColors[status] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    const label = status.replace(/_/g, ' ')

    return (
        <span className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium border font-body uppercase tracking-wide',
            color,
            className,
        )}>
            {label}
        </span>
    )
}
