import { useRef, useEffect, useState } from 'react'
import { useInView } from 'framer-motion'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'

interface DecryptedTextProps {
    text: string
    className?: string
    speed?: number
    delay?: number
}

export default function DecryptedText({ text, className = '', speed = 30, delay = 0 }: DecryptedTextProps) {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true })
    const [displayed, setDisplayed] = useState(text.split('').map(() => ' '))
    const [started, setStarted] = useState(false)

    useEffect(() => {
        if (!isInView) return
        const timer = setTimeout(() => setStarted(true), delay)
        return () => clearTimeout(timer)
    }, [isInView, delay])

    useEffect(() => {
        if (!started) return

        let frame = 0
        const maxFrames = text.length * 3

        const interval = setInterval(() => {
            frame++
            setDisplayed(
                text.split('').map((char, i) => {
                    if (char === ' ') return ' '
                    const revealAt = i * 2
                    if (frame >= revealAt + 3) return char
                    return CHARS[Math.floor(Math.random() * CHARS.length)]
                })
            )
            if (frame >= maxFrames) {
                clearInterval(interval)
                setDisplayed(text.split(''))
            }
        }, speed)

        return () => clearInterval(interval)
    }, [started, text, speed])

    return (
        <span ref={ref} className={className}>
            {displayed.map((char, i) => (
                <span key={i} style={{ display: 'inline-block', minWidth: char === ' ' ? '0.3em' : undefined }}>
                    {char}
                </span>
            ))}
        </span>
    )
}
