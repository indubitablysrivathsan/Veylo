import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useWallet } from '@/hooks/useWallet'
import { useApp } from '@/context/AppContext'
import { cn, formatAddress } from '@/lib/utils'
import {
    LayoutDashboard, PlusCircle, FolderOpen, Shield, Settings,
    Search, FolderCode, ChevronLeft, LogOut,
} from 'lucide-react'

const clientNav = [
    { to: '/client', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/client/create', icon: PlusCircle, label: 'Create Job' },
    { to: '/client', icon: FolderOpen, label: 'My Jobs' },
    { to: '/client/reputation', icon: Shield, label: 'Reputation' },
]

const freelancerNav = [
    { to: '/freelancer', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/freelancer/marketplace', icon: Search, label: 'Browse Jobs' },
    { to: '/freelancer', icon: FolderCode, label: 'My Jobs' },
    { to: '/freelancer/reputation', icon: Shield, label: 'Reputation' },
]

export default function GlassSidebar() {
    const [collapsed, setCollapsed] = useState(false)
    const { state: wallet, disconnect } = useWallet()
    const { state: appState } = useApp()
    const navigate = useNavigate()
    const location = useLocation()

    const isFreelancer = appState.role === 'freelancer' || location.pathname.startsWith('/freelancer')
    const navItems = isFreelancer ? freelancerNav : clientNav
    const roleLabel = isFreelancer ? 'Freelancer' : 'Client'

    return (
        <aside
            className={cn(
                'fixed left-0 top-0 bottom-0 z-40 glass-sidebar flex flex-col transition-all duration-300',
                collapsed ? 'w-16' : 'w-[260px]',
            )}
        >
            {/* Logo */}
            <div className="h-16 flex items-center px-5 border-b border-white/[0.06]">
                <NavLink to="/" className="font-display font-bold text-lg tracking-tight text-text-primary">
                    {collapsed ? <span className="text-violet-400">V</span> : <><span className="text-violet-400">V</span>eylo</>}
                </NavLink>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 space-y-0.5 px-3">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to + item.label}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                            cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                                isActive
                                    ? 'bg-white/[0.06] text-text-primary border-l-2 border-violet-500 ml-0'
                                    : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.03]',
                                collapsed && 'justify-center px-2',
                            )
                        }
                    >
                        <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                        {!collapsed && <span className="font-body">{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom section */}
            <div className="p-4 border-t border-white/[0.06] space-y-3">
                {wallet.address && !collapsed && (
                    <div className="space-y-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-violet-500/15 text-violet-400 border border-violet-500/20 uppercase tracking-wider font-body">
                            {roleLabel}
                        </span>
                        <p className="font-mono text-xs text-text-muted truncate">{formatAddress(wallet.address)}</p>
                    </div>
                )}
                {!collapsed && (
                    <button
                        onClick={() => { disconnect(); navigate('/auth') }}
                        className="flex items-center gap-2 text-xs text-text-muted hover:text-text-secondary transition-colors font-body"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Disconnect
                    </button>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex items-center justify-center w-full text-text-muted hover:text-text-secondary transition-colors"
                >
                    <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
                </button>
            </div>
        </aside>
    )
}
