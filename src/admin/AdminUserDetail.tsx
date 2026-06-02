import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const BOT_ICONS: Record<string, string> = {
  accounting: '📊', inventory: '📦', social: '📱', planner: '📅', customers: '👥',
  personal: '🤖', gemledger: '💎', meal: '🍳',
}
const BOT_NAMES: Record<string, string> = {
  accounting: 'Accounting', inventory: 'Inventory', social: 'Social',
  planner: 'Planner', customers: 'Customers', personal: 'Personal', gemledger: 'GemLedger', meal: 'Meal Bot',
}
const ALL_BOT_IDS = ['accounting', 'inventory', 'social', 'customers', 'planner', 'personal', 'gemledger', 'meal']
const STATUS_PILL: Record<string, { label: string; color: string; bg: string }> = {
  active:  { label: 'Active',  color: '#064e3b', bg: '#6ee7b7' },
  trial:   { label: 'Trial',   color: '#78350f', bg: '#fcd34d' },
  expired: { label: 'Expired', color: '#7f1d1d', bg: '#fca5a5' },
  blocked: { label: 'Blocked', color: '#7f1d1d', bg: '#f87171' },
  none:    { label: 'None',    color: '#374151', bg: '#9ca3af' },
}

function botStatusLine(b: any): string {
  const now = Date.now()
  if (b.status === 'trial') {
    const d = b.trial_days_remaining ?? 0
    if (b.trial_started_at) {
      const start = new Date(b.trial_started_at).toLocaleDateString()
      return `Started ${start} — ${d}d remaining`
    }
    return `${d}d remaining`
  }
  if (b.status === 'active' && b.subscription_expires_at) {
    const d = b.trial_days_remaining ?? 0
    const date = new Date(b.subscription_expires_at).toLocaleDateString()
    return `Renews ${date} — ${d} days remaining`
  }
  if (b.status === 'expired' && b.subscription_expires_at) {
    const days = Math.floor((now - new Date(b.subscription_expires_at).getTime()) / 86400000)
    return `Expired ${days} days ago`
  }
  return b.status
}

export default function AdminUserDetail() {
  const { business_id } = useParams<{ business_id: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [msg, setMsg] = useState('')
  const [botActionLoading, setBotActionLoading] = useState<string | null>(null)
  const [addBotId, setAddBotId] = useState('')
  const [addBotLoading, setAddBotLoading] = useState(false)
  const noteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  async function load() {
    setLoading(true)
    const r = await fetch(`/api/admin/users/${business_id}`, { credentials: 'include' })
    if (r.ok) setUser(await r.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [business_id])

  async function doAction(url: string, body: any) {
    setActionLoading(true)
    setMsg('')
    try {
      const r = await fetch(url, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (d.ok) {
        setMsg('Done')
        await load()
      } else {
        setMsg('Error: ' + JSON.stringify(d))
      }
    } catch (e: any) {
      setMsg('Error: ' + e.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function saveNotes(bot_id: string, notes: string) {
    await fetch(`/api/admin/users/${business_id}/notes`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bot_id, notes }),
    })
  }

  function onNotesChange(bot_id: string, val: string) {
    setUser((u: any) => ({
      ...u,
      bots: u.bots.map((b: any) => b.bot_id === bot_id ? { ...b, notes: val } : b),
    }))
    clearTimeout(noteTimers.current[bot_id])
    noteTimers.current[bot_id] = setTimeout(() => saveNotes(bot_id, val), 1000)
  }

  async function changeBotStatus(bot_id: string, status: string) {
    setBotActionLoading(bot_id)
    setMsg('')
    try {
      const r = await fetch(`/api/admin/users/${business_id}/bots`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_id, status, trial_days: 7 }),
      })
      const d = await r.json()
      if (d.ok) await load()
      else setMsg('Error: ' + JSON.stringify(d))
    } catch (e: any) {
      setMsg('Error: ' + e.message)
    } finally { setBotActionLoading(null) }
  }

  async function deactivateBot(bot_id: string) {
    setBotActionLoading(bot_id)
    setMsg('')
    try {
      const r = await fetch(`/api/admin/users/${business_id}/bots/${bot_id}`, {
        method: 'DELETE', credentials: 'include',
      })
      const d = await r.json()
      if (d.ok) await load()
      else setMsg('Error: ' + JSON.stringify(d))
    } catch (e: any) {
      setMsg('Error: ' + e.message)
    } finally { setBotActionLoading(null) }
  }

  async function handleAddBot() {
    if (!addBotId) return
    setAddBotLoading(true)
    setMsg('')
    try {
      const r = await fetch(`/api/admin/users/${business_id}/bots`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_id: addBotId, status: 'trial', trial_days: 7 }),
      })
      const d = await r.json()
      if (d.ok) { setAddBotId(''); await load() }
      else setMsg('Error: ' + JSON.stringify(d))
    } catch (e: any) {
      setMsg('Error: ' + e.message)
    } finally { setAddBotLoading(false) }
  }

  if (loading) return (
    <div style={pageStyle}>
      <div style={{ color: '#9ca3af', textAlign: 'center', marginTop: '4rem' }}>Loading…</div>
    </div>
  )
  if (!user) return <div style={pageStyle}><p style={{ color: '#ef4444' }}>Not found</p></div>

  const allActive = user.bots?.every((b: any) => b.status === 'active')
  const anyBlocked = user.bots?.some((b: any) => b.status === 'blocked')
  const totalLLM = user.llm_usage_by_bot?.reduce((s: number, b: any) => s + b.cost_usd, 0) ?? 0
  const totalCalls = user.llm_usage_by_bot?.reduce((s: number, b: any) => s + b.calls, 0) ?? 0
  const activeBotIds = new Set((user.bots || []).map((b: any) => b.bot_id))
  const availableBots = ALL_BOT_IDS.filter(id => !activeBotIds.has(id))

  return (
    <div style={pageStyle}>
      <button onClick={() => navigate('/admin')} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', marginBottom: '1rem', fontSize: '0.875rem' }}>
        ← Back
      </button>

      {/* Business info */}
      <div style={card}>
        <h2 style={{ color: '#fff', fontWeight: 700, margin: '0 0 0.5rem' }}>{user.business_name}</h2>
        <p style={meta}>{user.owner_name} · {user.owner_email} {user.owner_phone && `· ${user.owner_phone}`}</p>
        <p style={meta}>Signed up: {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</p>
        <p style={meta}>Last active: {user.last_active ? new Date(user.last_active).toLocaleDateString() : 'Never'}</p>
        <p style={meta}>Total entries: {user.total_entries} · This month: {user.entry_count_this_month}</p>
      </div>

      {/* Bot subscriptions */}
      <div style={card}>
        <h3 style={{ color: '#e5e7eb', marginBottom: '0.75rem', fontWeight: 600 }}>Subscriptions</h3>
        {(user.bots || []).map((b: any) => {
          const pill = STATUS_PILL[b.status] || STATUS_PILL.none
          return (
            <div key={b.bot_id} style={{ borderBottom: '1px solid #374151', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span>{BOT_ICONS[b.bot_id]}</span>
                <span style={{ color: '#f9fafb', fontWeight: 500 }}>{BOT_NAMES[b.bot_id] || b.bot_id}</span>
                <span style={{ ...pillStyle, background: pill.bg, color: pill.color }}>{pill.label}</span>
                <span style={{ color: '#9ca3af', fontSize: '0.8rem', marginLeft: 'auto' }}>${b.price_usd}/mo</span>
              </div>
              <p style={{ ...meta, margin: '0 0 0.5rem' }}>{botStatusLine(b)}</p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <select
                  value={b.status}
                  onChange={e => changeBotStatus(b.bot_id, e.target.value)}
                  disabled={botActionLoading === b.bot_id}
                  style={selectStyle}
                >
                  {['trial', 'active', 'expired', 'blocked'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  disabled={botActionLoading === b.bot_id}
                  onClick={() => deactivateBot(b.bot_id)}
                  style={{ ...actionBtn, background: '#ef4444', color: '#fff', padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                >
                  Deactivate
                </button>
              </div>
              <textarea
                value={b.notes || ''}
                onChange={e => onNotesChange(b.bot_id, e.target.value)}
                placeholder="Notes (auto-saved)…"
                rows={2}
                style={{ width: '100%', background: '#111827', border: '1px solid #374151', color: '#d1d5db', borderRadius: '0.375rem', padding: '0.5rem', fontSize: '0.8rem', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
          )
        })}
        {availableBots.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
            <select
              value={addBotId}
              onChange={e => setAddBotId(e.target.value)}
              style={{ ...selectStyle, flex: 1 }}
            >
              <option value="">Add bot…</option>
              {availableBots.map(id => (
                <option key={id} value={id}>{BOT_NAMES[id] || id}</option>
              ))}
            </select>
            <button
              disabled={!addBotId || addBotLoading}
              onClick={handleAddBot}
              style={{ ...actionBtn, background: '#5DCAA5', color: '#fff', padding: '0.25rem 0.75rem', fontSize: '0.75rem', opacity: (!addBotId || addBotLoading) ? 0.5 : 1 }}
            >
              Add
            </button>
          </div>
        )}
      </div>

      {/* LLM usage */}
      <div style={card}>
        <h3 style={{ color: '#e5e7eb', marginBottom: '0.75rem', fontWeight: 600 }}>LLM Usage This Month</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ color: '#6b7280' }}>
              {['Bot', 'Calls', 'Est. Cost'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '0.4rem 0.5rem', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(user.llm_usage_by_bot || []).map((b: any) => (
              <tr key={b.bot_id} style={{ borderTop: '1px solid #374151' }}>
                <td style={{ padding: '0.4rem 0.5rem', color: '#d1d5db' }}>{BOT_ICONS[b.bot_id]} {BOT_NAMES[b.bot_id]}</td>
                <td style={{ padding: '0.4rem 0.5rem', color: '#d1d5db' }}>{b.calls}</td>
                <td style={{ padding: '0.4rem 0.5rem', color: '#d1d5db' }}>${b.cost_usd.toFixed(3)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '2px solid #374151', fontWeight: 600 }}>
              <td style={{ padding: '0.4rem 0.5rem', color: '#f9fafb' }}>Total</td>
              <td style={{ padding: '0.4rem 0.5rem', color: '#f9fafb' }}>{totalCalls}</td>
              <td style={{ padding: '0.4rem 0.5rem', color: '#f9fafb' }}>${totalLLM.toFixed(3)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div style={card}>
        <h3 style={{ color: '#e5e7eb', marginBottom: '0.75rem', fontWeight: 600 }}>Actions</h3>
        {msg && <p style={{ color: '#6ee7b7', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{msg}</p>}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {!allActive && (
            <button disabled={actionLoading}
              onClick={() => doAction('/api/admin/activate', { business_id, duration_days: 30 })}
              style={{ ...actionBtn, background: '#5DCAA5', color: '#fff' }}>
              Activate (30d)
            </button>
          )}
          <button disabled={actionLoading}
            onClick={() => doAction('/api/admin/extend', { business_id, months: 1 })}
            style={{ ...actionBtn, background: '#3b82f6', color: '#fff' }}>
            Extend 1 month
          </button>
          {anyBlocked ? (
            <button disabled={actionLoading}
              onClick={() => doAction('/api/admin/unblock', { business_id })}
              style={{ ...actionBtn, background: '#374151', color: '#d1d5db' }}>
              Unblock
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
                placeholder="Block reason"
                style={{ padding: '0.4rem 0.6rem', borderRadius: '0.375rem', border: '1px solid #374151', background: '#1f2937', color: '#f9fafb', fontSize: '0.8rem', outline: 'none', width: 160 }}
              />
              <button disabled={actionLoading || !blockReason}
                onClick={() => doAction('/api/admin/block', { business_id, reason: blockReason })}
                style={{ ...actionBtn, background: '#ef4444', color: '#fff', opacity: blockReason ? 1 : 0.5 }}>
                Block
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  minHeight: '100dvh', background: '#0f1117', color: '#e8e8e8',
  padding: '1.5rem', maxWidth: 800, margin: '0 auto',
}
const card: React.CSSProperties = {
  background: '#1f2937', borderRadius: '0.5rem', padding: '1.25rem',
  marginBottom: '1rem',
}
const meta: React.CSSProperties = { color: '#9ca3af', fontSize: '0.8rem', margin: '0.2rem 0' }
const pillStyle: React.CSSProperties = {
  padding: '0.15rem 0.5rem', borderRadius: '0.25rem',
  fontSize: '0.7rem', fontWeight: 600,
}
const actionBtn: React.CSSProperties = {
  padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none',
  cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
}
const selectStyle: React.CSSProperties = {
  background: '#111827', border: '1px solid #374151', color: '#d1d5db',
  borderRadius: '0.25rem', padding: '0.25rem 0.5rem', fontSize: '0.8rem', cursor: 'pointer',
}
