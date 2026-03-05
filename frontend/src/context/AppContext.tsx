import { createContext, useContext, useReducer, useEffect } from 'react'
import type { AppState, UserRole } from '@/types'

type AppAction =
    | { type: 'SET_ROLE'; role: UserRole }

const initialState: AppState = {
    role: (localStorage.getItem('veylo_role') as UserRole) || null,
}

function reducer(state: AppState, action: AppAction): AppState {
    switch (action.type) {
        case 'SET_ROLE':
            localStorage.setItem('veylo_role', action.role || '')
            return { ...state, role: action.role }
        default:
            return state
    }
}

const AppContext = createContext<{
    state: AppState
    dispatch: React.Dispatch<AppAction>
}>({ state: initialState, dispatch: () => { } })

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState)

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    )
}

export function useApp() {
    return useContext(AppContext)
}
