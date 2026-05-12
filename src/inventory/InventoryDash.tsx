import { useState } from 'react'
import { inv } from './api'

const INV = '#E86B3A'
const GRN = '#5DCAA5'
const RED = '#D85A30'
const AMB = '#D4A843'

function HeatmapCell({ cell, onClick }: { cell: any; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      className="heatmap-cell"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: cell.color,
        borderRadius: 3,
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
          background: '#212120',
          border: '1px solid rgba(255,255,255,.06)',
          color: '#e8e7e0',
          fontSize: 10,
          padding: '6px 10px',
          borderRadius: 6,
          whiteSpace: 'nowrap',
          zIndex: 10,
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,.4)',
        }}>
          <div style={{ fontWeight: 500 }}>{cell.name}</div>
          <div style={{ color: '#c4c3bc', marginTop: 1, fontFamily: "'DM Mono', monospace", fontSize: 8 }}>
            {cell.current_qty} of {cell.reorder_level} {cell.unit}
          </div>
        </div>
      )}
    </div>
  )
}

function getNext7Days(): string[] {
  const days: string[] = []
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

function parseDayCell(dateStr: string, todayIso: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const isToday = dateStr === todayIso
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return {
    dayLabel: isToday ? 'Today' : dayNames[d.getDay()],
    dateNum: d.getDate(),
    isToday,
  }
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function InventoryDash({
  data,
  onProduct,
  onDraftPO,
  onMismatch,
  onWastage,
  onPOs,
}: {
  data: any
  onProduct: (id: string) => void
  onDraftPO: (productId?: string) => void
  onMismatch: () => void
  onWastage: () => void
  onPOs: () => void
}) {
  const [expiryTab, setExpiryTab] = useState<'date' | 'next7' | 'expired'>('date')
  const [selectedDay, setSelectedDay] = useState<string>(todayStr())
  const [expiredLoading, setExpiredLoading] = useState<Record<string, boolean>>({})

  const {
    heatmap = {},
    low_stock = [],
    expiry = {},
    wastage_week = 0,
    mismatch_count = 0,
    draft_po_count = 0,
  } = data || {}

  const cells: any[] = heatmap.cells || []
  const healthyCount: number = heatmap.healthy_count ?? 0
  const lowCount: number = heatmap.low_count ?? 0

  const expiryByDate: Record<string, any[]> = expiry.by_date || {}
  const allExpiring: any[] = expiry.all_expiring || []
  const expired: any[] = expiry.expired || []
  const expiringCount: number = heatmap.expiring_count ?? allExpiring.length

  const next7Days = getNext7Days()
  const today = todayStr()

  async function handleExpiredWastage(item: any) {
    const key = item.batch_id
    setExpiredLoading(prev => ({ ...prev, [key]: true }))
    try {
      await inv.logWastage({
        product_id: item.product_id,
        qty: item.qty,
        reason: 'expired',
        batch_id: item.batch_id,
        logged_date: today,
      })
    } catch (e: any) {
      alert(e.message || 'Error logging wastage')
    } finally {
      setExpiredLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  async function handleExpiredUsed(item: any) {
    const key = item.batch_id + '_used'
    setExpiredLoading(prev => ({ ...prev, [key]: true }))
    try {
      await inv.entry({
        type: 'adjustment',
        product_id: item.product_id,
        qty: -Math.abs(item.qty),
        reason: 'used',
        date: today,
        notes: 'Expired stock marked as used',
      })
    } catch (e: any) {
      alert(e.message || 'Error marking as used')
    } finally {
      setExpiredLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  return (
    <div style={{ padding: '0 16px 100px' }}>

      {/* ── Heatmap card ── */}
      <div style={{ marginTop: 12, background: '#1a1a18', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, position: 'relative' }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: '#e8e7e0' }}>Stock Health</span>
          <div style={{ position: 'absolute', right: 0, display: 'flex', gap: 1 }}>
            {['#D85A30', '#D4A843', '#7daa6b', '#5DCAA5', '#2a8a6a'].map(c => (
              <div key={c} style={{ width: 10, height: 8, background: c, borderRadius: 2 }} />
            ))}
          </div>
        </div>

        {cells.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ color: '#9c9b95', fontSize: 13, marginBottom: 10 }}>No products with reorder levels set</div>
            <button
              onClick={() => onProduct('')}
              style={{ background: 'none', border: 'none', color: INV, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              Set up reorder levels →
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, 1fr)', gap: 3, marginBottom: 14 }}>
            {cells.map((cell: any) => (
              <HeatmapCell key={cell.product_id} cell={cell} onClick={() => onProduct(cell.product_id)} />
            ))}
          </div>
        )}

        {/* Summary strip — Healthy / Low / Expiring */}
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: 1, background: '#212120', borderRadius: 6, padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ color: GRN, fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 600, lineHeight: 1 }}>{healthyCount}</div>
            <div style={{ color: '#c4c3bc', fontFamily: "'DM Mono', monospace", fontSize: 8, marginTop: 4 }}>Healthy</div>
          </div>
          <div style={{ flex: 1, background: '#212120', borderRadius: 6, padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ color: RED, fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 600, lineHeight: 1 }}>{lowCount}</div>
            <div style={{ color: '#c4c3bc', fontFamily: "'DM Mono', monospace", fontSize: 8, marginTop: 4 }}>Low</div>
          </div>
          <div style={{ flex: 1, background: '#212120', borderRadius: 6, padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ color: AMB, fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 600, lineHeight: 1 }}>{expiringCount}</div>
            <div style={{ color: '#c4c3bc', fontFamily: "'DM Mono', monospace", fontSize: 8, marginTop: 4 }}>Expiring</div>
          </div>
        </div>
      </div>

      {/* ── Low Stock section ── */}
      <div style={{ marginTop: 14, textAlign: 'center', color: '#e8e7e0', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600 }}>
        Low Stock
      </div>
      <div style={{ marginTop: 6, background: '#1a1a18', borderRadius: 10, border: '1px solid rgba(255,255,255,.06)', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 8, bottom: 8, left: 0, width: 3, borderRadius: '0 2px 2px 0', background: RED }} />
        <div style={{ padding: '4px 14px 4px 18px' }}>
          {low_stock.length === 0 ? (
            <div style={{ color: '#9c9b95', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>All items in range</div>
          ) : (
            low_stock.slice(0, 6).map((item: any) => {
              const ratio = item.current_qty / Math.max(item.reorder_level, 0.001)
              const pct = Math.min(ratio * 100, 100)
              const deficit = Math.max(0, item.reorder_level - item.current_qty)
              return (
                <div key={item.product_id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                    <button
                      onClick={() => onProduct(item.product_id)}
                      style={{ background: 'none', border: 'none', color: '#e8e7e0', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', padding: 0, textAlign: 'left' }}
                    >
                      {item.name}
                    </button>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ color: RED, fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 500 }}>
                        {item.current_qty} {item.unit}
                      </span>
                      <span style={{ color: '#9c9b95', fontFamily: "'DM Mono', monospace", fontSize: 9 }}>of</span>
                      <span style={{ color: '#c4c3bc', fontFamily: "'DM Mono', monospace", fontSize: 11 }}>
                        {item.reorder_level} {item.unit}
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 5, background: 'rgba(255,255,255,.08)', borderRadius: 3, position: 'relative' }}>
                    <div style={{ width: pct + '%', height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #D85A30, #e8704a)' }} />
                    <div style={{ position: 'absolute', top: -3, left: '100%', transform: 'translateX(-1px)', width: 2, height: 11, background: '#c4c3bc', borderRadius: 1, opacity: 0.6 }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#c4c3bc' }}>
                      Need <strong style={{ color: RED, fontWeight: 500 }}>{deficit} {item.unit}</strong>
                    </span>
                    <button
                      onClick={() => onDraftPO(item.product_id)}
                      style={{ background: 'none', border: 'none', color: INV, fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 500, cursor: 'pointer', padding: 0 }}
                    >
                      Draft PO →
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Expiry section ── */}
      <div style={{ marginTop: 14, textAlign: 'center', color: '#e8e7e0', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600 }}>
        Expiry
      </div>
      <div style={{ marginTop: 6, background: '#1a1a18', borderRadius: 10, border: '1px solid rgba(255,255,255,.06)', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 8, bottom: 8, left: 0, width: 3, borderRadius: '0 2px 2px 0', background: AMB }} />
        <div style={{ padding: '12px 14px 14px 18px' }}>

          {/* Expiry tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
            {([['date', 'By Date'], ['next7', 'Next 7 Days'], ['expired', 'Expired']] as const).map(([t, label]) => {
              const active = expiryTab === t
              return (
                <button
                  key={t}
                  onClick={() => setExpiryTab(t)}
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '5px 12px',
                    borderRadius: 20,
                    border: active ? '1px solid rgba(212,168,67,0.2)' : '1px solid transparent',
                    background: active ? 'rgba(212,168,67,0.1)' : 'transparent',
                    color: active ? AMB : '#9c9b95',
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* By Date */}
          {expiryTab === 'date' && (
            <>
              <div style={{ display: 'flex', gap: 5, overflowX: 'auto', marginBottom: 10, scrollbarWidth: 'none' as const }}>
                {next7Days.map(dateStr => {
                  const { dayLabel, dateNum, isToday } = parseDayCell(dateStr, today)
                  const items = expiryByDate[dateStr] || []
                  const hasItems = items.length > 0
                  const isSel = selectedDay === dateStr
                  return (
                    <div
                      key={dateStr}
                      onClick={() => setSelectedDay(dateStr)}
                      style={{
                        minWidth: 48,
                        flexShrink: 0,
                        borderRadius: 6,
                        padding: '7px 4px 6px',
                        textAlign: 'center' as const,
                        cursor: 'pointer',
                        border: isToday ? '1px solid #E86B3A' : isSel ? '1px solid #D4A843' : '1px solid rgba(255,255,255,.06)',
                        background: isToday ? 'rgba(232,107,58,0.06)' : isSel ? 'rgba(212,168,67,0.05)' : '#212120',
                      }}
                    >
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#9c9b95', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 1 }}>
                        {dayLabel}
                      </div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, fontWeight: 500, color: isToday ? INV : '#e8e7e0' }}>
                        {dateNum}
                      </div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: hasItems ? AMB : '#c4c3bc', marginTop: 2 }}>
                        {hasItems ? items.length + (items.length > 1 ? ' items' : ' item') : '—'}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div>
                {(expiryByDate[selectedDay] || []).length === 0 ? (
                  <div style={{ color: '#9c9b95', fontSize: 12, padding: '4px 0' }}>No items expiring on this date</div>
                ) : (
                  (expiryByDate[selectedDay] || []).map((item: any) => (
                    <div key={item.batch_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.05)', minHeight: 38 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: selectedDay === today ? RED : AMB, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#e8e7e0' }}>{item.product_name}</span>
                      </div>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#c4c3bc' }}>{item.qty} {item.unit}</span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* Next 7 Days */}
          {expiryTab === 'next7' && (
            <div>
              {allExpiring.length === 0 ? (
                <div style={{ color: '#9c9b95', fontSize: 12, padding: '4px 0' }}>No expiring items in the next 7 days</div>
              ) : (
                allExpiring.map((item: any) => (
                  <div key={item.batch_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.05)', minHeight: 38 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: item.expiry_date === today ? RED : AMB, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#e8e7e0' }}>{item.product_name}</span>
                    </div>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#c4c3bc' }}>
                      {item.qty} {item.unit} · {item.day_label || item.expiry_date}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Expired */}
          {expiryTab === 'expired' && (
            <div>
              {expired.length === 0 ? (
                <div style={{ color: '#9c9b95', fontSize: 12, padding: '4px 0' }}>No expired stock</div>
              ) : (
                expired.map((item: any) => (
                  <div key={item.batch_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.05)', minHeight: 38 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: RED, boxShadow: '0 0 4px rgba(216,90,48,0.3)', flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#e8e7e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#c4c3bc' }}>
                          {item.qty} {item.unit} · expired {item.expiry_date}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0, marginLeft: 8 }}>
                      <button
                        onClick={() => handleExpiredWastage(item)}
                        disabled={!!expiredLoading[item.batch_id]}
                        style={{
                          fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 500,
                          padding: '5px 9px', borderRadius: 4,
                          border: '1px solid rgba(216,90,48,0.2)',
                          background: '#2a2a28', color: RED,
                          cursor: 'pointer', minHeight: 28,
                          opacity: expiredLoading[item.batch_id] ? 0.5 : 1,
                        }}
                      >
                        Wastage
                      </button>
                      <button
                        onClick={() => handleExpiredUsed(item)}
                        disabled={!!expiredLoading[item.batch_id + '_used']}
                        style={{
                          fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 500,
                          padding: '5px 9px', borderRadius: 4,
                          border: '1px solid rgba(232,107,58,0.2)',
                          background: '#2a2a28', color: INV,
                          cursor: 'pointer', minHeight: 28,
                          opacity: expiredLoading[item.batch_id + '_used'] ? 0.5 : 1,
                        }}
                      >
                        Used
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom 3-box row ── */}
      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <button
          onClick={onWastage}
          style={{ flex: 1, background: '#1a1a18', borderRadius: 10, padding: '14px 10px', textAlign: 'center', border: '1px solid rgba(255,255,255,.06)', cursor: 'pointer' }}
        >
          <div style={{ color: '#c4c3bc', fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Wastage</div>
          <div style={{ color: RED, fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 500, lineHeight: 1 }}>
            {wastage_week > 0 ? (wastage_week >= 1000 ? (wastage_week / 1000).toFixed(1) + 'K' : String(wastage_week)) : '—'}
          </div>
          <div style={{ color: '#9c9b95', fontFamily: "'DM Mono', monospace", fontSize: 8, marginTop: 3 }}>LKR this week</div>
        </button>
        <button
          onClick={onMismatch}
          style={{ flex: 1, background: '#1a1a18', borderRadius: 10, padding: '14px 10px', textAlign: 'center', border: '1px solid rgba(255,255,255,.06)', cursor: 'pointer' }}
        >
          <div style={{ color: '#c4c3bc', fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Mismatch</div>
          <div style={{ color: AMB, fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 500, lineHeight: 1 }}>{mismatch_count}</div>
          <div style={{ color: '#9c9b95', fontFamily: "'DM Mono', monospace", fontSize: 8, marginTop: 3 }}>items off count</div>
        </button>
        <button
          onClick={onPOs}
          style={{ flex: 1, background: '#1a1a18', borderRadius: 10, padding: '14px 10px', textAlign: 'center', border: '1px solid rgba(255,255,255,.06)', cursor: 'pointer' }}
        >
          <div style={{ color: '#c4c3bc', fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>POs</div>
          <div style={{ color: INV, fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 500, lineHeight: 1 }}>{draft_po_count}</div>
          <div style={{ color: '#9c9b95', fontFamily: "'DM Mono', monospace", fontSize: 8, marginTop: 3 }}>drafts pending</div>
        </button>
      </div>

    </div>
  )
}
