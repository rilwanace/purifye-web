import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import { useToast } from '../../shared/components/Toast'
import EntryForm from '../entry/EntryForm'

interface Entry {
  entry_group: string; type: string; date: string | null
  description: string | null; party_name: string | null
  amount: number; account: string | null; created_at: string | null
}

const TYPE_TABS = [
  { id: '', label: 'All' }, { id: 'sale', label: 'Sales' },
  { id: 'purchase', label: 'Purchases' }, { id: 'expense', label: 'Expenses' }, { id: 'other', label: 'Other' },
]
const DATE_FILTERS = [
  { id: 'this_month', label: 'This Month' }, { id: 'last_month', label: 'Last Month' },
  { id: 'all', label: 'All' }, { id: 'custom', label: 'Custom' },
]
const TYPE_COLORS: Record<string, string> = { sale: '#5DCAA5', purchase: '#E86B3A', other_expense: '#D4A843', default: '#7068D9' }

function typeColor(t: string) { return TYPE_COLORS[t] || TYPE_COLORS.default }
function typeLabel(t: string) { return (t || 'other').replace(/_/g, ' ') }
function fmtAmt(n: number) { return Math.round(n).toLocaleString('en-US') }

function fmtTime(s: string | null): string {
  if (!s) return ''
  try { return new Date(s).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}

function getDateKey(e: Entry): string {
  const raw = e.date || (e.created_at ? e.created_at.slice(0, 10) : null)
  return raw || '1970-01-01'
}

function dateLabel(key: string): string {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const yest = new Date(today); yest.setDate(today.getDate() - 1)
  const yesterdayStr = yest.toISOString().slice(0, 10)
  if (key === todayStr) return 'TODAY'
  if (key === yesterdayStr) return 'YESTERDAY'
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
}

function groupByDate(entries: Entry[]): { key: string; label: string; entries: Entry[] }[] {
  const map = new Map<string, Entry[]>()
  for (const e of entries) {
    const k = getDateKey(e)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(e)
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, ents]) => ({ key, label: dateLabel(key), entries: ents }))
}

function getRange(f: string): { from: string; to: string } | null {
  const now = new Date(), pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate())
  const today = fmt(now)
  if (f === 'this_month') return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: today }
  if (f === 'last_month') {
    const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const lmStart = new Date(lmEnd.getFullYear(), lmEnd.getMonth(), 1)
    return { from: fmt(lmStart), to: fmt(lmEnd) }
  }
  if (f === 'all') return null
  return null
}
interface MD { customers: string[]; suppliers: string[]; staff: string[]; accounts: string[]; categories: string[]; products: string[] }

export default function HistoryPage({ containerHeight = 'calc(100dvh - 56px)' }: { containerHeight?: string }) {
  const { show } = useToast()
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [typeTab, setTypeTab] = useState('')
  const [dateFilter, setDateFilter] = useState('this_month')
  const [customFrom, setCustomFrom] = useState(''), [customTo, setCustomTo] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Entry | null>(null)
  const [masterData, setMasterData] = useState<MD | null>(null)
  const [editPrefill, setEditPrefill] = useState<any>(null)
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useEffect(() => {
    api<any>('/api/entry/master-data').then(res => setMasterData({
      customers: (res.customers||[]).map((c: any) => c.name ?? c),
      suppliers: (res.suppliers||[]).map((s: any) => s.name ?? s),
      staff: (res.employees||[]).map((e: any) => e.name ?? e),
      accounts: (res.cash_accounts||[]).map((a: any) => a.name ?? a),
      categories: res.expense_categories || [],
      products: (res.products||[]).map((p: any) => p.name ?? p),
    })).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const range = dateFilter === 'custom' ? { from: customFrom, to: customTo } : getRange(dateFilter)
    const params = new URLSearchParams({ limit: '50' })
    if (typeTab) params.set('type', typeTab)
    if (range?.from) params.set('from_date', range.from)
    if (range?.to) params.set('to_date', range.to)
    if (search) params.set('search', search)
    try { const res = await api<any>('/api/entries/list?' + params); setEntries(res.entries || []) }
    catch { show('Failed to load entries', 'error') }
    finally { setLoading(false) }
  }, [typeTab, dateFilter, customFrom, customTo, search])

  useEffect(() => { load() }, [load])

  async function handleEdit(eg: string) {
    try { const res = await api<any>('/api/entry/by-group/' + eg); setEditPrefill({ type: res.type, fields: res.fields || {}, entryGroup: eg }); setEditSheetOpen(true); setSelected(null) }
    catch { show('Could not load entry', 'error') }
  }
  async function handleDelete(eg: string) {
    try { await api('/api/entry/undo', { method: 'POST', body: JSON.stringify({ entry_group: eg }) }); show('Entry deleted', 'success'); setSelected(null); setDeleteConfirm(false); load() }
    catch { show('Delete failed', 'error') }
  }

  const tabSt = (a: boolean): React.CSSProperties => ({ padding: '5px 14px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer', border: a ? '1px solid rgba(93,202,165,0.4)' : '1px solid rgba(255,255,255,0.06)', background: a ? 'rgba(93,202,165,0.1)' : 'transparent', color: a ? '#5DCAA5' : '#6a6a64', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', fontWeight: 600 })
  const dateSt = (a: boolean): React.CSSProperties => ({ padding: '5px 12px', borderRadius: 16, whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer', border: 'none', background: a ? 'rgba(106,106,100,0.15)' : 'transparent', color: a ? '#e8e7e0' : '#6a6a64', fontSize: 12, fontFamily: 'var(--font-sans)' })

  if (selected) {
    const isSale = selected.type === 'sale'
    return (
      <div style={{ height: containerHeight, background: '#131311', overflowY: 'auto', paddingBottom: 80 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#5DCAA5', cursor: 'pointer', fontSize: 18 }}>&#8592;</button>
          <span style={{ fontSize: 12, color: '#6a6a64', fontFamily: 'var(--font-mono)' }}>ENTRY DETAIL</span>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ background: '#1a1a18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ padding: '4px 10px', borderRadius: 20, background: typeColor(selected.type) + '18', border: '1px solid ' + typeColor(selected.type) + '40', fontSize: 10, fontFamily: 'var(--font-mono)', color: typeColor(selected.type), textTransform: 'uppercase' }}>{typeLabel(selected.type)}</span>
              <span style={{ fontSize: 11, color: '#6a6a64', fontFamily: 'var(--font-mono)' }}>{dateLabel(getDateKey(selected))}</span>
            </div>
            {([['Description', selected.description || '—'], ['Party', selected.party_name || '—'], ['Account', selected.account || '—']] as [string,string][]).map(([l, v]) => (
              <div key={l} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#6a6a64', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 13, color: '#e8e7e0' }}>{v}</div>
              </div>
            ))}
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <span style={{ fontSize: 20, fontFamily: 'var(--font-mono)', fontWeight: 700, color: isSale ? '#5DCAA5' : '#e8e7e0' }}>{isSale ? '+' : '−'}Rs. {fmtAmt(selected.amount)}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={() => handleEdit(selected.entry_group)} style={{ flex: 1, padding: '11px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: '#e8e7e0', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Edit</button>
              <button onClick={() => setDeleteConfirm(true)} style={{ flex: 1, padding: '11px', borderRadius: 9, border: '1px solid rgba(232,84,84,0.25)', background: 'rgba(232,84,84,0.07)', color: '#e85454', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Delete</button>
            </div>
          </div>
        </div>
        {deleteConfirm && (
          <>
            <div onClick={() => setDeleteConfirm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400 }} />
            <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: '#1a1a18', borderRadius: '20px 20px 0 0', padding: 24, zIndex: 401 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#e8e7e0', marginBottom: 8 }}>Delete this entry?</div>
              <div style={{ fontSize: 13, color: '#6a6a64', marginBottom: 20 }}>This action cannot be undone.</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setDeleteConfirm(false)} style={{ flex: 1, padding: '12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: '#6a6a64', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Cancel</button>
                <button onClick={() => handleDelete(selected.entry_group)} style={{ flex: 1, padding: '12px', borderRadius: 9, border: 'none', background: '#e85454', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Delete</button>
              </div>
            </div>
          </>
        )}
        {editSheetOpen && masterData && (
          <>
            <div onClick={() => { setEditSheetOpen(false); setEditPrefill(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400 }} />
            <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: '#1a1a18', borderRadius: '20px 20px 0 0', maxHeight: '78vh', display: 'flex', flexDirection: 'column', zIndex: 401 }}>
              <div style={{ width: 36, height: 4, background: 'rgba(106,106,100,0.3)', borderRadius: 2, margin: '12px auto 0' }} />
              <div style={{ overflowY: 'auto', flex: 1, padding: '16px' }}>
                <EntryForm masterData={masterData} prefill={editPrefill} onSaved={() => { setEditSheetOpen(false); setEditPrefill(null); setSelected(null); load(); show('Entry updated', 'success') }} />
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  const groups = groupByDate(entries)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: containerHeight, background: '#131311' }}>
      <div style={{ display: 'flex', gap: 6, padding: '12px 12px 0', overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0 }}>
        {TYPE_TABS.map(t => <button key={t.id} onClick={() => setTypeTab(t.id)} style={tabSt(typeTab === t.id)}>{t.label}</button>)}
      </div>
      <div style={{ display: 'flex', gap: 4, padding: '8px 12px', overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0 }}>
        {DATE_FILTERS.map(f => <button key={f.id} onClick={() => setDateFilter(f.id)} style={dateSt(dateFilter === f.id)}>{f.label}</button>)}
      </div>
      {dateFilter === 'custom' && (
        <div style={{ display: 'flex', gap: 8, padding: '4px 12px 8px', flexShrink: 0 }}>
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ flex: 1, background: '#2a2a28', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 7, padding: '7px 10px', color: '#e8e7e0', fontSize: 12 }} />
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ flex: 1, background: '#2a2a28', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 7, padding: '7px 10px', color: '#e8e7e0', fontSize: 12 }} />
        </div>
      )}
      <div style={{ padding: '4px 12px 8px', flexShrink: 0 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transactions..." style={{ width: '100%', background: '#2a2a28', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 12px', color: '#e8e7e0', fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box' }} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 80px' }}>
        {loading && (
          <div style={{ paddingTop: 12 }}>
            {[75, 50, 80, 55, 70].map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 11, borderRadius: 4, background: 'rgba(255,255,255,0.06)', width: w + '%', marginBottom: 7 }} />
                  <div style={{ height: 10, borderRadius: 4, background: 'rgba(255,255,255,0.04)', width: '38%' }} />
                </div>
                <div style={{ height: 13, borderRadius: 4, background: 'rgba(255,255,255,0.06)', width: 64 }} />
              </div>
            ))}
          </div>
        )}
        {!loading && entries.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: '#6a6a64', fontSize: 13 }}>No entries found</div>}
        {!loading && groups.map(group => (
          <div key={group.key}>
            <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#131311', padding: '12px 0 6px', fontSize: 11, fontFamily: 'var(--font-mono)', color: '#6a6a64', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              {group.label}
            </div>
            {group.entries.map(e => (
              <div key={e.entry_group} onClick={() => setSelected(e)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: typeColor(e.type), opacity: 0.6, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: '#e8e7e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)' }}>{e.description || typeLabel(e.type)}</div>
                  {e.party_name && <div style={{ fontSize: 12, color: '#9c9b95', marginTop: 2, fontFamily: 'var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.party_name}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 500, color: e.type === 'sale' ? '#5DCAA5' : '#e8e7e0' }}>{e.type === 'sale' ? '+' : '−'}Rs. {fmtAmt(e.amount)}</span>
                  {e.created_at && <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#6a6a64', marginTop: 2 }}>{fmtTime(e.created_at)}</span>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
