import { useNavigate, useLocation } from 'react-router-dom'
import { useToast } from '../shared/components/Toast'

const BOTS = [
  { id: 'accounting', label: 'Accounting', gradient: 'linear-gradient(145deg, #28997A, #13654C)', path: '/accounting', active: true, icon: '📊' },
  { id: 'inventory',  label: 'Inventory',  gradient: 'linear-gradient(145deg, #EE7844, #B84D22)', path: '/inventory',  active: true,  icon: '📦' },
  { id: 'social',     label: 'Social',     gradient: 'linear-gradient(145deg, #7068D9, #4840A3)', path: '/social',     active: true,  icon: '📣' },
  { id: 'planner',    label: 'Planner',    gradient: 'linear-gradient(145deg, #D4A843, #9E7B28)', path: '/planner',    active: true,  icon: '📅' },
  { id: 'customers',  label: 'Customers',  gradient: 'linear-gradient(145deg, #CF5BA0, #8A3063)', path: '/customers',  active: true,  icon: '👥' },
]

export default function BotTabBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430,
      height: 64, background: 'var(--bg-primary)',
      borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      padding: '0 8px', boxSizing: 'border-box', zIndex: 100,
    }}>
      {BOTS.map(bot => {
        const isCurrent = location.pathname.startsWith(bot.path)
        return (
          <button
            key={bot.id}
            onClick={() => bot.active ? navigate(bot.path) : toast.show('Coming soon', 'info')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: '4px 8px',
              opacity: bot.active ? 1 : 0.35,
              filter: bot.active ? 'none' : 'grayscale(1)',
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: bot.gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
              boxShadow: isCurrent ? `0 0 12px rgba(93,202,165,0.3)` : 'none',
            }}>
              {bot.icon}
            </div>
            <span style={{ fontSize: 10, fontWeight: 500, color: isCurrent ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
              {bot.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
