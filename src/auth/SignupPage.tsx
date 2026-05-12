import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from './useAuth'

export default function SignupPage() {
  const [form, setForm] = useState({ businessName: '', name: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setAuth } = useAuth()

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const passwordMismatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      setError("Passwords don't match")
      return
    }
    setError('')
    setLoading(true)
    try {
      const data = await api('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.name,
          phone: form.phone || undefined,
          business_name: form.businessName,
        }),
      })
      setAuth(data.user, data.business)
      navigate('/accounting/dashboard', { replace: true })
    } catch (err: any) {
      setError(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px' }}>
            <span style={{ color: 'var(--accent)' }}>P</span>urifye
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>Create your account</div>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input placeholder="Business name" value={form.businessName} onChange={set('businessName')} required style={inputStyle} />
          <input placeholder="Your name" value={form.name} onChange={set('name')} required style={inputStyle} />
          <input type="email" placeholder="Email" value={form.email} onChange={set('email')} required style={inputStyle} />
          <input type="tel" placeholder="Phone (optional)" value={form.phone} onChange={set('phone')} style={inputStyle} />
          <input type="password" placeholder="Password" value={form.password} onChange={set('password')} required style={inputStyle} />
          <input type="password" placeholder="Confirm password" value={form.confirmPassword} onChange={set('confirmPassword')} required style={inputStyle} />
          {passwordMismatch && (
            <div style={{ fontSize: 13, color: 'var(--danger)', marginTop: -4 }}>Passwords don&#39;t match</div>
          )}
          {error && <div style={{ fontSize: 13, color: 'var(--danger)', marginTop: 4 }}>{error}</div>}
          <button
            type="submit"
            disabled={loading || passwordMismatch || form.confirmPassword.length === 0}
            style={{ ...btnStyle, opacity: (loading || passwordMismatch || form.confirmPassword.length === 0) ? 0.5 : 1 }}
          >
            {loading ? 'Creating account?' : 'Create account'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '13px 14px',
  color: 'var(--text-primary)',
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'var(--font-sans)',
}

const btnStyle: React.CSSProperties = {
  background: 'var(--accent)',
  color: '#131311',
  fontWeight: 600,
  fontSize: 14,
  border: 'none',
  borderRadius: 10,
  padding: '14px',
  cursor: 'pointer',
  width: '100%',
  marginTop: 4,
  fontFamily: 'var(--font-sans)',
}
