import { useEffect, useRef, useState } from 'react'
import { gemApi } from './gemledger-api'
import type { Lot } from './gemledger-types'
import { numFmt, fmtCt } from './GemLedgerCards'
import { SellForm, TransferForm, AddExpenseForm } from './GemLedgerForms'

const C = {
  bg: '#0a0f0a', bg2: '#111a11', bg3: '#1a2a1a', border: '#1e2e1e',
  t1: '#e0e8e0', t2: '#c0ccc0', t3: '#8a9a8a',
  green: '#34d399', yellow: '#fbbf24', purple: '#a78bfa', red: '#f87171',
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 20, marginRight: 6, marginBottom: 6,
      background: `${color}20`, border: `1px solid ${color}40`,
      color, fontSize: 11, fontFamily: 'DM Sans', fontWeight: 600,
    }}>{label}</div>
  )
}

// EditInput lives outside the component so React preserves its DOM node across re-renders
function EditInput({ value, onChange, type = 'text', label, mono = false }: {
  value: string; onChange: (v: string) => void; type?: string; label: string; mono?: boolean
}) {
  return (
    <div>
      <div style={{ color: '#8a9a8a', fontSize: 10, fontFamily: 'DM Sans', marginBottom: 3, letterSpacing: '0.05em' }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box', background: '#1a2a1a',
          border: '1px solid #1e2e1e', borderRadius: 8,
          color: '#e0e8e0', fontSize: 14, padding: '8px 10px',
          fontFamily: mono || type === 'number' ? 'JetBrains Mono' : 'DM Sans',
        }}
      />
    </div>
  )
}

interface Props {
  lotId: string
  onClose: () => void
  onRefresh: () => void
  wipEnabled?: boolean
}

type Form = 'sell' | 'transfer' | 'expense' | null

export default function GemLedgerStoneDetail({ lotId, onClose, onRefresh, wipEnabled = true }: Props) {
  const [lot, setLot] = useState<Lot | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Form>(null)
  const [histOpen, setHistOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [edit, setEdit] = useState<any>({})
  const [dupWarn, setDupWarn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expEdit, setExpEdit] = useState<{id: string; amount: string; description: string} | null>(null)
  const [expDelId, setExpDelId] = useState<string | null>(null)
  const [savingExp, setSavingExp] = useState(false)
  const [deletingExp, setDeletingExp] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const certRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLoading(true)
    gemApi.lot(lotId)
      .then(d => { setLot(d); setEdit({ ...d }) })
      .catch((err: any) => { setError(err?.message || 'Failed to load lot') })
      .finally(() => setLoading(false))
  }, [lotId, refreshKey])

  function refresh() { setRefreshKey(k => k + 1); onRefresh() }

  async function saveExpense() {
    if (!expEdit) return
    setSavingExp(true)
    try {
      await gemApi.updateExpense(expEdit.id, { amount: parseFloat(expEdit.amount), description: expEdit.description })
      setExpEdit(null)
      refresh()
    } catch (e: any) { setError(e?.message || 'Failed to update expense') }
    finally { setSavingExp(false) }
  }

  async function confirmDeleteExpense() {
    if (!expDelId) return
    setDeletingExp(true)
    try {
      await gemApi.deleteExpense(expDelId)
      setExpDelId(null)
      refresh()
    } catch (e: any) { setError(e?.message || 'Failed to delete expense') }
    finally { setDeletingExp(false) }
  }

  async function save() {
    if (!lot) return
    setSaving(true)
    try {
      const res = await gemApi.updateLot(lot.id, {
        name: edit.name, code: edit.code,
        stone_count: parseInt(edit.stone_count),
        total_weight_ct: parseFloat(edit.total_weight_ct),
        total_cost: parseFloat(edit.total_cost),
        shape: edit.shape || null, color: edit.color || null,
        origin: edit.origin || null, treatment: edit.treatment || null,
        dimensions: edit.dimensions || null,
        certified: edit.certified, cert_body: edit.cert_body || null,
        investment_id: edit.investment_id || null,
        status: edit.status,
      })
      setDupWarn(res.warning === 'code_duplicate')
      setLot(res)
      setEditing(false)
      onRefresh()
    } catch (e: any) { setError(e.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  async function uploadPhoto(file: File, photoType: string) {
    await gemApi.uploadPhoto(lotId, file, photoType)
    refresh()
  }

  async function deletePhoto(photoId: string) {
    await gemApi.deletePhoto(photoId)
    refresh()
  }

  async function share() {
    try {
      const r = await gemApi.shareLot(lotId)
      if (navigator.share) {
        navigator.share({ title: lot?.name || 'Stone', url: r.url })
      } else {
        navigator.clipboard.writeText(r.url)
        alert('Share link copied!')
      }
    } catch { setError('Share failed') }
  }

  if (loading || !lot) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: C.bg, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: `2px solid ${C.green}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  const costPerCt = parseFloat(lot.total_weight_ct) > 0
    ? numFmt(parseFloat(lot.total_cost) / parseFloat(lot.total_weight_ct)) : '0'

  const statusColor: Record<string, string> = { rough: C.yellow, cut: C.green, wip: C.purple, sold: C.t3, processed: C.t3 }
  const sc = statusColor[lot.status] || C.t3

  const stonePhotos = (lot.photos || []).filter(p => p.photo_type === 'stone')
  const certPhotos = (lot.photos || []).filter(p => p.photo_type === 'certificate')


  const isSold = lot.status === 'sold' || lot.status === 'processed'

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.bg, zIndex: 100, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {error && (
        <div style={{
          position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: '#f87171', color: '#0a0f0a', padding: '8px 16px',
          borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 200,
          maxWidth: '90%', textAlign: 'center', pointerEvents: 'none',
        }}>{error}</div>
      )}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: `1px solid ${C.border}`,
        background: C.bg, zIndex: 10, flexShrink: 0,
      }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.t2, fontFamily: 'DM Sans', fontSize: 14, cursor: 'pointer', padding: '4px 0' }}>← Back</button>
        {editing ? (
          <button onClick={save} disabled={saving} style={{
            background: saving ? C.bg3 : C.green, border: 'none', borderRadius: 8,
            color: saving ? C.t3 : '#0a0f0a', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 14, padding: '8px 16px', cursor: 'pointer',
          }}>{saving ? 'Saving…' : 'Save'}</button>
        ) : (
          <button onClick={() => setEditing(true)} style={{
            background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.t2, fontFamily: 'DM Sans', fontSize: 14, padding: '8px 16px', cursor: 'pointer',
          }}>Edit</button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ padding: '16px', maxWidth: 430, margin: '0 auto' }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.t1, fontFamily: 'DM Sans', marginBottom: 8 }}>{lot.name}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 4 }}>
            <Badge label={lot.status.toUpperCase()} color={sc} />
            {lot.treatment && <Badge label={lot.treatment} color={C.t3} />}
            {lot.origin && <Badge label={lot.origin} color={C.t3} />}
            {lot.certified && <Badge label={lot.cert_body || 'Certified'} color={C.green} />}
          </div>
        </div>

        {editing ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <EditInput value={String(edit.stone_count ?? '')} onChange={v => setEdit((p: any) => ({...p, stone_count: v}))} type="number" label="STONES" />
            <EditInput value={String(edit.total_weight_ct ?? '')} onChange={v => setEdit((p: any) => ({...p, total_weight_ct: v}))} type="number" label="WEIGHT CT" />
            <EditInput value={String(edit.total_cost ?? '')} onChange={v => setEdit((p: any) => ({...p, total_cost: v}))} type="number" label="TOTAL COST" />
            <div>
              <div style={{ color: C.t3, fontSize: 10, fontFamily: 'DM Sans', marginBottom: 3, letterSpacing: '0.05em' }}>COST/CT</div>
              <div style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', color: C.t3, fontFamily: 'JetBrains Mono', fontSize: 14 }}>
                {costPerCt} <span style={{ fontSize: 11 }}>(auto)</span>
              </div>
            </div>
            <div style={{ gridColumn: '1/-1' }}><EditInput value={String(edit.code ?? '')} onChange={v => setEdit((p: any) => ({...p, code: v}))} label="CODE" mono /></div>
            {dupWarn && <div style={{ gridColumn: '1/-1', color: C.yellow, fontSize: 12, fontFamily: 'DM Sans' }}>⚠ Code already in use — saved anyway</div>}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              ['STONES', lot.stone_count, 'JetBrains Mono'],
              ['WEIGHT', `${fmtCt(lot.total_weight_ct)} ct`, 'JetBrains Mono'],
              ['COST', numFmt(lot.total_cost), 'JetBrains Mono'],
              ['COST/CT', costPerCt, 'JetBrains Mono'],
              ['INVESTMENT', lot.investment_name || '—', 'DM Sans'],
              ['CODE', lot.code, 'JetBrains Mono'],
            ].map(([label, val, font]) => (
              <div key={label as string} style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ color: C.t3, fontSize: 10, fontFamily: 'DM Sans', letterSpacing: '0.05em', marginBottom: 4 }}>{label as string}</div>
                <div style={{ color: C.t1, fontFamily: `${font}, sans-serif`, fontSize: 15, fontWeight: 600 }}>{String(val)}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 8 }}>STONE PHOTOS</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {stonePhotos.map(p => (
              <div key={p.id} style={{ position: 'relative' }}>
                <img src={p.thumb_url || p.url || ''} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, border: `1px solid ${C.border}` }} />
                <button onClick={() => deletePhoto(p.id)} style={{
                  position: 'absolute', top: -8, right: -8, minWidth: 44, minHeight: 44,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><span style={{ width: 20, height: 20, borderRadius: 10, background: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white' }}>✕</span></button>
              </div>
            ))}
            <button onClick={() => fileRef.current?.click()} style={{
              width: 72, height: 72, borderRadius: 10, border: `1.5px dashed ${C.border}`,
              background: C.bg3, color: C.t3, fontSize: 24, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>+</button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0], 'stone')} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 8 }}>CERTIFICATE PHOTOS</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {certPhotos.map(p => (
              <div key={p.id} style={{ position: 'relative' }}>
                <img src={p.thumb_url || p.url || ''} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, border: `1px solid ${C.border}` }} />
                <button onClick={() => deletePhoto(p.id)} style={{
                  position: 'absolute', top: -8, right: -8, minWidth: 44, minHeight: 44,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><span style={{ width: 20, height: 20, borderRadius: 10, background: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white' }}>✕</span></button>
              </div>
            ))}
            <button onClick={() => certRef.current?.click()} style={{
              width: 72, height: 72, borderRadius: 10, border: `1.5px dashed ${C.border}`,
              background: C.bg3, color: C.t3, fontSize: 24, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>+</button>
          </div>
          <input ref={certRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0], 'certificate')} />
        </div>

        {/* Action buttons */}
        {!isSold && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <ActionBtn label="Record Sale" color={C.green} onClick={() => setForm('sell')} />
            <ActionBtn label="Transfer" color={C.purple} onClick={() => setForm('transfer')} />
            <ActionBtn label="Add Expense" color={C.t3} onClick={() => setForm('expense')} />
          </div>
        )}

        <button onClick={share} style={{
          width: '100%', padding: '12px', borderRadius: 10,
          background: C.bg3, border: `1px solid ${C.border}`,
          color: C.t2, fontFamily: 'DM Sans', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 16,
        }}>🔗 Share via WhatsApp</button>

        <button onClick={() => setHistOpen(h => !h)} style={{
          width: '100%', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 10,
          color: C.t2, fontFamily: 'DM Sans', fontSize: 14, padding: '10px 14px',
          cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
        }}>
          <span>History</span>
          <span style={{ color: C.t3 }}>{histOpen ? '▲' : '▼'}</span>
        </button>
        {histOpen && (lot.history || []).map(h => (
          <div key={h.id} style={{
            background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: '10px 14px', marginBottom: 6,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ color: C.t2, fontFamily: 'DM Sans', fontSize: 13 }}>{h.transfer_type.replace(/_/g, ' ')}</span>
              <span style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans' }}>{new Date(h.date).toLocaleDateString()}</span>
            </div>
            {h.party_name && <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans' }}>{h.party_name}</div>}
            {h.result_weight_ct && <div style={{ color: C.t3, fontSize: 11, fontFamily: 'JetBrains Mono' }}>{h.result_weight_ct} ct · charge: {h.cutting_charge}</div>}
          </div>
        ))}

        {(lot.expenses || []).length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 8 }}>EXPENSES</div>
            {(lot.expenses || []).map(e => (
              <div key={e.id} style={{
                background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10,
                padding: '10px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.t2, fontFamily: 'DM Sans', fontSize: 13 }}>{e.description}</div>
                  <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans' }}>{e.date}</div>
                </div>
                <div style={{ color: C.t1, fontFamily: 'JetBrains Mono', fontSize: 14, marginRight: 4 }}>{numFmt(e.amount)}</div>
                <button onClick={() => setExpEdit({ id: e.id, amount: e.amount, description: e.description })}
                  style={{ minWidth: 44, minHeight: 44, background: 'none', border: 'none', cursor: 'pointer', color: '#c0ccc0', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label="Edit expense">&#9998;</button>
                <button onClick={() => setExpDelId(e.id)}
                  style={{ minWidth: 44, minHeight: 44, background: 'none', border: 'none', cursor: 'pointer', color: '#c0ccc0', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label="Delete expense">&#10005;</button>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      {form === 'sell' && <SellForm lot={lot} onClose={() => setForm(null)} onSaved={refresh} />}
      {form === 'transfer' && <TransferForm lot={lot} onClose={() => setForm(null)} onSaved={refresh} wipEnabled={wipEnabled} />}
      {form === 'expense' && <AddExpenseForm lotId={lot.id} onClose={() => setForm(null)} onSaved={refresh} />}

      {expEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 430, background: C.bg2, borderRadius: '16px 16px 0 0', border: `1px solid ${C.border}`, padding: 24 }}>
            <div style={{ color: C.t1, fontFamily: 'DM Sans', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Edit Expense</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: C.t3, fontSize: 10, fontFamily: 'DM Sans', marginBottom: 4 }}>DESCRIPTION</div>
              <input value={expEdit.description}
                onChange={e => setExpEdit(p => p ? {...p, description: e.target.value} : p)}
                style={{ width: '100%', boxSizing: 'border-box', background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, color: C.t1, fontSize: 14, padding: '8px 10px', fontFamily: 'DM Sans' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: C.t3, fontSize: 10, fontFamily: 'DM Sans', marginBottom: 4 }}>AMOUNT</div>
              <input type="number" value={expEdit.amount}
                onChange={e => setExpEdit(p => p ? {...p, amount: e.target.value} : p)}
                style={{ width: '100%', boxSizing: 'border-box', background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, color: C.t1, fontSize: 14, padding: '8px 10px', fontFamily: 'JetBrains Mono' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setExpEdit(null)} style={{ flex: 1, padding: '12px', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.t2, fontFamily: 'DM Sans', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveExpense} disabled={savingExp} style={{ flex: 1, padding: '12px', borderRadius: 10, background: savingExp ? C.bg3 : C.green, border: 'none', color: '#0a0f0a', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{savingExp ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {expDelId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 360, background: C.bg2, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 }}>
            <div style={{ color: C.t1, fontFamily: 'DM Sans', fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Delete this expense?</div>
            <div style={{ color: C.t3, fontFamily: 'DM Sans', fontSize: 13, marginBottom: 20 }}>This cannot be undone.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setExpDelId(null)} style={{ flex: 1, padding: '12px', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.t2, fontFamily: 'DM Sans', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmDeleteExpense} disabled={deletingExp} style={{ flex: 1, padding: '12px', borderRadius: 10, background: deletingExp ? C.bg3 : C.red, border: 'none', color: 'white', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{deletingExp ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ActionBtn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 8px', borderRadius: 10, minHeight: 44,
      background: `${color}18`, border: `1px solid ${color}40`,
      color, fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13, cursor: 'pointer',
      WebkitTapHighlightColor: 'transparent',
    }}>{label}</button>
  )
}
