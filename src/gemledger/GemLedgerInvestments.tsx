import { useEffect, useState } from 'react'
import { gemApi } from './gemledger-api'
import type { Investment, InvestmentDetail } from './gemledger-types'
import { numFmt, fmtCt } from './GemLedgerCards'
import { CloseInvestmentModal, ReturnCapitalForm } from './GemLedgerForms'

const C = {
  bg2: '#111a11', bg3: '#1a2a1a', border: '#1e2e1e', border2: '#162016',
  t1: '#e0e8e0', t2: '#c0ccc0', t3: '#8a9a8a',
  green: '#34d399', yellow: '#fbbf24', purple: '#a78bfa', red: '#f87171',
}

interface Props {
  onBack: () => void
  onInvestorDetail: (id: string, name: string) => void
  refreshKey: number
}

export function InvestmentsList({ onBack, onInvestorDetail, refreshKey }: Props) {
  const [invs, setInvs] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'cash' | 'pnl'>('cash')

  useEffect(() => {
    setLoading(true)
    gemApi.investments().then(setInvs).catch(() => {}).finally(() => setLoading(false))
  }, [refreshKey])

  const active = invs.filter(i => i.status === 'active')
  const closed = invs.filter(i => i.status === 'closed')
  const totalCash = active.reduce((a, i) => a + parseFloat(i.cash_available), 0)
  const totalCap = active.reduce((a, i) => a + parseFloat(i.capital_amount), 0)
  const totalInStock = active.reduce((a, i) => a + parseFloat(i.in_stock_value), 0)
  const totalReturned = invs.reduce((a, i) => a + parseFloat(i.total_returned), 0)

  const totalPnL = closed.reduce((a, i) => a + parseFloat(i.close_your_profit || '0'), 0)

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
        borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: '#0a0f0a', zIndex: 10,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.green, fontSize: 14, cursor: 'pointer', fontFamily: 'DM Sans', padding: '4px 0' }}>← Investments</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
        {([['cash', 'Cash'], ['pnl', 'Profit & Loss']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '12px', background: 'transparent', border: 'none', cursor: 'pointer',
            borderBottom: tab === t ? `2px solid ${C.green}` : '2px solid transparent',
            color: tab === t ? C.green : C.t3, fontFamily: 'DM Sans', fontWeight: tab === t ? 700 : 400, fontSize: 14,
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: '12px 16px', paddingBottom: 80 }}>
        {loading && <div style={{ color: C.t3, textAlign: 'center', padding: 20, fontFamily: 'DM Sans' }}>Loading…</div>}

        {tab === 'cash' ? (
          <>
            {/* Hero */}
            <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px', marginBottom: 14 }}>
              <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 8 }}>CASH AVAILABLE TO DEPLOY</div>
              <div style={{ color: C.green, fontSize: 32, fontFamily: 'JetBrains Mono', fontWeight: 700 }}>{numFmt(totalCash)}</div>
              <div style={{ color: C.t3, fontSize: 12, fontFamily: 'DM Sans', marginTop: 4 }}>{active.length} active investor{active.length !== 1 ? 's' : ''}</div>
            </div>

            {/* Investor rows */}
            <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 8 }}>CASH BY INVESTOR</div>
            {active.map(inv => (
              <button key={inv.id} onClick={() => onInvestorDetail(inv.id, inv.name)} style={{
                width: '100%', background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12,
                padding: '12px 14px', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center',
                WebkitTapHighlightColor: 'transparent',
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: C.bg3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 12 }}>
                  <span style={{ color: C.green, fontFamily: 'DM Sans', fontWeight: 700, fontSize: 14 }}>{inv.name[0].toUpperCase()}</span>
                </div>
                <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                  <div style={{ color: C.t1, fontFamily: 'DM Sans', fontWeight: 600, fontSize: 14 }}>{inv.name}</div>
                  <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans' }}>
                    {numFmt(inv.capital_amount)} in · {numFmt(inv.in_stock_value)} in stock
                  </div>
                </div>
                <div style={{ color: C.green, fontFamily: 'JetBrains Mono', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>{numFmt(inv.cash_available)}</div>
              </button>
            ))}

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
              {[['Total capital', numFmt(totalCap)], ['In stock value', numFmt(totalInStock)]].map(([label, val]) => (
                <div key={label} style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px' }}>
                  <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans', marginBottom: 4 }}>{label}</div>
                  <div style={{ color: C.t1, fontFamily: 'JetBrains Mono', fontSize: 16, fontWeight: 600 }}>{val}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* P&L Hero */}
            <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px', marginBottom: 14 }}>
              <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 8 }}>TOTAL PROFIT & LOSS</div>
              <div style={{ color: totalPnL >= 0 ? C.green : C.red, fontSize: 32, fontFamily: 'JetBrains Mono', fontWeight: 700 }}>{numFmt(totalPnL)}</div>
            </div>

            {/* Active investments */}
            {active.length > 0 && (
              <>
                <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 8 }}>ACTIVE</div>
                {active.map(inv => (
                  <button key={inv.id} onClick={() => onInvestorDetail(inv.id, inv.name)} style={{
                    width: '100%', background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12,
                    padding: '12px 14px', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center',
                    WebkitTapHighlightColor: 'transparent',
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: C.bg3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 12 }}>
                      <span style={{ color: C.green, fontFamily: 'DM Sans', fontWeight: 700, fontSize: 14 }}>{inv.name[0].toUpperCase()}</span>
                    </div>
                    <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                      <div style={{ color: C.t1, fontFamily: 'DM Sans', fontWeight: 600, fontSize: 14 }}>{inv.name}</div>
                      <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans' }}>
                        {numFmt(inv.capital_amount)} in · returned {numFmt(inv.total_returned)}
                      </div>
                    </div>
                    <span style={{ color: C.t3, fontSize: 16 }}>›</span>
                  </button>
                ))}
              </>
            )}

            {/* Closed investments */}
            {closed.length > 0 && (
              <>
                <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 8, marginTop: 8 }}>CLOSED</div>
                {closed.map(inv => {
                  const profit = parseFloat(inv.close_your_profit || '0')
                  return (
                    <div key={inv.id} style={{
                      background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12,
                      padding: '12px 14px', marginBottom: 8, opacity: 0.7, display: 'flex', alignItems: 'center',
                    }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: C.bg3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 12 }}>
                        <span style={{ color: C.t3, fontFamily: 'DM Sans', fontWeight: 700, fontSize: 14 }}>{inv.name[0].toUpperCase()}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: C.t2, fontFamily: 'DM Sans', fontWeight: 600, fontSize: 14 }}>{inv.name}</div>
                        <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans' }}>Closed · {numFmt(inv.capital_amount)} in</div>
                      </div>
                      <div style={{ color: profit >= 0 ? C.green : C.red, fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 600 }}>{numFmt(profit)}</div>
                    </div>
                  )
                })}
              </>
            )}

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
              {[['Total returned', numFmt(totalReturned)], ['In stock value', numFmt(totalInStock)]].map(([label, val]) => (
                <div key={label} style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px' }}>
                  <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans', marginBottom: 4 }}>{label}</div>
                  <div style={{ color: C.t1, fontFamily: 'JetBrains Mono', fontSize: 16, fontWeight: 600 }}>{val}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Investor Detail ───────────────────────────────────────────────────────────

interface DetailProps {
  investmentId: string
  investmentName: string
  onBack: () => void
  onLot: (id: string) => void
}

export function InvestorDetail({ investmentId, investmentName, onBack, onLot }: DetailProps) {
  const [inv, setInv] = useState<InvestmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [histOpen, setHistOpen] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    gemApi.investment(investmentId).then(setInv).catch(() => {}).finally(() => setLoading(false))
  }, [investmentId, refreshKey])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <div style={{ width: 24, height: 24, border: `2px solid ${C.green}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
  if (!inv) return null

  const capital = parseFloat(inv.capital_amount)
  const cashLeft = parseFloat(inv.cash_available)
  const inStock = parseFloat(inv.in_stock_value)
  const returned = parseFloat(inv.total_returned)
  const allSold = inv.lots.filter(l => !['sold', 'processed'].includes(l.status)).length === 0

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
        borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: '#0a0f0a', zIndex: 10,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.green, fontSize: 14, cursor: 'pointer', fontFamily: 'DM Sans', padding: '4px 0' }}>← Back</button>
        <span style={{ color: C.t1, fontFamily: 'DM Sans', fontWeight: 700, fontSize: 16 }}>{investmentName}</span>
      </div>

      <div style={{ padding: '12px 16px', paddingBottom: 80 }}>
        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            ['Invested', numFmt(capital), C.t1],
            ['Cash left', numFmt(cashLeft), C.green],
            ['In stock', numFmt(inStock), C.yellow],
            ['Returned', numFmt(returned), C.t2],
          ].map(([label, val, color]) => (
            <div key={label} style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans', marginBottom: 4 }}>{label}</div>
              <div style={{ color, fontFamily: 'JetBrains Mono', fontSize: 16, fontWeight: 600 }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Return capital button */}
        {inv.status === 'active' && (
          <button onClick={() => setReturnOpen(true)} style={{
            width: '100%', padding: '12px', borderRadius: 10, background: `${C.green}18`,
            border: `1px solid ${C.green}40`, color: C.green,
            fontFamily: 'DM Sans', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 16,
          }}>↩ Return capital to investor</button>
        )}

        {/* Stones */}
        <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 8 }}>STONES IN THIS INVESTMENT</div>
        {inv.lots.map(lot => {
          const isSold = lot.status === 'sold' || lot.status === 'processed'
          const profitNum = lot.sale_price ? parseFloat(lot.sale_price) - parseFloat(lot.total_cost) : null
          return (
            <button key={lot.id} onClick={() => !isSold && onLot(lot.id)} style={{
              width: '100%', background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12,
              padding: '10px 14px', marginBottom: 8, opacity: isSold ? 0.45 : 1,
              cursor: isSold ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 10,
              WebkitTapHighlightColor: 'transparent',
            }}>
              <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                <div style={{ color: C.t1, fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13 }}>{lot.name}</div>
                <div style={{ color: C.t3, fontSize: 11, fontFamily: 'JetBrains Mono' }}>
                  {fmtCt(lot.total_weight_ct)} ct · Cost: {numFmt(lot.total_cost)}
                  {lot.sale_price && ` → ${numFmt(lot.sale_price)}`}
                  {profitNum !== null && <span style={{ color: profitNum >= 0 ? C.green : C.red }}> ({profitNum >= 0 ? "+" : ""}{numFmt(profitNum)})</span>}
                </div>
              </div>
              <div style={{
                fontSize: 10, fontFamily: 'DM Sans', fontWeight: 700, color: 'white', padding: '2px 8px',
                borderRadius: 6, background: lot.status === 'sold' ? '#2a2a2a' : lot.status === 'rough' ? `${C.yellow}30` : `${C.green}30`,
              }}>{lot.status.toUpperCase()}</div>
            </button>
          )
        })}

        {/* Transaction history */}
        <button onClick={() => setHistOpen(h => !h)} style={{
          width: '100%', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 10,
          color: C.t2, fontFamily: 'DM Sans', fontSize: 14, padding: '10px 14px',
          cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
        }}>
          <span>Transaction log</span>
          <span style={{ color: C.t3 }}>{histOpen ? '▲' : '▼'}</span>
        </button>
        {histOpen && inv.returns.map(r => (
          <div key={r.id} style={{
            background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: '10px 14px', marginBottom: 6, display: 'flex', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ color: C.t2, fontFamily: 'DM Sans', fontSize: 13 }}>{r.is_final ? 'Final settlement' : 'Capital return'}</div>
              <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans' }}>{new Date(r.date).toLocaleDateString()}</div>
            </div>
            <div style={{ color: C.green, fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 600 }}>{numFmt(r.amount)}</div>
          </div>
        ))}

        {/* Close investment */}
        {inv.status === 'active' && (
          <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <button onClick={() => allSold && setCloseOpen(true)} style={{
              width: '100%', padding: '12px', borderRadius: 10,
              background: allSold ? `${C.red}18` : 'transparent',
              border: `1px solid ${allSold ? C.red : C.border}`,
              color: allSold ? C.red : C.t3,
              fontFamily: 'DM Sans', fontWeight: 600, fontSize: 14, cursor: allSold ? 'pointer' : 'default',
            }}>Close this investment</button>
            {!allSold && <div style={{ color: C.t3, fontSize: 12, fontFamily: 'DM Sans', textAlign: 'center', marginTop: 4 }}>All stones must be sold first</div>}
          </div>
        )}
      </div>

      {returnOpen && <ReturnCapitalForm investmentId={investmentId} investmentName={investmentName} onClose={() => setReturnOpen(false)} onSaved={() => setRefreshKey(k => k + 1)} />}
      {closeOpen && inv && <CloseInvestmentModal inv={inv} onClose={() => setCloseOpen(false)} onSaved={() => { setRefreshKey(k => k + 1); setCloseOpen(false) }} />}
    </div>
  )
}
