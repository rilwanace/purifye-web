import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from './useAuth'

interface InviteInfo {
  email: string
  name: string
  business_name: string
}

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { setAuth } = useAuth()

  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [loadError, setLoadError] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { setLoadError('Invalid invite link'); return }
    api('/api/auth/invite/' + encodeURIComponent(token))
      .then((d: any) => setInfo(d))
      .catch((e: any) => setLoadError(e.message || 'Invite link is invalid or has expired'))
  }, [token])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setSubmitting(true)
    try {
      const data = await api('/api/auth/accept-invite', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      })
      setAuth((data as any).user, (data as any).business)
      navigate('/portal', { replace: true })
    } catch (e: any) {
      setError(e.message || 'Failed to accept invite')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 10,
    padding: '13px 14px', color: 'var(--text-primary)', fontSize: 14, outline: 'none',
    width: '100%', boxSizing: 'border-box',
  }

  const btnStyle: React.CSSProperties = {
    background: '#D4A843', color: '#000', border: 'none', borderRadius: 10,
    padding: '14px', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%',
    opacity: submitting ? 0.7 : 1,
  }

  if (loadError) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>&#x1F517;</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Invite Expired</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>{loadError}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Contact your manager for a new invite link.</div>
        </div>
      </div>
    )
  }

  if (!info) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, border: '2px solid #D4A843', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg) } }' }} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4 }}>
            <span style={{ color: '#D4A843' }}>P</span>urifye
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>You are invited!</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {info.business_name} invited <strong>{info.name}</strong> to join.
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{info.email}</div>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="password" placeholder="Set a password" value={password}
            onChange={e => setPassword(e.target.value)} required style={inputStyle} autoFocus />
          <input type="password" placeholder="Confirm password" value={confirm}
            onChange={e => setConfirm(e.target.value)} required style={inputStyle} />
          {error && <div style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</div>}
          <button type="submit" disabled={submitting} style={btnStyle}>
            {submitting ? 'Setting up...' : 'Create account and sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
