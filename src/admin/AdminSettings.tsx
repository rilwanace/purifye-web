import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SETTING_LABELS: Record<string, string> = {
  usd_to_lkr_rate:      'USD → LKR Rate',
  trial_days:           'Trial Duration (days)',
  bot_price_accounting: 'Accounting price (USD)',
  bot_price_inventory:  'Inventory price (USD)',
  bot_price_social:     'Social price (USD)',
  bot_price_planner:    'Planner price (USD)',
  bot_price_customers:  'Customers price (USD)',
}

export default function AdminSettings() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/admin/settings', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setSettings(d.settings || {}))
  }, [])

  async function save(key: string) {
    setSaving(key)
    setMsg('')
    try {
      const r = await fetch('/api/admin/settings', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: settings[key] }),
      })
      const d = await r.json()
      setMsg(d.ok ? `Saved ${key}` : 'Error saving')
    } catch {
      setMsg('Network error')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#0f1117', padding: '1.5rem', maxWidth: 600, margin: '0 auto' }}>
      <button onClick={() => navigate('/admin')} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', marginBottom: '1rem', fontSize: '0.875rem' }}>
        ← Back
      </button>
      <h2 style={{ color: '#fff', fontWeight: 700, marginBottom: '1.5rem' }}>Admin Settings</h2>
      {msg && <p style={{ color: '#6ee7b7', marginBottom: '1rem', fontSize: '0.875rem' }}>{msg}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {Object.keys(SETTING_LABELS).map(key => (
          <div key={key} style={{ background: '#1f2937', borderRadius: '0.5rem', padding: '1rem' }}>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
              {SETTING_LABELS[key]}
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text" value={settings[key] ?? ''}
                onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #374151', background: '#111827', color: '#f9fafb', fontSize: '0.9rem', outline: 'none' }}
              />
              <button
                disabled={saving === key}
                onClick={() => save(key)}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', background: '#5DCAA5', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                {saving === key ? '…' : 'Save'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
