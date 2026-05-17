import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { useState, useEffect } from 'react'
import { api } from '../api'

const GRAD = 'linear-gradient(135deg, #28997A, #13654C)'

const noSel: React.CSSProperties = {
  WebkitUserSelect: 'none', userSelect: 'none',
  WebkitTapHighlightColor: 'transparent' as any,
  cursor: 'pointer', touchAction: 'manipulation',
}

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [hasUnread, setHasUnread] = useState(false)

  const path = location.pathname
  const onDash = path.startsWith('/accounting/dashboard')
  const onEntry = path.startsWith('/accounting/entry')
  const onNotif = path.startsWith('/accounting/notifications')
  const onSettings = path.startsWith('/accounting/settings')

  useEffect(() => {
    const lastRead = localStorage.getItem('briefs_last_read')
    api<any>('/api/briefs/morning').then(res => {
      const briefs = res.briefs || []
      if (!briefs.length) return
      const latest = briefs[0]?.generated_at
      if (latest && (!lastRead || new Date(latest) > new Date(lastRead))) setHasUnread(true)
    }).catch(() => {})
  }, [])

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const iconBox = (active: boolean): React.CSSProperties => ({
    width: 44, height: 44, borderRadius: 12,
    background: active ? GRAD : '#1a1a18',
    border: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: active ? '0 0 12px rgba(93,202,165,0.2)' : 'none',
    flexShrink: 0, ...noSel,
  })

  function handleBell() {
    setHasUnread(false)
    localStorage.setItem('briefs_last_read', new Date().toISOString())
    navigate('/accounting/notifications')
  }

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430,
      background: '#131311', borderTop: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 12px',
      paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
      zIndex: 100, boxSizing: 'border-box',
    }}>
      <div style={{
        flex: 1, height: 44, background: '#1a1a18',
        borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)',
        padding: 3, display: 'flex',
      }}>
        <div
          onClick={() => navigate('/accounting/dashboard')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 11,
            background: onDash ? GRAD : 'transparent',
            boxShadow: onDash ? '0 0 12px rgba(93,202,165,0.2)' : 'none',
            fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
            color: onDash ? '#fff' : '#6a6a64',
            transition: 'background 0.15s, color 0.15s',
            ...noSel,
          }}
        >
          Dashboard
        </div>
        <div
          onClick={() => navigate('/accounting/entry')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 11,
            background: onEntry ? GRAD : 'transparent',
            boxShadow: onEntry ? '0 0 12px rgba(93,202,165,0.2)' : 'none',
            fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
            color: onEntry ? '#fff' : '#6a6a64',
            transition: 'background 0.15s, color 0.15s',
            ...noSel,
          }}
        >
          Entry
        </div>
      </div>

      <div onClick={handleBell} style={{ ...iconBox(onNotif), position: 'relative' }}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
          stroke={onNotif ? '#fff' : '#9c9b95'} strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {hasUnread && (
          <span style={{
            position: 'absolute', top: 8, right: 8,
            width: 7, height: 7, borderRadius: '50%',
            background: '#5DCAA5', border: '1.5px solid #131311',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      <div onClick={() => navigate('/accounting/settings')} style={iconBox(onSettings)}>
        <span style={{
          fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
          color: onSettings ? '#fff' : '#9c9b95',
        }}>
          {initials}
        </span>
      </div>
    </div>
  )
}