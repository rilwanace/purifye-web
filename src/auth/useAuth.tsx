import React, { createContext, useContext, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../api'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface Business {
  id: string
  name: string
}

interface AuthState {
  user: User | null
  business: Business | null
  isLoading: boolean
  isAuthenticated: boolean
}

interface AuthCtx extends AuthState {
  logout: () => Promise<void>
  setAuth: (user: User, business: Business) => void
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    business: null,
    isLoading: true,
    isAuthenticated: false,
  })

  useEffect(() => {
    api('/api/auth/me')
      .then((data) => {
        setState({ user: data.user, business: data.business, isLoading: false, isAuthenticated: true })
      })
      .catch(() => {
        setState({ user: null, business: null, isLoading: false, isAuthenticated: false })
      })
  }, [])

  const logout = async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {})
    setState({ user: null, business: null, isLoading: false, isAuthenticated: false })
    window.location.href = '/login'
  }

  const setAuth = (user: User, business: Business) => {
    setState({ user, business, isLoading: false, isAuthenticated: true })
  }

  return <AuthContext.Provider value={{ ...state, logout, setAuth }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth()
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <div style={{ width: 24, height: 24, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}
