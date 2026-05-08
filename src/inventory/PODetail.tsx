import { useState, useEffect } from 'react'
import { inv } from './api'

const INV = '#E86B3A'
const RED = '#D85A30'

export default function PODetail({
  poId,
  stock,
  suppliers,
  onBack: _onBack,
  onDeleted,
}: {
  poId: string | null
  stock: any[]
  suppliers: any[]
  onBack: () => void
  onDeleted: () => void
}) {
  const [po, setPO] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [supplierName, setSupplierName] = useState('')
  const [supplierPhone, setSupplierPhone] = useState('')
  const [supplierAddress, setSupplierAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [showSupplierPicker, setShowSupplierPicker] = useState(false)

  const isNew = poId === null

  useEffect(() => {
    if (!poId) {
      setPO({ status: 'draft', po_number: 'New PO' })
      setItems([])
      return
    }
    setLoading(true)
    inv.getPO(poId)
      .then(r => {
        setPO(r.po)
        setItems(r.items || [])
        setSupplierName(r.po.supplier_name || '')
        setSupplierPhone(r.po.supplier_phone || '')
        setSupplierAddress(r.po.supplier_address || '')
        setNotes(r.po.notes || '')
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [poId])

  function updateItem(idx: number, field: string, val: string) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item))
  }

  function addItem() {
    setItems(prev => [...prev, { product_name: '', qty_ordered: '', unit_cost: '' }])
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const grandTotal = items.reduce((sum, item) => {
    const qty = parseFloat(item.qty_ordered) || 0
    const price = parseFloat(item.unit_cost) || 0
    return sum + qty * price
  }, 0)

  async function save(status?: string) {
    setSaving(true)
    try {
      const body: any = {
        supplier_name: supplierName || null,
        supplier_phone: supplierPhone || null,
        supplier_address: supplierAddress || null,
        notes: notes || null,
        items: items.map(item => ({
          product_name: item.product_name,
          qty_ordered: parseFloat(item.qty_ordered) || 0,
          unit_cost: parseFloat(item.unit_cost) || null,
        })).filter(item => item.product_name && item.qty_ordered > 0),
      }
      if (status) body.status = status

      if (isNew || !po?.id) {
        const res = await inv.createPO(body)
        setPO(res.po)
        setItems(res.items || [])
      } else {
        if (status) await inv.setPOStatus(po.id, status)
        const res = await inv.updatePO(po.id, body)
        setPO(res.po)
        setItems(res.items || [])
      }
    } catch (e: any) {
      alert(e.message || 'Error saving PO')
    } finally {
      setSaving(false)
    }
  }

  async function downloadPDF() {
    if (!po?.id) return
    try {
      const res = await inv.poPdf(po.id)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${po.po_number}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert(e.message || 'Error downloading PDF')
    }
  }

  async function deletePO() {
    if (!po?.id) return
    if (!confirm('Delete this PO?')) return
    await inv.deletePO(po.id)
    onDeleted()
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9c9b95' }}>Loading…</div>

  return (
    <div style={{ padding: '0 16px 120px' }}>
      {/* Supplier card */}
      <div style={{ background: '#1a1a18', borderRadius: 12, padding: 14, marginTop: 12, border: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ color: '#e8e7e0', fontWeight: 600, fontSize: 13 }}>Supplier</span>
          <button
            onClick={() => setShowSupplierPicker(true)}
            style={{ background: 'rgba(255,255,255,.06)', border: 'none', borderRadius: 6, color: '#9c9b95', fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}
          >Pick from list</button>
        </div>

        {showSupplierPicker && (
          <div style={{ marginBottom: 10 }}>
            {suppliers.map((s: any) => (
              <button
                key={s.id}
                onClick={() => {
                  setSupplierName(s.name)
                  setSupplierPhone(s.phone || '')
                  setSupplierAddress(s.address || '')
                  setShowSupplierPicker(false)
                }}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'rgba(255,255,255,.04)', border: 'none', borderRadius: 6, color: '#e8e7e0', fontSize: 12, padding: '8px 10px', marginBottom: 4, cursor: 'pointer' }}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        <input
          value={supplierName}
          onChange={e => setSupplierName(e.target.value)}
          placeholder="Supplier name"
          style={inputStyle}
        />
        <input
          value={supplierPhone}
          onChange={e => setSupplierPhone(e.target.value)}
          placeholder="Phone"
          style={{ ...inputStyle, marginTop: 6 }}
        />
        <input
          value={supplierAddress}
          onChange={e => setSupplierAddress(e.target.value)}
          placeholder="Address"
          style={{ ...inputStyle, marginTop: 6 }}
        />
      </div>

      {/* PO Info */}
      <div style={{ background: '#1a1a18', borderRadius: 10, padding: '12px 14px', marginTop: 8, border: '1px solid rgba(255,255,255,.07)', display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#9c9b95', fontSize: 10 }}>PO Number</div>
          <div style={{ color: '#e8e7e0', fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-mono)' }}>{po?.po_number || '—'}</div>
        </div>
        <div>
          <div style={{ color: '#9c9b95', fontSize: 10 }}>Date</div>
          <div style={{ color: '#e8e7e0', fontSize: 13 }}>{(po?.created_at || '').slice(0, 10) || new Date().toLocaleDateString()}</div>
        </div>
      </div>

      {/* Line items */}
      <div style={{ background: '#1a1a18', borderRadius: 10, padding: '12px 14px', marginTop: 8, border: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '4px 8px', marginBottom: 8 }}>
          {['Product', 'Qty', 'Unit Price', ''].map(h => (
            <div key={h} style={{ color: '#9c9b95', fontSize: 10 }}>{h}</div>
          ))}
        </div>

        {items.map((item, idx) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '4px 8px', marginBottom: 6, alignItems: 'center' }}>
            <select
              value={item.product_name}
              onChange={e => updateItem(idx, 'product_name', e.target.value)}
              style={{ ...inputStyle, fontSize: 11 }}
            >
              <option value="">Select…</option>
              {stock.map(p => <option key={p.product_id} value={p.name}>{p.name}</option>)}
            </select>
            <input
              type="number"
              value={item.qty_ordered}
              onChange={e => updateItem(idx, 'qty_ordered', e.target.value)}
              placeholder="qty"
              style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: 12 }}
            />
            <input
              type="number"
              value={item.unit_cost}
              onChange={e => updateItem(idx, 'unit_cost', e.target.value)}
              placeholder="price"
              style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: 12 }}
            />
            <button
              onClick={() => removeItem(idx)}
              style={{ background: 'none', border: 'none', color: RED, fontSize: 14, cursor: 'pointer', padding: 0 }}
            >×</button>
          </div>
        ))}

        <button
          onClick={addItem}
          style={{ background: 'rgba(255,255,255,.04)', border: '1px dashed rgba(255,255,255,.1)', borderRadius: 8, color: '#9c9b95', fontSize: 11, padding: '6px 12px', cursor: 'pointer', width: '100%', marginTop: 4 }}
        >+ Add Item</button>
      </div>

      {/* Totals */}
      <div style={{ background: '#1a1a18', borderRadius: 10, padding: '12px 14px', marginTop: 8, border: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: '#9c9b95', fontSize: 12 }}>Subtotal</span>
          <span style={{ color: '#e8e7e0', fontSize: 12, fontFamily: 'var(--font-mono)' }}>LKR {grandTotal.toLocaleString('en', { maximumFractionDigits: 2 })}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#e8e7e0', fontWeight: 700, fontSize: 14 }}>Grand Total</span>
          <span style={{ color: INV, fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-mono)' }}>LKR {grandTotal.toLocaleString('en', { maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Notes */}
      <div style={{ marginTop: 8 }}>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes (optional)…"
          rows={2}
          style={{ width: '100%', boxSizing: 'border-box', ...inputStyle, resize: 'none', fontFamily: 'inherit' }}
        />
      </div>

      {/* Actions */}
      <div style={{ position: 'fixed', bottom: 64, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, padding: '10px 16px', boxSizing: 'border-box', background: '#131311', borderTop: '1px solid rgba(255,255,255,.06)', zIndex: 40 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <button
            onClick={() => save()}
            disabled={saving}
            style={{ flex: 1, padding: 12, background: 'rgba(255,255,255,.06)', border: 'none', borderRadius: 10, color: '#e8e7e0', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
          >{saving ? 'Saving…' : 'Save Draft'}</button>
          {po?.id && (
            <button
              onClick={downloadPDF}
              style={{ flex: 1, padding: 12, background: 'rgba(255,255,255,.06)', border: 'none', borderRadius: 10, color: '#e8e7e0', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
            >⬇ PDF</button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {po?.id && po.status !== 'completed' && po.status !== 'cancelled' && (
            <button
              onClick={() => save('sent')}
              style={{ flex: 2, padding: 12, background: `linear-gradient(135deg, #EE7844, #B84D22)`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >Mark Sent →</button>
          )}
          {po?.id && (
            <button
              onClick={deletePO}
              style={{ flex: 1, padding: 12, background: `${RED}20`, border: 'none', borderRadius: 10, color: RED, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
            >Delete</button>
          )}
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(255,255,255,.05)',
  border: '1px solid rgba(255,255,255,.08)',
  borderRadius: 8,
  color: '#e8e7e0',
  padding: '8px 10px',
  fontSize: 13,
  outline: 'none',
}
