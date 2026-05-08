import { useState } from 'react'
import { inv } from './api'

const INV = '#E86B3A'
const RED = '#D85A30'

export default function SuppliersView({ suppliers: initialSuppliers, onBack: _onBack }: { suppliers: any[]; onBack: () => void }) {
  const [suppliers, setSuppliers] = useState(initialSuppliers || [])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<any | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const filtered = suppliers.filter(s =>
    !query || s.name?.toLowerCase().includes(query.toLowerCase())
  )

  function openNew() {
    setForm({ name: '', phone: '', email: '', address: '', notes: '' })
    setSelected(null)
    setIsNew(true)
  }

  function openEdit(s: any) {
    setForm({ name: s.name || '', phone: s.phone || '', email: s.email || '', address: s.address || '', notes: s.notes || '' })
    setSelected(s)
    setIsNew(false)
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (isNew) {
        const res = await inv.createSupplier(form)
        setSuppliers(prev => [res.supplier, ...prev])
      } else if (selected) {
        const res = await inv.updateSupplier(selected.id, form)
        setSuppliers(prev => prev.map(s => s.id === selected.id ? res.supplier : s))
      }
      setSelected(null)
      setIsNew(false)
    } catch (e: any) {
      alert(e.message || 'Error saving')
    } finally {
      setSaving(false)
    }
  }

  async function del() {
    if (!selected || !confirm(`Delete ${selected.name}?`)) return
    await inv.deleteSupplier(selected.id)
    setSuppliers(prev => prev.filter(s => s.id !== selected.id))
    setSelected(null)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    background: 'rgba(255,255,255,.05)',
    border: '1px solid rgba(255,255,255,.08)',
    borderRadius: 8,
    color: '#e8e7e0',
    padding: '10px 12px',
    fontSize: 13,
    outline: 'none',
  }

  // ── Edit form ───────────────────────────────────────────────────────────────
  if (selected || isNew) {
    return (
      <div style={{ padding: '0 16px 120px' }}>
        <div style={{ color: '#e8e7e0', fontWeight: 600, fontSize: 16, marginTop: 14, marginBottom: 14 }}>
          {isNew ? 'New Supplier' : selected?.name}
        </div>
        {[
          { key: 'name', label: 'Name', placeholder: 'Supplier name' },
          { key: 'phone', label: 'Phone', placeholder: '+94 77 000 0000' },
          { key: 'email', label: 'Email', placeholder: 'contact@supplier.com' },
          { key: 'address', label: 'Address', placeholder: 'Street, City' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 10 }}>
            <label style={{ color: '#9c9b95', fontSize: 11, display: 'block', marginBottom: 4 }}>{f.label}</label>
            <input
              value={(form as any)[f.key]}
              onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              style={inputStyle}
            />
          </div>
        ))}
        <div style={{ marginBottom: 10 }}>
          <label style={{ color: '#9c9b95', fontSize: 11, display: 'block', marginBottom: 4 }}>Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
            style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ position: 'fixed', bottom: 64, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, padding: '10px 16px', boxSizing: 'border-box', background: '#131311', borderTop: '1px solid rgba(255,255,255,.06)', zIndex: 40, display: 'flex', gap: 8 }}>
          {!isNew && (
            <button onClick={del} style={{ flex: 1, padding: 12, background: `${RED}20`, border: 'none', borderRadius: 10, color: RED, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Delete
            </button>
          )}
          <button
            onClick={save}
            disabled={saving}
            style={{ flex: 2, padding: 12, background: `linear-gradient(135deg, #EE7844, #B84D22)`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    )
  }

  // ── List view ───────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '0 16px 80px' }}>
      <div style={{ position: 'relative', marginTop: 12, marginBottom: 10 }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9c9b95', fontSize: 14 }}>🔍</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search suppliers…"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: '#1a1a18',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 10,
            padding: '10px 12px 10px 32px',
            color: '#e8e7e0',
            fontSize: 13,
            outline: 'none',
          }}
        />
      </div>

      <button
        onClick={openNew}
        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: `${INV}10`, border: `1px dashed ${INV}`, borderRadius: 10, padding: '10px 14px', marginBottom: 10, cursor: 'pointer', color: INV, fontWeight: 600, fontSize: 13 }}
      >
        + Add Supplier
      </button>

      {filtered.map(s => {
        const initials = s.name?.slice(0, 2).toUpperCase() || '??'
        return (
          <button
            key={s.id}
            onClick={() => openEdit(s)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: '#1a1a18', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: '10px 14px', marginBottom: 8, cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 8, background: `${INV}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: INV, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#e8e7e0', fontWeight: 500, fontSize: 13 }}>{s.name}</div>
              <div style={{ color: '#9c9b95', fontSize: 11, marginTop: 1 }}>
                {s.phone ? s.phone : 'No phone'}
              </div>
            </div>
            <span style={{ color: '#9c9b95', fontSize: 14 }}>›</span>
          </button>
        )
      })}
    </div>
  )
}
