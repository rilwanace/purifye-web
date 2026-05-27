import { useEffect, useRef, useState } from 'react'
import { gemApi } from './gemledger-api'
import type { Lot } from './gemledger-types'
import { numFmt, fmtCt } from './GemLedgerCards'
import {
  SellForm, GiveApprovalForm, SendCutterForm,
  ReceiveCutterForm, AddExpenseForm,
} from './GemLedgerForms'

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

interface Props {
  lotId: string
  onClose: () => void
  onRefresh: () => void
}

type Form = 'sell' | 'approval' | 'cutter' | 'receive' | 'expense' | null

export default function GemLedgerStoneDetail({ lotId, onClose, onRefresh }: Props) {
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
  const fileRef = useRef<HTMLInputElement>(null)
  const certRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLoading(true)
    gemApi.lot(lotId).then(d => { setLot(d); setEdit({ ...d }) }).catch((err: any) => { setError(err?.message || 'Failed to load lot') }).finally(() => setLoading(false))
  }, [lotId, refreshKey])

  function refresh() { setRefreshKey(k => k + 1); onRefresh() }

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
    } catch (e: any) { setError('Share failed') }
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
    ? numFmt(parseFloat(lot.total_cost) / parseFloat(lot.total_weight_ct)) : "0"

  const statusColor: Record<string, string> = { rough: C.yellow, cut: C.green, wip: C.purple, sold: C.t3, processed: C.t3 }
  const sc = statusColor[lot.status] || C.t3

  const stonePhotos = (lot.photos || []).filter(p => p.photo_type === 'stone')
  const certPhotos = (lot.photos || []).filter(p => p.photo_type === 'certificate')

  const upd = (k: string) => (e: any) => setEdit((p: any) => ({ ...p, [k]: e.target.value }))

  function EditInput({ k, type = 'text', label }: { k: string; type?: string; label: string }) {
    return (
      <div>
        <div style={{ color: C.t3, fontSize: 10, fontFamily: 'DM Sans', marginBottom: 3, letterSpacing: '0.05em' }}>{label}</div>
        <input
          type={type} value={edit[k] ?? ''} onChange={upd(k)}
          style={{
            width: '100%', boxSizing: 'border-box', background: C.bg3,
            border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.t1, fontSize: 14, padding: '8px 10px',
            fontFamily: k === 'code' || type === 'number' ? 'JetBrains Mono' : 'DM Sans',
          }}
        />
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.bg, zIndex: 100, overflowY: 'auto' }}>
      {error && (
        <div style={{
          position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: '#f87171', color: '#0a0f0a', padding: '8px 16px',
          borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 200,
          maxWidth: '90%', textAlign: 'center', pointerEvents: 'none',
        }}>{error}</div>
      )}
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: `1px solid ${C.border}`,
        position: 'sticky', top: 0, background: C.bg, zIndex: 10,
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

      <div style={{ padding: '16px', maxWidth: 430, margin: '0 auto' }}>
        {/* Hero */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.t1, fontFamily: 'DM Sans', marginBottom: 8 }}>{lot.name}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 4 }}>
            <Badge label={lot.status.toUpperCase()} color={sc} />
            {lot.treatment && <Badge label={lot.treatment} color={C.t3} />}
            {lot.origin && <Badge label={lot.origin} color={C.t3} />}
            {lot.certified && <Badge label={lot.cert_body || 'Certified'} color={C.green} />}
          </div>
        </div>

        {/* Field grid */}
        {editing ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <EditInput k="stone_count" type="number" label="STONES" />
            <EditInput k="total_weight_ct" type="number" label="WEIGHT CT" />
            <EditInput k="total_cost" type="number" label="TOTAL COST" />
            <div>
              <div style={{ color: C.t3, fontSize: 10, fontFamily: 'DM Sans', marginBottom: 3, letterSpacing: '0.05em' }}>COST/CT</div>
              <div style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', color: C.t3, fontFamily: 'JetBrains Mono', fontSize: 14 }}>
                {costPerCt} <span style={{ fontSize: 11 }}>(auto)</span>
              </div>
            </div>
            <div style={{ gridColumn: '1/-1' }}><EditInput k="code" label="CODE" /></div>
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

        {/* Stone photos */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 8 }}>STONE PHOTOS</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {stonePhotos.map(p => (
              <div key={p.id} style={{ position: 'relative' }}>
                <img
                  src={p.thumb_url || p.url || ''}
                  alt=""
                  style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, border: `1px solid ${C.border}` }}
                />
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

        {/* Certificate photos */}
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

        {/* Action buttons — contextual */}
        {lot.status !== 'sold' && lot.status !== 'processed' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {lot.location === 'with_me' && (
              <>
                <ActionBtn label="Record Sale" color={C.green} onClick={() => setForm('sell')} />
                {lot.status !== 'wip' && <ActionBtn label="Give Approval" color={C.yellow} onClick={() => setForm('approval')} />}
                {lot.status !== 'wip' && lot.status !== 'cut' && <ActionBtn label="Send to Cutter" color={C.purple} onClick={() => setForm('cutter')} />}
                {lot.status === 'wip' && <ActionBtn label="Receive from Cutter" color={C.purple} onClick={() => setForm('receive')} />}
                <ActionBtn label="Add Expense" color={C.t3} onClick={() => setForm('expense')} />
              </>
            )}
            {lot.location === 'on_approval' && (
              <>
                <ActionBtn label="Return to Me" color={C.green} onClick={async () => { try { await gemApi.returnLot(lot.id); refresh() } catch (e: any) { setError(e.message || 'Failed to return lot') } }} />
                <ActionBtn label="Record Sale" color={C.yellow} onClick={() => setForm('sell')} />
              </>
            )}
          </div>
        )}

        {/* Share button */}
        <button onClick={share} style={{
          width: '100%', padding: '12px', borderRadius: 10,
          background: C.bg3, border: `1px solid ${C.border}`,
          color: C.t2, fontFamily: 'DM Sans', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 16,
        }}>🔗 Share via WhatsApp</button>

        {/* History (collapsible) */}
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

        {/* Expenses */}
        {(lot.expenses || []).length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 8 }}>EXPENSES</div>
            {(lot.expenses || []).map(e => (
              <div key={e.id} style={{
                background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10,
                padding: '10px 14px', marginBottom: 6, display: 'flex', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ color: C.t2, fontFamily: 'DM Sans', fontSize: 13 }}>{e.description}</div>
                  <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans' }}>{e.date}</div>
                </div>
                <div style={{ color: C.t1, fontFamily: 'JetBrains Mono', fontSize: 14 }}>{numFmt(e.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Forms */}
      {form === 'sell' && <SellForm lot={lot} onClose={() => setForm(null)} onSaved={refresh} />}
      {form === 'approval' && <GiveApprovalForm lotId={lot.id} onClose={() => setForm(null)} onSaved={refresh} />}
      {form === 'cutter' && <SendCutterForm lotId={lot.id} onClose={() => setForm(null)} onSaved={refresh} />}
      {form === 'receive' && <ReceiveCutterForm lotId={lot.id} onClose={() => setForm(null)} onSaved={refresh} />}
      {form === 'expense' && <AddExpenseForm lotId={lot.id} onClose={() => setForm(null)} onSaved={refresh} />}
    </div>
  )
}

function ActionBtn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 8px', borderRadius: 10,
      background: `${color}18`, border: `1px solid ${color}40`,
      color, fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13, cursor: 'pointer',
      WebkitTapHighlightColor: 'transparent',
    }}>{label}</button>
  )
}
