import React from 'react'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger'
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
  style?: React.CSSProperties
}

export default function Button({ variant = 'primary', children, onClick, disabled, loading, type = 'button', style }: ButtonProps) {
  const base: React.CSSProperties = {
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    fontSize: 14,
    border: 'none',
    borderRadius: 10,
    padding: '13px 20px',
    cursor: disabled || loading ? 'default' : 'pointer',
    opacity: disabled || loading ? 0.5 : 1,
    transition: 'opacity 0.15s',
  }
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--accent)', color: '#131311' },
    secondary: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)' },
    danger: { background: 'var(--danger)', color: '#fff' },
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} style={{ ...base, ...variants[variant], ...style }}>
      {loading ? '…' : children}
    </button>
  )
}
