import { cn, formatEth, formatUsd } from '@/lib/utils'

interface AmountDisplayProps {
    amount: string | number
    showUsd?: boolean
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

export default function AmountDisplay({ amount, showUsd = false, size = 'md', className }: AmountDisplayProps) {
    const sizeClass = size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-base' : 'text-sm'

    return (
        <span className={cn('font-mono font-semibold text-text-primary', sizeClass, className)}>
            {formatEth(amount)}
            {showUsd && (
                <span className="text-text-muted text-xs font-normal ml-1.5">
                    {formatUsd(amount)}
                </span>
            )}
        </span>
    )
}
