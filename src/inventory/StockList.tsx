import { useState, useMemo } from 'react'

const INV = '#E86B3A'
const GRN = '#5DCAA5'
const RED = '#D85A30'
const AMB = '#D4A843'

function healthColor(h: string) {
  if (h === 'critical') return RED
  if (h === 'low') return AMB
  return GRN
}

export default function StockList({ stock, onProduct }: { stock: any[]; onProduct: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'critical' | 'low' | 'ok'>('all')

  const filtered = useMemo(() => {
    return (stock || []).filter(p => {
      const matchQ = !query || p.name.toLowerCase().includes(query.toLowerCase()) || (p.code || '').toLowerCase().includes(query.toLowerCase())
      const matchF = filter === 'all' || p.health === filter
      return matchQ && matchF
    })
  }, [stock, query, filter])

  return (
    <div style={{ padding: '0 16px 80px' }}>
      {/* Search */}
      <div style={{ position: 'relative', marginTop: 12, marginBottom: 10 }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9c9b95', fontSize: 14 }}>🔍</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search products…"
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

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {(['all', 'critical', 'low', 'ok'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '4px 10px',
              borderRadius: 20,
              border: 'none',
              fontSize: 11,
              cursor: 'pointer',
              background: filter === f ? INV : 'rgba(255,255,255,.06)',
              color: filter === f ? '#fff' : '#9c9b95',
              fontWeight: filter === f ? 600 : 400,
              textTransform: 'capitalize',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ color: '#9c9b95', textAlign: 'center', marginTop: 40, fontSize: 13 }}>No products found.</p>
      )}

      {filtered.map((p: any) => (
        <button
          key={p.product_id}
          onClick={() => onProduct(p.product_id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            background: '#1a1a18',
            border: '1px solid rgba(255,255,255,.07)',
            borderRadius: 10,
            padding: '12px 12px',
            marginBottom: 8,
            cursor: 'pointer',
            textAlign: 'left',
            gap: 10,
          }}
        >
          {/* Health dot */}
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: healthColor(p.health), flexShrink: 0 }} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#e8e7e0', fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.name}
            </div>
            <div style={{ color: '#9c9b95', fontSize: 11, marginTop: 2 }}>
              {p.code ? `${p.code} · ` : ''}{p.product_type?.replace('_', ' ') || ''}
            </div>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ color: '#e8e7e0', fontWeight: 600, fontSize: 14 }}>
              {p.current_qty.toLocaleString('en', { maximumFractionDigits: 2 })}
            </div>
            <div style={{ color: '#9c9b95', fontSize: 11 }}>{p.unit}</div>
          </div>

          <span style={{ color: '#9c9b95', fontSize: 12 }}>›</span>
        </button>
      ))}
    </div>
  )
}
