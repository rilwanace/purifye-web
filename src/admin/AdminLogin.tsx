import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from './useAdmin'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAdmin()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.detail || 'Login failed')
        return
      }
      login(email)
      navigate('/admin')
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f1117', padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', marginBottom: '0.25rem' }}>
          Purifye Admin
        </h1>
        <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: '2rem', fontSize: '0.875rem' }}>
          Restricted access
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="email" placeholder="Admin email" value={email}
            onChange={e => setEmail(e.target.value)} required
            style={inputStyle}
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} required
            style={inputStyle}
          />
          {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: 0 }}>{error}</p>}
          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '0.75rem 1rem', borderRadius: '0.5rem',
  border: '1px solid #374151', background: '#1f2937',
  color: '#f9fafb', fontSize: '1rem', outline: 'none',
}
const btnStyle: React.CSSProperties = {
  padding: '0.75rem', borderRadius: '0.5rem', border: 'none',
  background: '#5DCAA5', color: '#fff', fontSize: '1rem',
  fontWeight: 600, cursor: 'pointer',
}
