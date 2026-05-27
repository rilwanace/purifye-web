import type { Lot } from './gemledger-types'

const C = {
  bg2: '#111a11', border: '#1e2e1e', border2: '#162016',
  t1: '#e0e8e0', t2: '#c0ccc0', t3: '#8a9a8a',
  green: '#34d399', yellow: '#fbbf24', purple: '#a78bfa',
}

export function numFmt(v: string | number) {
  return parseFloat(String(v)).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function LotCard({
  lot,
  onTap,
  showDot = true,
  showApprovalBadge = false,
  action,
}: {
  lot: Lot
  onTap?: () => void
  showDot?: boolean
  showApprovalBadge?: boolean
  action?: React.ReactNode
}) {
  const dot = lot.location === 'with_me' ? C.green : lot.location === 'on_approval' ? C.yellow : C.purple
  const badges = [lot.origin, lot.shape, lot.treatment].filter(Boolean)

  return (
    <div
      onClick={onTap}
      style={{
        background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12,
        padding: '12px 14px', marginBottom: 8,
        cursor: onTap ? 'pointer' : 'default',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Line 1: Name + dot */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: C.t1, fontSize: 14, fontFamily: 'DM Sans', fontWeight: 600, minWidth: 0, flex: 1 }}>{lot.name}</span>
        {showDot && (
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, marginLeft: 8, flexShrink: 0 }} />
        )}
      </div>

      {/* Line 2: Weight + stone count aligned */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 16, marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, minWidth: 80, justifyContent: 'flex-end' }}>
          <span style={{ color: C.t1, fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 600 }}>{numFmt(lot.total_weight_ct)}</span>
          <span style={{ color: C.t3, fontSize: 10 }}>ct</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, minWidth: 60, justifyContent: 'flex-end' }}>
          <span style={{ color: C.t1, fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 600 }}>{lot.stone_count}</span>
          <span style={{ color: C.t3, fontSize: 10 }}>stone{lot.stone_count !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Line 3: origin · shape · treatment */}
      {badges.length > 0 && (
        <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans', marginBottom: 4 }}>
          {badges.join(' · ')}
        </div>
      )}

      {/* Line 4: approval info */}
      {showApprovalBadge && lot.party_name && (
        <div style={{ color: C.yellow, fontSize: 11, fontFamily: 'DM Sans' }}>
          {lot.party_name}{lot.days_out !== undefined ? ` · ${lot.days_out}d` : ''}
        </div>
      )}

      {/* Action slot (e.g. receive from cutter button) */}
      {action}
    </div>
  )
}
