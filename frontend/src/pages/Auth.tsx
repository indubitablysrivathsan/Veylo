import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Aurora from '@/components/ui/Aurora'
import DecryptedText from '@/components/ui/DecryptedText'
import { useWallet } from '@/hooks/useWallet'
import { useApp } from '@/context/AppContext'
import { cn, formatAddress } from '@/lib/utils'
import { SEPOLIA_CHAIN_ID } from '@/lib/constants'
import { Briefcase, Code2, Check, AlertTriangle, Wallet } from 'lucide-react'

export default function Auth() {
    const { state: wallet, connect, switchToSepolia } = useWallet()
    const { state: appState, dispatch } = useApp()
    const navigate = useNavigate()

    const isConnected = !!wallet.address
    const isSepolia = wallet.chainId === SEPOLIA_CHAIN_ID

    useEffect(() => {
        if (isConnected && appState.role) {
            navigate(appState.role === 'client' ? '/client' : '/freelancer')
        }
    }, [isConnected, appState.role, navigate])

    const selectRole = (role: 'client' | 'freelancer') => {
        dispatch({ type: 'SET_ROLE', role })
        navigate(role === 'client' ? '/client' : '/freelancer')
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
                        <DecryptedText text="Connect your wallet to continue" speed={25} />
                    </p>
                </div>

                {/* Wallet card */}
                <div className="glass-elevated p-7 mb-6">
                    {!isConnected ? (
                        <button
                            onClick={connect}
                            disabled={wallet.isConnecting}
                            className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium transition-colors"
                        >
                            <Wallet className="w-4 h-4" />
                            {wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}
                        </button>
                    ) : (
                        <div className="space-y-4">
                            {/* Connected address */}
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                <span className="font-mono text-sm text-text-primary">{formatAddress(wallet.address!)}</span>
                            </div>

                            {/* Network status */}
                            {isSepolia ? (
                                <div className="flex items-center gap-2">
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-medium">Sepolia</span>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                        <span className="text-xs text-amber-400 font-medium">Wrong network</span>
                                    </div>
                                    <button
                                        onClick={switchToSepolia}
                                        className="w-full px-4 py-2 rounded-lg border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-500/10 transition-colors"
                                    >
                                        Switch to Sepolia
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Role selection */}
                {isConnected && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="grid grid-cols-2 gap-4"
                    >
                        {[
                            { role: 'client' as const, icon: Briefcase, title: "I'm Hiring", desc: 'Post jobs, define requirements, fund escrow' },
                            { role: 'freelancer' as const, icon: Code2, title: "I'm Building", desc: 'Browse jobs, submit work, get paid automatically' },
                        ].map((r) => (
                            <motion.button
                                key={r.role}
                                onClick={() => selectRole(r.role)}
                                whileHover={{ scale: 1.01 }}
                                className="glass p-5 text-left card-hover group hover:border-violet-500/30 hover:shadow-[0_0_24px_rgba(139,92,246,0.08)] transition-all"
                            >
                                <r.icon className="w-6 h-6 text-violet-400 mb-3" />
                                <h3 className="font-display font-semibold text-sm text-text-primary mb-1">{r.title}</h3>
                                <p className="text-xs text-text-muted font-body leading-relaxed">{r.desc}</p>
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </motion.div>
        </div>
    )
}
