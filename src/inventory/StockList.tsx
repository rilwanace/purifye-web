import { useState, useMemo } from 'react'

export default function StockList({ stock, onProduct }: { stock: any[]; onProduct: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const filtered = useMemo(() => {
    return (stock || []).filter(p =>
      !query ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      (p.code || '').toLowerCase().includes(query.toLowerCase())
    )
  }, [stock, query])

  const isManufacturing = filtered.some(
    p => p.product_type === 'raw_material' || p.product_type === 'work_in_progress'
  )

  const groups = isManufacturing
    ? [
        { key: 'raw_material', label: 'Raw Materials', color: '#5B8DEF', items: filtered.filter(p => p.product_type === 'raw_material') },
        { key: 'work_in_progress', label: 'Work in Progress', color: '#D4A843', items: filtered.filter(p => p.product_type === 'work_in_progress') },
        { key: 'finished_good', label: 'Finished Goods', color: '#5DCAA5', items: filtered.filter(p => p.product_type === 'finished_good' || p.product_type === 'goods_resold') },
      ].filter(g => g.items.length > 0)
    : [{ key: 'all', label: 'Products', color: '#9c9b95', items: filtered }]

  return (
    <div style={{ padding: '0 16px 100px' }}>
      <div style={{ position: 'relative', marginTop: 12, marginBottom: 12 }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9c9b95', fontSize: 14 }}>🔍</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search products…"
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            background: '#1a1a18', border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 10, padding: '10px 12px 10px 32px',
            color: '#e8e7e0', fontSize: 13, outline: 'none',
          }}
        />
      </div>

      {filtered.length === 0 && (
        <p style={{ color: '#9c9b95', textAlign: 'center', marginTop: 40, fontSize: 13 }}>No products found.</p>
      )}

      {groups.map(group => (
        <div key={group.key} style={{ marginBottom: 8 }}>
          <button
            onClick={() => setCollapsed(prev => ({ ...prev, [group.key]: !prev[group.key] }))}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', background: 'none', border: 'none',
              padding: '6px 0', cursor: 'pointer', textAlign: 'left' as const,
              marginBottom: 4,
            }}
          >
            <span style={{
              fontFamily: "'DM Mono', monospace", fontSize: 9,
              color: group.color,
              background: group.color + '18',
              border: '1px solid ' + group.color + '30',
              borderRadius: 4, padding: '2px 6px', fontWeight: 700,
            }}>
              {group.items.length}
            </span>
            <span style={{ color: '#9c9b95', fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
              {group.label}
            </span>
            <span style={{ color: '#9c9b95', fontSize: 10, marginLeft: 'auto' }}>
              {collapsed[group.key] ? '›' : '⌄'}
            </span>
          </button>

          {!collapsed[group.key] && group.items.map((p: any) => (
            <button
              key={p.product_id}
              onClick={() => onProduct(p.product_id)}
              style={{
                display: 'flex', alignItems: 'center',
                width: '100%', background: '#1a1a18',
                border: '1px solid rgba(255,255,255,.07)',
                borderRadius: 10, padding: '12px 12px',
                marginBottom: 6, cursor: 'pointer',
                textAlign: 'left' as const, gap: 10,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#e8e7e0', fontWeight: 500, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </div>
              </div>
              <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", color: '#e8e7e0', fontWeight: 500, fontSize: 11 }}>
                  {p.current_qty != null ? p.current_qty.toLocaleString('en', { maximumFractionDigits: 2 }) : '—'} {p.unit}
                </div>
              </div>
              <span style={{ color: '#9c9b95', fontSize: 12 }}>›</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
