import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import type { WalletState } from '@/types'
import { SEPOLIA_CHAIN_ID } from '@/lib/constants'

type WalletAction =
    | { type: 'CONNECTING' }
    | { type: 'CONNECTED'; address: string; chainId: number }
    | { type: 'CHAIN_CHANGED'; chainId: number }
    | { type: 'BALANCE_UPDATED'; balance: string }
    | { type: 'DISCONNECTED' }

const initialState: WalletState = {
    address: null,
    chainId: null,
    balance: null,
    isConnecting: false,
}

function reducer(state: WalletState, action: WalletAction): WalletState {
    switch (action.type) {
        case 'CONNECTING':
            return { ...state, isConnecting: true }
        case 'CONNECTED':
            return { ...state, address: action.address, chainId: action.chainId, isConnecting: false }
        case 'CHAIN_CHANGED':
            return { ...state, chainId: action.chainId }
        case 'BALANCE_UPDATED':
            return { ...state, balance: action.balance }
        case 'DISCONNECTED':
            return { ...initialState }
        default:
            return state
    }
}

interface WalletContextValue {
    state: WalletState
    connect: () => Promise<void>
    disconnect: () => void
    switchToSepolia: () => Promise<void>
}

const WalletContext = createContext<WalletContextValue>({
    state: initialState,
    connect: async () => { },
    disconnect: () => { },
    switchToSepolia: async () => { },
})

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState)

    const connect = useCallback(async () => {
        if (!window.ethereum) {
            alert('Please install MetaMask to use Veylo.')
            return
        }
        dispatch({ type: 'CONNECTING' })
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[]
            const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' }) as string
            if (accounts[0]) {
                dispatch({ type: 'CONNECTED', address: accounts[0], chainId: parseInt(chainIdHex, 16) })
            }
        } catch {
            dispatch({ type: 'DISCONNECTED' })
        }
    }, [])

    const disconnect = useCallback(() => {
        dispatch({ type: 'DISCONNECTED' })
        localStorage.removeItem('veylo_role')
    }, [])

    const switchToSepolia = useCallback(async () => {
        if (!window.ethereum) return
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}` }],
            })
        } catch {
            // chain not added
        }
    }, [])

    useEffect(() => {
        if (!window.ethereum) return
        const handleAccounts = (accounts: string[]) => {
            if (accounts.length === 0) dispatch({ type: 'DISCONNECTED' })
            else dispatch({ type: 'CONNECTED', address: accounts[0], chainId: state.chainId || 0 })
        }
        const handleChain = (chainIdHex: string) => {
            dispatch({ type: 'CHAIN_CHANGED', chainId: parseInt(chainIdHex, 16) })
        }
        window.ethereum.on?.('accountsChanged', handleAccounts)
        window.ethereum.on?.('chainChanged', handleChain)
        return () => {
            window.ethereum.removeListener?.('accountsChanged', handleAccounts)
            window.ethereum.removeListener?.('chainChanged', handleChain)
        }
    }, [state.chainId])

    return (
        <WalletContext.Provider value={{ state, connect, disconnect, switchToSepolia }}>
            {children}
        </WalletContext.Provider>
    )
}

export function useWalletContext() {
    return useContext(WalletContext)
}
