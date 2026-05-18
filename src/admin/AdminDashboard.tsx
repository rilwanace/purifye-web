import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from './useAdmin'

const BOT_ICONS: Record<string, string> = {
  accounting: '📊', inventory: '📦', social: '📱', planner: '📅', customers: '👥',
}

const STATUS_PILL: Record<string, { label: string; color: string; bg: string }> = {
  active:  { label: 'Active',  color: '#064e3b', bg: '#6ee7b7' },
  trial:   { label: 'Trial',   color: '#78350f', bg: '#fcd34d' },
  expired: { label: 'Expired', color: '#7f1d1d', bg: '#fca5a5' },
  blocked: { label: 'Blocked', color: '#7f1d1d', bg: '#f87171' },
  none:    { label: 'None',    color: '#374151', bg: '#9ca3af' },
}

function countdown(user: any): string {
  if (!user.bots?.length) return '—'
  const b = user.bots[0]
  if (b.status === 'trial') {
    const d = b.trial_days_remaining ?? 0
    return d > 0 ? `${d}d left` : 'Trial ended'
  }
  if (b.status === 'active' && b.subscription_expires_at) {
    const d = b.trial_days_remaining ?? 0
    return `Renews in ${d}d`
  }
  if (b.status === 'expired') {
    const exp = b.subscription_expires_at || b.trial_started_at
    if (exp) {
      const days = Math.floor((Date.now() - new Date(exp).getTime()) / 86400000)
      return `Expired ${days}d ago`
    }
  }
  return b.status
}

export default function AdminDashboard() {
  const { logout } = useAdmin()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sum, usr] = await Promise.all([
        fetch('/api/admin/dashboard', { credentials: 'include' }).then(r => r.json()),
        fetch(`/api/admin/users?status_filter=${filter}&search=${encodeURIComponent(search)}`,
              { credentials: 'include' }).then(r => r.json()),
      ])
      setSummary(sum)
      setUsers(usr.users || [])
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [filter, search])

  useEffect(() => { load() }, [load])

  if (loading && !summary) return (
    <div style={pageStyle}>
      <div style={{ color: '#9ca3af', textAlign: 'center', marginTop: '4rem' }}>Loading…</div>
    </div>
  )

  const rate = summary?.usd_rate ?? 305
  const FILTERS = ['all', 'active', 'trial', 'expired', 'blocked']

  return (
    <div style={pageStyle}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ color: '#fff', fontWeight: 700, fontSize: '1.25rem', margin: 0 }}>Admin Dashboard</h1>
          <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>
            MRR: ${(summary?.mrr_usd ?? 0).toFixed(0)}/mo · LLM cost this month: ${(summary?.total_llm_cost_this_month ?? 0).toFixed(2)} · Rate: Rs.{rate}
          </span>
        </div>
        <button onClick={logout} style={{ background: 'none', border: '1px solid #374151', color: '#9ca3af', padding: '0.4rem 0.75rem', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8rem' }}>
          Sign out
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total', val: summary?.total_users ?? 0, col: '#6b7280' },
          { label: 'Active', val: summary?.active ?? 0, col: '#6ee7b7' },
          { label: 'Trial', val: summary?.trial ?? 0, col: '#fcd34d' },
          { label: 'Expired', val: summary?.expired ?? 0, col: '#fca5a5' },
        ].map(c => (
          <div key={c.label} style={{ background: '#1f2937', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: c.col }}>{c.val}</div>
            <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer',
            background: filter === f ? '#5DCAA5' : '#374151',
            color: filter === f ? '#fff' : '#9ca3af', fontSize: '0.8rem', textTransform: 'capitalize',
          }}>{f}</button>
        ))}
        <input
          placeholder="Search name or email…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginLeft: 'auto', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #374151', background: '#1f2937', color: '#f9fafb', fontSize: '0.8rem', minWidth: 200, outline: 'none' }}
        />
      </div>

      {/* User table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ color: '#6b7280', borderBottom: '1px solid #374151' }}>
              {['Business', 'Bots', 'Status', 'Billing', 'LLM Cost', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const pill = STATUS_PILL[u.status] || STATUS_PILL.none
              return (
                <tr key={u.business_id}
                  onClick={() => navigate(`/admin/users/${u.business_id}`)}
                  style={{ borderBottom: '1px solid #1f2937', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1f2937')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ color: '#f9fafb', fontWeight: 500 }}>{u.business_name}</div>
                    <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>{u.owner_email}</div>
                    <div style={{ color: '#4b5563', fontSize: '0.7rem' }}>{countdown(u)}</div>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {(u.bots || []).map((b: any) => (
                      <span key={b.bot_id} title={b.bot_id} style={{ marginRight: 2 }}>
                        {BOT_ICONS[b.bot_id] || '🤖'}
                      </span>
                    ))}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ background: pill.bg, color: pill.color, padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                      {pill.label}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', color: '#d1d5db' }}>
                    ${u.total_monthly_usd.toFixed(0)}/mo<br />
                    <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Rs.{u.total_monthly_lkr.toLocaleString()}</span>
                  </td>
                  <td style={{ padding: '0.75rem', color: '#d1d5db' }}>
                    ${(u.llm_cost_this_month ?? 0).toFixed(3)}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/admin/users/${u.business_id}`) }}
                      style={{ padding: '0.3rem 0.6rem', borderRadius: '0.25rem', border: '1px solid #374151', background: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {users.length === 0 && !loading && (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No users found</p>
        )}
      </div>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  minHeight: '100dvh', background: '#0f1117', color: '#e8e8e8',
  padding: '1.5rem', maxWidth: 1200, margin: '0 auto',
}
