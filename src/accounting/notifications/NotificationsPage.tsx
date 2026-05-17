import { useState } from 'react'
import { MorningTab, EveningTab, RemindersTab } from './NotifTabs'

const GRAD = 'linear-gradient(135deg, #28997A, #13654C)'
type NTab = 'morning' | 'evening' | 'reminders'

export default function NotificationsPage() {
  const [tab, setTab] = useState<NTab>('morning')

  const seg = (t: NTab): React.CSSProperties => ({
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 9, fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
    color: tab === t ? '#fff' : '#6a6a64',
    background: tab === t ? GRAD : 'transparent',
    boxShadow: tab === t ? '0 0 12px rgba(93,202,165,0.2)' : 'none',
    cursor: 'pointer',
    WebkitUserSelect: 'none', userSelect: 'none',
    WebkitTapHighlightColor: 'transparent' as any,
    touchAction: 'manipulation',
    transition: 'background 0.15s, color 0.15s',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 60px)', background: '#131311' }}>
      <div style={{ padding: '12px 16px 8px', flexShrink: 0 }}>
        <div style={{
          height: 36, background: '#1a1a18',
          borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)',
          padding: 3, display: 'flex',
        }}>
          <div onClick={() => setTab('morning')} style={seg('morning')}>Morning</div>
          <div onClick={() => setTab('evening')} style={seg('evening')}>Evening</div>
          <div onClick={() => setTab('reminders')} style={seg('reminders')}>Reminders</div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
        {tab === 'morning' && <MorningTab />}
        {tab === 'evening' && <EveningTab />}
        {tab === 'reminders' && <RemindersTab />}
      </div>
    </div>
  )
}