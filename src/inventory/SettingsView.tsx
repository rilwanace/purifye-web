import { useState, useEffect } from 'react'
import { inv } from './api'

const INV = '#E86B3A'
const GRN = '#5DCAA5'
const RED = '#D85A30'
const AMB = '#D4A843'

const THRESHOLD_COLORS = [RED, AMB, GRN, '#5DCAA5', '#2a8a6a']
const THRESHOLD_LABELS = ['Critical', 'Low', 'Normal', 'Healthy', 'Overstocked']

export default function SettingsView({ onBack: _onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<any>(null)
  const [locations, setLocations] = useState<any[]>([])
  const [newLocation, setNewLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    inv.settings().then(setSettings).catch(console.error)
    inv.locations().then(r => setLocations(r.locations || [])).catch(console.error)
  }, [])

  function set(field: string, val: any) {
    setSettings((prev: any) => ({ ...prev, [field]: val }))
  }

  async function save() {
    setSaving(true)
    try {
      await inv.saveSettings(settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      alert(e.message || 'Error saving')
    } finally {
      setSaving(false)
    }
  }

  async function addLocation() {
    if (!newLocation.trim()) return
    const res = await inv.createLocation({ name: newLocation.trim() })
    setLocations(prev => [...prev, res.location])
    setNewLocation('')
  }

  async function delLocation(id: string) {
    await inv.deleteLocation(id)
    setLocations(prev => prev.filter(l => l.id !== id))
  }

  if (!settings) return <div style={{ padding: 40, textAlign: 'center', color: '#9c9b95' }}>Loading…</div>

  return (
    <div style={{ padding: '0 16px 120px' }}>
      {/* General */}
      <div style={{ background: '#1a1a18', borderRadius: 10, padding: '12px 14px', marginTop: 12, border: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ color: '#e8e7e0', fontWeight: 600, fontSize: 13, marginBottom: 12 }}>General</div>

        {/* Batch tracking toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ color: '#e8e7e0', fontSize: 13 }}>Batch Tracking</div>
            <div style={{ color: '#9c9b95', fontSize: 11 }}>Track expiry per batch</div>
          </div>
          <button
            onClick={() => set('batch_tracking_enabled', !settings.batch_tracking_enabled)}
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              background: settings.batch_tracking_enabled ? INV : 'rgba(255,255,255,.12)',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background .2s',
            }}
          >
            <div style={{
              position: 'absolute',
              top: 2,
              left: settings.batch_tracking_enabled ? 22 : 2,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#fff',
              transition: 'left .2s',
            }} />
          </button>
        </div>

        {/* Costing method */}
        <div>
          <label style={{ color: '#9c9b95', fontSize: 11, display: 'block', marginBottom: 4 }}>Costing Method</label>
          <select
            value={settings.costing_method || 'wac'}
            onChange={e => set('costing_method', e.target.value)}
            style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, color: '#e8e7e0', padding: '8px 10px', fontSize: 13, outline: 'none', appearance: 'none' }}
          >
            <option value="wac">Weighted Average Cost (WAC)</option>
            <option value="fifo">FIFO</option>
          </select>
        </div>
      </div>

      {/* Heatmap thresholds */}
      <div style={{ background: '#1a1a18', borderRadius: 10, padding: '12px 14px', marginTop: 10, border: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ color: '#e8e7e0', fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Heatmap Thresholds</div>
        {[
          ['heatmap_critical', 0],
          ['heatmap_low', 1],
          ['heatmap_normal', 2],
          ['heatmap_healthy', 3],
        ].map(([key, colorIdx]) => (
          <div key={key as string} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: THRESHOLD_COLORS[colorIdx as number], flexShrink: 0 }} />
            <div style={{ color: '#c4c3bc', fontSize: 12, flex: 1 }}>{THRESHOLD_LABELS[colorIdx as number]}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="number"
                step="0.1"
                value={settings[key as string] || 0}
                onChange={e => set(key as string, parseFloat(e.target.value) || 0)}
                style={{ width: 60, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 6, color: '#e8e7e0', padding: '4px 8px', fontSize: 12, fontFamily: 'var(--font-mono)', outline: 'none', textAlign: 'right' }}
              />
              <span style={{ color: '#9c9b95', fontSize: 11 }}>×</span>
            </div>
          </div>
        ))}
      </div>

      {/* Expiry alert days */}
      <div style={{ background: '#1a1a18', borderRadius: 10, padding: '12px 14px', marginTop: 10, border: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#e8e7e0', fontSize: 13 }}>Expiry Alert Window</div>
            <div style={{ color: '#9c9b95', fontSize: 11 }}>Days before expiry to alert</div>
          </div>
          <input
            type="number"
            value={settings.expiry_alert_days || 7}
            onChange={e => set('expiry_alert_days', parseInt(e.target.value) || 7)}
            style={{ width: 60, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, color: '#e8e7e0', padding: '8px 10px', fontSize: 14, fontFamily: 'var(--font-mono)', outline: 'none', textAlign: 'right' }}
          />
        </div>
      </div>

      {/* Locations */}
      <div style={{ background: '#1a1a18', borderRadius: 10, padding: '12px 14px', marginTop: 10, border: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ color: '#e8e7e0', fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Locations</div>
        {locations.map(l => (
          <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 14 }}>📍</span>
            <span style={{ color: '#e8e7e0', fontSize: 13, flex: 1 }}>{l.name}</span>
            {l.is_default && (
              <span style={{ background: `${INV}20`, color: INV, fontSize: 9, padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>DEFAULT</span>
            )}
            <button
              onClick={() => delLocation(l.id)}
              style={{ background: 'none', border: 'none', color: '#9c9b95', fontSize: 14, cursor: 'pointer', padding: 0 }}
            >×</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            value={newLocation}
            onChange={e => setNewLocation(e.target.value)}
            placeholder="New location name"
            style={{ flex: 1, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, color: '#e8e7e0', padding: '8px 10px', fontSize: 12, outline: 'none' }}
            onKeyDown={e => e.key === 'Enter' && addLocation()}
          />
          <button
            onClick={addLocation}
            style={{ padding: '8px 12px', background: INV, border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >+ Add</button>
        </div>
      </div>

      {/* Save */}
      <div style={{ position: 'fixed', bottom: 64, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, padding: '10px 16px', boxSizing: 'border-box', background: '#131311', borderTop: '1px solid rgba(255,255,255,.06)', zIndex: 40 }}>
        <button
          onClick={save}
          disabled={saving}
          style={{ width: '100%', padding: 14, background: saved ? GRN : `linear-gradient(135deg, #EE7844, #B84D22)`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'background .3s' }}
        >
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
