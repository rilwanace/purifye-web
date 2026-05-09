const RED = '#D85A30'
const GRN = '#5DCAA5'
const INV = '#E86B3A'

export default function MismatchView({ data, onBack: _onBack, onNewCount }: { data: any; onBack: () => void; onNewCount?: () => void }) {
  const mismatches = data?.mismatches || []
  const summary = data?.summary || {}

  return (
    <div style={{ padding: '0 16px 100px' }}>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {[
          { label: 'Items Off', value: mismatches.length, color: mismatches.length > 0 ? RED : GRN },
          { label: 'LKR Gap', value: summary.value_gap ? 'LKR ' + Math.abs(summary.value_gap).toLocaleString('en', { maximumFractionDigits: 0 }) : '—', color: RED },
          { label: 'Last Count', value: summary.last_count_date || '—', color: '#e8e7e0' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: '#1a1a18', borderRadius: 10, padding: '10px 6px', textAlign: 'center', border: '1px solid rgba(255,255,255,.07)' }}>
            <div style={{ color: s.color, fontWeight: 700, fontSize: 13 }}>{s.value}</div>
            <div style={{ color: '#9c9b95', fontSize: 9 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {mismatches.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 60 }}>
          <div style={{ fontSize: 40 }}>✓</div>
          <div style={{ color: GRN, fontWeight: 600, fontSize: 16, marginTop: 8 }}>All balanced</div>
          <div style={{ color: '#9c9b95', fontSize: 13, marginTop: 4 }}>No mismatches found from recent counts.</div>
        </div>
      ) : (
        <div style={{ background: '#1a1a18', borderRadius: 10, padding: '12px 14px', marginTop: 10, border: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ color: '#e8e7e0', fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Variance Detail</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '6px 8px', fontSize: 11 }}>
            <div style={{ color: '#9c9b95' }}>Product</div>
            <div style={{ color: '#9c9b95', textAlign: 'right' }}>System</div>
            <div style={{ color: '#9c9b95', textAlign: 'right' }}>Counted</div>
            <div style={{ color: '#9c9b95', textAlign: 'right' }}>Diff</div>
            {mismatches.map((m: any) => (
              <>
                <div key={'n-' + m.product_id} style={{ color: '#c4c3bc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.product_name}</div>
                <div key={'s-' + m.product_id} style={{ color: '#e8e7e0', textAlign: 'right', fontFamily: "'DM Mono', monospace" }}>{m.system_qty}</div>
                <div key={'c-' + m.product_id} style={{ color: '#e8e7e0', textAlign: 'right', fontFamily: "'DM Mono', monospace" }}>{m.counted_qty}</div>
                <div key={'d-' + m.product_id} style={{ color: m.diff > 0 ? GRN : RED, textAlign: 'right', fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                  {m.diff > 0 ? '+' : ''}{m.diff}
                </div>
              </>
            ))}
          </div>
        </div>
      )}

      {onNewCount && (
        <div style={{ marginTop: 20 }}>
          <button
            onClick={onNewCount}
            style={{
              width: '100%', padding: 14,
              background: 'linear-gradient(135deg, #EE7844, #B84D22)',
              border: 'none', borderRadius: 10,
              color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >
            Start New Count
          </button>
        </div>
      )}
    </div>
  )
}
