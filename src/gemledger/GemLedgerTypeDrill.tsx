import { useEffect, useState } from 'react'
import { gemApi } from './gemledger-api'
import type { Lot } from './gemledger-types'
import { LotCard, fmtCt } from './GemLedgerCards'

const C = {
  bg3: '#1a2a1a', border: '#1e2e1e', t1: '#e0e8e0', t2: '#c0ccc0', t3: '#8a9a8a',
  green: '#34d399', yellow: '#fbbf24', purple: '#a78bfa',
}

interface Props {
  stoneTypeId: string
  stoneTypeName: string
  color: string
  onBack: () => void
  onLot: (id: string) => void
  onTransfer: (lot: Lot) => void
  refreshKey?: number
}

export default function GemLedgerTypeDrill({ stoneTypeId, stoneTypeName, color, onBack, onLot, onTransfer, refreshKey }: Props) {
  const [lots, setLots] = useState<Lot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'rough' | 'cut' | 'wip'>('rough')

  useEffect(() => {
    setLoading(true)
    setError(null)
    gemApi.lots({ stone_type_id: stoneTypeId, page_size: 200 })
      .then(r => setLots(r.items.filter(l => !['sold', 'processed'].includes(l.status))))
      .catch((err: any) => { setError(err?.message || 'Failed to load lots') })
      .finally(() => setLoading(false))
  }, [stoneTypeId, refreshKey])

  const byTab = lots.filter(l => l.status === tab)
  const roughLots = lots.filter(l => l.status === 'rough')
  const cutLots = lots.filter(l => l.status === 'cut')
  const wipLots = lots.filter(l => l.status === 'wip')

  const tabCounts: Record<string, number> = { rough: roughLots.length, cut: cutLots.length, wip: wipLots.length }
  const tabCts: Record<string, number> = {
    rough: roughLots.reduce((a, l) => a + parseFloat(l.total_weight_ct), 0),
    cut: cutLots.reduce((a, l) => a + parseFloat(l.total_weight_ct), 0),
    wip: wipLots.reduce((a, l) => a + parseFloat(l.total_weight_ct), 0),
  }

  const tabColors: Record<string, string> = { rough: C.yellow, cut: C.green, wip: C.purple }

  const wipByParty: Record<string, Lot[]> = {}
  wipLots.forEach(l => {
    const k = l.location_party_id || 'unknown'
    if (!wipByParty[k]) wipByParty[k] = []
    wipByParty[k].push(l)
  })

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
        borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: '#0a0f0a', zIndex: 10,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color, fontSize: 14, cursor: 'pointer', fontFamily: 'DM Sans', padding: '4px 0' }}>&#8592; Back</button>
        <span style={{ color, fontFamily: 'DM Sans', fontWeight: 700, fontSize: 16 }}>{stoneTypeName}</span>
      </div>

      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
        {(['rough', 'cut', 'wip'] as const).map(t => {
          const active = tab === t
          const tc = tabColors[t]
          return (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '10px 4px', background: 'transparent', border: 'none', cursor: 'pointer',
              borderBottom: active ? `2px solid ${tc}` : '2px solid transparent',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
            }}>
              <span style={{ color: active ? tc : C.t3, fontFamily: 'DM Sans', fontWeight: active ? 700 : 400, fontSize: 13, textTransform: 'capitalize' }}>{t}</span>
              <span style={{ color: C.t3, fontFamily: 'JetBrains Mono', fontSize: 10 }}>{tabCounts[t]} &middot; {fmtCt(tabCts[t])} ct</span>
            </button>
          )
        })}
      </div>

      <div style={{ padding: '12px 16px', paddingBottom: 80 }}>
        {loading && <div style={{ color: C.t3, textAlign: 'center', padding: 20, fontFamily: 'DM Sans' }}>Loading&#8230;</div>}
        {error && <div style={{ color: '#f87171', textAlign: 'center', padding: 20, fontFamily: 'DM Sans', fontSize: 13 }}>{error}</div>}
        {!loading && byTab.length === 0 && (
          <div style={{ color: C.t3, textAlign: 'center', padding: 20, fontFamily: 'DM Sans' }}>No {tab} lots</div>
        )}
        {tab === 'wip' ? (
          Object.entries(wipByParty).map(([, partyLots]) => {
            const first = partyLots[0]
            return (
              <div key={first.location_party_id || 'unknown'}>
                <div style={{ color: C.purple, fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, marginBottom: 4, padding: '4px 0' }}>
                  {first.party_name || 'Unknown'} {first.party_location ? `· ${first.party_location}` : ''}
                </div>
                {partyLots.map(lot => (
                  <LotCard key={lot.id} lot={lot} showDot={false}
                    onTap={() => onLot(lot.id)}
                    action={
                      <button onClick={e => { e.stopPropagation(); onTransfer(lot) }} style={{
                        marginTop: 8, width: '100%', padding: '8px', borderRadius: 8, minHeight: 44,
                        background: `${C.purple}20`, border: `1px solid ${C.purple}40`,
                        color: C.purple, fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                      }}>Transfer</button>
                    }
                  />
                ))}
              </div>
            )
          })
        ) : (
          byTab.map(lot => (
            <LotCard key={lot.id} lot={lot}
              onTap={() => onLot(lot.id)}
              showApprovalBadge={lot.location === 'on_approval'}
            />
          ))
        )}
      </div>
    </div>
  )
}