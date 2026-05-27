import { useEffect, useState } from 'react'
import { gemApi } from './gemledger-api'
import type { SoldData } from './gemledger-types'
import { numFmt } from './GemLedgerCards'

const C = {
  bg2: '#111a11', border: '#1e2e1e', t1: '#e0e8e0', t2: '#c0ccc0', t3: '#8a9a8a',
  green: '#34d399', red: '#f87171',
}

interface Props {
  refreshKey: number
}

type Period = 'month' | 'last_month' | 'all'

export default function GemLedgerSold({ refreshKey }: Props) {
  const [data, setData] = useState<SoldData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('month')

  useEffect(() => {
    setLoading(true)
    gemApi.sold(period).then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [period, refreshKey])

  return (
    <div style={{ padding: '12px 16px', paddingBottom: 80 }}>
      {/* Period filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([
          ['month', 'This month'],
          ['last_month', 'Last month'],
          ['all', 'All time'],
        ] as const).map(([k, label]) => (
          <button key={k} onClick={() => setPeriod(k)} style={{
            flex: 1, padding: '8px 4px', borderRadius: 8,
            border: `1px solid ${period === k ? C.green : C.border}`,
            background: period === k ? `${C.green}18` : 'transparent',
            color: period === k ? C.green : C.t3,
            fontFamily: 'DM Sans', fontSize: 12, fontWeight: period === k ? 700 : 400, cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 24, height: 24, border: `2px solid ${C.green}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {data && (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px' }}>
              <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans', marginBottom: 4 }}>REVENUE</div>
              <div style={{ color: C.green, fontFamily: 'JetBrains Mono', fontSize: 20, fontWeight: 700 }}>{numFmt(data.revenue)}</div>
            </div>
            <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px' }}>
              <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans', marginBottom: 4 }}>PROFIT</div>
              <div style={{
                color: parseFloat(data.profit) >= 0 ? C.green : C.red,
                fontFamily: 'JetBrains Mono', fontSize: 20, fontWeight: 700,
              }}>{numFmt(data.profit)}</div>
            </div>
          </div>

          {data.items.length === 0 ? (
            <div style={{ color: C.t3, fontFamily: 'DM Sans', textAlign: 'center', padding: 24 }}>No sales for this period</div>
          ) : (
            data.items.map(lot => {
              const profit = lot.profit ? parseFloat(String(lot.profit)) : (parseFloat(lot.sale_price || '0') - parseFloat(lot.total_cost))
              return (
                <div key={lot.id} style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div>
                      <div style={{ color: C.t1, fontFamily: 'DM Sans', fontWeight: 600, fontSize: 14 }}>{lot.name}</div>
                      <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans' }}>
                        {lot.sold_at ? new Date(lot.sold_at).toLocaleDateString() : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: C.green, fontFamily: 'JetBrains Mono', fontSize: 15, fontWeight: 700 }}>{numFmt(lot.sale_price || '0')}</div>
                      <div style={{ color: profit >= 0 ? C.green : C.red, fontFamily: 'JetBrains Mono', fontSize: 12 }}>
                        {profit >= 0 ? '+' : ''}{numFmt(profit)}
                      </div>
                    </div>
                  </div>
                  <div style={{ color: C.t3, fontSize: 11, fontFamily: 'JetBrains Mono' }}>
                    {lot.stone_count} stone{lot.stone_count !== 1 ? 's' : ''} · {lot.total_weight_ct} ct · {lot.stone_type_name}
                  </div>
                </div>
              )
            })
          )}
        </>
      )}
    </div>
  )
}
