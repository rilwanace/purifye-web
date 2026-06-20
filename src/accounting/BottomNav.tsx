import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { useState, useEffect } from 'react'

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

  const path = location.pathname
  const onDash = path.startsWith('/accounting/dashboard')
  const onEntry = path.startsWith('/accounting/entry')
  const onPD = path.startsWith('/accounting/pd-cheques')
  const onSettings = path.startsWith('/accounting/settings')



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

      <div onClick={() => navigate('/accounting/pd-cheques')} style={iconBox(onPD)}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
          stroke={onPD ? '#fff' : '#9c9b95'} strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="14" rx="2"/>
          <line x1="6" y1="11" x2="14" y2="11"/>
          <line x1="6" y1="15" x2="10" y2="15"/>
        </svg>
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