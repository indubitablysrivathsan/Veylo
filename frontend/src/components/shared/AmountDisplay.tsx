import { cn, formatINR } from '@/lib/utils'

interface AmountDisplayProps {
    amount: string | number
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

export default function AmountDisplay({ amount, size = 'md', className }: AmountDisplayProps) {
    const sizeClass = size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-base' : 'text-sm'

    return (
        <span className={cn('font-mono font-semibold text-text-primary', sizeClass, className)}>
            {formatINR(amount)}
        </span>
    )
}
