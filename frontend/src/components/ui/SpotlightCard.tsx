import { useRef } from 'react'
import { cn } from '@/lib/utils'

interface SpotlightCardProps {
    children: React.ReactNode
    className?: string
}

export default function SpotlightCard({ children, className }: SpotlightCardProps) {
    const cardRef = useRef<HTMLDivElement>(null)

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return
        const rect = cardRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        cardRef.current.style.setProperty('--spotlight-x', `${x}px`)
        cardRef.current.style.setProperty('--spotlight-y', `${y}px`)
    }

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            className={cn(
                'relative glass overflow-hidden group card-hover',
                className
            )}
        >
            {/* Spotlight overlay */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                    background: 'radial-gradient(350px circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), rgba(139, 92, 246, 0.07), transparent 60%)',
                }}
            />
            <div className="relative z-10">
                {children}
            </div>
        </div>
    )
}
