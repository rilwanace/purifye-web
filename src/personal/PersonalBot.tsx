import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import PersonalHome from './PersonalHome'
import PersonalMoney from './PersonalMoney'
import PersonalDocs from './PersonalDocs'
import PersonalNotes from './PersonalNotes'
import PersonalRules from './PersonalRules'
import PersonalOnboarding from './PersonalOnboarding'
import { api } from '../api'

const ACCENT = '#5B8DEF'

const TABS = [
  { id: 'home', label: 'HOME', path: '/personal/home' },
  { id: 'money', label: 'MONEY', path: '/personal/money' },
  { id: 'docs', label: 'DOCS', path: '/personal/docs' },
  { id: 'notes', label: 'NOTES', path: '/personal/notes' },
] as const

export default function PersonalBot() {
  const navigate = useNavigate()
  const location = useLocation()
  const [hasRules, setHasRules] = useState<boolean | null>(null)

  useEffect(() => {
    api<{ id: string }[]>('/api/personal/rules')
      .then(rules => setHasRules(rules.length > 0))
      .catch(() => setHasRules(true))
  }, [])

  function activeTab() {
    const seg = location.pathname.split('/')[2] || 'home'
    return seg
  }

  if (hasRules === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh', background: '#131311' }}>
        <div style={{ width: 24, height: 24, border: `2px solid ${ACCENT}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!hasRules) {
    return <PersonalOnboarding onDone={() => { setHasRules(true); navigate('/personal/home') }} />
  }

  return (
    <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100dvh', background: '#131311', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Top nav */}
      <div style={{
        padding: '14px 20px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: '#131311',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, color: '#e8e7e0', flexShrink: 0 }}
            aria-label="Back to bot selector"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="#e8e7e0" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'DM Sans', letterSpacing: '-0.3px', color: '#e8e7e0' }}>
            <span style={{ color: ACCENT }}>◆</span> Personal Bot
          </div>
        </div>
        <button
          onClick={() => navigate('/personal/rules')}
          style={{ background: 'rgba(91,141,239,0.12)', border: '1px solid rgba(91,141,239,0.2)', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontFamily: 'DM Mono', fontWeight: 600, color: ACCENT, cursor: 'pointer' }}
        >
          Rules
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 140 }}>
        <Routes>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<PersonalHome />} />
          <Route path="money" element={<PersonalMoney />} />
          <Route path="docs/*" element={<PersonalDocs />} />
          <Route path="notes" element={<PersonalNotes />} />
          <Route path="tasks" element={<Navigate to="/personal/notes" replace />} />
          <Route path="rules" element={<PersonalRules />} />
          <Route path="*" element={<Navigate to="home" replace />} />
        </Routes>
      </div>

      {/* Bottom tab bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 430,
        height: 64,
        background: '#1a1a18',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 40,
      }}>
        {TABS.map(tab => {
          const active = activeTab() === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              style={{
                flex: 1,
                height: '100%',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
              }}
            >
              <div style={{
                fontSize: 11,
                fontFamily: 'DM Mono',
                fontWeight: 600,
                color: active ? ACCENT : '#6a6a64',
                letterSpacing: '0.05em',
              }}>
                {tab.label}
              </div>
              {active && (
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: ACCENT }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

