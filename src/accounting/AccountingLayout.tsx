import { NavLink, Outlet } from 'react-router-dom'

const TABS = [
  { to: '/accounting/dashboard', label: 'Dashboard' },
  { to: '/accounting/entry',     label: 'Entry' },
  { to: '/accounting/recipes',   label: 'Recipes' },
  { to: '/accounting/reports',   label: 'Reports' },
  { to: '/accounting/settings',  label: 'Settings' },
]

export default function AccountingLayout() {
  return (
    <div>
      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border)', scrollbarWidth: 'none', padding: '6px 12px', gap: 4 }}>
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
              color: isActive ? '#5DCAA5' : '#6a6a64',
              background: isActive ? 'rgba(93,202,165,0.1)' : 'transparent',
              border: isActive ? '1px solid rgba(93,202,165,0.2)' : '1px solid transparent',
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
