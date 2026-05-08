import { useState, useEffect } from 'react'
import { api } from '../../api'
import { useToast } from '../../shared/components/Toast'

export default function InventoryToggle() {
  const { show } = useToast()
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api<{ track_inventory: boolean }>('/api/settings/business')
      .then(d => setEnabled(d.track_inventory))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function toggle() {
    const next = !enabled
    setSaving(true)
    try {
      await api('/api/settings/business', {
        method: 'PUT',
        body: JSON.stringify({ track_inventory: next }),
      })
      setEnabled(next)
      show(`Inventory tracking turned ${next ? 'ON' : 'OFF'}`, 'success')
    } catch (err: any) {
      show(err.message || 'Failed to update', 'error')
    } finally {
      setSaving(false)
    }
  }

  const s: Record<string, React.CSSProperties> = {
    section: {
      padding: '20px 16px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    left: {},
    title: { fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' },
    sub: { fontSize: 13, color: 'var(--text-muted)', marginTop: 2 },
    track: {
      position: 'relative' as const,
      width: 48,
      height: 28,
      cursor: saving || loading ? 'not-allowed' : 'pointer',
    },
    trackBg: {
      position: 'absolute' as const,
      inset: 0,
      borderRadius: 14,
      background: enabled ? 'var(--accent)' : 'var(--bg-input)',
      transition: 'background 0.2s',
    },
    trackThumb: {
      position: 'absolute' as const,
      top: 3,
      left: enabled ? 23 : 3,
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: '#fff',
      transition: 'left 0.2s',
      boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
    },
  }

  return (
    <div style={s.section}>
      <div style={s.left}>
        <div style={s.title}>Track Inventory</div>
        <div style={s.sub}>Monitor stock levels and COGS</div>
      </div>
      <div style={s.track} onClick={saving || loading ? undefined : toggle}>
        <div style={s.trackBg} />
        <div style={s.trackThumb} />
      </div>
    </div>
  )
}
