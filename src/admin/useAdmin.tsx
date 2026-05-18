import React, { createContext, useContext, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'

interface AdminState {
  email: string | null
  isLoading: boolean
  isAuthenticated: boolean
}

interface AdminCtx extends AdminState {
  login: (email: string) => void
  logout: () => Promise<void>
}

const AdminContext = createContext<AdminCtx | null>(null)

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AdminState>({
    email: null, isLoading: true, isAuthenticated: false,
  })

  useEffect(() => {
    fetch('/api/admin/dashboard', { credentials: 'include' })
      .then(r => {
        if (r.ok) {
          const stored = sessionStorage.getItem('admin_email')
          setState({ email: stored, isLoading: false, isAuthenticated: true })
        } else {
          setState({ email: null, isLoading: false, isAuthenticated: false })
        }
      })
      .catch(() => setState({ email: null, isLoading: false, isAuthenticated: false }))
  }, [])

  const login = (email: string) => {
    sessionStorage.setItem('admin_email', email)
    setState({ email, isLoading: false, isAuthenticated: true })
  }

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
    sessionStorage.removeItem('admin_email')
    setState({ email: null, isLoading: false, isAuthenticated: false })
    window.location.href = '/admin/login'
  }

  return <AdminContext.Provider value={{ ...state, login, logout }}>{children}</AdminContext.Provider>
}

export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider')
  return ctx
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAdmin()
  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: '#0f1117' }}>
      <div style={{ width: 24, height: 24, border: '2px solid #5DCAA5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}
