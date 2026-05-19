import { useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import PersonalEntryDetail from './PersonalEntryDetail'

const ACCENT = '#5B8DEF'
const CATEGORIES = ['all', 'food', 'transport', 'shopping', 'bills', 'income', 'subscription', 'health', 'education', 'entertainment', 'other']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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

function monthRange(year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

export default function PersonalMoney() {
  const now = new Date()
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [entries, setEntries] = useState<MoneyEntry[]>([])
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<MoneyEntry | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const openedRef = useRef<string | null>(null)

  function load(cat: string, year: number, month: number) {
    setLoading(true)
    const { from, to } = monthRange(year, month)
    const params = new URLSearchParams({ from_date: from, to_date: to })
    if (cat !== 'all') params.set('category', cat)
    api<MoneyEntry[]>(`/api/personal/money?${params}`)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(category, viewYear, viewMonth) }, [category, viewYear, viewMonth])

  useEffect(() => {
    const eid = (location.state as any)?.openEntryId
    if (eid && eid !== openedRef.current) {
      openedRef.current = eid
      navigate(location.pathname, { state: {}, replace: true })
      api<MoneyEntry>(`/api/personal/entry/${eid}`)
        .then(entry => setSelectedEntry(entry))
        .catch(() => null)
    }
  }, [location.state])

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const spent = entries.filter(e => e.direction === 'out').reduce((s, e) => s + Number(e.amount), 0)
  const earned = entries.filter(e => e.direction === 'in').reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: '#9c9b95', cursor: 'pointer', fontSize: 20, padding: '4px 12px', minHeight: 44, minWidth: 44 }}>‹</button>
        <span style={{ fontSize: 11, fontFamily: 'DM Mono', fontWeight: 600, color: '#c4c3bc', letterSpacing: '0.08em' }}>
          {MONTHS[viewMonth - 1].toUpperCase()} {viewYear}
        </span>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: '#9c9b95', cursor: 'pointer', fontSize: 20, padding: '4px 12px', minHeight: 44, minWidth: 44 }}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div style={{ background: '#1a1a18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px' }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64', letterSpacing: '0.08em' }}>OUT</div>
          <div style={{ fontSize: 20, fontFamily: 'DM Mono', fontWeight: 500, color: '#D85A30', marginTop: 4 }}>{fmt(spent)}</div>
        </div>
        <div style={{ background: '#1a1a18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px' }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64', letterSpacing: '0.08em' }}>IN</div>
          <div style={{ fontSize: 20, fontFamily: 'DM Mono', fontWeight: 500, color: '#5DCAA5', marginTop: 4 }}>{fmt(earned)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 12, scrollbarWidth: 'none' }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)} style={{
            flexShrink: 0, padding: '6px 12px', borderRadius: 20, fontSize: 10,
            fontFamily: 'DM Mono', fontWeight: 600,
            border: category === cat ? `1px solid ${ACCENT}33` : '1px solid transparent',
            background: category === cat ? `${ACCENT}1a` : 'transparent',
            color: category === cat ? ACCENT : '#6a6a64', cursor: 'pointer', minHeight: 32,
          }}>
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

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
          <div
            key={e.id}
            onClick={() => setSelectedEntry(e)}
            style={{
              background: '#1a1a18', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10, padding: '12px 14px', marginBottom: 6,
              display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', minHeight: 44,
            }}
          >
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

      {selectedEntry && (
        <PersonalEntryDetail
          entry={selectedEntry}
          workflow="money"
          onClose={() => setSelectedEntry(null)}
          onUpdated={() => load(category, viewYear, viewMonth)}
          onDeleted={() => load(category, viewYear, viewMonth)}
        />
      )}
    </div>
  )
}