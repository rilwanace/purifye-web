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
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('month')
  const [actionKey, setActionKey] = useState(0)
  const [menuLotId, setMenuLotId] = useState<string | null>(null)
  const [editSaleLot, setEditSaleLot] = useState<{id: string; price: string} | null>(null)
  const [editSalePrice, setEditSalePrice] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(null)
    gemApi.sold(period).then(setData).catch((err: any) => { setError(err?.message || 'Failed to load sales') }).finally(() => setLoading(false))
  }, [period, refreshKey, actionKey])

  async function saveSaleEdit() {
    if (!editSaleLot) return
    setSavingEdit(true)
    try {
      await gemApi.editSale(editSaleLot.id, { sale_price: parseFloat(editSalePrice) })
      setEditSaleLot(null)
      setActionKey(k => k + 1)
    } catch (e: any) { setError(e?.message || 'Failed to update sale') }
    finally { setSavingEdit(false) }
  }

  async function doUndoSale() {
    if (!deleteConfirmId) return
    setDeleting(true)
    try {
      await gemApi.undoSale(deleteConfirmId)
      setDeleteConfirmId(null)
      setActionKey(k => k + 1)
    } catch (e: any) { setError(e?.message || 'Failed to delete sale') }
    finally { setDeleting(false) }
  }

  return (
    <>
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

      {error && <div style={{ color: '#f87171', fontFamily: 'DM Sans', textAlign: 'center', padding: 20, fontSize: 13 }}>{error}</div>}

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
                <div key={lot.id} style={{ position: 'relative', background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}
                  onClick={() => menuLotId === lot.id && setMenuLotId(null)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: C.t1, fontFamily: 'DM Sans', fontWeight: 600, fontSize: 14 }}>{lot.name}</div>
                      <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans' }}>
                        {lot.sold_at ? new Date(lot.sold_at).toLocaleDateString() : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: C.green, fontFamily: 'JetBrains Mono', fontSize: 15, fontWeight: 700 }}>{numFmt(lot.sale_price || '0')}</div>
                        <div style={{ color: profit >= 0 ? C.green : C.red, fontFamily: 'JetBrains Mono', fontSize: 12 }}>
                          {profit >= 0 ? '+' : ''}{numFmt(profit)}
                        </div>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={e => { e.stopPropagation(); setMenuLotId(menuLotId === lot.id ? null : lot.id) }}
                          style={{ minWidth: 44, minHeight: 44, background: 'none', border: 'none', cursor: 'pointer', color: '#c0ccc0', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                          aria-label="Actions">&#8943;</button>
                        {menuLotId === lot.id && (
                          <div style={{ position: 'absolute', right: 0, top: 44, background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', zIndex: 10, minWidth: 160, boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
                            <button onClick={() => { setEditSaleLot({ id: lot.id, price: lot.sale_price || '0' }); setEditSalePrice(lot.sale_price || '0'); setMenuLotId(null) }}
                              style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'none', border: 'none', color: C.t1, fontFamily: 'DM Sans', fontSize: 14, cursor: 'pointer', textAlign: 'left' }}>
                              Edit sale price
                            </button>
                            <button onClick={() => { setDeleteConfirmId(lot.id); setMenuLotId(null) }}
                              style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'none', border: 'none', color: C.red, fontFamily: 'DM Sans', fontSize: 14, cursor: 'pointer', textAlign: 'left' }}>
                              Delete sale
                            </button>
                          </div>
                        )}
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

    {editSaleLot && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 430, background: C.bg2, borderRadius: '16px 16px 0 0', border: `1px solid ${C.border}`, padding: 24 }}>
          <div style={{ color: C.t1, fontFamily: 'DM Sans', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Edit sale price</div>
          <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans', marginBottom: 4 }}>SALE PRICE</div>
          <input type="number" value={editSalePrice}
            onChange={e => setEditSalePrice(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', background: '#1a2a1a', border: `1px solid ${C.border}`, borderRadius: 8, color: C.t1, fontSize: 14, padding: '8px 10px', fontFamily: 'JetBrains Mono', marginBottom: 20 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setEditSaleLot(null)} style={{ flex: 1, padding: '12px', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.t2, fontFamily: 'DM Sans', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            <button onClick={saveSaleEdit} disabled={savingEdit} style={{ flex: 1, padding: '12px', borderRadius: 10, background: savingEdit ? '#2a4a3a' : C.green, border: 'none', color: '#0a0f0a', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{savingEdit ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    )}

    {deleteConfirmId && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 360, background: C.bg2, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 }}>
          <div style={{ color: C.t1, fontFamily: 'DM Sans', fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Delete this sale?</div>
          <div style={{ color: C.t3, fontFamily: 'DM Sans', fontSize: 13, marginBottom: 20 }}>The lot will return to your inventory.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setDeleteConfirmId(null)} style={{ flex: 1, padding: '12px', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.t2, fontFamily: 'DM Sans', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            <button onClick={doUndoSale} disabled={deleting} style={{ flex: 1, padding: '12px', borderRadius: 10, background: deleting ? '#2a1a1a' : C.red, border: 'none', color: 'white', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{deleting ? 'Deleting…' : 'Delete'}</button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}