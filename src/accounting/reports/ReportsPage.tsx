import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, apiBlob } from '../../api'
import { useAuth } from '../../auth/useAuth'
import { promptWhatsApp } from '../../shared/utils/whatsapp'

type Period = 'this_month' | 'last_month' | '3m' | '6m' | 'ytd' | 'all'
type Tab = 'pnl' | 'bs' | 'cf' | 'tb' | 'ledger'

function fmt(n: number | string | null | undefined) {
  if (n == null) return '0'
  const v = typeof n === 'string' ? Number(n) : n
  if (!isFinite(v)) return '0'
  return Math.round(v).toLocaleString('en-US')
}
function fmtDate(s: string) {
  if (!s) return ''
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3])
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
  }
  try { return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) }
  catch { return s }
}

const TabBar = ({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) => {
  const tabs: [Tab, string][] = [['pnl', 'P&L'], ['bs', 'B/S'], ['cf', 'C/F'], ['tb', 'T/B'], ['ledger', 'Ledger']]
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', overflowX: 'auto', scrollbarWidth: 'none', padding: '6px 12px', gap: 4 }}>
      {tabs.map(([id, label]) => (
        <button key={id} onClick={() => onChange(id)} style={{
          padding: '6px 14px', borderRadius: 20, background: id === active ? 'rgba(93,202,165,0.1)' : 'transparent', border: id === active ? '1px solid rgba(93,202,165,0.2)' : 'none',
          color: id === active ? '#5DCAA5' : '#6a6a64', fontSize: 11, fontWeight: 600, flexShrink: 0,
          cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)',
        }}>{label}</button>
      ))}
    </div>
  )
}

const PeriodPills = ({ period, onChange, full }: { period: Period; onChange: (p: Period) => void; full?: boolean }) => {
  const opts: [Period, string][] = full
    ? [['this_month', 'This Month'], ['last_month', 'Last Month'], ['3m', '3M'], ['6m', '6M'], ['ytd', 'YTD'], ['all', 'All']]
    : [['this_month', 'This Month'], ['3m', '3M'], ['6m', '6M'], ['ytd', 'YTD'], ['all', 'All']]
  return (
    <div style={{ display: 'flex', gap: 6, padding: '10px 0', overflowX: 'auto', scrollbarWidth: 'none' }}>
      {opts.map(([id, label]) => (
        <button key={id} onClick={() => onChange(id)} style={{
          padding: '5px 13px', borderRadius: 20,
          border: `1px solid ${id === period ? 'rgba(93,202,165,0.4)' : 'var(--border)'}`,
          background: id === period ? 'rgba(93,202,165,0.12)' : 'var(--bg-card)',
          color: id === period ? 'var(--accent)' : 'var(--text-muted)',
          fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', cursor: 'pointer',
          flexShrink: 0, fontFamily: 'var(--font-sans)',
        }}>{label}</button>
      ))}
    </div>
  )
}

const ReportSkeleton = () => (
  <div style={{ paddingTop: 16 }}>
    {[60, 80, 45, 70, 55, 80, 40].map((w, i) => (
      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ height: 11, borderRadius: 4, background: 'rgba(255,255,255,0.06)', width: w + '%' }} />
        <div style={{ height: 11, borderRadius: 4, background: 'rgba(255,255,255,0.05)', width: '18%' }} />
      </div>
    ))}
  </div>
)

const Err = ({ msg }: { msg: string }) => <div style={{ padding: 20, color: 'var(--danger)', textAlign: 'center' }}>{msg}</div>

async function downloadPdf(type: string, period: string, setPdfLoading: (v: boolean) => void) {
  setPdfLoading(true)
  try {
    const res = await apiBlob(`/api/reports/pdf?type=${type}&period=${period}`)
    if (!res.ok) throw new Error('PDF generation failed')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}_${period}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e: any) {
    alert(e.message || 'PDF failed')
  } finally {
    setPdfLoading(false)
  }
}

const PdfBtn = ({ type, period }: { type: string; period: string }) => {
  const [loading, setLoading] = useState(false)
  return (
    <button onClick={() => downloadPdf(type, period, setLoading)} disabled={loading} style={{
      padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(93,202,165,0.3)',
      background: 'rgba(93,202,165,0.08)', color: 'var(--accent)',
      fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
      fontFamily: 'var(--font-sans)', opacity: loading ? 0.6 : 1,
    }}>{loading ? 'Generating…' : '↓ PDF'}</button>
  )
}

const WaShareBtn = ({ data, bizName, tab, period }: { data: any; bizName: string; tab: string; period: string }) => {
  const d = data?.data || {}
  function buildMsg() {
    const p = period === 'this_month' ? 'This Month' : period === 'last_month' ? 'Last Month'
      : period === '3m' ? 'Last 3M' : period === '6m' ? 'Last 6M' : period === 'ytd' ? 'YTD' : 'All Time'
    if (tab === 'pnl') {
      const rev = Math.round(d.total_revenue ?? 0).toLocaleString('en-US')
      const np = Math.round(d.net_profit ?? 0).toLocaleString('en-US')
      const margin = d.net_margin != null ? d.net_margin.toFixed(1) : '0'
      return bizName + ' Financial Highlights (' + p + '):\nRevenue: Rs. ' + rev + ' | Net Profit: Rs. ' + np + ' | Margin: ' + margin + '%\n— Generated by Purifye'
    }
    if (tab === 'bs') {
      const assets = Math.round(d.total_assets ?? 0).toLocaleString('en-US')
      const equity = Math.round(d.total_equity ?? 0).toLocaleString('en-US')
      return bizName + ' Balance Sheet (' + p + '):\nTotal Assets: Rs. ' + assets + ' | Equity: Rs. ' + equity + '\n— Generated by Purifye'
    }
    if (tab === 'cf') {
      const closing = Math.round(d.closing_cash ?? 0).toLocaleString('en-US')
      const ops = Math.round(d.net_operating ?? 0).toLocaleString('en-US')
      return bizName + ' Cash Flow (' + p + '):\nClosing Cash: Rs. ' + closing + ' | Operating CF: Rs. ' + ops + '\n— Generated by Purifye'
    }
    return ''
  }
  return (
    <button onClick={() => promptWhatsApp(buildMsg())} style={{
      padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(37,211,102,0.3)',
      background: 'rgba(37,211,102,0.08)', color: '#25d366',
      fontSize: 12, fontWeight: 600, cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
    }}>Share</button>
  )
}

// ─── Statement primitives ────────────────────────────────────────────────────

const SHead = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '14px 0 6px', fontFamily: 'var(--font-mono)' }}>
    {children}
  </div>
)
const SRow = ({ name, amount, indent, bold, accent, danger, subtotal }: {
  name: string; amount: number | null | undefined; indent?: boolean; bold?: boolean;
  accent?: boolean; danger?: boolean; subtotal?: boolean
}) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: subtotal ? '8px 0' : '5px 0',
    borderTop: subtotal ? '1px solid var(--border)' : undefined,
    marginTop: subtotal ? 4 : 0,
  }}>
    <span style={{
      fontSize: subtotal ? 13 : 12, fontWeight: bold || subtotal ? 600 : 400,
      color: accent ? 'var(--accent)' : 'var(--text-primary)',
      paddingLeft: indent ? 16 : 0, fontFamily: 'var(--font-sans)',
    }}>{name}</span>
    <span style={{
      fontSize: subtotal ? 13 : 12, fontWeight: bold || subtotal ? 700 : 400, fontFamily: 'var(--font-mono)',
      color: accent ? '#3bf084' : danger ? 'var(--danger)' : 'var(--text-primary)',
    }}>Rs. {fmt(amount)}</span>
  </div>
)
const Divider = () => <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0' }} />
const TotalRow = ({ name, amount, positive }: { name: string; amount: number; positive?: boolean }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 14px', marginTop: 8,
    background: positive ? 'rgba(26,158,110,0.1)' : 'rgba(26,26,24,0.6)',
    border: `1px solid ${positive ? 'rgba(93,202,165,0.3)' : 'var(--border)'}`,
    borderRadius: 10,
  }}>
    <span style={{ fontSize: 14, fontWeight: 700 }}>{name}</span>
    <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)', color: amount >= 0 ? '#3bf084' : 'var(--danger)' }}>
      Rs. {fmt(amount)}
    </span>
  </div>
)

// ─── Collapsible category row (for BS / P&L sub-items) ──────────────────────

function groupItemsByCategory(items: { name: string; total: number }[]): {
  category: string; total: number; children: { name: string; total: number }[]
}[] {
  const map = new Map<string, { total: number; children: { name: string; total: number }[] }>()
  for (const item of items) {
    const sep = item.name.indexOf(' : ')
    const cat = sep !== -1 ? item.name.slice(0, sep) : item.name
    const child = sep !== -1 ? item.name.slice(sep + 3) : null
    if (!map.has(cat)) map.set(cat, { total: 0, children: [] })
    const g = map.get(cat)!
    g.total += item.total
    if (child) g.children.push({ name: child, total: item.total })
  }
  return Array.from(map.entries()).map(([category, g]) => ({
    category,
    total: Math.round(g.total * 100) / 100,
    children: g.children,
  }))
}

function CollapsibleSection({ groups, accent, danger }: {
  groups: { category: string; total: number; children: { name: string; total: number }[] }[]
  accent?: boolean; danger?: boolean
}) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const toggle = (cat: string) => setOpen(prev => {
    const next = new Set(prev)
    next.has(cat) ? next.delete(cat) : next.add(cat)
    return next
  })
  return (
    <>
      {groups.map(g => {
        const isOpen = open.has(g.category)
        const hasChildren = g.children.length > 0
        return (
          <div key={g.category}>
            <div
              onClick={() => hasChildren && toggle(g.category)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 0', cursor: hasChildren ? 'pointer' : 'default',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
                {g.category}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  color: accent ? '#3bf084' : danger ? 'var(--danger)' : 'var(--text-primary)',
                }}>Rs. {fmt(g.total)}</span>
                {hasChildren && (
                  <span style={{ fontSize: 14, color: '#6a6a64', fontFamily: 'var(--font-mono)', minWidth: 12, textAlign: 'center' }}>
                    {isOpen ? '−' : '+'}
                  </span>
                )}
              </div>
            </div>
            {isOpen && hasChildren && (
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.04)', marginLeft: 4, paddingLeft: 16, marginBottom: 4 }}>
                {g.children.map((child, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                    <span style={{ fontSize: 13, color: '#9c9b95', fontFamily: 'var(--font-sans)', flex: 1, marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{child.name}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#9c9b95', flexShrink: 0 }}>Rs. {fmt(child.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

// ─── P&L ────────────────────────────────────────────────────────────────────

function PnlReport({ period, onData }: { period: Period; onData?: (d: any) => void }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  useEffect(() => {
    let stale = false
    setLoading(true); setErr(''); setData(null)
    api(`/api/reports/pnl?period=${period}`).then(d => { if (!stale) { setData(d); setLoading(false); onData?.(d) } }).catch(e => { if (!stale) { setErr(e.message); setLoading(false) } })
    return () => { stale = true }
  }, [period])
  if (loading) return <ReportSkeleton />
  if (err) return <Err msg={err} />
  const d = data?.data || {}
  return (
    <div>
      <SHead>Revenue</SHead>
      {(d.revenue_items || []).map((r: any, i: number) => <SRow key={i} name={r.account || r.name} amount={r.total} indent />)}
      <SRow name="Total Revenue" amount={d.total_revenue} subtotal bold accent />
      <SHead>Cost of Sales</SHead>
      {(d.cos_items || []).map((r: any, i: number) => <SRow key={i} name={r.account || r.name} amount={r.total} indent danger />)}
      <SRow name="Total COS" amount={d.total_cos} subtotal bold danger />
      <SRow name="Gross Profit" amount={d.gross_profit} subtotal bold accent />
      {d.gross_margin != null && <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', marginBottom: 4 }}>Gross Margin: {d.gross_margin.toFixed(1)}%</div>}
      <SHead>Operating Expenses</SHead>
      {(d.opex_items || []).map((r: any, i: number) => <SRow key={i} name={r.account || r.name} amount={r.total} indent danger />)}
      <SRow name="Total Opex" amount={d.total_opex} subtotal bold danger />
      <TotalRow name={`Net Profit ${d.net_margin != null ? `(${d.net_margin.toFixed(1)}%)` : ''}`} amount={d.net_profit ?? 0} positive={(d.net_profit ?? 0) >= 0} />
    </div>
  )
}

// ─── Balance Sheet ───────────────────────────────────────────────────────────

function BsReport({ period, onData }: { period: Period; onData?: (d: any) => void }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  useEffect(() => {
    let stale = false
    setLoading(true); setErr(''); setData(null)
    api(`/api/reports/bs?period=${period}`).then(d => { if (!stale) { setData(d); setLoading(false); onData?.(d) } }).catch(e => { if (!stale) { setErr(e.message); setLoading(false) } })
    return () => { stale = true }
  }, [period])
  if (loading) return <ReportSkeleton />
  if (err) return <Err msg={err} />
  const d = data?.data || {}
  const totalLE = d.total_liab_plus_equity ?? 0

  const assetGroups = groupItemsByCategory(d.asset_items || [])
  const liabGroups = groupItemsByCategory(d.liab_items || [])

  return (
    <div>
      <SHead>Assets</SHead>
      <CollapsibleSection groups={assetGroups} />
      <SRow name="Total Assets" amount={d.total_assets} subtotal bold accent />
      <Divider />
      <SHead>Liabilities</SHead>
      <CollapsibleSection groups={liabGroups} />
      <SRow name="Total Liabilities" amount={d.total_liab} subtotal bold />
      <SHead>Equity</SHead>
      {(d.equity_items || []).map((r: any, i: number) => <SRow key={i} name={r.name} amount={r.total} indent />)}
      <SRow name="Total Equity" amount={d.total_equity} subtotal bold />
      <TotalRow name="Total Liabilities + Equity" amount={totalLE} positive={totalLE >= 0} />
      {d.balance_status?.warning && (
        <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.25)', borderRadius: 8, fontSize: 11, color: '#D4A843' }}>
          {d.balance_status.warning}
        </div>
      )}
    </div>
  )
}

// ─── Cash Flow ───────────────────────────────────────────────────────────────

function CfReport({ period, onData }: { period: Period; onData?: (d: any) => void }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  useEffect(() => {
    let stale = false
    setLoading(true); setErr(''); setData(null)
    api(`/api/reports/cf?period=${period}`).then(d => { if (!stale) { setData(d); setLoading(false); onData?.(d) } }).catch(e => { if (!stale) { setErr(e.message); setLoading(false) } })
    return () => { stale = true }
  }, [period])
  if (loading) return <ReportSkeleton />
  if (err) return <Err msg={err} />
  const d = data?.data || {}
  const renderItems = (items: any[], label: string, net: number) => {
    if (!items?.length && !net) return null
    return <>
      <SHead>{label}</SHead>
      {(items || []).map((it: any, i: number) => (
        <SRow key={i} name={it.name || it.account || it.description} amount={it.total ?? it.amount}
          indent accent={it.type === 'inflow'} danger={it.type === 'outflow'} />
      ))}
      <SRow name={`Net ${label}`} amount={net} subtotal bold accent={net >= 0} danger={net < 0} />
    </>
  }
  const netChange = (d.net_operating ?? 0) + (d.net_investing ?? 0) + (d.net_financing ?? 0)
  return (
    <div>
      {renderItems(d.operating_items || [], 'Operating Activities', d.net_operating ?? 0)}
      <Divider />
      {renderItems(d.investing_items || [], 'Investing Activities', d.net_investing ?? 0)}
      <Divider />
      {renderItems(d.financing_items || [], 'Financing Activities', d.net_financing ?? 0)}
      <div style={{ marginTop: 8, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
        <SRow name="Opening Cash Balance" amount={d.opening_cash} bold />
        <SRow name="Net Change" amount={netChange} bold accent={netChange >= 0} danger={netChange < 0} />
      </div>
      <TotalRow name="Closing Cash Balance" amount={d.closing_cash ?? 0} positive={(d.closing_cash ?? 0) >= 0} />
    </div>
  )
}

// ─── Trial Balance ────────────────────────────────────────────────────────────

function TbReport({ period }: { period: Period }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  useEffect(() => {
    let stale = false
    setLoading(true); setErr(''); setData(null)
    api(`/api/reports/tb?period=${period}`).then(d => { if (!stale) { setData(d); setLoading(false) } }).catch(e => { if (!stale) { setErr(e.message); setLoading(false) } })
    return () => { stale = true }
  }, [period])
  if (loading) return <ReportSkeleton />
  if (err) return <Err msg={err} />
  const d = data?.data || {}
  const sections: any = d.sections || {}
  const order = ['asset', 'liability', 'equity', 'pnl']
  const headers: Record<string, string> = { asset: 'Assets', liability: 'Liabilities', equity: 'Equity', pnl: 'P&L Accounts' }
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '4px 12px', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '.5px' }}>ACCOUNT</span>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right', letterSpacing: '.5px' }}>DEBIT</span>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right', letterSpacing: '.5px' }}>CREDIT</span>
      </div>
      {order.map(key => {
        const sec = sections[key]
        if (!sec) return null
        const items: any[] = sec.items || []
        if (!items.length) return null
        return (
          <div key={key} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '10px 0 5px' }}>
              {headers[key] || sec.label}
            </div>
            {items.map((it: any, i: number) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '4px 12px', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 8 }}>{it.account}</span>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textAlign: 'right', color: (it.dr || 0) > 0 ? 'var(--text-primary)' : 'var(--text-dim)' }}>{(it.dr || 0) > 0 ? fmt(it.dr) : '—'}</span>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textAlign: 'right', color: (it.cr || 0) > 0 ? 'var(--text-primary)' : 'var(--text-dim)' }}>{(it.cr || 0) > 0 ? fmt(it.cr) : '—'}</span>
              </div>
            ))}
          </div>
        )
      })}
      {(d.total_dr != null || d.total_cr != null) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '4px 12px', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>TOTAL</span>
          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', textAlign: 'right', color: '#3bf084' }}>Rs. {fmt(d.total_dr)}</span>
          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', textAlign: 'right', color: '#3bf084' }}>Rs. {fmt(d.total_cr)}</span>
        </div>
      )}
    </div>
  )
}

// ─── Account Ledger ───────────────────────────────────────────────────────────

function LedgerReport() {
  const [accounts, setAccounts] = useState<string[]>([])
  const [account, setAccount] = useState('')
  const [period, setPeriod] = useState<Period>('this_month')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [err, setErr] = useState('')
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    api('/api/reports/accounts-list').then(d => {
      const accs: string[] = d.accounts || []
      setAccounts(accs)
      if (accs.length > 0) setAccount(accs[0])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!account) return
    let stale = false
    setLoading(true); setErr(''); setData(null); setOffset(0)
    api(`/api/reports/account-ledger?account=${encodeURIComponent(account)}&period=${period}&offset=0&limit=50`)
      .then(d => { if (!stale) { setData(d); setLoading(false) } })
      .catch(e => { if (!stale) { setErr(e.message); setLoading(false) } })
    return () => { stale = true }
  }, [account, period])

  const loadMore = useCallback(async () => {
    if (!data?.has_more || loadingMore) return
    const nextOffset = offset + 50
    setLoadingMore(true)
    try {
      const more = await api(`/api/reports/account-ledger?account=${encodeURIComponent(account)}&period=${period}&offset=${nextOffset}&limit=50`)
      setData((prev: any) => ({ ...prev, transactions: [...(prev.transactions || []), ...(more.transactions || [])], has_more: !!more.has_more }))
      setOffset(nextOffset)
    } catch { }
    setLoadingMore(false)
  }, [account, period, offset, data, loadingMore])

  return (
    <div>
      {accounts.length > 0 && (
        <select value={account} onChange={e => setAccount(e.target.value)} style={{
          width: '100%', padding: '9px 12px', borderRadius: 10,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-sans)',
          marginBottom: 2, cursor: 'pointer',
        }}>
          {accounts.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      )}
      <PeriodPills period={period} onChange={p => setPeriod(p)} full />
      {loading && <ReportSkeleton />}
      {err && <Err msg={err} />}
      {data && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{data.total ?? 0} transactions</span>
          </div>
          {(data.transactions || []).map((tx: any, i: number) => {
            const dr = tx.debit || 0
            const cr = tx.credit || 0
            return (
              <div key={i} style={{ padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, flex: 1, marginRight: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                    {tx.description || '—'}
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', color: dr > 0 ? 'var(--text-primary)' : 'var(--text-dim)', fontFamily: 'var(--font-mono)', minWidth: 60, textAlign: 'right' }}>
                      {dr > 0 ? `Dr ${fmt(dr)}` : '—'}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', color: cr > 0 ? 'var(--text-primary)' : 'var(--text-dim)', fontFamily: 'var(--font-mono)', minWidth: 60, textAlign: 'right' }}>
                      {cr > 0 ? `Cr ${fmt(cr)}` : '—'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtDate(tx.date)}{tx.ref ? ` · ${tx.ref}` : ''}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>Bal Rs. {fmt(tx.balance)}</div>
                </div>
              </div>
            )
          })}
          {data.has_more && (
            <div onClick={loadMore} style={{ padding: 12, textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: loadingMore ? 'not-allowed' : 'pointer', opacity: loadingMore ? 0.6 : 1 }}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { business } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initTab = (searchParams.get('tab') as Tab) || 'pnl'
  const [tab, setTab] = useState<Tab>(initTab)
  const [period, setPeriod] = useState<Period>('this_month')
  const [reportData, setReportData] = useState<any>(null)

  const showPdf = tab === 'pnl' || tab === 'bs' || tab === 'cf'
  const showWa = showPdf
  const pdfType = tab === 'bs' ? 'bs' : tab === 'cf' ? 'cf' : 'pnl'
  const bizName = business?.name || 'Business'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 80 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 18, padding: 0, display: 'flex', alignItems: 'center' }}>&#8592;</button>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>REPORTS</span>
      </div>
      <TabBar active={tab} onChange={t => { setTab(t); setReportData(null) }} />
      <div style={{ padding: '12px 16px' }}>
        {tab !== 'ledger' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <PeriodPills period={period} onChange={p => { setPeriod(p); setReportData(null) }} full={tab === 'tb'} />
            <div style={{ display: 'flex', gap: 6 }}>
              {showWa && reportData && <WaShareBtn data={reportData} bizName={bizName} tab={tab} period={period} />}
              {showPdf && <PdfBtn type={pdfType} period={period} />}
            </div>
          </div>
        )}
        {tab === 'pnl' && <PnlReport period={period} onData={setReportData} />}
        {tab === 'bs' && <BsReport period={period} onData={setReportData} />}
        {tab === 'cf' && <CfReport period={period} onData={setReportData} />}
        {tab === 'tb' && <TbReport period={period} />}
        {tab === 'ledger' && <LedgerReport />}
      </div>
    </div>
  )
}
