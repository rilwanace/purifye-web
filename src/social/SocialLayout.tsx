import { NavLink, Outlet } from 'react-router-dom'

const TABS = [
  { to: '/social/analytics', label: 'Analytics' },
  { to: '/social/create',    label: 'Create' },
  { to: '/social/calendar',  label: 'Calendar' },
  { to: '/social/feed',      label: 'Feed' },
  { to: '/social/library',   label: 'Library' },
]

const ACCENT = '#7068D9'

export default function SocialLayout() {
  return (
    <div>
      <div style={{
        display: 'flex', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.06)',
        scrollbarWidth: 'none', padding: '6px 12px', gap: 4,
      }}>
        {TABS.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            style={({ isActive }) => ({
              padding: '6px 14px',
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              textDecoration: 'none',
              fontFamily: 'var(--font-mono)',
              flexShrink: 0,
              borderRadius: 20,
              color: isActive ? ACCENT : '#6a6a64',
              background: isActive ? 'rgba(112,104,217,0.1)' : 'transparent',
              border: isActive ? '1px solid rgba(112,104,217,0.2)' : '1px solid transparent',
              minHeight: 34,
              display: 'flex',
              alignItems: 'center',
            })}
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  )
}
