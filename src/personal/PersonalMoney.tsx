import { useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../shared/components/Toast'
import PersonalEntryDetail from './PersonalEntryDetail'

const ACCENT = '#5B8DEF'
const CATEGORIES = ['all', 'food', 'transport', 'shopping', 'bills', 'income', 'subscription', 'health', 'education', 'entertainment', 'other']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const RECURRENCES = ['none', 'daily', 'weekly', 'monthly', 'yearly']
const PAYMENT_METHODS = ['Cash', 'Card', 'Bank Transfer']

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

function calcNextDue(dateStr: string, recurrence: string): string | null {
  if (!recurrence || recurrence === 'none') return null
  const d = new Date(dateStr + 'T00:00:00')
  if (recurrence === 'daily') d.setDate(d.getDate() + 1)
  else if (recurrence === 'weekly') d.setDate(d.getDate() + 7)
  else if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1)
  else if (recurrence === 'yearly') d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#2a2a28', border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 8, color: '#e8e7e0', fontSize: 14, fontFamily: 'DM Sans',
  padding: '10px 12px', boxSizing: 'border-box', outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontFamily: 'DM Mono', color: '#9c9b95', marginBottom: 6, display: 'block',
}

function QuickAddMoney({ onClose, onSaved, existingCategories }: {
  onClose: () => void
  onSaved: () => void
  existingCategories: string[]
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [direction, setDirection] = useState<'out' | 'in'>('out')
  const [amount, setAmount] = useState('')
  const [vendor, setVendor] = useState('')
  const [category, setCategory] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [date, setDate] = useState(today)
  const [recurrence, setRecurrence] = useState('none')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const { show } = useToast()

  const dropdownCategories = Array.from(new Set([
    ...CATEGORIES.filter(c => c !== 'all'),
    ...existingCategories.map(c => c.toLowerCase()),
  ]))

  async function save() {
    if (!amount) return
    setSaving(true)
    try {
      await api('/api/personal/confirm', {
        method: 'POST',
        body: JSON.stringify({
          source_input_id: null,
          workflow: 'money',
          fields: {
            direction,
            amount: parseFloat(amount),
            vendor_or_person: vendor || null,
            category: category || null,
            payment_method: paymentMethod || null,
            date,
            recurrence,
            next_due: calcNextDue(date, recurrence),
            notes: notes || null,
          },
        }),
      })
      show('Saved', 'success')
      onSaved()
      onClose()
    } catch {
      show('Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430,
          background: '#1a1a18', borderRadius: '16px 16px 0 0',
          maxHeight: '85vh', overflowY: 'auto',
          padding: '0 20px 32px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 16px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#6a6a64' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <span style={labelStyle}>DIRECTION</span>
            <div style={{ display: 'flex', background: '#212120', borderRadius: 10, padding: 3 }}>
              {(['out', 'in'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDirection(d)}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 8,
                    fontSize: 11, fontFamily: 'DM Mono', fontWeight: 600,
                    background: direction === d ? '#2a2a28' : 'transparent',
                    border: direction === d ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
                    color: direction === d ? (d === 'out' ? '#D85A30' : '#5DCAA5') : '#6a6a64',
                    cursor: 'pointer', letterSpacing: '0.05em',
                  }}
                >
                  {d.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span style={labelStyle}>AMOUNT</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ ...inputStyle, fontSize: 24, fontFamily: 'DM Mono', textAlign: 'center' }}
            />
          </div>

          <div>
            <span style={labelStyle}>VENDOR / PERSON</span>
            <input
              type="text"
              placeholder="e.g. Keells, Taxi"
              value={vendor}
              onChange={e => setVendor(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <span style={labelStyle}>CATEGORY</span>
            <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, appearance: 'none' as any }}>
              <option value="">— Select —</option>
              {dropdownCategories.map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <span style={labelStyle}>PAYMENT METHOD</span>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{ ...inputStyle, appearance: 'none' as any }}>
              <option value="">— Select —</option>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <span style={labelStyle}>DATE</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <span style={labelStyle}>RECURRENCE</span>
            <select value={recurrence} onChange={e => setRecurrence(e.target.value)} style={{ ...inputStyle, appearance: 'none' as any }}>
              {RECURRENCES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>

          <div>
            <span style={labelStyle}>NOTES</span>
            <textarea
              rows={2}
              placeholder="Optional note"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ ...inputStyle, resize: 'none' as any, lineHeight: '1.5' }}
            />
          </div>

          <button
            onClick={save}
            disabled={!amount || saving}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 12,
              background: !amount ? '#2a2a28' : ACCENT,
              color: !amount ? '#6a6a64' : 'white',
              fontSize: 14, fontFamily: 'DM Sans', fontWeight: 600,
              border: 'none', cursor: !amount ? 'default' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PersonalMoney() {
  const now = new Date()
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [entries, setEntries] = useState<MoneyEntry[]>([])
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<MoneyEntry | null>(null)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
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
  const existingCategories = Array.from(new Set(entries.filter(e => e.category).map(e => e.category!)))

  return (
    <div style={{ padding: '16px 20px', paddingBottom: 100 }}>
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

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 12, scrollbarWidth: 'none' as any }}>
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

      <button
        onClick={() => setShowQuickAdd(true)}
        style={{
          position: 'fixed', bottom: 80, right: 20,
          width: 48, height: 48, borderRadius: '50%',
          background: ACCENT, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)', zIndex: 50,
          fontSize: 24, color: 'white', lineHeight: '1',
        }}
      >
        +
      </button>

      {showQuickAdd && (
        <QuickAddMoney
          onClose={() => setShowQuickAdd(false)}
          onSaved={() => load(category, viewYear, viewMonth)}
          existingCategories={existingCategories}
        />
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
