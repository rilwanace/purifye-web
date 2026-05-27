import { useEffect, useState } from 'react'
import { gemApi } from './gemledger-api'
import type { Lot } from './gemledger-types'
import { LotCard, numFmt } from './GemLedgerCards'

const C = {
  border: '#1e2e1e', t1: '#e0e8e0', t2: '#c0ccc0', t3: '#8a9a8a',
  green: '#34d399', yellow: '#fbbf24',
}

interface Props {
  loc: 'with_me' | 'on_approval'
  onBack: () => void
  onLot: (id: string) => void
}

export default function GemLedgerLocationDrill({ loc, onBack, onLot }: Props) {
  const [lots, setLots] = useState<Lot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'rough' | 'cut'>('rough')

  const color = loc === 'with_me' ? C.green : C.yellow
  const title = loc === 'with_me' ? 'With me' : 'On approval'

  useEffect(() => {
    setLoading(true)
    setError(null)
    gemApi.lots({ location: loc, page_size: 200 })
      .then(r => setLots(r.items.filter(l => l.status === 'rough' || l.status === 'cut')))
      .catch((err: any) => { setError(err?.message || 'Failed to load lots') })
      .finally(() => setLoading(false))
  }, [loc])

  const rough = lots.filter(l => l.status === 'rough')
  const cut = lots.filter(l => l.status === 'cut')
  const byTab = tab === 'rough' ? rough : cut

  // For on_approval: group by party
  const byParty: Record<string, Lot[]> = {}
  if (loc === 'on_approval') {
    byTab.forEach(l => {
      const k = l.location_party_id || 'unknown'
      if (!byParty[k]) byParty[k] = []
      byParty[k].push(l)
    })
  }

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
        borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: '#0a0f0a', zIndex: 10,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color, fontSize: 14, cursor: 'pointer', fontFamily: 'DM Sans', padding: '4px 0' }}>← Back</button>
        <span style={{ color, fontFamily: 'DM Sans', fontWeight: 700, fontSize: 16 }}>{title}</span>
      </div>

      {/* Rough / Cut sub-tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
        {(['rough', 'cut'] as const).map(t => {
          const active = tab === t
          const tc = t === 'rough' ? C.yellow : C.green
          const lst = t === 'rough' ? rough : cut
          return (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '10px', background: 'transparent', border: 'none', cursor: 'pointer',
              borderBottom: active ? `2px solid ${tc}` : '2px solid transparent',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
            }}>
              <span style={{ color: active ? tc : C.t3, fontFamily: 'DM Sans', fontWeight: active ? 700 : 400, fontSize: 13, textTransform: 'capitalize' }}>{t}</span>
              <span style={{ color: C.t3, fontFamily: 'JetBrains Mono', fontSize: 10 }}>
                {lst.length} · {numFmt(lst.reduce((a, l) => a + parseFloat(l.total_weight_ct), 0))} ct
              </span>
            </button>
          )
        })}
      </div>

      <div style={{ padding: '12px 16px', paddingBottom: 80 }}>
        {loading && <div style={{ color: C.t3, textAlign: 'center', padding: 20, fontFamily: 'DM Sans' }}>Loading…</div>}
        {error && <div style={{ color: '#f87171', textAlign: 'center', padding: 20, fontFamily: 'DM Sans', fontSize: 13 }}>{error}</div>}
        {!loading && byTab.length === 0 && (
          <div style={{ color: C.t3, textAlign: 'center', padding: 20, fontFamily: 'DM Sans' }}>No {tab} lots here</div>
        )}

        {loc === 'on_approval' ? (
          Object.entries(byParty).map(([, partyLots]) => {
            const first = partyLots[0]
            const totalCt = partyLots.reduce((a, l) => a + parseFloat(l.total_weight_ct), 0)
            return (
              <div key={first.location_party_id || 'unknown'} style={{ marginBottom: 12 }}>
                <div style={{
                  background: '#1a2a1a', borderRadius: 10, padding: '10px 12px', marginBottom: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ color: C.yellow, fontFamily: 'DM Sans', fontWeight: 600 }}>{first.party_name || 'Unknown'}</div>
                    {first.party_location && <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans' }}>{first.party_location}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: C.t2, fontFamily: 'JetBrains Mono', fontSize: 13 }}>{partyLots.length} lot{partyLots.length !== 1 ? 's' : ''}</div>
                    <div style={{ color: C.t3, fontFamily: 'JetBrains Mono', fontSize: 11 }}>{numFmt(totalCt)} ct</div>
                  </div>
                </div>
                {partyLots.map(lot => (
                  <LotCard key={lot.id} lot={lot} showDot={false}
                    onTap={() => onLot(lot.id)}
                    showApprovalBadge={true}
                  />
                ))}
              </div>
            )
          })
        ) : (
          byTab.map(lot => (
            <LotCard key={lot.id} lot={lot}
              onTap={() => onLot(lot.id)}
              showDot={false}
            />
          ))
        )}
      </div>
    </div>
  )
}
