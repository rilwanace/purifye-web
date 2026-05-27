const G = '#34d399'
const DIM = '#4a6a5a'

interface Props {
  tab: 'dashboard' | 'sold' | 'settings'
  onTab: (t: 'dashboard' | 'sold' | 'settings') => void
}

const TABS = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: '◆' },
  { id: 'sold' as const, label: 'Sold', icon: '✓' },
  { id: 'settings' as const, label: 'Settings', icon: '⚙' },
]

export default function GemLedgerBottomNav({ tab, onTab }: Props) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430, height: 56,
      background: '#0d170d', borderTop: '1px solid #1e2e1e',
      display: 'flex', alignItems: 'stretch', zIndex: 40,
    }}>
      {TABS.map(t => {
        const active = tab === t.id
        return (
          <button
            key={t.id}
            onClick={() => onTab(t.id)}
            style={{
              flex: 1, background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 2, padding: 0,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: 16, color: active ? G : DIM, lineHeight: 1 }}>{t.icon}</span>
            <span style={{
              fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
              color: active ? G : DIM, letterSpacing: '0.04em',
            }}>{t.label}</span>
            {active && <div style={{ width: 20, height: 2, background: G, borderRadius: 1 }} />}
          </button>
        )
      })}
    </div>
  )
}
