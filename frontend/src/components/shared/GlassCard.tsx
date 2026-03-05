import { cn } from '@/lib/utils'

interface GlassCardProps {
    children: React.ReactNode
    className?: string
    variant?: 'standard' | 'elevated' | 'subtle'
    hover?: boolean
    glow?: boolean
    onClick?: () => void
}

export default function GlassCard({ children, className, variant = 'standard', hover = false, glow = false, onClick }: GlassCardProps) {
    const base =
        variant === 'elevated' ? 'glass-elevated' :
            variant === 'subtle' ? 'glass-subtle' :
                'glass'

    return (
        <div
            onClick={onClick}
            className={cn(
                base,
                hover && 'card-hover cursor-pointer',
                glow && 'hover:shadow-[0_0_0_1px_rgba(139,92,246,0.2),0_0_24px_rgba(139,92,246,0.08)]',
                className,
            )}
        >
            {children}
        </div>
    )
}
