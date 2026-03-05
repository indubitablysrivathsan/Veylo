import CountUp from '@/components/ui/CountUp'
import { cn, getScoreColorClass } from '@/lib/utils'

interface ScoreDisplayProps {
    score: number
    size?: 'sm' | 'md' | 'lg'
    animate?: boolean
    suffix?: string
    className?: string
}

export default function ScoreDisplay({ score, size = 'md', animate = true, suffix = '%', className }: ScoreDisplayProps) {
    const sizeClass = size === 'lg' ? 'text-6xl' : size === 'md' ? 'text-3xl' : 'text-lg'
    const colorClass = getScoreColorClass(score)

    return (
        <span className={cn('font-mono font-bold', sizeClass, colorClass, className)}>
            {animate ? (
                <CountUp end={score} duration={1.5} decimals={size === 'lg' ? 1 : 0} suffix={suffix} />
            ) : (
                `${score}${suffix}`
            )}
        </span>
    )
}
