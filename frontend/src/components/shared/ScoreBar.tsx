import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { cn, getScoreBarClass } from '@/lib/utils'

interface ScoreBarProps {
    label: string
    weight: number
    score: number
    className?: string
}

export default function ScoreBar({ label, weight, score, className }: ScoreBarProps) {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true })

    return (
        <div ref={ref} className={cn('flex items-center gap-3', className)}>
            <span className="text-xs text-text-secondary w-20 text-right font-body">{label}</span>
            <span className="text-[10px] text-text-muted font-mono w-10 text-right">({Math.round(weight * 100)}%)</span>
            <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={isInView ? { width: `${score}%` } : {}}
                    transition={{ duration: 1, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className={cn('h-full rounded-full', getScoreBarClass(score))}
                />
            </div>
            <span className="font-mono text-xs text-text-secondary w-8 text-right">{score}</span>
        </div>
    )
}
