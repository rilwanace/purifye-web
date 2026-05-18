import { useEffect, useState } from 'react'
import { api } from '../api'

const ACCENT = '#5DCAA5'
const CATEGORIES = ['all', 'food', 'transport', 'shopping', 'bills', 'income', 'subscription', 'health', 'education', 'entertainment', 'other']

interface MoneyEntry {
  id: string
  direction: 'in' | 'out'
  amount: number
  currency: string
  vendor_or_person?: string
  category?: string
  payment_method?: string
  date: string
  recurrence?: string
  notes?: string
}

function fmt(n: number) {
  return n.toLocaleString('en', { maximumFractionDigits: 0 })
}

export default function PersonalMoney() {
  const [entries, setEntries] = useState<MoneyEntry[]>([])
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)

  function load(cat: string) {
    setLoading(true)
    const params = cat !== 'all' ? `?category=${cat}` : ''
    api<MoneyEntry[]>(`/api/personal/money${params}`)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(category) }, [category])

  const spent = entries.filter(e => e.direction === 'out').reduce((s, e) => s + Number(e.amount), 0)
  const earned = entries.filter(e => e.direction === 'in').reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div style={{ background: '#1a1a18', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: '14px' }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64', letterSpacing: '0.08em' }}>OUT</div>
          <div style={{ fontSize: 20, fontFamily: 'DM Mono', fontWeight: 500, color: '#D85A30', marginTop: 4 }}>{fmt(spent)}</div>
        </div>
        <div style={{ background: '#1a1a18', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: '14px' }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64', letterSpacing: '0.08em' }}>IN</div>
          <div style={{ fontSize: 20, fontFamily: 'DM Mono', fontWeight: 500, color: '#5DCAA5', marginTop: 4 }}>{fmt(earned)}</div>
        </div>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 12, scrollbarWidth: 'none' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              flexShrink: 0,
              padding: '5px 12px',
              borderRadius: 20,
              fontSize: 11,
              fontFamily: 'DM Mono',
              fontWeight: 600,
              border: category === cat ? `1px solid ${ACCENT}33` : '1px solid transparent',
              background: category === cat ? `${ACCENT}1a` : 'transparent',
              color: category === cat ? ACCENT : '#6a6a64',
              cursor: 'pointer',
            }}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Entry list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
          <div style={{ width: 20, height: 20, border: `2px solid ${ACCENT}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : entries.length === 0 ? (
        <div style={{ fontSize: 12, fontFamily: 'DM Sans', color: '#6a6a64', textAlign: 'center', paddingTop: 40 }}>
          No entries{category !== 'all' ? ` for ${category}` : ''}
        </div>
      ) : (
        entries.map(e => (
          <div key={e.id} style={{
            background: '#1a1a18', border: '1px solid rgba(255,255,255,0.04)',
            borderRadius: 10, padding: '12px 14px', marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: e.direction === 'out' ? 'rgba(216,90,48,0.12)' : 'rgba(93,202,165,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: e.direction === 'out' ? '#D85A30' : '#5DCAA5',
            }}>
              {e.direction === 'out' ? '−' : '+'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontFamily: 'DM Sans', fontWeight: 500, color: '#e8e7e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.vendor_or_person || e.category || 'Entry'}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center' }}>
                {e.category && (
                  <span style={{ fontSize: 9, fontFamily: 'DM Mono', fontWeight: 700, background: 'rgba(91,141,239,0.1)', color: '#5B8DEF', borderRadius: 4, padding: '2px 6px' }}>
                    {e.category}
                  </span>
                )}
                <span style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64' }}>{e.date}</span>
                {e.recurrence && e.recurrence !== 'none' && (
                  <span style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#D4A843' }}>{e.recurrence}</span>
                )}
              </div>
            </div>
            <div style={{ fontFamily: 'DM Mono', fontWeight: 500, color: e.direction === 'out' ? '#D85A30' : '#5DCAA5', fontSize: 14, flexShrink: 0 }}>
              {fmt(Number(e.amount))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
