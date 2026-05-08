export default function NotificationPrefs() {
  const toggles = [
    'Overdue receivables alerts',
    'Overdue payables alerts',
    'Evening briefing',
  ]

  return (
    <div style={{ padding: '20px 16px' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
        Push Notifications
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, fontFamily: 'var(--font-sans)' }}>Coming soon</div>
      {toggles.map(label => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)', opacity: 0.4 }}>
          <span style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{label}</span>
          <div style={{ width: 44, height: 26, background: 'var(--bg-input)', borderRadius: 13, position: 'relative' as const }}>
            <div style={{ position: 'absolute' as const, top: 3, left: 3, width: 20, height: 20, borderRadius: '50%', background: 'var(--text-muted)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
