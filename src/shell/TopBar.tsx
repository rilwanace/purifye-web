import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { api } from '../api'
import NotificationPanel from '../accounting/notifications/NotificationPanel'

export default function TopBar() {
  const { user, business, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
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
    if (isAccounting) navigate('/accounting/settings')
    else setOpen(o => !o)
  }

  return (
    <>
      <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, borderBottom: '1px solid var(--border)', position: 'relative', flexShrink: 0 }}>
        <div onClick={() => navigate('/')} style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.4px', flexShrink: 0, cursor: 'pointer' }}>
          <span style={{ color: 'var(--accent)' }}>P</span>urifye
        </div>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {business?.name}
        </div>
        {isAccounting && (
          <button onClick={handleBellClick} style={{ position: 'relative', width: 32, height: 32, borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }} title="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {hasUnread && <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: '#5DCAA5', border: '1.5px solid #131311' }} />}
          </button>
        )}
        <div onClick={handleAvatarClick} style={{ width: 28, height: 28, borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
          {initials}
        </div>
        {!isAccounting && open && (
          <div style={{ position: 'absolute', top: 50, right: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', zIndex: 200, minWidth: 140 }}>
            <button onClick={() => { navigate('/'); setOpen(false) }} style={menuItemStyle}>Switch bot</button>
          <button onClick={() => { navigate(settingsPath); setOpen(false) }} style={menuItemStyle}>Settings</button>
            <button onClick={() => { logout(); setOpen(false) }} style={{ ...menuItemStyle, color: 'var(--danger)' }}>Logout</button>
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
