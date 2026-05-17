import { useState, useEffect } from 'react'
import { MorningTab, EveningTab, RemindersTab } from './NotifTabs'

const tabActive: React.CSSProperties = { padding: '5px 14px', borderRadius: 20, border: '1px solid rgba(93,202,165,0.4)', background: 'rgba(93,202,165,0.1)', color: '#5DCAA5', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }
const tabInactive: React.CSSProperties = { padding: '5px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: '#6a6a64', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }

type PTab = 'morning' | 'evening' | 'reminders'

export default function NotificationPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<PTab>('morning')
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: '#1a1a18', borderTop: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px 20px 0 0', zIndex: 301, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ width: 36, height: 4, background: 'rgba(106,106,100,0.3)', borderRadius: 2, margin: '12px auto 0' }} />
        <div style={{ display: 'flex', gap: 4, padding: '12px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0 }}>
          {(['morning', 'evening', 'reminders'] as PTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={tab === t ? tabActive : tabInactive}>{t}</button>
          ))}
        </div>
        <div style={{ overflowY: 'auto', flex: 1, paddingTop: 12 }}>
          {tab === 'morning' && <MorningTab />}
          {tab === 'evening' && <EveningTab />}
          {tab === 'reminders' && <RemindersTab />}
        </div>
      </div>
    </>
  )
}