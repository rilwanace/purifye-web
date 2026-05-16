import { NavLink, useLocation } from 'react-router-dom'

const GRAD = 'linear-gradient(145deg, #28997A, #13654C)'

const TABS = [
  {
    to: '/accounting/dashboard',
    label: 'Dashboard',
    svg: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    to: '/accounting/chat',
    label: 'Chat',
    svg: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    to: '/accounting/history',
    label: 'History',
    svg: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <circle cx="3" cy="6" r="1.2" fill="rgba(255,255,255,0.9)" stroke="none"/>
        <circle cx="3" cy="12" r="1.2" fill="rgba(255,255,255,0.9)" stroke="none"/>
        <circle cx="3" cy="18" r="1.2" fill="rgba(255,255,255,0.9)" stroke="none"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const location = useLocation()
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430,
      background: '#131311', borderTop: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'stretch', zIndex: 100,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {TABS.map(tab => {
        const active = location.pathname.startsWith(tab.to)
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 5, padding: '10px 0 14px',
              textDecoration: 'none', border: 'none', background: 'none',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: GRAD,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: active ? 1 : 0.4,
              boxShadow: active ? '0 0 12px rgba(93,202,165,0.3)' : 'none',
              transition: 'opacity 0.15s, box-shadow 0.15s',
            }}>
              {tab.svg}
            </div>
            <span style={{
              fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
              letterSpacing: '0.08em', fontWeight: 500,
              color: active ? '#5DCAA5' : '#6a6a64',
              transition: 'color 0.15s',
            }}>
              {tab.label}
            </span>
          </NavLink>
        )
      })}
    </div>
  )
}
