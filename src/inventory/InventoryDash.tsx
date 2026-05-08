import { useState } from 'react'

const INV = '#E86B3A'
const GRN = '#5DCAA5'
const RED = '#D85A30'
const AMB = '#D4A843'

function HeatmapCell({ cell, onClick }: { cell: any; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: cell.color,
        borderRadius: 4,
        cursor: 'pointer',
        aspectRatio: '1',
        minWidth: 0,
        position: 'relative',
        transition: 'opacity .15s',
        opacity: hover ? 0.8 : 1,
      }}
    >
      {hover && (
        <div style={{
          position: 'absolute',
          bottom: '110%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#111',
          color: '#e8e7e0',
          fontSize: 10,
          padding: '4px 6px',
          borderRadius: 6,
          whiteSpace: 'nowrap',
          zIndex: 10,
          pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,.5)',
        }}>
          <b>{cell.name}</b><br />
          {cell.current_qty} / {cell.reorder_level} {cell.unit}
        </div>
      )}
    </div>
  )
}

export default function InventoryDash({
  data,
  onProduct,
  onDraftPO,
  onMismatch,
  onNewEntry,
}: {
  data: any
  onProduct: (id: string) => void
  onDraftPO: (productId?: string) => void
  onMismatch: () => void
  onNewEntry: () => void
}) {
  const [expiryTab, setExpiryTab] = useState<'date' | 'all' | 'expired'>('date')

  const { heatmap = {}, low_stock = [], expiry = {}, wastage_week = 0, mismatch_count = 0, draft_po_count = 0 } = data || {}
  const cells = heatmap.cells || []
  const healthyCount = heatmap.healthy_count || 0
  const lowCount = heatmap.low_count || 0

  const expiryByDate = expiry.by_date || {}
  const allExpiring = expiry.all_expiring || []
  const expired = expiry.expired || []
  const expiringCount = allExpiring.length + expired.length

  return (
    <div style={{ padding: '0 0 80px' }}>
      {/* Heatmap */}
      <div style={{ margin: '12px 16px 0', background: '#1a1a18', borderRadius: 12, padding: 14, border: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#e8e7e0' }}>Stock Health</span>
          <span style={{ fontSize: 11, color: '#9c9b95' }}>tap to drill in</span>
        </div>
        {cells.length === 0 ? (
          <p style={{ color: '#9c9b95', fontSize: 13, textAlign: 'center', margin: '20px 0' }}>
            No products with reorder levels set.
          </p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(cells.length, 10)}, 1fr)`,
            gap: 4,
            marginBottom: 12,
          }}>
            {cells.map((cell: any) => (
              <HeatmapCell key={cell.product_id} cell={cell} onClick={() => onProduct(cell.product_id)} />
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: 'rgba(93,202,165,.1)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ color: GRN, fontWeight: 700, fontSize: 18 }}>{healthyCount}</div>
            <div style={{ color: '#9c9b95', fontSize: 10 }}>Healthy</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(216,90,48,.1)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ color: RED, fontWeight: 700, fontSize: 18 }}>{lowCount}</div>
            <div style={{ color: '#9c9b95', fontSize: 10 }}>Low / Critical</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(212,168,67,.1)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ color: AMB, fontWeight: 700, fontSize: 18 }}>{expiringCount}</div>
            <div style={{ color: '#9c9b95', fontSize: 10 }}>Expiring</div>
          </div>
        </div>
      </div>

      {/* Low Stock */}
      {low_stock.length > 0 && (
        <div style={{ margin: '12px 16px 0', background: '#1a1a18', borderRadius: 12, padding: 14, border: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#e8e7e0', marginBottom: 12 }}>Low Stock</div>
          {low_stock.slice(0, 6).map((item: any) => {
            const ratio = item.current_qty / Math.max(item.reorder_level, 0.001)
            const pct = Math.min(ratio * 100, 100)
            const barColor = ratio < 0.5 ? RED : AMB
            return (
              <div key={item.product_id} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <button
                    onClick={() => onProduct(item.product_id)}
                    style={{ background: 'none', border: 'none', color: '#e8e7e0', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: 0, textAlign: 'left' }}
                  >
                    {item.name}
                  </button>
                  <button
                    onClick={() => onDraftPO(item.product_id)}
                    style={{ background: 'none', border: 'none', color: INV, fontSize: 11, cursor: 'pointer', padding: 0 }}
                  >
                    Draft PO →
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 3 }} />
                  </div>
                  <span style={{ color: '#9c9b95', fontSize: 11, whiteSpace: 'nowrap' }}>
                    {item.current_qty} / {item.reorder_level} {item.unit}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Expiry */}
      {(allExpiring.length > 0 || expired.length > 0) && (
        <div style={{ margin: '12px 16px 0', background: '#1a1a18', borderRadius: 12, padding: 14, border: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#e8e7e0', marginBottom: 10 }}>Expiry Tracker</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {(['date', 'all', 'expired'] as const).map(t => (
              <button
                key={t}
                onClick={() => setExpiryTab(t)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 20,
                  border: 'none',
                  fontSize: 11,
                  cursor: 'pointer',
                  background: expiryTab === t ? INV : 'rgba(255,255,255,.06)',
                  color: expiryTab === t ? '#fff' : '#9c9b95',
                  fontWeight: expiryTab === t ? 600 : 400,
                }}
              >
                {t === 'date' ? 'By Date' : t === 'all' ? 'Next 7 Days' : 'Expired'}
              </button>
            ))}
          </div>

          {expiryTab === 'date' && Object.entries(expiryByDate).map(([date, items]: [string, any]) => (
            <div key={date} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: AMB, fontWeight: 600, marginBottom: 4 }}>{date}</div>
              {(items as any[]).map((item: any) => (
                <div key={item.batch_id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ color: '#c4c3bc', fontSize: 12 }}>{item.product_name}</span>
                  <span style={{ color: '#9c9b95', fontSize: 12 }}>{item.qty} {item.unit}</span>
                </div>
              ))}
            </div>
          ))}

          {expiryTab === 'all' && allExpiring.map((item: any) => (
            <div key={item.batch_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
              <span style={{ color: '#c4c3bc', fontSize: 12 }}>{item.product_name}</span>
              <span style={{ color: AMB, fontSize: 11 }}>{item.expiry_date}</span>
            </div>
          ))}

          {expiryTab === 'expired' && (expired.length === 0
            ? <p style={{ color: '#9c9b95', fontSize: 12 }}>No expired stock.</p>
            : expired.map((item: any) => (
              <div key={item.batch_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                <span style={{ color: RED, fontSize: 12 }}>{item.product_name}</span>
                <span style={{ color: '#9c9b95', fontSize: 11 }}>{item.qty} {item.unit} · expired {item.expiry_date}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Bottom stat boxes */}
      <div style={{ margin: '12px 16px 0', display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, background: '#1a1a18', borderRadius: 10, padding: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,.07)', cursor: 'pointer' }}>
          <div style={{ color: RED, fontWeight: 700, fontSize: 16 }}>
            {wastage_week > 0 ? `LKR ${wastage_week.toLocaleString('en', { maximumFractionDigits: 0 })}` : '—'}
          </div>
          <div style={{ color: '#9c9b95', fontSize: 10, marginTop: 2 }}>Wastage (7d)</div>
        </div>
        <div
          onClick={onMismatch}
          style={{ flex: 1, background: '#1a1a18', borderRadius: 10, padding: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,.07)', cursor: 'pointer' }}
        >
          <div style={{ color: mismatch_count > 0 ? AMB : GRN, fontWeight: 700, fontSize: 16 }}>{mismatch_count}</div>
          <div style={{ color: '#9c9b95', fontSize: 10, marginTop: 2 }}>Mismatches</div>
        </div>
        <div style={{ flex: 1, background: '#1a1a18', borderRadius: 10, padding: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ color: INV, fontWeight: 700, fontSize: 16 }}>{draft_po_count}</div>
          <div style={{ color: '#9c9b95', fontSize: 10, marginTop: 2 }}>Draft POs</div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={onNewEntry}
        style={{
          position: 'fixed',
          bottom: 76,
          right: 24,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: `linear-gradient(145deg, #EE7844, #B84D22)`,
          border: 'none',
          color: '#fff',
          fontSize: 24,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(232,107,58,.4)',
          zIndex: 50,
        }}
      >+</button>
    </div>
  )
}
