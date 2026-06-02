import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'

// ── Types ────────────────────────────────────────────────────────────────────

interface Entry {
  id: string
  type: 'income' | 'expense'
  amount: number
  description: string
  category: string | null
  payment_method: string | null
  date: string
  notes: string | null
}

interface Summary {
  income: number
  expenses: number
  net: number
}

interface EntryForm {
  type: 'income' | 'expense'
  amount: string
  description: string
  category: string
  payment_method: string
  date: string
  notes: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Utilities', 'Rent', 'Health', 'Education', 'Shopping', 'Other']
const INCOME_CATEGORIES  = ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Other']
const PAYMENT_METHODS    = ['Cash', 'Card', 'Bank Transfer', 'Other']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

// ── Inline styles (light theme, scoped) ──────────────────────────────────────

const S = {
  page: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    background: '#FAFAF9',
    minHeight: '100vh',
    color: '#1a1a1a',
    maxWidth: 480,
    margin: '0 auto',
    position: 'relative' as const,
    overflowX: 'hidden' as const,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px 13px',
    background: '#FFFFFF',
    borderBottom: '1px solid #F0F0EE',
  },
  headerTitle: { fontSize: 15, fontWeight: 500, color: '#1a1a1a' },
  monthNav: { display: 'flex', alignItems: 'center', gap: 8 },
  monthLabel: { fontSize: 13, fontWeight: 500, color: '#1a1a1a', minWidth: 72, textAlign: 'center' as const },
  arrowBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#555',
    fontSize: 18,
    padding: '2px 6px',
    borderRadius: 6,
    lineHeight: 1,
  },
  summaryRow: { display: 'flex', gap: 8, padding: '12px 16px 0' },
  summaryBox: (_color: string, bg: string) => ({
    flex: 1,
    background: bg,
    borderRadius: 10,
    padding: '10px 12px',
  }),
  summaryLabel: {
    fontSize: 10,
    fontWeight: 500,
    color: '#888',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  summaryAmount: (color: string) => ({ fontSize: 16, fontWeight: 500, color }),
  netBox: {
    margin: '8px 16px 12px',
    background: '#F5F5FF',
    borderRadius: 10,
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  netLabel: {
    fontSize: 10,
    fontWeight: 500,
    color: '#888',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  netAmount: (color: string) => ({ fontSize: 16, fontWeight: 500, color }),
  actionRow: { display: 'flex', gap: 8, padding: '0 16px 16px' },
  actionBtn: (color: string) => ({
    flex: 1,
    height: 40,
    background: color,
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  }),
  listHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px 8px',
  },
  listLabel: { fontSize: 12, color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  filterLink: { fontSize: 11, color: '#4338CA', cursor: 'default' },
  entryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    background: '#FFFFFF',
    borderBottom: '1px solid #F8F8F6',
    cursor: 'pointer',
  },
  dot: (color: string) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
  }),
  entryMid: { flex: 1, minWidth: 0 },
  entryDesc: {
    fontSize: 13,
    color: '#1a1a1a',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  entryCat: { fontSize: 11, color: '#999', marginTop: 2 },
  entryRight: { textAlign: 'right' as const, flexShrink: 0 },
  entryAmount: (color: string) => ({ fontSize: 13, fontWeight: 500, color }),
  entryDate: { fontSize: 10, color: '#BBBBBB', marginTop: 2 },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 32px',
    textAlign: 'center' as const,
  },
  spinner: { display: 'flex', justifyContent: 'center', padding: '48px', color: '#BBB' },
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: '#FAFAF9',
    zIndex: 100,
    maxWidth: 480,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column' as const,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  formHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 16px',
    background: '#FFFFFF',
    borderBottom: '1px solid #F0F0EE',
  },
  formBack: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 22,
    color: '#555',
    padding: '0 10px 0 0',
    lineHeight: 1,
  },
  formTitle: { flex: 1, textAlign: 'center' as const, fontSize: 15, fontWeight: 600 },
  formCancel: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#999' },
  formBody: { flex: 1, overflowY: 'auto' as const, padding: '16px' },
  amountWrap: (border: string) => ({
    border: `1.5px solid ${border}`,
    borderRadius: 10,
    padding: '12px 16px',
    background: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center' as const,
  }),
  amountInput: (color: string) => ({
    width: '100%',
    border: 'none',
    background: 'transparent',
    fontSize: 22,
    fontWeight: 500,
    color,
    textAlign: 'center' as const,
    outline: 'none',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  }),
  fieldWrap: {
    background: '#FFFFFF',
    border: '1px solid #E5E5E3',
    borderRadius: 10,
    padding: '10px 14px',
    marginBottom: 10,
  },
  fieldLabel: { fontSize: 11, color: '#999', marginBottom: 4 },
  fieldInput: {
    width: '100%',
    border: 'none',
    background: 'transparent',
    fontSize: 13,
    color: '#1a1a1a',
    outline: 'none',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    boxSizing: 'border-box' as const,
  },
  pillRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 10 },
  pill: (active: boolean, type: 'income' | 'expense') => ({
    padding: '5px 12px',
    borderRadius: 15,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    border: active
      ? `1px solid ${type === 'income' ? '#86EFAC' : '#FDBA9B'}`
      : '1px solid #E5E5E3',
    background: active
      ? (type === 'income' ? '#F0FAF5' : '#FEF3F0')
      : '#FAFAF9',
    color: active
      ? (type === 'income' ? '#15803D' : '#C2410C')
      : '#555',
  }),
  saveBtn: (color: string) => ({
    width: '100%',
    height: 46,
    background: color,
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
  }),
  deleteBtn: {
    width: '100%',
    height: 40,
    background: 'transparent',
    color: '#C2410C',
    border: '1px solid #FDBA9B',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    marginTop: 8,
  },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(amount: number) {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function blankForm(type: 'income' | 'expense'): EntryForm {
  return { type, amount: '', description: '', category: '', payment_method: '', date: todayStr(), notes: '' }
}

// ── Entry Form ─────────────────────────────────────────────────────────────────

interface FormProps {
  initial: EntryForm
  customCategories: string[]
  editId: string | null
  onSave: (form: EntryForm) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}

function EntryFormView({ initial, customCategories, editId, onSave, onDelete, onClose }: FormProps) {
  const [form, setForm] = useState<EntryForm>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const type = form.type
  const accentColor = type === 'income' ? '#15803D' : '#C2410C'
  const defaultCats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const allCats = [...defaultCats, ...customCategories.filter(c => !defaultCats.includes(c))]

  const set = (k: keyof EntryForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSave() {
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      setError('Enter a valid amount')
      return
    }
    if (!form.description.trim()) {
      setError('Description is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(form)
    } catch (e: any) {
      setError(e.message || 'Failed to save')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    if (!confirm('Delete this entry?')) return
    setSaving(true)
    try {
      await onDelete()
    } catch (e: any) {
      setError(e.message || 'Failed')
      setSaving(false)
    }
  }

  const title = (editId ? 'Edit ' : 'Add ') + type

  return (
    <div style={S.overlay}>
      <div style={S.formHeader}>
        <button style={S.formBack} onClick={onClose}>‹</button>
        <span style={{ ...S.formTitle, color: accentColor }}>
          {title.charAt(0).toUpperCase() + title.slice(1)}
        </span>
        <button style={S.formCancel} onClick={onClose}>Cancel</button>
      </div>

      <div style={S.formBody}>
        {/* Amount */}
        <div style={S.amountWrap(form.amount ? accentColor : '#E5E5E3')}>
          <div style={{ fontSize: 10, color: '#999', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Amount (LKR)
          </div>
          <input
            style={S.amountInput(accentColor)}
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={form.amount}
            onChange={set('amount')}
            autoFocus
          />
        </div>

        {/* Description */}
        <div style={S.fieldWrap}>
          <div style={S.fieldLabel}>Description</div>
          <input
            style={S.fieldInput}
            placeholder="What was this for?"
            value={form.description}
            onChange={set('description')}
          />
        </div>

        {/* Category pills */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 6 }}>Category</div>
          <div style={S.pillRow}>
            {allCats.map(cat => (
              <button
                key={cat}
                style={S.pill(form.category === cat, type)}
                onClick={() => setForm(f => ({ ...f, category: f.category === cat ? '' : cat }))}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div style={S.fieldWrap}>
          <div style={S.fieldLabel}>Date</div>
          <input style={S.fieldInput} type="date" value={form.date} onChange={set('date')} />
        </div>

        {/* Payment method */}
        <div style={S.fieldWrap}>
          <div style={S.fieldLabel}>Payment method</div>
          <select
            style={{ ...S.fieldInput, appearance: 'none' as any }}
            value={form.payment_method}
            onChange={set('payment_method')}
          >
            <option value="">Select...</option>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Notes */}
        <div style={S.fieldWrap}>
          <div style={S.fieldLabel}>Notes (optional)</div>
          <input
            style={S.fieldInput}
            placeholder="Add a note..."
            value={form.notes}
            onChange={set('notes')}
          />
        </div>

        {error && (
          <div style={{ color: '#C2410C', fontSize: 12, marginBottom: 8 }}>{error}</div>
        )}

        <button style={S.saveBtn(accentColor)} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : `Save ${type}`}
        </button>

        {editId && onDelete && (
          <button style={S.deleteBtn} onClick={handleDelete} disabled={saving}>
            Delete entry
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function SimpleLedger() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [entries, setEntries] = useState<Entry[]>([])
  const [summary, setSummary] = useState<Summary>({ income: 0, expenses: 0, net: 0 })
  const [loading, setLoading] = useState(true)
  const [customCats, setCustomCats] = useState<string[]>([])
  const [form, setForm] = useState<EntryForm | null>(null)
  const [editId, setEditId] = useState<string | null>(null)

  const monthKey = `${year}-${String(month).padStart(2, '0')}`

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<{ entries: Entry[]; summary: Summary }>(
        `/api/ledger/entries?month=${monthKey}`
      )
      setEntries(data.entries)
      setSummary(data.summary)
    } finally {
      setLoading(false)
    }
  }, [monthKey])

  const loadCats = useCallback(async () => {
    try {
      const data = await api<{ categories: string[] }>('/api/ledger/categories')
      setCustomCats(data.categories)
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadCats() }, [loadCats])

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  function openAdd(type: 'income' | 'expense') {
    setEditId(null)
    setForm(blankForm(type))
  }

  function openEdit(entry: Entry) {
    setEditId(entry.id)
    setForm({
      type: entry.type,
      amount: String(entry.amount),
      description: entry.description,
      category: entry.category || '',
      payment_method: entry.payment_method || '',
      date: entry.date,
      notes: entry.notes || '',
    })
  }

  async function handleSave(f: EntryForm) {
    const body = {
      type: f.type,
      amount: Number(f.amount),
      description: f.description.trim(),
      category: f.category || null,
      payment_method: f.payment_method || null,
      date: f.date,
      notes: f.notes || null,
    }
    if (editId) {
      await api(`/api/ledger/entries/${editId}`, { method: 'PUT', body: JSON.stringify(body) })
    } else {
      await api('/api/ledger/entries', { method: 'POST', body: JSON.stringify(body) })
    }
    setForm(null)
    setEditId(null)
    await load()
    await loadCats()
  }

  async function handleDelete() {
    if (!editId) return
    await api(`/api/ledger/entries/${editId}`, { method: 'DELETE' })
    setForm(null)
    setEditId(null)
    await load()
  }

  const netColor = summary.net >= 0 ? '#4338CA' : '#C2410C'

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <span style={S.headerTitle}>Simple Ledger</span>
        <div style={S.monthNav}>
          <button style={S.arrowBtn} onClick={prevMonth}>‹</button>
          <span style={S.monthLabel}>{MONTHS[month - 1].slice(0, 3)} {year}</span>
          <button style={S.arrowBtn} onClick={nextMonth}>›</button>
        </div>
      </div>

      {/* Summary boxes */}
      <div style={S.summaryRow}>
        <div style={S.summaryBox('#15803D', '#F0FAF5')}>
          <div style={S.summaryLabel}>Income</div>
          <div style={S.summaryAmount('#15803D')}>LKR {fmt(summary.income)}</div>
        </div>
        <div style={S.summaryBox('#C2410C', '#FEF3F0')}>
          <div style={S.summaryLabel}>Expenses</div>
          <div style={S.summaryAmount('#C2410C')}>LKR {fmt(summary.expenses)}</div>
        </div>
      </div>
      <div style={S.netBox}>
        <span style={S.netLabel}>Net</span>
        <span style={S.netAmount(netColor)}>LKR {fmt(summary.net)}</span>
      </div>

      {/* Action buttons */}
      <div style={S.actionRow}>
        <button style={S.actionBtn('#15803D')} onClick={() => openAdd('income')}>+ Income</button>
        <button style={S.actionBtn('#C2410C')} onClick={() => openAdd('expense')}>- Expense</button>
      </div>

      {/* List header */}
      <div style={S.listHeader}>
        <span style={S.listLabel}>Recent</span>
        <span style={S.filterLink}>Filter</span>
      </div>

      {/* Entries */}
      {loading ? (
        <div style={S.spinner}>Loading...</div>
      ) : entries.length === 0 ? (
        <div style={S.emptyState}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 14, color: '#999', marginBottom: 6 }}>
            No entries for {MONTHS[month - 1]} {year}
          </div>
          <div style={{ fontSize: 12, color: '#BBB' }}>
            Tap + Income or - Expense to start
          </div>
        </div>
      ) : (
        <div>
          {entries.map(entry => (
            <div key={entry.id} style={S.entryRow} onClick={() => openEdit(entry)}>
              <div style={S.dot(entry.type === 'income' ? '#22C55E' : '#EF4444')} />
              <div style={S.entryMid}>
                <div style={S.entryDesc}>{entry.description}</div>
                <div style={S.entryCat}>{entry.category || ''}</div>
              </div>
              <div style={S.entryRight}>
                <div style={S.entryAmount(entry.type === 'income' ? '#15803D' : '#C2410C')}>
                  {entry.type === 'income' ? '+' : '-'}{fmt(entry.amount)}
                </div>
                <div style={S.entryDate}>{entry.date}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form overlay */}
      {form && (
        <EntryFormView
          initial={form}
          customCategories={customCats}
          editId={editId}
          onSave={handleSave}
          onDelete={editId ? handleDelete : undefined}
          onClose={() => { setForm(null); setEditId(null) }}
        />
      )}
    </div>
  )
}
