import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'

export default function GlassNavbar() {
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40)
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    return (
        <header
            className={cn(
                'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
                scrolled ? 'glass-navbar' : 'bg-transparent',
            )}
        >
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <Link to="/" className="font-display font-bold text-xl tracking-tight text-text-primary">
                    <span className="text-violet-400">V</span>eylo
                </Link>
                <Link
                    to="/auth"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
                >
                    Open App <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>
        </header>
    )
}
