import { } from 'react'

const INV = '#E86B3A'
const RED = '#D85A30'

const REASON_COLORS: Record<string, string> = {
  expired: '#8B3A3A',
  damaged: '#5A4A8B',
  spoiled: '#3A7A5A',
  theft: '#7A3A5A',
  other: '#4A4A4A',
}

export default function WastageView({
  wastage,
  onBack: _onBack,
}: {
  wastage: any[]
  onBack: () => void
}) {
  const totalValue = (wastage || []).reduce((sum, w) => sum + (w.total_value || 0), 0)
  const totalItems = wastage?.length || 0
  const totalUnits = (wastage || []).reduce((sum, w) => sum + (w.qty || 0), 0)

  const byReason: Record<string, number> = {}
  ;(wastage || []).forEach(w => {
    const r = (w.reason || 'other').toLowerCase()
    byReason[r] = (byReason[r] || 0) + (w.total_value || 0)
  })
  const maxVal = Math.max(...Object.values(byReason), 1)

  return (
    <div style={{ padding: '0 16px 80px' }}>
      {/* Summary */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {[
          { label: 'LKR Total', value: `LKR ${totalValue.toLocaleString('en', { maximumFractionDigits: 0 })}`, color: RED },
          { label: 'Items', value: String(totalItems), color: '#e8e7e0' },
          { label: 'Units Lost', value: totalUnits.toFixed(1), color: '#e8e7e0' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: '#1a1a18', borderRadius: 10, padding: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,.07)' }}>
            <div style={{ color: s.color, fontWeight: 700, fontSize: 14 }}>{s.value}</div>
            <div style={{ color: '#9c9b95', fontSize: 10 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Reason breakdown */}
      {Object.entries(byReason).length > 0 && (
        <div style={{ background: '#1a1a18', borderRadius: 10, padding: '12px 14px', marginTop: 10, border: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ color: '#e8e7e0', fontWeight: 600, fontSize: 13, marginBottom: 10 }}>By Reason</div>
          {Object.entries(byReason).map(([reason, val]) => (
            <div key={reason} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ color: '#c4c3bc', fontSize: 12, textTransform: 'capitalize' }}>{reason}</span>
                <span style={{ color: '#9c9b95', fontSize: 12, fontFamily: 'var(--font-mono)' }}>LKR {val.toLocaleString('en', { maximumFractionDigits: 0 })}</span>
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,.06)', borderRadius: 3 }}>
                <div style={{
                  height: '100%',
                  width: `${(val / maxVal) * 100}%`,
                  background: REASON_COLORS[reason] || INV,
                  borderRadius: 3,
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Items list */}
      <div style={{ background: '#1a1a18', borderRadius: 10, padding: '12px 14px', marginTop: 10, border: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ color: '#e8e7e0', fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Wastage Log</div>
        {(wastage || []).length === 0 && (
          <p style={{ color: '#9c9b95', fontSize: 13 }}>No wastage recorded.</p>
        )}
        {(wastage || []).map((w: any, i: number) => {
          const reason = (w.reason || 'other').toLowerCase()
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: i < wastage.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none', marginBottom: i < wastage.length - 1 ? 10 : 0 }}>
              <div style={{
                background: REASON_COLORS[reason] || '#333',
                borderRadius: 4,
                padding: '2px 6px',
                fontSize: 9,
                fontWeight: 700,
                color: '#e8e7e0',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-mono)',
                flexShrink: 0,
              }}>
                {reason}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#e8e7e0', fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {w.product_name}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ color: RED, fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                  {w.qty} {w.unit}
                </div>
                <div style={{ color: '#9c9b95', fontSize: 10 }}>{w.wastage_date}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
