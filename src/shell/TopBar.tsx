import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { api } from '../api'
import NotificationPanel from '../accounting/notifications/NotificationPanel'

const PILL: React.CSSProperties = {
  background: 'linear-gradient(135deg, #28997A, #13654C)',
  borderRadius: 10,
  boxShadow: '0 0 10px rgba(93,202,165,0.15)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', flexShrink: 0, border: 'none',
  fontFamily: 'var(--font-sans)', fontWeight: 500, color: '#fff',
}

export default function TopBar() {
  const { user, logout } = useAuth()
  const [panelOpen, setPanelOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const isAccounting = location.pathname.startsWith('/accounting')
  const settingsPath = location.pathname.startsWith('/planner') ? '/planner/settings' : '/accounting/settings'

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  useEffect(() => {
    if (!isAccounting) return
    const lastRead = localStorage.getItem('briefs_last_read')
    api<any>('/api/briefs/morning').then(res => {
      const briefs = res.briefs || []
      if (!briefs.length) return
      const latest = briefs[0]?.generated_at
      if (latest && (!lastRead || new Date(latest) > new Date(lastRead))) setHasUnread(true)
    }).catch(() => {})
  }, [isAccounting])

  function handleBellClick() {
    setHasUnread(false)
    localStorage.setItem('briefs_last_read', new Date().toISOString())
    setPanelOpen(true)
  }

  function handleAvatarClick() {
    if (isAccounting) {
      navigate('/accounting/settings')
    } else {
      setMenuOpen(o => !o)
    }
  }

  return (
    <>
      <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, flexShrink: 0, position: 'relative' }}>
        {/* Left — Purifye logo pill */}
        <div
          onClick={() => navigate('/')}
          style={{ ...PILL, padding: '6px 12px', fontSize: 14 }}
        >
          Purifye
        </div>

        {/* Centre — Dashboard pill */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div
            onClick={() => navigate('/accounting/dashboard')}
            style={{ ...PILL, padding: '5px 12px 5px 8px', gap: 6, fontSize: 12 }}
          >
            <span style={{ fontSize: 14 }}>📊</span>
            <span>Dashboard</span>
          </div>
        </div>

        {/* Right — Bell + Avatar */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleBellClick}
            style={{ ...PILL, width: 32, height: 32, position: 'relative', padding: 0 }}
            title="Notifications"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {hasUnread && (
              <span style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: '50%', background: '#fff', border: '1.5px solid #13654C' }} />
            )}
          </button>

          <div
            onClick={handleAvatarClick}
            style={{ ...PILL, width: 32, height: 32, fontSize: 12, padding: 0 }}
          >
            {initials}
          </div>
        </div>

        {/* Non-accounting avatar dropdown */}
        {!isAccounting && menuOpen && (
          <div style={{ position: 'absolute', top: 50, right: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', zIndex: 200, minWidth: 140 }}>
            <button onClick={() => { navigate('/'); setMenuOpen(false) }} style={menuItemStyle}>Switch bot</button>
            <button onClick={() => { navigate(settingsPath); setMenuOpen(false) }} style={menuItemStyle}>Settings</button>
            <button onClick={() => { logout(); setMenuOpen(false) }} style={{ ...menuItemStyle, color: 'var(--danger)' }}>Logout</button>
          </div>
        )}
      </div>
      {panelOpen && <NotificationPanel onClose={() => setPanelOpen(false)} />}
    </>
  )
}

const menuItemStyle: React.CSSProperties = {
  display: 'block', width: '100%', background: 'none', border: 'none',
  padding: '12px 16px', textAlign: 'left', cursor: 'pointer',
  fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)',
}
