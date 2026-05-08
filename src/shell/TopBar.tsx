import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { useNavigate } from 'react-router-dom'

export default function TopBar() {
  const { user, business, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const settingsPath = location.pathname.startsWith('/planner') ? '/planner/settings' : '/accounting/settings'

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, borderBottom: '1px solid var(--border)', position: 'relative' }}>
      <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.4px', flexShrink: 0 }}>
        <span style={{ color: 'var(--accent)' }}>P</span>urifye
      </div>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {business?.name}
      </div>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ width: 28, height: 28, borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
      >
        {initials}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 50, right: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', zIndex: 200, minWidth: 140 }}>
          <button onClick={() => { navigate(settingsPath); setOpen(false) }} style={menuItemStyle}>Settings</button>
          <button onClick={() => { logout(); setOpen(false) }} style={{ ...menuItemStyle, color: 'var(--danger)' }}>Logout</button>
        </div>
      )}
    </div>
  )
}

const menuItemStyle: React.CSSProperties = {
  display: 'block', width: '100%', background: 'none', border: 'none',
  padding: '12px 16px', textAlign: 'left', cursor: 'pointer',
  fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)',
}
