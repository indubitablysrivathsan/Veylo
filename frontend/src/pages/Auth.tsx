import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Aurora from '@/components/ui/Aurora'
import DecryptedText from '@/components/ui/DecryptedText'
import { useAuth } from '@/hooks/useAuth'
import { useApp } from '@/context/AppContext'
import { cn } from '@/lib/utils'
import { Briefcase, Code2, Mail, Lock, User, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react'

type AuthMode = 'login' | 'register'

export default function Auth() {
    const { state: authState, login, register } = useAuth()
    const { dispatch } = useApp()
    const navigate = useNavigate()

    const [mode, setMode] = useState<AuthMode>('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [role, setRole] = useState<'client' | 'freelancer'>('client')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState<'credentials' | 'role'>('credentials')

    // Redirect if already authenticated (in useEffect to avoid setState-during-render)
    useEffect(() => {
        if (authState.isAuthenticated && authState.user) {
            const userRole = authState.user.role || 'client'
            navigate(userRole === 'freelancer' ? '/freelancer' : '/client', { replace: true })
        }
    }, [authState.isAuthenticated, authState.user, navigate])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        if (mode === 'login') {
            const result = await login(email, password)
            if (result.success) {
                // Auth context will have the user, redirect based on role
                const savedRole = localStorage.getItem('veylo_role')
                dispatch({ type: 'SET_ROLE', role: (savedRole as 'client' | 'freelancer') || 'client' })
                navigate(savedRole === 'freelancer' ? '/freelancer' : '/client')
            } else {
                setError(result.error || 'Login failed')
            }
        } else {
            // Register mode — go to role selection first
            if (step === 'credentials') {
                if (!email || !password) {
                    setError('Email and password are required')
                    setLoading(false)
                    return
                }
                if (password.length < 6) {
                    setError('Password must be at least 6 characters')
                    setLoading(false)
                    return
                }
                setStep('role')
                setLoading(false)
                return
            }

            // Step 2: Complete registration with role
            const result = await register(email, password, name || email.split('@')[0], role)
            if (result.success) {
                dispatch({ type: 'SET_ROLE', role })
                navigate(role === 'freelancer' ? '/freelancer' : '/client')
            } else {
                setError(result.error || 'Registration failed')
            }
        }
        setLoading(false)
    }

    return (
        <div className="relative min-h-screen bg-background flex items-center justify-center overflow-hidden">
            <Aurora />

            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="relative z-10 w-full max-w-md px-6"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="font-display font-bold text-3xl text-text-primary mb-3">
                        <span className="text-violet-400">V</span>eylo
                    </h1>
                    <p className="text-text-secondary font-body text-base">
                        <DecryptedText text={mode === 'login' ? 'Sign in to your account' : 'Create your account'} speed={25} />
                    </p>
                </div>

                {/* Auth card */}
                <div className="glass-elevated p-7 mb-6">
                    <AnimatePresence mode="wait">
                        {step === 'credentials' ? (
                            <motion.form
                                key="credentials"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                                onSubmit={handleSubmit}
                                className="space-y-4"
                            >
                                {/* Mode tabs */}
                                <div className="flex rounded-lg overflow-hidden border border-white/[0.08] mb-2">
                                    {(['login', 'register'] as const).map((m) => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => { setMode(m); setError('') }}
                                            className={cn(
                                                'flex-1 py-2 text-sm font-medium transition-all',
                                                mode === m ? 'bg-violet-600 text-white' : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.03]'
                                            )}
                                        >
                                            {m === 'login' ? 'Sign In' : 'Sign Up'}
                                        </button>
                                    ))}
                                </div>

                                {/* Name (register only) */}
                                {mode === 'register' && (
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                        <input
                                            type="text"
                                            placeholder="Full name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-text-primary text-sm font-body placeholder:text-text-muted focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                                        />
                                    </div>
                                )}

                                {/* Email */}
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                    <input
                                        type="email"
                                        placeholder="Email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-text-primary text-sm font-body placeholder:text-text-muted focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                                    />
                                </div>

                                {/* Password */}
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                    <input
                                        type="password"
                                        placeholder={mode === 'register' ? 'Create password (6+ chars)' : 'Password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-text-primary text-sm font-body placeholder:text-text-muted focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                                    />
                                </div>

                                {/* Error */}
                                {error && (
                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                        <p className="text-xs text-red-400 font-body">{error}</p>
                                    </div>
                                )}

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={loading || authState.isLoading}
                                    className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium transition-colors"
                                >
                                    {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Continue'}
                                    <ArrowRight className="w-4 h-4" />
                                </button>

                                {/* Divider */}
                                <div className="relative my-4">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-white/[0.06]" />
                                    </div>
                                    <div className="relative flex justify-center text-xs">
                                        <span className="px-3 bg-[#0D0D12] text-text-muted font-body">or</span>
                                    </div>
                                </div>

                                {/* Google OAuth */}
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-lg border border-white/[0.08] text-text-secondary text-sm font-medium hover:bg-white/[0.03] hover:border-white/[0.12] transition-all"
                                    onClick={() => {
                                        // In production, redirect to Google OAuth
                                        // For now, show a message
                                        setError('Google OAuth requires GOOGLE_CLIENT_ID/SECRET in .env')
                                    }}
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Continue with Google
                                </button>
                            </motion.form>
                        ) : (
                            <motion.div
                                key="role-selection"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-4"
                            >
                                <h2 className="font-display font-semibold text-base text-text-primary text-center">Choose your role</h2>
                                <p className="text-xs text-text-muted text-center font-body">You can change this later</p>

                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { value: 'client' as const, icon: Briefcase, title: "I'm Hiring", desc: 'Post jobs, define requirements' },
                                        { value: 'freelancer' as const, icon: Code2, title: "I'm Building", desc: 'Browse jobs, submit work' },
                                    ].map((r) => (
                                        <button
                                            key={r.value}
                                            type="button"
                                            onClick={() => setRole(r.value)}
                                            className={cn(
                                                'p-4 rounded-lg text-left transition-all border',
                                                role === r.value
                                                    ? 'border-violet-500/40 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.08)]'
                                                    : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                                            )}
                                        >
                                            <r.icon className={cn('w-5 h-5 mb-2', role === r.value ? 'text-violet-400' : 'text-text-muted')} />
                                            <h3 className="font-display font-semibold text-sm text-text-primary mb-0.5">{r.title}</h3>
                                            <p className="text-[11px] text-text-muted font-body">{r.desc}</p>
                                        </button>
                                    ))}
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                        <p className="text-xs text-red-400 font-body">{error}</p>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setStep('credentials')}
                                        className="px-4 py-2.5 rounded-lg border border-white/[0.07] text-text-secondary text-sm font-medium hover:bg-white/[0.03] transition-colors"
                                    >
                                        <ArrowLeft className="w-4 h-4 inline mr-1" /> Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSubmit({ preventDefault: () => { } } as React.FormEvent)}
                                        disabled={loading}
                                        className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium transition-colors"
                                    >
                                        {loading ? 'Creating account...' : 'Create Account'}
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    )
}
