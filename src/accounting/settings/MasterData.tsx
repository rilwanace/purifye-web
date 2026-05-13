import { useState, useEffect } from 'react'
import { api } from '../../api'
import { useToast } from '../../shared/components/Toast'

type Kind = 'customers' | 'suppliers' | 'products' | 'employees' | 'accounts'

const KINDS: { key: Kind; label: string }[] = [
  { key: 'customers', label: 'Customers' },
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'products', label: 'Products' },
  { key: 'employees', label: 'Employees' },
  { key: 'accounts', label: 'Accounts' },
]

interface Item {
  id: string
  name: string
  [k: string]: any
}

interface EditState {
  id: string | null
  fields: Record<string, string>
}

const baseSection: React.CSSProperties = { padding: '20px 16px', borderBottom: '1px solid var(--border)' }
const baseSectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 14 }
const baseInp: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '9px 12px',
  color: 'var(--text-primary)',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  marginBottom: 8,
  minHeight: 40,
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: '6px 14px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    background: active ? 'var(--accent)' : 'var(--bg-input)',
    color: active ? '#000' : 'var(--text-muted)',
  }
}

function iconBtnStyle(danger?: boolean): React.CSSProperties {
  return {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: danger ? 'var(--danger)' : 'var(--text-muted)',
    fontSize: 16,
    padding: '4px 8px',
    lineHeight: 1,
  }
}

export default function MasterData() {
  const { show } = useToast()
  const [kind, setKind] = useState<Kind>('customers')
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function load(k: Kind) {
    setLoading(true)
    api<{ items: Item[] }>(`/api/settings/master-data?kind=${encodeURIComponent(k)}`)
      .then(d => setItems(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(kind) }, [kind])

  function extraFields(item?: Item): Record<string, string> {
    if (kind === 'customers' || kind === 'suppliers') {
      return { credit_days: String(item?.credit_days ?? ''), contact: item?.contact ?? '' }
    }
    if (kind === 'products') {
      return { unit: item?.unit ?? '', product_type: item?.product_type ?? '' }
    }
    if (kind === 'employees') {
      return { employee_id: item?.employee_id ?? '', role: item?.role ?? '' }
    }
    if (kind === 'accounts') {
      return { type: item?.type ?? '' }
    }
    return {}
  }

  function startAdd() {
    setEdit({ id: null, fields: { name: '', ...extraFields() } })
  }

  function startEdit(item: Item) {
    setEdit({ id: item.id, fields: { name: item.name, ...extraFields(item) } })
  }

  async function saveEdit() {
    if (!edit || !edit.fields.name?.trim()) { show('Name is required', 'error'); return }
    setSaving(true)
    try {
      if (edit.id) {
        await api(`/api/settings/master-data/${encodeURIComponent(edit.id)}`, {
          method: 'PUT',
          body: JSON.stringify({ kind, ...edit.fields }),
        })
      } else {
        await api('/api/settings/master-data', {
          method: 'POST',
          body: JSON.stringify({ kind: kind, ...edit.fields }),
        })
      }
      show(edit.id ? 'Updated' : 'Added', 'success')
      setEdit(null)
      load(kind)
    } catch (err: any) {
      show(err.message || 'Failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function doDelete(id: string) {
    try {
      await api(`/api/settings/master-data/${encodeURIComponent(id)}`, { method: 'DELETE' })
      show('Deleted', 'success')
      setDeleteConfirm(null)
      load(kind)
    } catch (err: any) {
      show(err.message || 'Delete failed', 'error')
    }
  }

  function subLabel(item: Item): string {
    if (kind === 'customers' || kind === 'suppliers') {
      const parts = []
      if (item.credit_days) parts.push(`${item.credit_days}d credit`)
      if (item.contact) parts.push(item.contact)
      return parts.join(' · ')
    }
    if (kind === 'products') {
      const parts = []
      if (item.unit) parts.push(item.unit)
      if (item.product_type) parts.push(item.product_type)
      return parts.join(' · ')
    }
    if (kind === 'employees') {
      const parts = []
      if (item.employee_id) parts.push(`#${item.employee_id}`)
      if (item.role) parts.push(item.role)
      return parts.join(' · ')
    }
    if (kind === 'accounts') return item.type || ''
    return ''
  }

  return (
    <div style={baseSection}>
      <div style={baseSectionTitle}>Master Data</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {KINDS.map(k => (
          <button key={k.key} style={tabStyle(kind === k.key)} onClick={() => { setKind(k.key); setEdit(null) }}>
            {k.label}
          </button>
        ))}
      </div>

      {edit && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: 14, marginBottom: 12, border: '1px solid var(--accent-border)' }}>
          <input
            style={baseInp}
            placeholder="Name *"
            value={edit.fields.name || ''}
            onChange={e => setEdit(d => d ? { ...d, fields: { ...d.fields, name: e.target.value } } : d)}
            autoFocus
          />
          {(kind === 'customers' || kind === 'suppliers') && (
            <>
              <input style={baseInp} placeholder="Credit days" type="number" value={edit.fields.credit_days || ''} onChange={e => setEdit(d => d ? { ...d, fields: { ...d.fields, credit_days: e.target.value } } : d)} />
              <input style={baseInp} placeholder="Phone / contact" value={edit.fields.contact || ''} onChange={e => setEdit(d => d ? { ...d, fields: { ...d.fields, contact: e.target.value } } : d)} />
            </>
          )}
          {kind === 'products' && (
            <>
              <input style={baseInp} placeholder="Unit (kg, pcs, litre…)" value={edit.fields.unit || ''} onChange={e => setEdit(d => d ? { ...d, fields: { ...d.fields, unit: e.target.value } } : d)} />
              <input style={baseInp} placeholder="Type (raw material, finished good…)" value={edit.fields.product_type || ''} onChange={e => setEdit(d => d ? { ...d, fields: { ...d.fields, product_type: e.target.value } } : d)} />
            </>
          )}
          {kind === 'employees' && (
            <>
              <input style={baseInp} placeholder="Employee ID" value={edit.fields.employee_id || ''} onChange={e => setEdit(d => d ? { ...d, fields: { ...d.fields, employee_id: e.target.value } } : d)} />
              <input style={baseInp} placeholder="Role" value={edit.fields.role || ''} onChange={e => setEdit(d => d ? { ...d, fields: { ...d.fields, role: e.target.value } } : d)} />
            </>
          )}
          {kind === 'accounts' && (
            <input style={baseInp} placeholder="Type (cash, bank, credit card…)" value={edit.fields.type || ''} onChange={e => setEdit(d => d ? { ...d, fields: { ...d.fields, type: e.target.value } } : d)} />
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button style={{ flex: 1, minHeight: 38, background: 'var(--bg-input)', color: 'var(--text-muted)', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }} onClick={() => setEdit(null)}>Cancel</button>
            <button style={{ flex: 1, minHeight: 38, background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }} onClick={saveEdit} disabled={saving}>
              {saving ? '…' : edit.id ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      )}

      <button style={{ minHeight: 36, background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '0 14px', marginBottom: 12 }} onClick={startAdd}>
        + Add
      </button>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No {kind} yet</div>
      ) : (
        items.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{item.name}</div>
              {subLabel(item) && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{subLabel(item)}</div>}
            </div>
            <button style={iconBtnStyle()} onClick={() => startEdit(item)}>✏️</button>
            <button style={iconBtnStyle(true)} onClick={() => setDeleteConfirm(item.id)}>×</button>
          </div>
        ))
      )}

      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500 }}>
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 430, margin: '0 auto', borderRadius: '14px 14px 0 0', background: '#1a1a18', padding: 20 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, fontFamily: 'var(--font-sans)' }}>Delete?</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, fontFamily: 'var(--font-sans)' }}>This will soft-delete the record.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ flex: 1, height: 48, background: 'transparent', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-sans)' }} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button style={{ flex: 1, height: 48, background: 'rgba(216,90,48,0.1)', color: '#D85A30', border: '1px solid rgba(216,90,48,0.2)', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }} onClick={() => doDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
