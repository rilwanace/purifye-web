import { useState, useEffect } from 'react'
import { inv } from './api'

const INV = '#E86B3A'
const GRN = '#5DCAA5'
const RED = '#D85A30'
const AMB = '#D4A843'

function QA({ icon, label, onClick, color = INV }: { icon: string; label: string; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        background: '#1a1a18',
        border: `1px solid rgba(255,255,255,.07)`,
        borderRadius: 10,
        padding: '10px 4px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        cursor: 'pointer',
        color: '#e8e7e0',
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 10, color: color }}>{label}</span>
    </button>
  )
}

export default function ProductDetail({
  productId,
  onBack: _onBack,
  onEntry,
  onDraftPO,
}: {
  productId: string
  onBack: (() => void) | undefined
  onEntry: (type: string, productId: string) => void
  onDraftPO: (productId: string) => void
}) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editingReorder, setEditingReorder] = useState(false)
  const [reorderVal, setReorderVal] = useState('')

  useEffect(() => {
    setLoading(true)
    inv.product(productId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [productId])

  async function saveReorder() {
    const level = parseFloat(reorderVal)
    if (isNaN(level)) return
    await inv.setReorder(productId, level)
    setEditingReorder(false)
    const refreshed = await inv.product(productId)
    setData(refreshed)
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#9c9b95' }}>Loading…</div>
  )
  if (!data) return null

  const p = data.product || {}
  const movements = data.movements || []
  const batches = data.batches || []
  const health = data.health || 'ok'
  const healthColor = health === 'critical' ? RED : health === 'low' ? AMB : GRN

  return (
    <div style={{ padding: '0 16px 80px' }}>
      {/* Hero */}
      <div style={{ background: '#1a1a18', borderRadius: 12, padding: 16, marginTop: 12, border: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ color: '#e8e7e0', fontWeight: 700, fontSize: 18 }}>{p.name}</div>
            {p.code && <div style={{ color: '#9c9b95', fontSize: 11, marginTop: 2 }}>{p.code}</div>}
          </div>
          <div style={{ background: `${healthColor}20`, color: healthColor, fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            {health}
          </div>
        </div>
        <div style={{ color: INV, fontWeight: 800, fontSize: 36, letterSpacing: -1 }}>
          {data.current_qty?.toLocaleString('en', { maximumFractionDigits: 2 })}
          <span style={{ color: '#9c9b95', fontSize: 14, fontWeight: 400, marginLeft: 6 }}>{p.unit}</span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {[
          { label: 'WAC/unit', value: data.wac_per_unit ? `LKR ${data.wac_per_unit.toFixed(2)}` : '—' },
          { label: 'Stock Value', value: data.stock_value ? `LKR ${data.stock_value.toLocaleString('en', { maximumFractionDigits: 0 })}` : '—' },
          { label: 'Location', value: p.location_name || '—' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: '#1a1a18', borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid rgba(255,255,255,.07)' }}>
            <div style={{ color: '#e8e7e0', fontWeight: 600, fontSize: 12, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
            <div style={{ color: '#9c9b95', fontSize: 10, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Reorder level */}
      <div style={{ background: '#1a1a18', borderRadius: 10, padding: '12px 14px', marginTop: 8, border: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: healthColor, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ color: '#9c9b95', fontSize: 11 }}>Reorder Level</div>
          {editingReorder ? (
            <input
              autoFocus
              value={reorderVal}
              onChange={e => setReorderVal(e.target.value)}
              type="number"
              style={{ background: 'rgba(255,255,255,.06)', border: `1px solid ${INV}`, borderRadius: 6, color: '#e8e7e0', fontSize: 14, padding: '2px 6px', width: 80 }}
            />
          ) : (
            <div style={{ color: '#e8e7e0', fontWeight: 600, fontSize: 14 }}>
              {p.reorder_level || '—'} {p.unit}
            </div>
          )}
        </div>
        {editingReorder ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={saveReorder} style={{ background: INV, border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}>Save</button>
            <button onClick={() => setEditingReorder(false)} style={{ background: 'rgba(255,255,255,.08)', border: 'none', borderRadius: 6, color: '#9c9b95', fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}>Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => { setEditingReorder(true); setReorderVal(String(p.reorder_level || '')) }}
            style={{ background: 'none', border: `1px solid rgba(255,255,255,.1)`, borderRadius: 6, color: '#9c9b95', fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}
          >Edit</button>
        )}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <QA icon="📦" label="Purchase" onClick={() => onEntry('purchases', productId)} />
        <QA icon="🛒" label="Sale" onClick={() => onEntry('sales', productId)} />
        <QA icon="🗑️" label="Wastage" onClick={() => onEntry('wastage', productId)} color={RED} />
        <QA icon="📋" label="Draft PO" onClick={() => onDraftPO(productId)} color={AMB} />
      </div>

      {/* Batches */}
      {batches.length > 0 && (
        <div style={{ background: '#1a1a18', borderRadius: 10, padding: '12px 14px', marginTop: 10, border: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ color: '#e8e7e0', fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Active Batches</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '6px 8px', fontSize: 11 }}>
            <div style={{ color: '#9c9b95' }}>Batch</div>
            <div style={{ color: '#9c9b95' }}>Qty</div>
            <div style={{ color: '#9c9b95' }}>Expiry</div>
            <div />
            {batches.map((b: any) => {
              const today = new Date()
              const exp = b.expiry_date ? new Date(b.expiry_date) : null
              const expColor = exp && exp < today ? RED : exp && (exp.getTime() - today.getTime()) < 7 * 86400000 ? AMB : GRN
              return [
                <div key={`${b.id}-bn`} style={{ color: '#c4c3bc', fontFamily: 'var(--font-mono)' }}>{b.batch_number || b.id.slice(-6)}</div>,
                <div key={`${b.id}-q`} style={{ color: '#e8e7e0', fontWeight: 600 }}>{b.current_qty}</div>,
                <div key={`${b.id}-e`} style={{ color: expColor }}>{b.expiry_date || '—'}</div>,
                <div key={`${b.id}-d`} style={{ width: 6, height: 6, borderRadius: '50%', background: expColor, alignSelf: 'center' }} />,
              ]
            })}
          </div>
        </div>
      )}

      {/* Movement timeline */}
      {movements.length > 0 && (
        <div style={{ background: '#1a1a18', borderRadius: 10, padding: '12px 14px', marginTop: 10, border: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ color: '#e8e7e0', fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Movements</div>
          {movements.slice(0, 10).map((m: any, i: number) => {
            const isIn = m.qty_change > 0
            return (
              <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: 10, borderBottom: i < movements.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none', marginBottom: i < movements.length - 1 ? 10 : 0 }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: isIn ? `${GRN}20` : `${RED}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  flexShrink: 0,
                }}>
                  {isIn ? '↑' : '↓'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#e8e7e0', fontSize: 12, fontWeight: 500 }}>{m.description || m.type}</div>
                  <div style={{ color: '#9c9b95', fontSize: 10, marginTop: 2 }}>{m.txn_date}</div>
                </div>
                <div style={{ color: isIn ? GRN : RED, fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                  {isIn ? '+' : ''}{m.qty_change?.toFixed(2)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
