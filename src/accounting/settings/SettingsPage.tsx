import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import BriefSettings from './BriefSettings'
import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_BASE || ''

export default function SettingsPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [biz, setBiz] = useState<any>(null)

  useEffect(() => {
    fetch(`${API}/api/settings/business`, { credentials: 'include' })
      .then(r => r.json()).then(d => { if (d.ok) setBiz(d.business) }).catch(() => {})
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#131311', color: '#f0ede6', fontFamily: 'DM Sans, sans-serif', paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #232321' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: '#f0ede6', cursor: 'pointer', padding: '6px 0', fontSize: 20, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          ?
        </button>
        <span style={{ fontSize: 16, fontWeight: 600 }}>Settings</span>
        <button
          onClick={handleLogout}
          style={{ background: 'none', border: '1px solid #3a3a38', borderRadius: 8, color: '#f0ede6', cursor: 'pointer', padding: '6px 14px', fontSize: 13 }}
        >
          Logout
        </button>
      </div>

      <div style={{ padding: '24px 20px' }}>
        {/* Business Info */}
        {biz && (
          <div style={{ background: '#1c1c1a', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#6a6a64', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, fontFamily: 'DM Mono, monospace' }}>Business</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{biz.name}</div>
            {biz.industry && <div style={{ fontSize: 13, color: '#6a6a64' }}>{biz.industry}</div>}
          </div>
        )}

        {/* Account Info */}
        {user && (
          <div style={{ background: '#1c1c1a', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#6a6a64', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, fontFamily: 'DM Mono, monospace' }}>Account</div>
            <div style={{ fontSize: 14, marginBottom: 4 }}>{user.email || user.name || 'User'}</div>
            {user.role && <div style={{ fontSize: 12, color: '#5DCAA5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{user.role}</div>}
          </div>
        )}

        {/* Brief Settings */}
        <BriefSettings />

        {/* Currency / Locale */}
        {biz && (
          <div style={{ background: '#1c1c1a', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#6a6a64', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, fontFamily: 'DM Mono, monospace' }}>Locale</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: '#c5c2bc' }}>Currency</span>
              <span style={{ fontSize: 14, color: '#f0ede6', fontFamily: 'DM Mono, monospace' }}>{biz.currency || 'NGN'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
