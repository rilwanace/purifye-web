import { useState, useEffect } from 'react'
import { api } from '../api'
import { inv } from './api'

const INV = '#E86B3A'
const GRN = '#5DCAA5'
const RED = '#D85A30'
const AMB = '#D4A843'

const THRESHOLD_COLORS = [RED, AMB, GRN, '#5DCAA5', '#2a8a6a']
const THRESHOLD_LABELS = ['Critical', 'Low', 'Normal', 'Healthy', 'Overstocked']

export default function SettingsView({ onBack: _onBack, onSuppliers }: { onBack: () => void; onSuppliers?: () => void }) {
  const [settings, setSettings] = useState<any>(null)
  const [locations, setLocations] = useState<any[]>([])
  const [newLocation, setNewLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [bizData, setBizData] = useState<any>({ name: '', address: '', phone: '' })
  const [bizSaving, setBizSaving] = useState(false)
  const [bizSaved, setBizSaved] = useState(false)

  useEffect(() => {
    inv.settings().then(setSettings).catch(console.error)
    inv.locations().then(r => setLocations(r.locations || [])).catch(console.error)
    api('/api/settings/business').then((d: any) => setBizData({ name: d.name || '', address: d.address || '', phone: d.phone || '' })).catch(() => {})
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

  async function saveBiz() {
    setBizSaving(true)
    try {
      await api('/api/settings/business', { method: 'PUT', body: JSON.stringify(bizData) })
      setBizSaved(true)
      setTimeout(() => setBizSaved(false), 2000)
    } catch (e: any) {
      alert(e.message || 'Error saving business details')
    } finally {
      setBizSaving(false)
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

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: '#2a2a28', border: '1px solid rgba(255,255,255,.08)',
    borderRadius: 6, padding: '10px 12px',
    color: '#e8e7e0', fontSize: 13, outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
  }

  return (
    <div style={{ padding: '0 16px 160px' }}>

      {/* ── Business (common settings) ── */}
      <div style={{ background: '#1a1a18', borderRadius: 10, padding: '14px', marginTop: 12, border: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ color: '#9c9b95', fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Business</div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ color: '#9c9b95', fontSize: 10, display: 'block', marginBottom: 5, fontFamily: "'DM Mono', monospace" }}>Business Name</label>
          <input
            value={bizData.name}
            onChange={e => setBizData((d: any) => ({ ...d, name: e.target.value }))}
            placeholder="Your business name"
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ color: '#9c9b95', fontSize: 10, display: 'block', marginBottom: 5, fontFamily: "'DM Mono', monospace" }}>Phone</label>
          <input
            value={bizData.phone}
            onChange={e => setBizData((d: any) => ({ ...d, phone: e.target.value }))}
            placeholder="+94 77 123 4567"
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ color: '#9c9b95', fontSize: 10, display: 'block', marginBottom: 5, fontFamily: "'DM Mono', monospace" }}>Address</label>
          <input
            value={bizData.address}
            onChange={e => setBizData((d: any) => ({ ...d, address: e.target.value }))}
            placeholder="Business address"
            style={inputStyle}
          />
        </div>
        <button
          onClick={saveBiz}
          disabled={bizSaving}
          style={{ width: '100%', padding: 12, background: bizSaved ? GRN : 'rgba(232,107,58,0.15)', border: '1px solid rgba(232,107,58,0.3)', borderRadius: 8, color: bizSaved ? '#131311' : INV, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
        >
          {bizSaved ? '✓ Saved' : bizSaving ? 'Saving…' : 'Save Business Details'}
        </button>

        <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', marginTop: 14, paddingTop: 10 }}>
          {[{ label: 'Switch Business', icon: '⇄' }, { label: 'Add Business', icon: '+' }].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,.04)', cursor: 'pointer' }}>
              <span style={{ color: '#e8e7e0', fontSize: 13 }}>{item.label}</span>
              <span style={{ color: '#9c9b95', fontSize: 12 }}>›</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── General (inventory-specific) ── */}
      <div style={{ background: '#1a1a18', borderRadius: 10, padding: '12px 14px', marginTop: 10, border: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ color: '#9c9b95', fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>General</div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ color: '#e8e7e0', fontSize: 13 }}>Batch Tracking</div>
            <div style={{ color: '#9c9b95', fontSize: 11 }}>Track expiry per batch</div>
          </div>
          <button
            onClick={() => set('batch_tracking_enabled', !settings.batch_tracking_enabled)}
            style={{
              width: 44, height: 24, borderRadius: 12,
              background: settings.batch_tracking_enabled ? INV : 'rgba(255,255,255,.12)',
              border: 'none', cursor: 'pointer', position: 'relative', transition: 'background .2s',
            }}
          >
            <div style={{
              position: 'absolute', top: 2,
              left: settings.batch_tracking_enabled ? 22 : 2,
              width: 20, height: 20, borderRadius: '50%',
              background: '#fff', transition: 'left .2s',
            }} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ color: '#e8e7e0', fontSize: 13 }}>Default Reorder Level</div>
          </div>
          <input
            type="number"
            value={settings.default_reorder_level || 10}
            onChange={e => set('default_reorder_level', parseInt(e.target.value) || 10)}
            style={{ width: 70, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, color: '#e8e7e0', padding: '8px 10px', fontSize: 13, fontFamily: "'DM Mono', monospace", outline: 'none', textAlign: 'right' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ color: '#e8e7e0', fontSize: 13 }}>Expiry Alert Lead Time</div>
            <div style={{ color: '#9c9b95', fontSize: 11 }}>Days before expiry to alert</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number"
              value={settings.expiry_alert_days || 7}
              onChange={e => set('expiry_alert_days', parseInt(e.target.value) || 7)}
              style={{ width: 60, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, color: '#e8e7e0', padding: '8px 10px', fontSize: 13, fontFamily: "'DM Mono', monospace", outline: 'none', textAlign: 'right' }}
            />
            <span style={{ color: '#9c9b95', fontSize: 11 }}>days</span>
          </div>
        </div>

        <div>
          <label style={{ color: '#9c9b95', fontSize: 10, display: 'block', marginBottom: 5, fontFamily: "'DM Mono', monospace" }}>Costing Method</label>
          <select
            value={settings.costing_method || 'wac'}
            onChange={e => set('costing_method', e.target.value)}
            style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, color: '#e8e7e0', padding: '8px 10px', fontSize: 13, outline: 'none', appearance: 'none' as const }}
          >
            <option value="wac">Weighted Average Cost (WAC)</option>
            <option value="fifo">FIFO</option>
          </select>
        </div>
      </div>

      {/* ── Heatmap Thresholds ── */}
      <div style={{ background: '#1a1a18', borderRadius: 10, padding: '12px 14px', marginTop: 10, border: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ color: '#9c9b95', fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Heatmap Thresholds</div>
        <div style={{ color: '#9c9b95', fontSize: 10, marginBottom: 12 }}>Set ratio boundaries (current stock ÷ reorder level)</div>
        {(['heatmap_critical', 'heatmap_low', 'heatmap_normal', 'heatmap_healthy'] as const).map((key, idx) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: THRESHOLD_COLORS[idx], flexShrink: 0 }} />
            <div style={{ color: '#c4c3bc', fontSize: 12, flex: 1 }}>{THRESHOLD_LABELS[idx]}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="number"
                step="0.1"
                value={settings[key] || 0}
                onChange={e => set(key, parseFloat(e.target.value) || 0)}
                style={{ width: 60, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 6, color: '#e8e7e0', padding: '4px 8px', fontSize: 12, fontFamily: "'DM Mono', monospace", outline: 'none', textAlign: 'right' }}
              />
              <span style={{ color: '#9c9b95', fontSize: 11 }}>×</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Locations ── */}
      <div style={{ background: '#1a1a18', borderRadius: 10, padding: '12px 14px', marginTop: 10, border: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ color: '#9c9b95', fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Locations</div>
        {locations.map(l => (
          <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 14 }}>📍</span>
            <span style={{ color: '#e8e7e0', fontSize: 13, flex: 1 }}>{l.name}</span>
            {l.is_default && (
              <span style={{ background: 'rgba(232,107,58,0.15)', color: INV, fontSize: 9, padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>DEFAULT</span>
            )}
            <button
              onClick={() => delLocation(l.id)}
              style={{ background: 'none', border: 'none', color: '#9c9b95', fontSize: 16, cursor: 'pointer', padding: 0 }}
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

      {/* ── Manage ── */}
      <div style={{ background: '#1a1a18', borderRadius: 10, padding: '12px 14px', marginTop: 10, border: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ color: '#9c9b95', fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Manage</div>
        {[
          { label: 'Suppliers', onClick: onSuppliers },
          { label: 'Wastage Reasons', onClick: undefined },
          { label: 'Import Mappings', onClick: undefined },
        ].map(item => (
          <button
            key={item.label}
            onClick={item.onClick}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', background: 'none', border: 'none',
              borderBottom: '1px solid rgba(255,255,255,.04)',
              color: '#e8e7e0', padding: '13px 0', cursor: item.onClick ? 'pointer' : 'default',
              textAlign: 'left' as const, fontSize: 13,
            }}
          >
            {item.label}
            {item.onClick && <span style={{ color: '#9c9b95', fontSize: 12 }}>›</span>}
          </button>
        ))}
      </div>

      {/* Save button */}
      <div style={{ position: 'fixed', bottom: 64, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, padding: '10px 16px', boxSizing: 'border-box' as const, background: '#131311', borderTop: '1px solid rgba(255,255,255,.06)', zIndex: 40 }}>
        <button
          onClick={save}
          disabled={saving}
          style={{ width: '100%', padding: 14, background: saved ? GRN : 'linear-gradient(135deg, #EE7844, #B84D22)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'background .3s' }}
        >
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Inventory Settings'}
        </button>
      </div>
    </div>
  )
}
