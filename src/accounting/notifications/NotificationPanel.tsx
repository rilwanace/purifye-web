import { useState, useEffect } from 'react'
import { api } from '../../api'
import { useToast } from '../../shared/components/Toast'

function fmtDate(s: string | null | undefined) {
  if (!s) return ''
  try { return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) }
  catch { return '' }
}
function urgencyColor(due: string | null) {
  if (!due) return '#6a6a64'
  const diff = (new Date(due).getTime() - Date.now()) / 86400000
  if (diff < 0) return '#e85454'
  if (diff <= 3) return '#D4A843'
  return '#6a6a64'
}

const tabActive: React.CSSProperties = { padding: '5px 14px', borderRadius: 20, border: '1px solid rgba(93,202,165,0.4)', background: 'rgba(93,202,165,0.1)', color: '#5DCAA5', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }
const tabInactive: React.CSSProperties = { padding: '5px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: '#6a6a64', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }

interface Reminder { id: string; description: string; amount: number | null; due_date: string | null; status: string; completed_at: string | null }

function RemindersTab() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [showForm, setShowForm] = useState(false)
  const [desc, setDesc] = useState(''), [amt, setAmt] = useState(''), [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false), [swipeId, setSwipeId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null), [editDesc, setEditDesc] = useState(''), [editAmt, setEditAmt] = useState(''), [editDue, setEditDue] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const { show } = useToast()
  const load = () => api<any>('/api/reminders').then(r => setReminders(r.reminders || [])).catch(() => {})
  useEffect(() => { load() }, [])

  async function create() {
    if (!desc.trim() || !dueDate) { show('Description and due date required', 'error'); return }
    setSaving(true)
    try { await api('/api/reminders', { method: 'POST', body: JSON.stringify({ description: desc.trim(), amount: amt ? parseFloat(amt) : null, due_date: dueDate }) }); setDesc(''); setAmt(''); setDueDate(''); setShowForm(false); load(); show('Reminder added', 'success') }
    catch { show('Failed to save', 'error') }
    finally { setSaving(false) }
  }

  async function markDone(r: Reminder) {
    setActionLoading(true)
    try { await api('/api/reminders/' + r.id, { method: 'PUT', body: JSON.stringify({ completed_at: new Date().toISOString() }) }); load(); show('Marked done', 'success') }
    catch { show('Failed to update', 'error') }
    finally { setActionLoading(false) }
  }

  async function del(id: string) {
    setActionLoading(true)
    try { await api('/api/reminders/' + id, { method: 'DELETE' }); load(); show('Deleted', 'success') }
    catch { show('Failed to delete', 'error') }
    finally { setActionLoading(false) }
  }

  function startEdit(r: Reminder) {
    setEditId(r.id); setEditDesc(r.description); setEditAmt(r.amount != null ? String(r.amount) : ''); setEditDue(r.due_date ? r.due_date.slice(0, 10) : '')
  }

  async function saveEdit() {
    if (!editDesc.trim()) { show('Description required', 'error'); return }
    setActionLoading(true)
    try { await api('/api/reminders/' + editId, { method: 'PUT', body: JSON.stringify({ description: editDesc.trim(), amount: editAmt ? parseFloat(editAmt) : null, due_date: editDue || null }) }); setEditId(null); load(); show('Updated', 'success') }
    catch { show('Failed to update', 'error') }
    finally { setActionLoading(false) }
  }

  const active = reminders.filter(r => r.status === 'active')
  const done = reminders.filter(r => r.status === 'completed')
  const inp: React.CSSProperties = { width: '100%', background: '#2a2a28', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '9px 12px', color: '#e8e7e0', fontSize: 13, boxSizing: 'border-box', fontFamily: 'var(--font-sans)' }
  const dsInp: React.CSSProperties = { ...inp, fontSize: 12, padding: '7px 10px', marginBottom: 6 }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <button onClick={() => setShowForm(v => !v)} style={{ width: '100%', padding: '10px', borderRadius: 8, marginBottom: 12, border: '1px solid rgba(93,202,165,0.2)', background: 'rgba(93,202,165,0.08)', color: '#5DCAA5', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>+ Add Reminder</button>
      {showForm && (
        <div style={{ background: '#212120', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Reminder description" style={{ ...inp, marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input type="number" value={amt} onChange={e => setAmt(e.target.value)} placeholder="Amount (optional)" style={{ ...inp, flex: 1 }} />
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ ...inp, flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '9px', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, color: '#6a6a64', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>Cancel</button>
            <button onClick={create} disabled={saving} style={{ flex: 2, padding: '9px', background: '#5DCAA5', border: 'none', borderRadius: 8, color: '#131311', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      )}
      {active.map(r => (
        <div key={r.id} style={{ background: '#1a1a18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
          {editId === r.id ? (
            <div>
              <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" style={dsInp} />
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <input type="number" value={editAmt} onChange={e => setEditAmt(e.target.value)} placeholder="Amount" style={{ ...dsInp, flex: 1, marginBottom: 0 }} />
                <input type="date" value={editDue} onChange={e => setEditDue(e.target.value)} style={{ ...dsInp, flex: 1, marginBottom: 0 }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditId(null)} style={{ flex: 1, padding: '7px', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, color: '#6a6a64', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>Cancel</button>
                <button onClick={saveEdit} disabled={actionLoading} style={{ flex: 2, padding: '7px', background: '#5DCAA5', border: 'none', borderRadius: 6, color: '#131311', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>{actionLoading ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: '#e8e7e0' }}>{r.description}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 4, alignItems: 'center' }}>
                  {r.amount != null && <span style={{ fontSize: 13, color: '#5DCAA5', fontFamily: 'var(--font-mono)' }}>Rs. {Math.round(r.amount).toLocaleString()}</span>}
                  {r.due_date && <span style={{ fontSize: 11, color: urgencyColor(r.due_date), fontFamily: 'var(--font-mono)' }}>{fmtDate(r.due_date)}</span>}
                </div>
              </div>
              {swipeId === r.id ? (
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => { startEdit(r); setSwipeId(null) }} style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(93,202,165,0.08)', border: '1px solid rgba(93,202,165,0.2)', color: '#5DCAA5', fontSize: 11, cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => { markDone(r); setSwipeId(null) }} disabled={actionLoading} style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(93,202,165,0.1)', border: '1px solid rgba(93,202,165,0.3)', color: '#5DCAA5', fontSize: 11, cursor: 'pointer' }}>Done</button>
                  <button onClick={() => { del(r.id); setSwipeId(null) }} disabled={actionLoading} style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(232,84,84,0.1)', border: '1px solid rgba(232,84,84,0.25)', color: '#e85454', fontSize: 11, cursor: 'pointer' }}>Del</button>
                  <button onClick={() => setSwipeId(null)} style={{ padding: '5px 8px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#6a6a64', fontSize: 11, cursor: 'pointer' }}>&#215;</button>
                </div>
              ) : (
                <button onClick={() => setSwipeId(r.id)} style={{ background: 'none', border: 'none', color: '#6a6a64', cursor: 'pointer', fontSize: 16, padding: '0 0 0 8px' }}>&#183;&#183;&#183;</button>
              )}
            </div>
          )}
        </div>
      ))}
      {active.length === 0 && !showForm && <div style={{ textAlign: 'center', padding: 20, color: '#6a6a64', fontSize: 13 }}>No upcoming reminders</div>}
      {done.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 9, color: '#6a6a64', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Completed</div>
          {done.slice(0, 5).map(r => <div key={r.id} style={{ padding: '8px 0', opacity: 0.5 }}><div style={{ fontSize: 13, color: '#6a6a64', textDecoration: 'line-through' }}>{r.description}</div></div>)}
        </div>
      )}
    </div>
  )
}

function MorningTab() {
  const [briefs, setBriefs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { api<any>('/api/briefs/morning').then(r => { setBriefs(r.briefs || []); setLoading(false) }).catch(() => setLoading(false)) }, [])
  if (loading) return <div style={{ textAlign: 'center', padding: 30, color: '#6a6a64', fontSize: 13 }}>Loading...</div>
  if (!briefs.length) return <div style={{ textAlign: 'center', padding: 24, color: '#6a6a64', fontSize: 13 }}>No morning brief available yet</div>
  return (
    <div style={{ padding: '0 16px 16px' }}>
      {briefs.map(b => (
        <div key={b.id} style={{ background: '#1a1a18', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '3px solid #5DCAA5', borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#5DCAA5', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Morning Brief</span>
            <span style={{ fontSize: 10, color: '#6a6a64', fontFamily: 'var(--font-mono)' }}>{fmtDate(b.date)}</span>
          </div>
          <pre style={{ margin: 0, fontSize: 12, color: '#9c9b95', fontFamily: 'var(--font-sans)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{b.content}</pre>
        </div>
      ))}
    </div>
  )
}

function EveningTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { api<any>('/api/briefs/evening').then(r => { setData(r); setLoading(false) }).catch(() => setLoading(false)) }, [])
  if (loading) return <div style={{ textAlign: 'center', padding: 30, color: '#6a6a64', fontSize: 13 }}>Loading...</div>
  const briefs = data?.briefs || []
  if (!briefs.length) return <div style={{ textAlign: 'center', padding: 24, color: '#6a6a64', fontSize: 13 }}>{data?.message || 'Evening Focus briefs will appear here once enabled.'}</div>
  return (
    <div style={{ padding: '0 16px 16px' }}>
      {briefs.map((b: any) => (
        <div key={b.id} style={{ background: '#1a1a18', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '3px solid #7068D9', borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#7068D9', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Evening Focus</span>
            <span style={{ fontSize: 10, color: '#6a6a64', fontFamily: 'var(--font-mono)' }}>{fmtDate(b.date)}</span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#9c9b95' }}>Brief sent to WhatsApp</p>
        </div>
      ))}
    </div>
  )
}

type PTab = 'morning' | 'evening' | 'reminders'

export default function NotificationPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<PTab>('morning')
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: '#1a1a18', borderTop: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px 20px 0 0', zIndex: 301, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <style>{`@keyframes slideUp{from{transform:translateX(-50%) translateY(100%)}to{transform:translateX(-50%) translateY(0)}}`}</style>
        <div style={{ width: 36, height: 4, background: 'rgba(106,106,100,0.3)', borderRadius: 2, margin: '12px auto 0' }} />
        <div style={{ display: 'flex', gap: 4, padding: '12px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0 }}>
          {(['morning', 'evening', 'reminders'] as PTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={tab === t ? tabActive : tabInactive}>{t}</button>
          ))}
        </div>
        <div style={{ overflowY: 'auto', flex: 1, paddingTop: 12 }}>
          {tab === 'morning' && <MorningTab />}
          {tab === 'evening' && <EveningTab />}
          {tab === 'reminders' && <RemindersTab />}
        </div>
      </div>
    </>
  )
}
