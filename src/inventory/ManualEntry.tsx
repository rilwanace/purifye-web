import { useState, useEffect } from 'react'
import { inv } from './api'

const INV = '#E86B3A'
const RED = '#D85A30'

type EntryType = 'purchases' | 'sales' | 'adjustments' | 'wastage'

const TYPES: { id: EntryType; icon: string; label: string; sub: string }[] = [
  { id: 'purchases', icon: '📦', label: 'Purchase', sub: 'Stock in' },
  { id: 'sales', icon: '🛒', label: 'Sale', sub: 'Stock out' },
  { id: 'adjustments', icon: '⚖️', label: 'Adjust', sub: 'Correct qty' },
  { id: 'wastage', icon: '🗑️', label: 'Waste', sub: 'Write off' },
]

const WASTAGE_REASONS = ['Expired', 'Damaged', 'Spoiled', 'Theft', 'Other']
const ADJUST_REASONS = ['Physical Count', 'Write-off', 'Found Stock', 'Transfer', 'Other']

export default function ManualEntry({
  stock,
  initialType,
  initialProductId,
  onDone,
  onBack: _onBack,
}: {
  stock: any[]
  initialType?: string
  initialProductId?: string
  onDone: () => void
  onBack: (() => void) | undefined
}) {
  const [entryType, setEntryType] = useState<EntryType>((initialType as EntryType) || 'purchases')
  const [productId, setProductId] = useState(initialProductId || '')
  const [qty, setQty] = useState('')
  const [price, setPrice] = useState('')
  const [supplier, setSupplier] = useState('')
  const [direction, setDirection] = useState<'+' | '-'>('+')
  const [reason, setReason] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [suppliers, setSuppliers] = useState<any[]>([])
  useEffect(() => {
    inv.suppliers().then(r => setSuppliers(r.suppliers || [])).catch(() => {})
  }, [])

  const selectedProduct = stock.find(p => p.product_id === productId)
  const qtyNum = parseFloat(qty) || 0
  const priceNum = parseFloat(price) || 0
  const totalValue = qtyNum * priceNum

  const reasons = entryType === 'wastage' ? WASTAGE_REASONS : ADJUST_REASONS

  async function submit() {
    if (!productId) { setError('Select a product'); return }
    if (!qty || qtyNum <= 0) { setError('Enter a valid quantity'); return }
    setError('')
    setSubmitting(true)
    try {
      await inv.entry({
        entry_type: entryType,
        product_id: productId,
        product_name: selectedProduct?.name || '',
        qty: qtyNum,
        unit_cost: entryType === 'purchases' ? priceNum || null : null,
        unit_price: entryType === 'sales' ? priceNum || null : null,
        direction: entryType === 'adjustments' ? direction : undefined,
        reason: reason || undefined,
        supplier_name: entryType === 'purchases' ? supplier || null : null,
        date_: date,
        notes: notes || null,
      })
      onDone()
    } catch (e: any) {
      setError(e.message || 'Error saving entry')
    } finally {
      setSubmitting(false)
    }
  }

  const btnLabel = { purchases: 'Record Purchase', sales: 'Record Sale', adjustments: 'Save Adjustment', wastage: 'Log Wastage' }[entryType]

  return (
    <div style={{ padding: '0 16px 100px' }}>
      {/* Entry type grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
        {TYPES.map(t => (
          <button
            key={t.id}
            onClick={() => setEntryType(t.id)}
            style={{
              background: entryType === t.id ? `${INV}18` : '#1a1a18',
              border: `1px solid ${entryType === t.id ? INV : 'rgba(255,255,255,.07)'}`,
              borderRadius: 10,
              padding: '12px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 8, background: `${INV}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              {t.icon}
            </div>
            <div>
              <div style={{ color: entryType === t.id ? INV : '#e8e7e0', fontWeight: 600, fontSize: 13 }}>{t.label}</div>
              <div style={{ color: '#9c9b95', fontSize: 10 }}>{t.sub}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Product picker */}
      <div style={{ marginTop: 14 }}>
        <label style={{ color: '#9c9b95', fontSize: 11, display: 'block', marginBottom: 4 }}>Product</label>
        <select
          value={productId}
          onChange={e => setProductId(e.target.value)}
          style={{
            width: '100%',
            background: '#1a1a18',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 10,
            color: productId ? '#e8e7e0' : '#9c9b95',
            padding: '10px 12px',
            fontSize: 13,
            outline: 'none',
            appearance: 'none',
          }}
        >
          <option value="">Select product…</option>
          {stock.map(p => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
        </select>
        {selectedProduct && (
          <div style={{ color: '#9c9b95', fontSize: 11, marginTop: 4 }}>
            Current stock: {selectedProduct.current_qty} {selectedProduct.unit}
          </div>
        )}
      </div>

      {/* Qty + Price */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={{ color: '#9c9b95', fontSize: 11, display: 'block', marginBottom: 4 }}>
            Quantity {selectedProduct ? `(${selectedProduct.unit})` : ''}
          </label>
          <input
            type="number"
            value={qty}
            onChange={e => setQty(e.target.value)}
            placeholder="0"
            style={{ width: '100%', boxSizing: 'border-box', background: '#1a1a18', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, color: '#e8e7e0', padding: '10px 12px', fontSize: 14, fontFamily: 'var(--font-mono)', outline: 'none' }}
          />
        </div>
        {(entryType === 'purchases' || entryType === 'sales') && (
          <div style={{ flex: 1 }}>
            <label style={{ color: '#9c9b95', fontSize: 11, display: 'block', marginBottom: 4 }}>
              {entryType === 'purchases' ? 'Unit Cost' : 'Unit Price'} (LKR)
            </label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0.00"
              style={{ width: '100%', boxSizing: 'border-box', background: '#1a1a18', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, color: '#e8e7e0', padding: '10px 12px', fontSize: 14, fontFamily: 'var(--font-mono)', outline: 'none' }}
            />
          </div>
        )}
      </div>

      {/* Supplier (purchases) */}
      {entryType === 'purchases' && (
        <div style={{ marginTop: 12 }}>
          <label style={{ color: '#9c9b95', fontSize: 11, display: 'block', marginBottom: 4 }}>Supplier (optional)</label>
          <select
            value={supplier}
            onChange={e => setSupplier(e.target.value)}
            style={{ width: '100%', background: '#1a1a18', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, color: supplier ? '#e8e7e0' : '#9c9b95', padding: '10px 12px', fontSize: 13, outline: 'none', appearance: 'none' }}
          >
            <option value="">No supplier</option>
            {suppliers.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
      )}

      {/* Direction (adjustments) */}
      {entryType === 'adjustments' && (
        <div style={{ marginTop: 12 }}>
          <label style={{ color: '#9c9b95', fontSize: 11, display: 'block', marginBottom: 6 }}>Direction</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['+', '-'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDirection(d)}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: 8,
                  border: `1px solid ${direction === d ? INV : 'rgba(255,255,255,.08)'}`,
                  background: direction === d ? `${INV}18` : '#1a1a18',
                  color: direction === d ? INV : '#9c9b95',
                  fontWeight: 600,
                  fontSize: 18,
                  cursor: 'pointer',
                }}
              >
                {d === '+' ? '+ Add' : '− Remove'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reason chips */}
      {(entryType === 'adjustments' || entryType === 'wastage') && (
        <div style={{ marginTop: 12 }}>
          <label style={{ color: '#9c9b95', fontSize: 11, display: 'block', marginBottom: 6 }}>Reason</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {reasons.map(r => (
              <button
                key={r}
                onClick={() => setReason(r)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 20,
                  border: `1px solid ${reason === r ? INV : 'rgba(255,255,255,.1)'}`,
                  background: reason === r ? `${INV}18` : 'transparent',
                  color: reason === r ? INV : '#c4c3bc',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date */}
      <div style={{ marginTop: 12 }}>
        <label style={{ color: '#9c9b95', fontSize: 11, display: 'block', marginBottom: 4 }}>Date</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', background: '#1a1a18', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, color: '#e8e7e0', padding: '10px 12px', fontSize: 13, outline: 'none' }}
        />
      </div>

      {/* Notes */}
      <div style={{ marginTop: 12 }}>
        <label style={{ color: '#9c9b95', fontSize: 11, display: 'block', marginBottom: 4 }}>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any additional details…"
          rows={2}
          style={{ width: '100%', boxSizing: 'border-box', background: '#1a1a18', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, color: '#e8e7e0', padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit' }}
        />
      </div>

      {/* Total value */}
      {totalValue > 0 && (
        <div style={{ background: '#1a1a18', borderRadius: 10, padding: '10px 14px', marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,.07)' }}>
          <span style={{ color: '#9c9b95', fontSize: 12 }}>Total Value</span>
          <span style={{ color: INV, fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-mono)' }}>
            LKR {totalValue.toLocaleString('en', { maximumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {error && <div style={{ color: RED, fontSize: 12, marginTop: 8 }}>{error}</div>}

      {/* Submit */}
      <div style={{ position: 'fixed', bottom: 64, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, padding: '10px 16px', boxSizing: 'border-box', background: '#131311', borderTop: '1px solid rgba(255,255,255,.06)', zIndex: 40 }}>
        <button
          onClick={submit}
          disabled={submitting}
          style={{
            width: '100%',
            padding: '14px',
            background: submitting ? 'rgba(255,255,255,.1)' : `linear-gradient(135deg, #EE7844, #B84D22)`,
            border: 'none',
            borderRadius: 10,
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            cursor: submitting ? 'default' : 'pointer',
          }}
        >
          {submitting ? 'Saving…' : btnLabel}
        </button>
      </div>
    </div>
  )
}
