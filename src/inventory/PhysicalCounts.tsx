import { useState, useEffect } from 'react'
import { inv } from './api'

const INV = '#E86B3A'
const GRN = '#5DCAA5'
const RED = '#D85A30'
const AMB = '#D4A843'

type Phase = 'list' | 'count' | 'review'

export default function PhysicalCounts({ stock: _stock, onBack: _onBack }: { stock: any[]; onBack: () => void }) {
  const [phase, setPhase] = useState<Phase>('list')
  const [counts, setCounts] = useState<any[]>([])
  const [activeCount, setActiveCount] = useState<any>(null)
  const [countItems, setCountItems] = useState<any[]>([])
  const [countedValues, setCountedValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    inv.counts().then(r => setCounts(r.counts || [])).catch(console.error)
  }, [])

  async function openCount(count: any) {
    const detail = await inv.getCount(count.id)
    setActiveCount(detail.count)
    const items = detail.items || []
    setCountItems(items)
    const vals: Record<string, string> = {}
    items.forEach((item: any) => {
      if (item.counted_qty !== null && item.counted_qty !== undefined)
        vals[item.product_id] = String(item.counted_qty)
    })
    setCountedValues(vals)
    setPhase('count')
  }

  async function startNew() {
    setSaving(true)
    try {
      const res = await inv.createCount({ name: `Count ${new Date().toLocaleDateString()}` })
      const detail = await inv.getCount(res.id)
      setActiveCount(detail.count)
      const items = detail.items || []
      setCountItems(items)
      setCountedValues({})
      setPhase('count')
      setCounts(prev => [detail.count, ...prev])
    } finally {
      setSaving(false)
    }
  }

  async function saveDraft() {
    if (!activeCount) return
    setSaving(true)
    const items = countItems.map((item: any) => ({
      product_id: item.product_id,
      counted_qty: countedValues[item.product_id] !== undefined
        ? parseFloat(countedValues[item.product_id]) || null
        : null,
    }))
    await inv.saveCountItems(activeCount.id, items)
    setSaving(false)
  }

  async function reviewVariances() {
    await saveDraft()
    setPhase('review')
  }

  async function postCount() {
    if (!activeCount) return
    setPosting(true)
    try {
      await inv.postCount(activeCount.id)
      setPhase('list')
      const r = await inv.counts()
      setCounts(r.counts || [])
    } catch (e: any) {
      alert(e.message || 'Error posting count')
    } finally {
      setPosting(false)
    }
  }

  const countedCount = Object.keys(countedValues).filter(k => countedValues[k] !== '').length
  const totalItems = countItems.length
  const progress = totalItems > 0 ? Math.round((countedCount / totalItems) * 100) : 0

  // Variance calc
  const variances = countItems
    .filter(item => countedValues[item.product_id] !== undefined && countedValues[item.product_id] !== '')
    .map(item => {
      const counted = parseFloat(countedValues[item.product_id]) || 0
      const system = item.system_qty || 0
      return { ...item, counted, diff: counted - system }
    })
    .filter(item => item.diff !== 0)

  // ── REVIEW phase ────────────────────────────────────────────────────────────
  if (phase === 'review') {
    return (
      <div style={{ padding: '0 16px 100px' }}>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {[
            { label: 'Items Off', value: variances.length, color: variances.length > 0 ? RED : GRN },
            { label: 'Items Counted', value: countedCount, color: '#e8e7e0' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: '#1a1a18', borderRadius: 10, padding: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,.07)' }}>
              <div style={{ color: s.color, fontWeight: 700, fontSize: 20 }}>{s.value}</div>
              <div style={{ color: '#9c9b95', fontSize: 10 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#1a1a18', borderRadius: 10, padding: '12px 14px', marginTop: 10, border: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ color: '#e8e7e0', fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Variances</div>
          {variances.length === 0 ? (
            <p style={{ color: GRN, fontSize: 13 }}>All counts match! ✓</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '6px 8px', fontSize: 11 }}>
              <div style={{ color: '#9c9b95' }}>Product</div>
              <div style={{ color: '#9c9b95', textAlign: 'right' }}>System</div>
              <div style={{ color: '#9c9b95', textAlign: 'right' }}>Counted</div>
              <div style={{ color: '#9c9b95', textAlign: 'right' }}>Diff</div>
              {variances.map(v => (
                <>
                  <div key={`n-${v.product_id}`} style={{ color: '#c4c3bc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</div>
                  <div key={`s-${v.product_id}`} style={{ color: '#e8e7e0', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{v.system_qty}</div>
                  <div key={`c-${v.product_id}`} style={{ color: '#e8e7e0', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{v.counted}</div>
                  <div key={`d-${v.product_id}`} style={{ color: v.diff > 0 ? GRN : RED, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {v.diff > 0 ? '+' : ''}{v.diff.toFixed(2)}
                  </div>
                </>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: 'fixed', bottom: 64, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, padding: '10px 16px', boxSizing: 'border-box', background: '#131311', borderTop: '1px solid rgba(255,255,255,.06)', zIndex: 40, display: 'flex', gap: 8 }}>
          <button
            onClick={() => setPhase('count')}
            style={{ flex: 1, padding: 14, background: 'rgba(255,255,255,.06)', border: 'none', borderRadius: 10, color: '#e8e7e0', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >← Back to Count</button>
          <button
            onClick={postCount}
            disabled={posting}
            style={{ flex: 2, padding: 14, background: `linear-gradient(135deg, #EE7844, #B84D22)`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >{posting ? 'Posting…' : 'Post Count → Adjust Stock'}</button>
        </div>
      </div>
    )
  }

  // ── COUNT phase ─────────────────────────────────────────────────────────────
  if (phase === 'count' && activeCount) {
    return (
      <div style={{ padding: '0 16px 100px' }}>
        {/* Progress */}
        <div style={{ background: '#1a1a18', borderRadius: 10, padding: '12px 14px', marginTop: 12, border: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#e8e7e0', fontSize: 13, fontWeight: 500 }}>
              {activeCount.name}
            </span>
            <span style={{ color: '#9c9b95', fontSize: 11 }}>{countedCount} / {totalItems}</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: INV, borderRadius: 3, transition: 'width .3s' }} />
          </div>
        </div>

        {/* Items */}
        {countItems.map((item: any) => {
          const val = countedValues[item.product_id] ?? ''
          const counted = parseFloat(val)
          const hasVal = val !== '' && !isNaN(counted)
          const diff = hasVal ? counted - (item.system_qty || 0) : null
          const dotColor = !hasVal ? '#9c9b95' : diff === 0 ? GRN : diff! < 0 ? RED : AMB
          return (
            <div key={item.product_id} style={{ background: '#1a1a18', borderRadius: 10, padding: '10px 12px', marginTop: 8, border: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#e8e7e0', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                <div style={{ color: '#9c9b95', fontSize: 11 }}>System: {item.system_qty} {item.unit}</div>
              </div>
              <input
                type="number"
                value={val}
                onChange={e => setCountedValues(prev => ({ ...prev, [item.product_id]: e.target.value }))}
                placeholder="qty"
                style={{
                  width: 70,
                  background: 'rgba(255,255,255,.05)',
                  border: `1px solid ${hasVal ? (diff === 0 ? GRN : RED) : 'rgba(255,255,255,.1)'}`,
                  borderRadius: 8,
                  color: '#e8e7e0',
                  padding: '6px 8px',
                  fontSize: 14,
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                  textAlign: 'right',
                }}
              />
            </div>
          )
        })}

        <div style={{ position: 'fixed', bottom: 64, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, padding: '10px 16px', boxSizing: 'border-box', background: '#131311', borderTop: '1px solid rgba(255,255,255,.06)', zIndex: 40, display: 'flex', gap: 8 }}>
          <button
            onClick={saveDraft}
            disabled={saving}
            style={{ flex: 1, padding: 14, background: 'rgba(255,255,255,.06)', border: 'none', borderRadius: 10, color: '#e8e7e0', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >{saving ? 'Saving…' : 'Save Draft'}</button>
          <button
            onClick={reviewVariances}
            style={{ flex: 2, padding: 14, background: `linear-gradient(135deg, #EE7844, #B84D22)`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >Review Variances →</button>
        </div>
      </div>
    )
  }

  // ── LIST phase ──────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '0 16px 80px' }}>
      <button
        onClick={startNew}
        disabled={saving}
        style={{
          width: '100%',
          marginTop: 12,
          padding: 14,
          background: `linear-gradient(135deg, #EE7844, #B84D22)`,
          border: 'none',
          borderRadius: 10,
          color: '#fff',
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        {saving ? 'Creating…' : '+ Start New Count'}
      </button>

      {counts.length === 0 && (
        <p style={{ color: '#9c9b95', textAlign: 'center', marginTop: 40, fontSize: 13 }}>No physical counts yet.</p>
      )}

      {counts.map(c => (
        <button
          key={c.id}
          onClick={() => openCount(c)}
          style={{
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            background: '#1a1a18',
            border: '1px solid rgba(255,255,255,.07)',
            borderRadius: 10,
            padding: '12px 14px',
            marginTop: 8,
            cursor: 'pointer',
            textAlign: 'left',
            gap: 10,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ color: '#e8e7e0', fontWeight: 500, fontSize: 13 }}>{c.name}</div>
            <div style={{ color: '#9c9b95', fontSize: 11, marginTop: 2 }}>{c.count_date} · {c.item_count || 0} items</div>
          </div>
          <div style={{
            fontSize: 10,
            padding: '2px 8px',
            borderRadius: 20,
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            background: c.status === 'posted' ? `${GRN}20` : `${AMB}20`,
            color: c.status === 'posted' ? GRN : AMB,
            textTransform: 'uppercase',
          }}>
            {c.status || 'draft'}
          </div>
          <span style={{ color: '#9c9b95', fontSize: 14 }}>›</span>
        </button>
      ))}
    </div>
  )
}
