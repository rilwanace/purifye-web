import { useState, useEffect } from 'react'
import { gemApi } from './gemledger-api'
import { numFmt } from './GemLedgerCards'
import type { StoneType, Party, Investment } from './gemledger-types'

const C = {
  bg: '#0a0f0a', bg2: '#111a11', bg3: '#1a2a1a',
  border: '#1e2e1e', t1: '#e0e8e0', t2: '#c0ccc0', t3: '#8a9a8a',
  green: '#34d399', yellow: '#fbbf24', red: '#f87171', purple: '#a78bfa',
}

const SWATCH_COLORS = ['#60a5fa', '#f472b6', '#f87171', '#fbbf24', '#8a9a8a', '#a78bfa', '#22d3ee', '#fb923c']

const JOB_TYPE_OPTIONS = [
  { value: 'cutting', label: 'Cutting' },
  { value: 'heating', label: 'Heating' },
  { value: 'polishing', label: 'Polishing' },
  { value: 'preform', label: 'Preform' },
]

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', maxWidth: 430, margin: '0 auto',
        background: C.bg2, borderRadius: '16px 16px 0 0',
        border: `1px solid ${C.border}`, maxHeight: '90dvh',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '16px 20px 12px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: C.t1, fontFamily: 'DM Sans' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.t3, fontSize: 20, cursor: 'pointer', padding: 4 }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '16px 20px 32px', flex: 1 }}>{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: C.t3, fontFamily: 'DM Sans', marginBottom: 5, fontWeight: 500, letterSpacing: '0.04em' }}>{label}</div>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: any) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', boxSizing: 'border-box',
        background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8,
        color: C.t1, fontSize: 15, padding: '10px 12px',
        fontFamily: 'DM Sans, sans-serif', outline: 'none',
      }}
    />
  )
}

function Select({ value, onChange, children }: any) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', boxSizing: 'border-box',
        background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8,
        color: C.t1, fontSize: 15, padding: '10px 12px',
        fontFamily: 'DM Sans, sans-serif', outline: 'none',
      }}
    >
      {children}
    </select>
  )
}

function SaveBtn({ onClick, loading, label = 'Save' }: any) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        width: '100%', padding: '14px', borderRadius: 10,
        background: loading ? '#2a4a3a' : C.green, border: 'none', cursor: loading ? 'default' : 'pointer',
        color: '#0a0f0a', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 15, marginTop: 8,
      }}
    >{loading ? 'Saving…' : label}</button>
  )
}

// ── Add Stone/Lot ─────────────────────────────────────────────────────────────
export function AddLotForm({ onClose, onSaved, prefill }: { onClose: () => void; onSaved: () => void; prefill?: any }) {
  const [types, setTypes] = useState<StoneType[]>([])
  const [investments, setInvestments] = useState<Investment[]>([])
  const [f, setF] = useState({
    stone_type_id: prefill?.stone_type_id || '',
    name: prefill?.name || '',
    code: '',
    stone_count: '1',
    total_weight_ct: '',
    total_cost: '',
    status: 'rough',
    shape: '', color: '', origin: '', treatment: '',
    dimensions: '', certified: false, cert_body: '',
    investment_id: '',
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customColor, setCustomColor] = useState(SWATCH_COLORS[0])
  const [addingType, setAddingType] = useState(false)

  useEffect(() => {
    gemApi.stoneTypes().then(setTypes).catch(() => {})
    gemApi.investments().then(d => setInvestments(d.filter(i => i.status === 'active'))).catch(() => {})
  }, [])

  const upd = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }))

  async function addCustomType() {
    if (!customName.trim()) return
    setAddingType(true)
    try {
      const newType = await gemApi.createStoneType({ name: customName.trim(), color_hex: customColor })
      const refreshed = await gemApi.stoneTypes()
      setTypes(refreshed)
      upd('stone_type_id')(newType.id)
      setShowCustomInput(false)
      setCustomName('')
    } catch { }
    finally { setAddingType(false) }
  }

  async function save() {
    if (!f.stone_type_id || !f.total_weight_ct) { setErr('Stone type and weight are required'); return }
    setLoading(true)
    try {
      const body: any = {
        name: f.name || types.find(t => t.id === f.stone_type_id)?.name || 'Stone',
        stone_type_id: f.stone_type_id,
        stone_count: parseInt(f.stone_count) || 1,
        total_weight_ct: parseFloat(f.total_weight_ct),
        total_cost: parseFloat(f.total_cost) || 0,
        status: f.status,
        shape: f.shape || null,
        color: f.color || null,
        origin: f.origin || null,
        treatment: f.treatment || null,
        dimensions: f.dimensions || null,
        certified: f.certified,
        cert_body: f.certified ? f.cert_body || null : null,
        investment_id: f.investment_id || null,
      }
      if (f.code) body.code_override = f.code
      await gemApi.createLot(body)
      onSaved()
      onClose()
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <Sheet title="Add Stone / Lot" onClose={onClose}>
      <Field label="STONE TYPE">
        <Select value={f.stone_type_id} onChange={(v: string) => {
          if (v === '__new__') { setShowCustomInput(true); upd('stone_type_id')('') }
          else { setShowCustomInput(false); upd('stone_type_id')(v) }
        }}>
          <option value="">Select type…</option>
          {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          <option disabled>──────────</option>
          <option value="__new__">+ Add custom type</option>
        </Select>
        {showCustomInput && (
          <div style={{ marginTop: 10, background: C.bg3, borderRadius: 8, padding: '12px', border: `1px solid ${C.border}` }}>
            <Input value={customName} onChange={setCustomName} placeholder="Type name" />
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {SWATCH_COLORS.map(c => (
                <button key={c} onClick={() => setCustomColor(c)} style={{
                  width: 28, height: 28, borderRadius: 6, background: c,
                  border: `2px solid ${customColor === c ? 'white' : 'transparent'}`,
                  cursor: 'pointer', padding: 0,
                }} />
              ))}
            </div>
            <button
              onClick={addCustomType}
              disabled={!customName.trim() || addingType}
              style={{
                width: '100%', marginTop: 10, padding: '8px', borderRadius: 6,
                background: customName.trim() ? C.green : '#2a3a2a',
                border: 'none', color: customName.trim() ? '#0a0f0a' : C.t3,
                fontFamily: 'DM Sans', fontWeight: 600, fontSize: 14,
                cursor: customName.trim() ? 'pointer' : 'default',
              }}
            >{addingType ? 'Adding…' : 'Add type'}</button>
          </div>
        )}
      </Field>
      <Field label="DISPLAY NAME (optional)">
        <Input value={f.name} onChange={upd('name')} placeholder="Optional" />
      </Field>
      <Field label="CODE (auto-generated if blank)">
        <Input value={f.code} onChange={upd('code')} placeholder="e.g. BS-001" />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="STONES">
          <Input type="number" value={f.stone_count} onChange={upd('stone_count')} placeholder="1" />
        </Field>
        <Field label="TOTAL CT">
          <Input type="number" value={f.total_weight_ct} onChange={upd('total_weight_ct')} placeholder="0.00" />
        </Field>
      </div>
      <Field label="TOTAL COST">
        <Input type="number" value={f.total_cost} onChange={upd('total_cost')} placeholder="0.00" />
      </Field>
      <Field label="STATUS">
        <div style={{ display: 'flex', gap: 8 }}>
          {['rough', 'cut'].map(s => (
            <button key={s} onClick={() => upd('status')(s)} style={{
              flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${f.status === s ? C.green : C.border}`,
              background: f.status === s ? '#1a3a2a' : C.bg3, color: f.status === s ? C.green : C.t2,
              fontFamily: 'DM Sans', fontWeight: 600, fontSize: 14, cursor: 'pointer', textTransform: 'capitalize',
            }}>{s}</button>
          ))}
        </div>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="SHAPE">
          <Input value={f.shape} onChange={upd('shape')} placeholder="Oval, Round…" />
        </Field>
        <Field label="ORIGIN">
          <Input value={f.origin} onChange={upd('origin')} placeholder="Ceylon, Burma…" />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="COLOR">
          <Input value={f.color} onChange={upd('color')} placeholder="Royal Blue…" />
        </Field>
        <Field label="TREATMENT">
          <Select value={f.treatment} onChange={upd('treatment')}>
            <option value="">None/unknown</option>
            <option value="Heated">Heated</option>
            <option value="Unheated">Unheated</option>
            <option value="N/A">N/A</option>
          </Select>
        </Field>
      </div>
      <Field label="DIMENSIONS">
        <Input value={f.dimensions} onChange={upd('dimensions')} placeholder="8.2×6.1×4.3" />
      </Field>
      <Field label="CERTIFIED">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => upd('certified')(!f.certified)} style={{
            width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: f.certified ? C.green : '#2a3a2a', position: 'relative', transition: 'background 0.2s',
          }}>
            <div style={{
              position: 'absolute', top: 2, left: f.certified ? 22 : 2,
              width: 20, height: 20, borderRadius: 10, background: 'white', transition: 'left 0.2s',
            }} />
          </button>
          <span style={{ color: C.t2, fontFamily: 'DM Sans', fontSize: 14 }}>
            {f.certified ? 'Yes' : 'No'}
          </span>
        </div>
        {f.certified && (
          <div style={{ marginTop: 8 }}>
            <Input value={f.cert_body} onChange={upd('cert_body')} placeholder="GRS, GIA, etc." />
          </div>
        )}
      </Field>
      <Field label="INVESTMENT">
        <Select value={f.investment_id} onChange={upd('investment_id')}>
          <option value="">None / Own capital</option>
          {investments.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </Select>
      </Field>
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 8, fontFamily: 'DM Sans' }}>{err}</div>}
      <SaveBtn onClick={save} loading={loading} label="Add Stone" />
    </Sheet>
  )
}

// ── Record Sale ───────────────────────────────────────────────────────────────
export function SellForm({ lot, onClose, onSaved }: { lot: any; onClose: () => void; onSaved: () => void }) {
  const [salePrice, setSalePrice] = useState('')
  const [qty, setQty] = useState(String(lot.stone_count))
  const [wt, setWt] = useState(String(lot.total_weight_ct))
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const isPartial = parseInt(qty) < lot.stone_count

  async function save() {
    if (!salePrice) { setErr('Sale price required'); return }
    setLoading(true)
    try {
      const body: any = { sale_price: parseFloat(salePrice) }
      if (isPartial) { body.quantity = parseInt(qty); body.weight_sold = parseFloat(wt) }
      await gemApi.sellLot(lot.id, body)
      onSaved(); onClose()
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }

  const profitVal = salePrice ? parseFloat(salePrice) - parseFloat(lot.total_cost) : null

  return (
    <Sheet title={`Sell — ${lot.name}`} onClose={onClose}>
      <div style={{ background: C.bg3, borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans', marginBottom: 4 }}>CURRENT LOT</div>
        <div style={{ color: C.t1, fontFamily: 'DM Sans' }}>{lot.stone_count} stones · {lot.total_weight_ct} ct · Cost: {numFmt(lot.total_cost)}</div>
      </div>
      <Field label="SALE PRICE">
        <Input type="number" value={salePrice} onChange={setSalePrice} placeholder="0.00" />
      </Field>
      {lot.stone_count > 1 && (
        <>
          <div style={{ color: C.t3, fontSize: 12, marginBottom: 10, fontFamily: 'DM Sans' }}>Selling partial lot? Adjust below.</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="STONES SELLING">
              <Input type="number" value={qty} onChange={setQty} />
            </Field>
            <Field label="WEIGHT CT">
              <Input type="number" value={wt} onChange={setWt} />
            </Field>
          </div>
        </>
      )}
      {profitVal !== null && (
        <div style={{
          background: profitVal >= 0 ? '#0a2a1a' : '#2a0a0a',
          border: `1px solid ${profitVal >= 0 ? '#1a4a2a' : '#4a1a1a'}`,
          borderRadius: 8, padding: '10px 14px', marginBottom: 12,
        }}>
          <span style={{ color: C.t3, fontFamily: 'DM Sans', fontSize: 12 }}>Profit: </span>
          <span style={{
            color: profitVal >= 0 ? C.green : C.red,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700,
          }}>{numFmt(profitVal)}</span>
        </div>
      )}
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 8 }}>{err}</div>}
      <SaveBtn onClick={save} loading={loading} label="Record Sale" />
    </Sheet>
  )
}

// ── Give Approval ─────────────────────────────────────────────────────────────
export function GiveApprovalForm({ lotId, onClose, onSaved }: { lotId: string; onClose: () => void; onSaved: () => void }) {
  const [parties, setParties] = useState<Party[]>([])
  const [partyId, setPartyId] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { gemApi.parties().then(setParties).catch(() => {}) }, [])

  async function save() {
    if (!partyId) return
    setLoading(true)
    try { await gemApi.giveApproval(lotId, partyId); onSaved(); onClose() }
    catch (e: any) { setErr(e.message || 'Failed to save') } finally { setLoading(false) }
  }

  return (
    <Sheet title="Give on Approval" onClose={onClose}>
      <Field label="BUYER / BROKER">
        <Select value={partyId} onChange={setPartyId}>
          <option value="">Select party…</option>
          {parties.map(p => <option key={p.id} value={p.id}>{p.name}{p.location ? ` — ${p.location}` : ''}</option>)}
        </Select>
      </Field>
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 8, fontFamily: 'DM Sans' }}>{err}</div>}
      <SaveBtn onClick={save} loading={loading} label="Give on Approval" />
    </Sheet>
  )
}

// ── Send for Processing ───────────────────────────────────────────────────────
export function SendForProcessingForm({ lot, onClose, onSaved }: { lot: any; onClose: () => void; onSaved: () => void }) {
  const [parties, setParties] = useState<Party[]>([])
  const [jobType, setJobType] = useState('cutting')
  const [partyId, setPartyId] = useState('')
  const [sendCount, setSendCount] = useState(String(lot.stone_count))
  const [sendWeight, setSendWeight] = useState(String(lot.total_weight_ct))
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { gemApi.parties().then(setParties).catch(() => {}) }, [])

  const parsedCount = parseInt(sendCount) || 0
  const parsedWeight = parseFloat(sendWeight) || 0
  const isPartial = parsedCount < lot.stone_count

  async function save() {
    if (!partyId) { setErr('Select a party'); return }
    if (!parsedCount || parsedCount < 1) { setErr('Stone count must be at least 1'); return }
    if (!parsedWeight || parsedWeight <= 0) { setErr('Weight must be greater than 0'); return }
    if (parsedCount > lot.stone_count) { setErr('Cannot send more stones than lot contains'); return }
    if (parsedWeight > parseFloat(lot.total_weight_ct)) { setErr('Cannot send more weight than lot contains'); return }
    setLoading(true)
    try {
      const body: any = { party_id: partyId, job_type: jobType }
      if (isPartial) {
        body.send_stone_count = parsedCount
        body.send_weight_ct = parsedWeight
      }
      await gemApi.sendProcessing(lot.id, body)
      onSaved(); onClose()
    } catch (e: any) { setErr(e.message || 'Failed to send') }
    finally { setLoading(false) }
  }

  return (
    <Sheet title="Send for Processing" onClose={onClose}>
      <div style={{ background: C.bg3, borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans', marginBottom: 4 }}>LOT</div>
        <div style={{ color: C.t1, fontFamily: 'DM Sans' }}>{lot.stone_count} stones · {lot.total_weight_ct} ct · Cost: {numFmt(lot.total_cost)}</div>
      </div>
      <Field label="JOB TYPE">
        <Select value={jobType} onChange={setJobType}>
          {JOB_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </Field>
      <Field label="PROCESSOR / PARTY">
        <Select value={partyId} onChange={setPartyId}>
          <option value="">Select party…</option>
          {parties.map(p => <option key={p.id} value={p.id}>{p.name}{p.location ? ` — ${p.location}` : ''}</option>)}
        </Select>
      </Field>
      {lot.stone_count > 1 && (
        <>
          <div style={{ color: C.t3, fontSize: 12, marginBottom: 10, fontFamily: 'DM Sans' }}>Sending partial lot? Adjust below.</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="STONES SENDING">
              <Input type="number" value={sendCount} onChange={setSendCount} />
            </Field>
            <Field label="WEIGHT CT">
              <Input type="number" value={sendWeight} onChange={setSendWeight} />
            </Field>
          </div>
          {isPartial && parsedCount > 0 && (
            <div style={{
              background: `${C.purple}18`, border: `1px solid ${C.purple}40`,
              borderRadius: 8, padding: '10px 14px', marginBottom: 12,
            }}>
              <div style={{ color: C.t3, fontSize: 11, fontFamily: 'DM Sans' }}>
                Remaining: {lot.stone_count - parsedCount} stones · {numFmt(parseFloat(lot.total_weight_ct) - parsedWeight)} ct
              </div>
            </div>
          )}
        </>
      )}
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 8, fontFamily: 'DM Sans' }}>{err}</div>}
      <SaveBtn onClick={save} loading={loading} label="Send for Processing" />
    </Sheet>
  )
}

// ── Receive from Processing ───────────────────────────────────────────────────
export function ReceiveFromProcessingForm({ lotId, onClose, onSaved }: { lotId: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ result_stone_count: '1', result_weight_ct: '', cutting_charge: '0' })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const upd = (k: string) => (v: string) => setF(p => ({ ...p, [k]: v }))

  async function save() {
    if (!f.result_weight_ct) { setErr('Result weight required'); return }
    setLoading(true)
    try {
      await gemApi.receiveProcessing(lotId, {
        result_stone_count: parseInt(f.result_stone_count),
        result_weight_ct: parseFloat(f.result_weight_ct),
        cutting_charge: parseFloat(f.cutting_charge) || 0,
      })
      onSaved(); onClose()
    } catch (e: any) { setErr(e.message || 'Failed to receive') }
    finally { setLoading(false) }
  }

  return (
    <Sheet title="Receive from Processing" onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="RESULT STONES">
          <Input type="number" value={f.result_stone_count} onChange={upd('result_stone_count')} />
        </Field>
        <Field label="RESULT CT">
          <Input type="number" value={f.result_weight_ct} onChange={upd('result_weight_ct')} placeholder="0.00" />
        </Field>
      </div>
      <Field label="PROCESSING CHARGE">
        <Input type="number" value={f.cutting_charge} onChange={upd('cutting_charge')} placeholder="0.00" />
      </Field>
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 8 }}>{err}</div>}
      <SaveBtn onClick={save} loading={loading} label="Create Output Lot" />
    </Sheet>
  )
}

// ── Add Expense ───────────────────────────────────────────────────────────────
export function AddExpenseForm({ lotId, onClose, onSaved }: { lotId: string; onClose: () => void; onSaved: () => void }) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!description || !amount) return
    setLoading(true)
    try { await gemApi.addExpense(lotId, { description, amount: parseFloat(amount), date: expDate }); onSaved(); onClose() }
    catch (e: any) { setErr(e.message || 'Failed to save') } finally { setLoading(false) }
  }

  return (
    <Sheet title="Add Expense" onClose={onClose}>
      <Field label="DESCRIPTION">
        <Input value={description} onChange={setDescription} placeholder="Cutting, polishing, cert…" />
      </Field>
      <Field label="AMOUNT">
        <Input type="number" value={amount} onChange={setAmount} placeholder="0.00" />
      </Field>
      <Field label="DATE">
        <Input type="date" value={expDate} onChange={setExpDate} />
      </Field>
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 8, fontFamily: 'DM Sans' }}>{err}</div>}
      <SaveBtn onClick={save} loading={loading} label="Add Expense" />
    </Sheet>
  )
}

// ── Add Party ─────────────────────────────────────────────────────────────────
export function AddPartyForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: '', phone: '', location: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const upd = (k: string) => (v: string) => setF(p => ({ ...p, [k]: v }))

  async function save() {
    if (!f.name) return
    setLoading(true)
    try {
      await gemApi.createParty({ name: f.name, phone: f.phone || null, location: f.location || null, notes: f.notes || null })
      onSaved(); onClose()
    } catch (e: any) { setErr(e.message || 'Failed to save') } finally { setLoading(false) }
  }

  return (
    <Sheet title="Add Party" onClose={onClose}>
      <Field label="NAME"><Input value={f.name} onChange={upd('name')} placeholder="Party name" /></Field>
      <Field label="PHONE"><Input value={f.phone} onChange={upd('phone')} placeholder="+94 77 123 4567" /></Field>
      <Field label="LOCATION"><Input value={f.location} onChange={upd('location')} placeholder="Colombo, Bangkok…" /></Field>
      <Field label="NOTES"><Input value={f.notes} onChange={upd('notes')} placeholder="Optional notes" /></Field>
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 8, fontFamily: 'DM Sans' }}>{err}</div>}
      <SaveBtn onClick={save} loading={loading} label="Add Party" />
    </Sheet>
  )
}

// ── Add Investment ────────────────────────────────────────────────────────────
export function AddInvestmentForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: '', capital_amount: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const upd = (k: string) => (v: string) => setF(p => ({ ...p, [k]: v }))

  async function save() {
    if (!f.name || !f.capital_amount) return
    setLoading(true)
    try {
      await gemApi.createInvestment({ name: f.name, capital_amount: parseFloat(f.capital_amount), notes: f.notes || null })
      onSaved(); onClose()
    } catch (e: any) { setErr(e.message || 'Failed to save') } finally { setLoading(false) }
  }

  return (
    <Sheet title="Add Investment" onClose={onClose}>
      <Field label="INVESTOR NAME"><Input value={f.name} onChange={upd('name')} placeholder="Hameed Uncle, Own Capital…" /></Field>
      <Field label="CAPITAL AMOUNT"><Input type="number" value={f.capital_amount} onChange={upd('capital_amount')} placeholder="0.00" /></Field>
      <Field label="NOTES"><Input value={f.notes} onChange={upd('notes')} placeholder="Optional" /></Field>
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 8, fontFamily: 'DM Sans' }}>{err}</div>}
      <SaveBtn onClick={save} loading={loading} label="Add Investment" />
    </Sheet>
  )
}

// ── Return Capital ────────────────────────────────────────────────────────────
export function ReturnCapitalForm({ investmentId, investmentName, onClose, onSaved }: { investmentId: string; investmentName: string; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!amount) return
    setLoading(true)
    try {
      await gemApi.returnCapital(investmentId, { amount: parseFloat(amount), notes: notes || null })
      onSaved(); onClose()
    } catch (e: any) { setErr(e.message || 'Failed to save') } finally { setLoading(false) }
  }

  return (
    <Sheet title={`Return Capital — ${investmentName}`} onClose={onClose}>
      <Field label="AMOUNT RETURNING">
        <Input type="number" value={amount} onChange={setAmount} placeholder="0.00" />
      </Field>
      <Field label="NOTES">
        <Input value={notes} onChange={setNotes} placeholder="Optional" />
      </Field>
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 8, fontFamily: 'DM Sans' }}>{err}</div>}
      <SaveBtn onClick={save} loading={loading} label="Return Capital" />
    </Sheet>
  )
}

// ── Close Investment ──────────────────────────────────────────────────────────
export function CloseInvestmentModal({ inv, onClose, onSaved }: { inv: any; onClose: () => void; onSaved: () => void }) {
  const [returnNow, setReturnNow] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [err, setErr] = useState('')

  const capital = parseFloat(inv.capital_amount) || 0
  const prevReturned = parseFloat(inv.total_returned) || 0
  const inStock = parseFloat(inv.in_stock_value) || 0
  const revenue = parseFloat(inv.sold_revenue) || 0

  const poolBal = capital + revenue - inStock - prevReturned
  const now = parseFloat(returnNow) || 0
  const totalRet = prevReturned + now
  const theirProfit = totalRet - capital
  const yourProfit = poolBal - now
  const shortfall = Math.max(0, -yourProfit)

  const fmt = (n: number) => {
    if (Number.isInteger(n)) return n.toLocaleString('en')
    return n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  async function confirm() {
    if (!returnNow) return
    setLoading(true)
    try {
      const r = await gemApi.closeInvestment(inv.id, { return_amount_now: now })
      setResult(r)
      onSaved()
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }

  if (result) {
    return (
      <Sheet title="Investment Closed" onClose={onClose}>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
          <div style={{ color: C.green, fontFamily: 'DM Sans', fontSize: 18, fontWeight: 700 }}>Investment closed successfully</div>
        </div>
        <SaveBtn onClick={onClose} loading={false} label="Done" />
      </Sheet>
    )
  }

  return (
    <Sheet title={`Close — ${inv.name}`} onClose={onClose}>
      <div style={{ background: C.bg3, borderRadius: 10, padding: 14, marginBottom: 16 }}>
        {[
          ['Capital in', fmt(capital)],
          ['Previously returned', fmt(prevReturned)],
          ['Pool balance', fmt(poolBal)],
        ].map(([label, val]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: C.t3, fontFamily: 'DM Sans', fontSize: 13 }}>{label}</span>
            <span style={{ color: C.t1, fontFamily: 'JetBrains Mono', fontSize: 13 }}>{val}</span>
          </div>
        ))}
      </div>
      <Field label="AMOUNT RETURNING NOW">
        <Input type="number" value={returnNow} onChange={setReturnNow} placeholder="0.00" />
      </Field>
      {returnNow && (
        <div style={{ background: C.bg3, borderRadius: 10, padding: 14, marginBottom: 16 }}>
          {[
            ['Total returned', fmt(totalRet), C.t1],
            ['Their profit', fmt(theirProfit), theirProfit >= 0 ? C.green : C.red],
            ['Your profit', fmt(yourProfit), yourProfit >= 0 ? C.green : C.red],
          ].map(([label, val, color]) => (
            <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: C.t3, fontFamily: 'DM Sans', fontSize: 13 }}>{label as string}</span>
              <span style={{ color: color as string, fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 600 }}>{val as string}</span>
            </div>
          ))}
          {shortfall > 0 && (
            <div style={{ color: C.red, fontSize: 12, fontFamily: 'DM Sans', marginTop: 4 }}>
              Shortfall of {fmt(shortfall)} deducted from your P&L
            </div>
          )}
        </div>
      )}
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 8 }}>{err}</div>}
      <SaveBtn onClick={confirm} loading={loading} label="Close & Settle" />
    </Sheet>
  )
}
