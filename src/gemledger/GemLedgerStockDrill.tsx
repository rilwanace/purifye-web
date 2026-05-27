import { useEffect, useState } from 'react'
import { gemApi } from './gemledger-api'
import type { Lot } from './gemledger-types'
import { LotCard, numFmt } from './GemLedgerCards'

const C = {
  bg3: '#1a2a1a', border: '#1e2e1e', t1: '#e0e8e0', t2: '#c0ccc0', t3: '#8a9a8a',
  green: '#34d399', yellow: '#fbbf24', purple: '#a78bfa',
}

const STATUS_COLOR: Record<string, string> = { rough: C.yellow, cut: C.green, wip: C.purple }

interface Props {
  status: 'rough' | 'cut' | 'wip'
  onBack: () => void
  onLot: (id: string) => void
  onReceiveCutter: (lotId: string) => void
}

export default function GemLedgerStockDrill({ status, onBack, onLot, onReceiveCutter }: Props) {
  const [lots, setLots] = useState<Lot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [locTab, setLocTab] = useState<'all' | 'with_me' | 'on_approval'>('all')

  useEffect(() => {
    setLoading(true)
    setError(null)
    gemApi.lots({ status, page_size: 200 })
      .then(r => setLots(r.items))
      .catch((err: any) => { setError(err?.message || 'Failed to load lots') })
      .finally(() => setLoading(false))
  }, [status])

  const color = STATUS_COLOR[status]

  // Group WIP by party
  const grouped: Record<string, Lot[]> = {}
  if (status === 'wip') {
    lots.forEach(l => {
      const key = l.location_party_id || 'unknown'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(l)
    })
  }

  const filtered = status === 'wip' ? lots : lots.filter(l =>
    locTab === 'all' ? true : l.location === locTab
  )

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
        borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: '#0a0f0a', zIndex: 10,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: color, fontSize: 14, cursor: 'pointer', fontFamily: 'DM Sans', padding: '4px 0' }}>← Back</button>
        <span style={{ color, fontFamily: 'DM Sans', fontWeight: 700, fontSize: 16, textTransform: 'capitalize' }}>{status}</span>
      </div>

      {/* Location toggles for rough/cut */}
      {status !== 'wip' && (
        <div style={{ padding: '10px 16px', display: 'flex', gap: 8 }}>
          {([
            { k: 'all', label: 'All' },
            { k: 'with_me', label: 'With me' },
            { k: 'on_approval', label: 'On approval' },
          ] as const).map(({ k, label }) => {
            const cnt = k === 'all' ? lots.length : lots.filter(l => l.location === k).length
            const ct = k === 'all'
              ? lots.reduce((a, l) => a + parseFloat(l.total_weight_ct), 0)
              : lots.filter(l => l.location === k).reduce((a, l) => a + parseFloat(l.total_weight_ct), 0)
            const active = locTab === k
            return (
              <button key={k} onClick={() => setLocTab(k)} style={{
                flex: 1, padding: '8px 4px', borderRadius: 8,
                border: `1px solid ${active ? color : C.border}`,
                background: active ? `${color}18` : 'transparent',
                color: active ? color : C.t3,
                fontFamily: 'DM Sans', fontSize: 12, fontWeight: active ? 700 : 400, cursor: 'pointer',
              }}>
                <div>{label}</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, marginTop: 2 }}>{cnt} · {numFmt(ct)} ct</div>
              </button>
            )
          })}
        </div>
      )}

      {/* Cards */}
      <div style={{ padding: '4px 16px', paddingBottom: 80 }}>
        {loading && <div style={{ color: C.t3, fontFamily: 'DM Sans', textAlign: 'center', padding: 20 }}>Loading…</div>}
        {error && <div style={{ color: '#f87171', fontFamily: 'DM Sans', textAlign: 'center', padding: 20, fontSize: 13 }}>{error}</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ color: C.t3, fontFamily: 'DM Sans', textAlign: 'center', padding: 20 }}>No lots</div>
        )}
        {status === 'wip' ? (
          Object.entries(grouped).map(([partyKey, partyLots]) => {
            const first = partyLots[0]
            return (
              <div key={partyKey}>
                <div style={{
                  background: C.bg3, borderRadius: 10, padding: '10px 12px', marginBottom: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ color: C.purple, fontFamily: 'DM Sans', fontWeight: 600, fontSize: 14 }}>{first.party_name || 'Unknown cutter'}</div>
                    {first.party_location && <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans' }}>{first.party_location}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: C.t2, fontFamily: 'JetBrains Mono', fontSize: 13 }}>{partyLots.length} lot{partyLots.length !== 1 ? 's' : ''}</div>
                    <div style={{ color: C.t3, fontFamily: 'JetBrains Mono', fontSize: 11 }}>
                      {numFmt(partyLots.reduce((a, l) => a + parseFloat(l.total_weight_ct), 0))} ct
                    </div>
                  </div>
                </div>
                {partyLots.map(lot => (
                  <LotCard key={lot.id} lot={lot} showDot={false}
                    action={
                      <button
                        onClick={e => { e.stopPropagation(); onReceiveCutter(lot.id) }}
                        style={{
                          marginTop: 8, width: '100%', padding: '8px', borderRadius: 8,
                          background: `${C.purple}20`, border: `1px solid ${C.purple}40`,
                          color: C.purple, fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                        }}
                      >Receive from cutter</button>
                    }
                  />
                ))}
              </div>
            )
          })
        ) : (
          filtered.map(lot => (
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
