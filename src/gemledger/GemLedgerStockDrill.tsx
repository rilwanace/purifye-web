import { useEffect, useState } from 'react'
import { gemApi } from './gemledger-api'
import type { Lot } from './gemledger-types'
import { LotCard, fmtCt } from './GemLedgerCards'

const C = {
  bg3: '#1a2a1a', border: '#1e2e1e', t1: '#e0e8e0', t2: '#c0ccc0', t3: '#8a9a8a',
  green: '#34d399', yellow: '#fbbf24', purple: '#a78bfa',
}

const STATUS_COLOR: Record<string, string> = { rough: C.yellow, cut: C.green, wip: C.purple }

const JOB_TYPES = ['cutting', 'heating', 'polishing', 'preform'] as const
type JobType = typeof JOB_TYPES[number]
const JOB_TYPE_LABELS: Record<JobType, string> = {
  cutting: 'Cutting',
  heating: 'Heating',
  polishing: 'Polishing',
  preform: 'Preform',
}

interface Props {
  status: 'rough' | 'cut' | 'wip'
  onBack: () => void
  onLot: (id: string) => void
  onTransfer: (lot: Lot) => void
}

export default function GemLedgerStockDrill({ status, onBack, onLot, onTransfer }: Props) {
  const [lots, setLots] = useState<Lot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [locTab, setLocTab] = useState<'all' | 'with_me' | 'on_approval'>('all')
  const [jobTab, setJobTab] = useState<JobType>('cutting')

  useEffect(() => {
    setLoading(true)
    setError(null)
    gemApi.lots({ status, page_size: 200 })
      .then(r => {
        setLots(r.items)
        if (status === 'wip') {
          const first = JOB_TYPES.find(jt => r.items.some(l => (l.job_type || 'cutting') === jt))
          if (first) setJobTab(first)
        }
      })
      .catch((err: any) => { setError(err?.message || 'Failed to load lots') })
      .finally(() => setLoading(false))
  }, [status])

  const color = STATUS_COLOR[status]

  const availableJobTabs = JOB_TYPES.filter(jt => lots.some(l => (l.job_type || 'cutting') === jt))
  const activeJobTab = availableJobTabs.includes(jobTab) ? jobTab : (availableJobTabs[0] ?? 'cutting')

  const wipFiltered = status === 'wip' ? lots.filter(l => (l.job_type || 'cutting') === activeJobTab) : []
  const grouped: Record<string, Lot[]> = {}
  wipFiltered.forEach(l => {
    const key = l.location_party_id || 'unknown'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(l)
  })

  const filtered = status === 'wip' ? lots : lots.filter(l =>
    locTab === 'all' ? true : l.location === locTab
  )

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
        borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: '#0a0f0a', zIndex: 10,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color, fontSize: 14, cursor: 'pointer', fontFamily: 'DM Sans', padding: '4px 0' }}>← Back</button>
        <span style={{ color, fontFamily: 'DM Sans', fontWeight: 700, fontSize: 16, textTransform: 'capitalize' }}>{status}</span>
      </div>

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
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, marginTop: 2 }}>{cnt} · {fmtCt(ct)} ct</div>
              </button>
            )
          })}
        </div>
      )}

      {status === 'wip' && availableJobTabs.length > 0 && (
        <div style={{ padding: '10px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {availableJobTabs.map(jt => {
            const cnt = lots.filter(l => (l.job_type || 'cutting') === jt).length
            const ct = lots.filter(l => (l.job_type || 'cutting') === jt)
              .reduce((a, l) => a + parseFloat(l.total_weight_ct), 0)
            const active = activeJobTab === jt
            return (
              <button key={jt} onClick={() => setJobTab(jt)} style={{
                flex: 1, minWidth: 80, padding: '8px 10px', borderRadius: 20,
                border: `1px solid ${active ? C.purple : `${C.purple}40`}`,
                background: active ? `${C.purple}28` : 'transparent',
                color: active ? C.purple : `${C.purple}99`,
                fontFamily: 'DM Sans', fontSize: 12, fontWeight: active ? 700 : 400, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              }}>
                <span>{JOB_TYPE_LABELS[jt]}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: active ? C.purple : C.t3 }}>
                  {cnt} · {fmtCt(ct)} ct
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div style={{ padding: '4px 16px', paddingBottom: 80 }}>
        {loading && <div style={{ color: C.t3, fontFamily: 'DM Sans', textAlign: 'center', padding: 20 }}>Loading…</div>}
        {error && <div style={{ color: '#f87171', fontFamily: 'DM Sans', textAlign: 'center', padding: 20, fontSize: 13 }}>{error}</div>}
        {!loading && !error && status === 'wip' && wipFiltered.length === 0 && (
          <div style={{ color: C.t3, fontFamily: 'DM Sans', textAlign: 'center', padding: 20 }}>No lots</div>
        )}
        {!loading && !error && status !== 'wip' && filtered.length === 0 && (
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
                    <div style={{ color: C.purple, fontFamily: 'DM Sans', fontWeight: 600, fontSize: 14 }}>{first.party_name || 'Unknown'}</div>
                    {first.party_location && <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans' }}>{first.party_location}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: C.t2, fontFamily: 'JetBrains Mono', fontSize: 13 }}>{partyLots.length} lot{partyLots.length !== 1 ? 's' : ''}</div>
                    <div style={{ color: C.t3, fontFamily: 'JetBrains Mono', fontSize: 11 }}>
                      {fmtCt(partyLots.reduce((a, l) => a + parseFloat(l.total_weight_ct), 0))} ct
                    </div>
                  </div>
                </div>
                {partyLots.map(lot => (
                  <LotCard key={lot.id} lot={lot} showDot={false}
                    action={
                      <button
                        onClick={e => { e.stopPropagation(); onTransfer(lot) }}
                        style={{
                          marginTop: 8, width: '100%', padding: '10px', borderRadius: 8,
                          background: `${C.purple}20`, border: `1px solid ${C.purple}40`,
                          color: C.purple, fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                          minHeight: 44,
                        }}
                      >Transfer</button>
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
