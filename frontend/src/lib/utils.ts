import type { JobState } from '@/types'

export function cn(...classes: (string | false | null | undefined)[]): string {
    return classes.filter(Boolean).join(' ')
}

export function formatAddress(address: string, chars = 6): string {
    if (!address) return ''
    return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

export function formatHash(hash: string, start = 6, end = 4): string {
    if (!hash) return ''
    return `${hash.slice(0, start + 2)}...${hash.slice(-end)}`
}

export function formatINR(amount: string | number): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(num)) return '₹0'
    return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

/** @deprecated Use formatINR instead */
export function formatEth(amount: string | number): string {
    return formatINR(amount)
}

/** @deprecated Use formatINR instead */
export function formatUsd(): string {
    return ''
}

export function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

export function formatRelativeTime(dateStr: string): string {
    const now = Date.now()
    const diff = Math.floor((now - new Date(dateStr).getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return formatDate(dateStr)
}

export function formatCountdown(deadline: string | null): { text: string; urgency: 'normal' | 'warn' | 'critical' | 'expired' } {
    if (!deadline) return { text: 'No deadline', urgency: 'normal' }
    const now = Date.now()
    const diff = new Date(deadline).getTime() - now
    if (diff <= 0) return { text: 'Expired', urgency: 'expired' }
    const seconds = Math.floor(diff / 1000)
    if (seconds < 3600) return { text: `${Math.floor(seconds / 60)}m remaining`, urgency: 'critical' }
    if (seconds < 86400) return { text: `${Math.floor(seconds / 3600)}h remaining`, urgency: 'warn' }
    const days = Math.floor(seconds / 86400)
    return { text: `${days}d remaining`, urgency: 'normal' }
}

export function formatDuration(ms: number): string {
    const seconds = (ms / 1000).toFixed(1)
    return `${seconds}s`
}

export function getStatusColor(state: JobState): string {
    const colors: Record<JobState, string> = {
        CREATED: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
        FUNDED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        WORK_SUBMITTED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        VALIDATED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        CLOSED: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    }
    return colors[state]
}

export function getVerdictColor(verdict: string): string {
    const colors: Record<string, string> = {
        PASS: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
        FAIL: 'bg-red-500/15 text-red-400 border-red-500/25',
        DISPUTE: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
        PAID: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
        REFUNDED: 'bg-red-500/15 text-red-400 border-red-500/25',
        DISPUTED: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
    }
    return colors[verdict] || ''
}

export function getScoreColor(score: number): 'green' | 'amber' | 'red' {
    if (score >= 75) return 'green'
    if (score >= 50) return 'amber'
    return 'red'
}

export function getScoreColorClass(score: number): string {
    const color = getScoreColor(score)
    return color === 'green' ? 'text-emerald-400' : color === 'amber' ? 'text-amber-400' : 'text-red-400'
}

export function getScoreBarClass(score: number): string {
    const color = getScoreColor(score)
    return color === 'green'
        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
        : color === 'amber'
            ? 'bg-gradient-to-r from-amber-500 to-amber-400'
            : 'bg-gradient-to-r from-red-500 to-red-400'
}

export function copyToClipboard(text: string): Promise<void> {
    return navigator.clipboard.writeText(text)
}
