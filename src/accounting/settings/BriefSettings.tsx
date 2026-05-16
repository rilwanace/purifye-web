import { useState, useEffect } from 'react'
import { api } from '../../api'

interface BriefConfig {
  morning_brief_enabled: boolean
  evening_focus_enabled: boolean
}

export default function BriefSettings() {
  const [config, setConfig] = useState<BriefConfig>({ morning_brief_enabled: true, evening_focus_enabled: true })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/api/briefs/settings')
      .then(d => { if (d.ok) setConfig(d.settings) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggle = async (key: keyof BriefConfig) => {
    const prev = config[key]
    setConfig(c => ({ ...c, [key]: !prev }))
    try {
      const body: any = {}
      if (key === 'morning_brief_enabled') body.morning = !prev
      else body.evening = !prev
      await api('/api/briefs/settings', { method: 'PUT', body: JSON.stringify(body) })
    } catch {
      setConfig(c => ({ ...c, [key]: prev }))
    }
  }

  if (loading) return null

  const Switch = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: on ? '#5DCAA5' : '#3a3a38', position: 'relative', transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18,
        borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
      }} />
    </button>
  )

  return (
    <div style={{ background: '#1c1c1a', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: '#6a6a64', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, fontFamily: 'DM Mono, monospace' }}>Daily Briefs</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, color: '#f0ede6', marginBottom: 2 }}>Morning Brief</div>
          <div style={{ fontSize: 12, color: '#6a6a64' }}>Sent at 7:00 AM</div>
        </div>
        <Switch on={config.morning_brief_enabled} onToggle={() => toggle('morning_brief_enabled')} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 14, color: '#f0ede6', marginBottom: 2 }}>Evening Focus</div>
          <div style={{ fontSize: 12, color: '#6a6a64' }}>Sent at 7:00 PM</div>
        </div>
        <Switch on={config.evening_focus_enabled} onToggle={() => toggle('evening_focus_enabled')} />
      </div>
    </div>
  )
}
