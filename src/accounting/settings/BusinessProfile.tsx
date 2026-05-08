import { useState, useEffect } from 'react'
import { api } from '../../api'
import { useToast } from '../../shared/components/Toast'

interface BizData {
  name: string
  address: string
  phone: string
  track_inventory: boolean
}

export default function BusinessProfile() {
  const { show } = useToast()
  const [data, setData] = useState<BizData>({ name: '', address: '', phone: '', track_inventory: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api<BizData>('/api/settings/business')
      .then(d => setData({ name: d.name || '', address: d.address || '', phone: d.phone || '', track_inventory: d.track_inventory }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    try {
      await api('/api/settings/business', {
        method: 'PUT',
        body: JSON.stringify({ name: data.name, address: data.address, phone: data.phone }),
      })
      show('Profile saved', 'success')
    } catch (err: any) {
      show(err.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const s: Record<string, React.CSSProperties> = {
    section: { padding: '20px 16px', borderBottom: '1px solid var(--border)' },
    sectionTitle: { fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, fontFamily: 'var(--font-mono)' },
    fieldGroup: { marginBottom: 14 },
    label: { fontSize: 9, color: 'var(--text-muted)', marginBottom: 5, fontWeight: 600, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block' },
    input: {
      width: '100%',
      background: 'var(--bg-input)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '12px',
      color: 'var(--text-primary)',
      fontSize: 13,
      outline: 'none',
      boxSizing: 'border-box' as const,
      fontFamily: 'var(--font-sans)',
    },
    textarea: {
      width: '100%',
      background: 'var(--bg-input)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '12px',
      color: 'var(--text-primary)',
      fontSize: 13,
      outline: 'none',
      resize: 'vertical' as const,
      boxSizing: 'border-box' as const,
      minHeight: 80,
      fontFamily: 'var(--font-sans)',
    },
    saveBtn: {
      height: 48,
      background: 'var(--accent)',
      color: '#131311',
      border: 'none',
      borderRadius: 10,
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
      padding: '0 24px',
      fontFamily: 'var(--font-sans)',
    },
  }

  if (loading) return <div style={{ ...s.section, color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)' }}>Loading…</div>

  return (
    <div style={s.section}>
      <div style={s.sectionTitle}>Business Profile</div>
      <div style={s.fieldGroup}>
        <div style={s.label}>Business name</div>
        <input style={s.input} value={data.name} onChange={e => setData(d => ({ ...d, name: e.target.value }))} placeholder="Your business name" />
      </div>
      <div style={s.fieldGroup}>
        <div style={s.label}>Address</div>
        <textarea style={s.textarea} value={data.address} onChange={e => setData(d => ({ ...d, address: e.target.value }))} placeholder="Business address" />
      </div>
      <div style={s.fieldGroup}>
        <div style={s.label}>Phone</div>
        <input style={s.input} type="tel" value={data.phone} onChange={e => setData(d => ({ ...d, phone: e.target.value }))} placeholder="+94 XX XXX XXXX" />
      </div>
      <button style={s.saveBtn} onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}
