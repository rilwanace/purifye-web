import { useEffect, useState } from 'react'
import { gemApi } from './gemledger-api'
import type { DashboardData } from './gemledger-types'

const C = {
  bg2: '#111a11', bg3: '#1a2a1a', border: '#1e2e1e', border2: '#162016',
  t1: '#e0e8e0', t2: '#c0ccc0', t3: '#8a9a8a',
  green: '#34d399', yellow: '#fbbf24', purple: '#a78bfa',
}

const num = (n: string | number) =>
  parseFloat(String(n)).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function SectionDivider({ label, color }: { label: string; color: string }) {
  return (
    <div style={{
      margin: '8px 0 0', padding: '10px 20px',
      background: C.bg3,
      borderTop: `1px solid ${color}33`, borderBottom: `1px solid ${color}33`,
      textAlign: 'center',
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'DM Sans', letterSpacing: '0.1em' }}>
        {label}
      </span>
    </div>
  )
}

interface Props {
  onDrill: (type: 'stock' | 'location' | 'investments', params: any) => void
  onTypeDrill: (id: string, name: string, color: string) => void
  refreshKey: number
}

export default function GemLedgerDashboard({ onDrill, onTypeDrill, refreshKey }: Props) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    gemApi.dashboard()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [refreshKey])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <div style={{ width: 24, height: 24, border: `2px solid ${C.green}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  if (!data) return null

  const { stock_overview: s, stone_type_breakdown: types, location_summary: loc, investment_summary: inv } = data
  const maxCost = types.reduce((m, t) => Math.max(m, parseFloat(t.total_cost)), 0.01)

  return (
    <div style={{ paddingBottom: 4 }}>
      {/* Stock Overview */}
      <SectionDivider label="STOCK OVERVIEW" color={C.purple} />
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {([
            { key: 'rough', label: 'Rough', color: C.yellow },
            { key: 'cut', label: 'Cut', color: C.green },
            { key: 'wip', label: 'WIP', color: C.purple },
          ] as const).map(({ key, label, color }) => {
            const d = s[key]
            return (
              <button key={key}
                onClick={() => onDrill('stock', { status: key })}
                style={{
                  background: C.bg2, border: `1px solid ${C.border}`,
                  borderRadius: 12, padding: '12px 8px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'DM Sans', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: C.t1, fontFamily: 'JetBrains Mono' }}>{d.count}</span>
                <span style={{ fontSize: 11, color: C.t3, fontFamily: 'JetBrains Mono', marginTop: 2 }}>{num(d.ct)} ct</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Stone Type Breakdown */}
      <SectionDivider label="BY STONE TYPE" color="#60a5fa" />
      <div style={{ padding: '12px 16px' }}>
        {types.length === 0 ? (
          <div style={{ color: C.t3, fontSize: 13, fontFamily: 'DM Sans', textAlign: 'center', padding: 16 }}>No stone types with active inventory</div>
        ) : (
          types.map(t => {
            const pct = Math.max(4, (parseFloat(t.total_cost) / maxCost) * 100)
            return (
              <button key={t.id}
                onClick={() => onTypeDrill(t.id, t.name, t.color_hex)}
                style={{
                  width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                  borderBottom: `1px solid ${C.border2}`, WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{ width: 4, height: 32, borderRadius: 2, background: t.color_hex || C.green, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: C.t1, fontSize: 13, fontFamily: 'DM Sans', fontWeight: 600, marginBottom: 4, textAlign: 'left' }}>{t.name}</div>
                  <div style={{ height: 4, background: C.border, borderRadius: 2, position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: 4, width: `${pct}%`, background: t.color_hex || C.green, borderRadius: 2 }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: C.t1, fontSize: 13, fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{num(t.total_cost)}</div>
                  <div style={{ color: C.t3, fontSize: 11, fontFamily: 'JetBrains Mono' }}>{t.stone_count} · {num(t.total_ct)} ct</div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Location */}
      <SectionDivider label="LOCATION" color={C.yellow} />
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {([
            { key: 'with_me' as const, label: 'With me', dot: C.green },
            { key: 'on_approval' as const, label: 'On approval', dot: C.yellow },
          ]).map(({ key, label, dot }) => {
            const d = loc[key]
            return (
              <button key={key}
                onClick={() => onDrill('location', { loc: key })}
                style={{
                  background: C.bg2, border: `1px solid ${C.border}`,
                  borderRadius: 12, padding: '14px 12px',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: dot }} />
                  <span style={{ fontSize: 12, color: C.t2, fontFamily: 'DM Sans', fontWeight: 600 }}>{label}</span>
                </div>
                <span style={{ fontSize: 24, fontWeight: 700, color: C.t1, fontFamily: 'JetBrains Mono' }}>{d.count}</span>
                <span style={{ fontSize: 11, color: C.t3, fontFamily: 'JetBrains Mono', marginTop: 2 }}>{num(d.ct)} ct</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Investments */}
      <SectionDivider label="INVESTMENTS" color={C.green} />
      <div style={{ padding: '12px 16px 4px' }}>
        <button
          onClick={() => onDrill('investments', {})}
          style={{
            width: '100%', background: C.bg2, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '16px', cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent', textAlign: 'left',
          }}
        >
          <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans', fontWeight: 600, marginBottom: 6, letterSpacing: '0.05em' }}>CASH AVAILABLE TO DEPLOY</div>
          <div style={{ color: C.green, fontSize: 28, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
            {num(inv.cash_available)}
          </div>
          <div style={{ color: C.t3, fontSize: 12, fontFamily: 'DM Sans', marginTop: 4 }}>
            {inv.investor_count} investor{inv.investor_count !== 1 ? 's' : ''}
          </div>
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
