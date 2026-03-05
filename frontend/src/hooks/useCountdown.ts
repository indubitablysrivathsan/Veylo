import { useState, useEffect } from 'react'

export function useCountdown(deadline: string | null) {
    const [now, setNow] = useState(Date.now())

    useEffect(() => {
        if (!deadline) return
        const timer = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(timer)
    }, [deadline])

    if (!deadline) return { text: 'No deadline', urgency: 'normal' as const }

    const diff = new Date(deadline).getTime() - now
    if (diff <= 0) return { text: 'Expired', urgency: 'expired' as const }
    const seconds = Math.floor(diff / 1000)
    if (seconds < 3600) return { text: `${Math.floor(seconds / 60)}m remaining`, urgency: 'critical' as const }
    if (seconds < 86400) return { text: `${Math.floor(seconds / 3600)}h remaining`, urgency: 'warn' as const }
    const days = Math.floor(seconds / 86400)
    return { text: `${days}d remaining`, urgency: 'normal' as const }
}
