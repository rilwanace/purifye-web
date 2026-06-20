import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../shared/components/Toast'

const GRAD = 'linear-gradient(135deg, #28997A, #13654C)'

interface Cheque {
  id: string
  customer_name: string
  cheque_date: string
  cheque_number: string | null
  bank: string | null
  amount: number
  cumulative: number
}

const noSel: React.CSSProperties = {
  WebkitUserSelect: 'none', userSelect: 'none',
  WebkitTapHighlightColor: 'transparent' as any,
  cursor: 'pointer', touchAction: 'manipulation',
}

function fmtDate(s: string) {
  const d = new Date(s + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
}

function fmtAmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

const DepositIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 7V5a2 2 0 0 0-4 0v2"/>
    <line x1="12" y1="12" x2="12" y2="16"/>
    <line x1="10" y1="14" x2="14" y2="14"/>
  </svg>
)

export default function PDChequesPage() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [cheques, setCheques] = useState<Cheque[]>([])
  const [total, setTotal] = useState(0)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'form'>('list')
  const [editCheque, setEditCheque] = useState<Cheque | null>(null)
  const [depositing, setDepositing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState<string[]>([])
  const [fCustomer, setFCustomer] = useState('')
  const [fDate, setFDate] = useState('')
  const [fNumber, setFNumber] = useState('')
  const [fBank, setFBank] = useState('')
  const [fAmount, setFAmount] = useState('')

  const load = () => {
    setLoading(true)
    api<any>('/api/pd-cheques')
      .then(r => { setCheques(r.cheques || []); setTotal(r.total || 0); setCount(r.count || 0) })
      .catch(() => show('Failed to load cheques', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    api<any>('/api/pd-cheques/customers')
      .then(r => setCustomers(r.customers || []))
      .catch(() => {})
  }, [])

  function openAdd() {
    setEditCheque(null)
    setFCustomer(''); setFDate(''); setFNumber(''); setFBank(''); setFAmount('')
    setView('form')
  }

  function openEdit(c: Cheque) {
    setEditCheque(c)
    setFCustomer(c.customer_name); setFDate(c.cheque_date)
    setFNumber(c.cheque_number || ''); setFBank(c.bank || '')
    setFAmount(String(c.amount)); setView('form')
  }

  async function handleSave() {
    if (!fCustomer.trim()) { show('Customer required', 'error'); return }
    if (!fDate) { show('Cheque date required', 'error'); return }
    if (!fAmount || isNaN(parseFloat(fAmount))) { show('Amount required', 'error'); return }
    setSaving(true)
    const body = {
      customer_name: fCustomer.trim(), cheque_date: fDate,
      cheque_number: fNumber.trim() || null, bank: fBank.trim() || null,
      amount: parseFloat(fAmount),
    }
    try {
      if (editCheque) {
        await api('/api/pd-cheques/' + editCheque.id, { method: 'PUT', body: JSON.stringify(body) })
        show('Cheque updated', 'success')
      } else {
        await api('/api/pd-cheques', { method: 'POST', body: JSON.stringify(body) })
        show('Cheque added', 'success')
      }
      setView('list'); load()
    } catch { show('Failed to save', 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!editCheque) return
    setSaving(true)
    try {
      await api('/api/pd-cheques/' + editCheque.id, { method: 'DELETE' })
      show('Cheque deleted', 'success'); setView('list'); load()
    } catch { show('Failed to delete', 'error') }
    finally { setSaving(false) }
  }

  async function handleDeposit(c: Cheque) {
    if (depositing) return
    setDepositing(c.id)
    try {
      await api('/api/pd-cheques/' + c.id + '/deposit', { method: 'POST' })
      navigate('/accounting/entry', {
        state: { prefill: { type: 'payment_received', fields: {
          customer: c.customer_name, amount: String(c.amount),
          date: new Date().toISOString().slice(0, 10),
        }}}
      })
    } catch { show('Failed to mark as deposited', 'error'); setDepositing(null) }
  }

  const inp: React.CSSProperties = {
    width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '12px', color: 'var(--text-primary)',
    fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-sans)',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)',
    textTransform: 'uppercase' as const, letterSpacing: '0.04em',
    color: 'var(--text-muted)', marginBottom: 6,
  }

  if (view === 'form') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 60px)', background: '#131311', overflowY: 'auto' }}>
        <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div onClick={() => setView('list')} style={{ ...noSel, color: 'var(--text-muted)', fontSize: 13 }}>
            ← Back
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {editCheque ? 'Edit Cheque' : 'Add Cheque'}
          </span>
        </div>
        <div style={{ padding: '16px 16px 80px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <span style={lbl}>Customer</span>
            <input list="pd-customers" autoComplete="off" value={fCustomer} onChange={e => setFCustomer(e.target.value)}
              placeholder="Customer name" style={inp} />
            <datalist id="pd-customers">
              {customers.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <span style={lbl}>Cheque Date</span>
              <input type="date" value={fDate} onChange={e => setFDate(e.target.value)}
                style={{ ...inp, colorScheme: 'dark' }} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={lbl}>Cheque No. (opt)</span>
              <input value={fNumber} onChange={e => setFNumber(e.target.value)}
                placeholder="000001" style={inp} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <span style={lbl}>Bank (opt)</span>
              <input value={fBank} onChange={e => setFBank(e.target.value)}
                placeholder="Sampath" style={inp} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={lbl}>Amount</span>
              <input type="number" value={fAmount} onChange={e => setFAmount(e.target.value)}
                placeholder="0.00" style={{ ...inp, textAlign: 'right', fontFamily: 'var(--font-mono)' }} />
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} style={{
            width: '100%', padding: '13px', borderRadius: 10, border: 'none',
            background: saving ? 'rgba(255,255,255,0.08)' : GRAD,
            color: '#fff', fontWeight: 600, fontSize: 14,
            cursor: saving ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', marginTop: 4,
          }}>
            {saving ? 'Saving...' : editCheque ? 'Update Cheque' : 'Save Cheque'}
          </button>
          {editCheque && (
            <button onClick={handleDelete} disabled={saving} style={{
              width: '100%', padding: '13px', borderRadius: 10,
              background: 'rgba(216,90,48,0.1)', border: '1px solid rgba(216,90,48,0.2)',
              color: '#D85A30', fontWeight: 600, fontSize: 14,
              cursor: saving ? 'default' : 'pointer', fontFamily: 'var(--font-sans)',
            }}>
              Delete Cheque
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 60px)', background: '#131311' }}>
      <div style={{ padding: '12px 16px 8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-primary)', fontWeight: 600 }}>
            PD Cheques
          </span>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {count} pending
          </span>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Total Pending</span>
          <span style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#D4A843' }}>{fmtAmt(total)}</span>
        </div>
      </div>

      <div style={{ padding: '6px 16px 4px', display: 'flex', flexShrink: 0 }}>
        <span style={{ flex: 1, fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Customer</span>
        <span style={{ width: 80, textAlign: 'right', fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Amount</span>
        <span style={{ width: 90, textAlign: 'right', fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Cumulative</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
        ) : cheques.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>No pending cheques</div>
        ) : cheques.map(c => (
          <div key={c.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--accent)', marginBottom: 6 }}>
              {fmtDate(c.cheque_date)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                {c.customer_name}
              </div>
              <div style={{ width: 80, textAlign: 'right', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                {fmtAmt(c.amount)}
              </div>
              <div style={{ width: 90, textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#D4A843', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                {fmtAmt(c.cumulative)}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {[c.bank, c.cheque_number].filter(Boolean).join(' - ')}
              </span>
              <div style={{ display: 'flex', gap: 12 }}>
                <div onClick={() => openEdit(c)} style={{ ...noSel, color: 'var(--text-secondary)' }}>
                  <EditIcon />
                </div>
                <div onClick={() => handleDeposit(c)}
                  style={{ ...noSel, color: depositing === c.id ? '#D4A843' : 'var(--accent)', opacity: depositing && depositing !== c.id ? 0.4 : 1 }}>
                  <DepositIcon />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '0 16px', paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))', flexShrink: 0 }}>
        <button onClick={openAdd} style={{
          width: '100%', padding: '13px', borderRadius: 10, border: 'none',
          background: GRAD, color: '#fff', fontWeight: 600, fontSize: 14,
          cursor: 'pointer', fontFamily: 'var(--font-sans)',
        }}>
          + Add Cheque
        </button>
      </div>
    </div>
  )
}
