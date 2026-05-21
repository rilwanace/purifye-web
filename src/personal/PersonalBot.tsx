import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import PersonalDocs from './PersonalDocs'
import PersonalNotes from './PersonalNotes'

const TABS = [
  { id: 'docs', label: 'DOCS', icon: '📄', path: '/personal/docs', color: '#5B8DEF' },
  { id: 'notes', label: 'NOTES', icon: '📝', path: '/personal/notes', color: '#D4A843' },
] as const

export default function PersonalBot() {
  const navigate = useNavigate()
  const location = useLocation()
  const activeId = location.pathname.split('/')[2] || 'docs'

  return (
    <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100dvh', background: '#131311', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Top nav */}
      <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#131311', position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, color: '#e8e7e0', flexShrink: 0 }}
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="#e8e7e0" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'DM Sans', letterSpacing: '-0.3px', color: '#e8e7e0' }}>
          <span style={{ color: '#5B8DEF' }}>◆</span> Personal Bot
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 112 }}>
        <Routes>
          <Route index element={<Navigate to="docs" replace />} />
          <Route path="docs/*" element={<PersonalDocs />} />
          <Route path="notes" element={<PersonalNotes />} />
          <Route path="*" element={<Navigate to="docs" replace />} />
        </Routes>
      </div>

      {/* Bottom tab bar — 48px */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, height: 48, background: '#1a1a18', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'stretch', zIndex: 40 }}>
        {TABS.map(tab => {
          const active = activeId === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              style={{ flex: 1, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, padding: 0 }}
            >
              <div style={{ fontSize: 18, lineHeight: 1 }}>{tab.icon}</div>
              <div style={{ fontSize: 10, fontFamily: 'DM Sans', fontWeight: 600, color: active ? tab.color : '#6a6a64', letterSpacing: '0.04em' }}>{tab.label}</div>
              {active && <div style={{ width: 24, height: 2, background: tab.color, borderRadius: 1 }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
