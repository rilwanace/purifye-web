import React, { createContext, useContext, useState, useCallback } from 'react'

type Variant = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  variant: Variant
}

interface ToastCtx {
  show: (message: string, variant?: Variant) => void
}

const ToastContext = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  let counter = 0

  const show = useCallback((message: string, variant: Variant = 'info') => {
    const id = ++counter
    setToasts(t => [...t, { id, message, variant }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [])

  const borderColor = (v: Variant) =>
    v === 'success' ? 'var(--accent)' : v === 'error' ? 'var(--danger)' : 'var(--border)'

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8, width: 'calc(100% - 32px)', maxWidth: 398 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: 'var(--bg-surface)', border: `1px solid ${borderColor(t.variant)}`, borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
