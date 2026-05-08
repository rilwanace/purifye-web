import { useState } from 'react'

const INV = '#E86B3A'
const GRN = '#5DCAA5'
const AMB = '#D4A843'
const RED = '#D85A30'

function statusColor(s: string) {
  if (s === 'sent' || s === 'completed') return GRN
  if (s === 'draft') return AMB
  if (s === 'cancelled') return RED
  return '#9c9b95'
}

export default function POList({
  pos,
  onNew,
  onPO,
}: {
  pos: any[]
  onNew: () => void
  onPO: (id: string) => void
}) {
  const [tabFilter, setTabFilter] = useState<'all' | 'draft' | 'sent' | 'completed'>('all')

  const filtered = (pos || []).filter(p => tabFilter === 'all' || p.status === tabFilter)

  return (
    <div style={{ padding: '0 16px 80px' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginTop: 12, marginBottom: 10 }}>
        {(['all', 'draft', 'sent', 'completed'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTabFilter(t)}
            style={{
              padding: '5px 10px',
              borderRadius: 20,
              border: 'none',
              fontSize: 11,
              cursor: 'pointer',
              background: tabFilter === t ? INV : 'rgba(255,255,255,.06)',
              color: tabFilter === t ? '#fff' : '#9c9b95',
              fontWeight: tabFilter === t ? 600 : 400,
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ color: '#9c9b95', textAlign: 'center', marginTop: 40, fontSize: 13 }}>No purchase orders.</p>
      )}

      {filtered.map((po: any) => (
        <button
          key={po.id}
          onClick={() => onPO(po.id)}
          style={{
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            background: '#1a1a18',
            border: '1px solid rgba(255,255,255,.07)',
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 8,
            cursor: 'pointer',
            textAlign: 'left',
            gap: 10,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#e8e7e0', fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-mono)' }}>{po.po_number}</div>
            <div style={{ color: '#9c9b95', fontSize: 11, marginTop: 2 }}>
              {po.item_count || 0} items{po.supplier_name ? ` · ${po.supplier_name}` : ''}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ color: '#e8e7e0', fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-mono)' }}>
              {po.total_amount ? `LKR ${po.total_amount.toLocaleString('en', { maximumFractionDigits: 0 })}` : '—'}
            </div>
            <div style={{ color: '#9c9b95', fontSize: 10 }}>{(po.created_at || '').slice(0, 10)}</div>
          </div>
          <div style={{
            fontSize: 9,
            padding: '2px 7px',
            borderRadius: 20,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            background: `${statusColor(po.status)}20`,
            color: statusColor(po.status),
            textTransform: 'uppercase',
            flexShrink: 0,
          }}>
            {po.status || 'draft'}
          </div>
          <span style={{ color: '#9c9b95', fontSize: 14 }}>›</span>
        </button>
      ))}

      {/* FAB */}
      <button
        onClick={onNew}
        style={{
          position: 'fixed',
          bottom: 76,
          right: 24,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: `linear-gradient(145deg, #EE7844, #B84D22)`,
          border: 'none',
          color: '#fff',
          fontSize: 24,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(232,107,58,.4)',
          zIndex: 50,
        }}
      >+</button>
    </div>
  )
}
