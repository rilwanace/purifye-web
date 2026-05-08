import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { useToast } from '../../shared/components/Toast'

interface LineItem {
  product: string
  qty: number
  unit_price?: number
  unit_cost?: number
}

interface MasterData {
  customers: string[]
  suppliers: string[]
  staff: string[]
  accounts: string[]
  categories: string[]
  products: string[]
}

interface Props {
  masterData: MasterData
  prefill?: { type?: string; fields?: Record<string, any> } | null
  onSaved?: () => void
}

const ENTRY_GROUPS = [
  { label: 'Income', types: [
    { value: 'sale', label: 'Sale' },
    { value: 'sales_return', label: 'Sales Return' },
    { value: 'payment_received', label: 'Payment Received' },
    { value: 'capital_injection', label: 'Capital Injection' },
    { value: 'loan_disbursement', label: 'Loan Disbursement' },
  ]},
  { label: 'Expenses', types: [
    { value: 'purchase', label: 'Purchase' },
    { value: 'purchase_return', label: 'Purchase Return' },
    { value: 'other_expense', label: 'Other Expense' },
    { value: 'payment_made', label: 'Payment Made' },
    { value: 'payroll', label: 'Payroll' },
    { value: 'salary_advance', label: 'Salary Advance' },
    { value: 'owner_drawing', label: 'Owner Drawing' },
  ]},
  { label: 'Other', types: [
    { value: 'loan_repayment', label: 'Loan Repayment' },
    { value: 'asset_purchase', label: 'Asset Purchase' },
    { value: 'inventory_adjustment', label: 'Inventory Adjustment' },
    { value: 'intra_transfer', label: 'Intra-Transfer' },
    { value: 'conversion', label: 'Conversion (FG)' },
  ]},
]

function emptyItem(isSale: boolean): LineItem {
  return isSale ? { product: '', qty: 1, unit_price: 0 } : { product: '', qty: 1, unit_cost: 0 }
}

function defaultFields(type: string): Record<string, any> {
  const base = { date: new Date().toISOString().slice(0, 10) }
  switch (type) {
    case 'sale': return { ...base, customer: '', line_items: [emptyItem(true)], credit_period: 0, account: '' }
    case 'purchase': return { ...base, supplier: '', line_items: [emptyItem(false)], credit_period: 0, account: '' }
    case 'sales_return': return { ...base, customer: '', line_items: [emptyItem(true)], account: '' }
    case 'purchase_return': return { ...base, supplier: '', line_items: [emptyItem(false)], account: '' }
    case 'other_expense': return { ...base, vendor: '', category: '', amount: '', account: '' }
    case 'payment_received': return { ...base, customer: '', amount: '', account: '' }
    case 'payment_made': return { ...base, payee: '', amount: '', account: '' }
    case 'payroll': return { ...base, amount: '', account: '' }
    case 'salary_advance': return { ...base, employee: '', amount: '', account: '' }
    case 'owner_drawing': return { ...base, amount: '', account: '' }
    case 'capital_injection': return { ...base, source: '', amount: '', account: '' }
    case 'loan_disbursement': return { ...base, lender: '', amount: '', account: '' }
    case 'loan_repayment': return { ...base, lender: '', amount: '', account: '' }
    case 'asset_purchase': return { ...base, asset_name: '', amount: '', account: '' }
    case 'inventory_adjustment': return { ...base, product: '', qty: '', direction: 'add', reason: '' }
    case 'intra_transfer': return { ...base, from_account: '', to_account: '', amount: '' }
    case 'conversion': return { ...base, product: '', qty: '' }
    default: return base
  }
}

const inp: React.CSSProperties = {
  width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '12px', color: 'var(--text-primary)',
  fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-sans)',
}

const lbl: React.CSSProperties = {
  fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase',
  letterSpacing: '0.1em', marginBottom: 4, display: 'block', fontFamily: 'var(--font-mono)',
}

function Field({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={lbl}>{name}</label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} style={inp} />
  )
}

function AccountSelect({ value, onChange, accounts }: {
  value: string; onChange: (v: string) => void; accounts: string[]
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={inp}>
      <option value="">Select account</option>
      {accounts.map(a => <option key={a} value={a}>{a}</option>)}
    </select>
  )
}

function EntityPicker({ value, onChange, options, placeholder, onAddNew }: {
  value: string; onChange: (v: string) => void; options: string[]
  placeholder?: string; onAddNew?: (v: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [newVal, setNewVal] = useState('')

  if (adding) {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <input autoFocus value={newVal} onChange={e => setNewVal(e.target.value)}
          placeholder={`New ${placeholder || 'name'}`} style={{ ...inp, flex: 1 }}
          onKeyDown={e => {
            if (e.key === 'Enter' && newVal.trim()) {
              onAddNew?.(newVal.trim()); onChange(newVal.trim()); setAdding(false); setNewVal('')
            }
          }}
        />
        <button onClick={() => { if (newVal.trim()) { onAddNew?.(newVal.trim()); onChange(newVal.trim()); setAdding(false); setNewVal('') } }}
          style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          Add
        </button>
        <button onClick={() => { setAdding(false); setNewVal('') }}
          style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 10px', cursor: 'pointer', fontSize: 13 }}>
          ✕
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inp, flex: 1, appearance: 'none' as any }}>
        <option value="">{placeholder || 'Select...'}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {onAddNew && (
        <button onClick={() => setAdding(true)} title="Add new"
          style={{ background: 'var(--accent-dim, rgba(93,202,165,0.1))', color: 'var(--accent)', border: '1px solid var(--accent-border, rgba(93,202,165,0.3))', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>
          +
        </button>
      )}
    </div>
  )
}

function Pill({ value, options, onChange }: { value: number; options: number[]; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)}
          style={{
            padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: value === o ? 'none' : '1px solid var(--border)',
            background: value === o ? 'var(--accent)' : 'var(--bg-card)',
            color: value === o ? '#000' : 'var(--text-muted)',
          }}>
          {o === 0 ? 'Cash' : `${o}d credit`}
        </button>
      ))}
    </div>
  )
}

function LineItemsEditor({ items, isSale, onChange, products }: {
  items: LineItem[]; isSale: boolean; onChange: (items: LineItem[]) => void; products: string[]
}) {
  function set(idx: number, key: string, val: any) {
    onChange(items.map((it, i) => i === idx ? { ...it, [key]: val } : it))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, idx) => (
        <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>ITEM {idx + 1}</span>
            {items.length > 1 && (
              <button onClick={() => onChange(items.filter((_, i) => i !== idx))}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: 0 }}>✕</button>
            )}
          </div>
          <select value={item.product} onChange={e => set(idx, 'product', e.target.value)}
            style={{ ...inp, marginBottom: 6 }}>
            <option value="">Product / Service</option>
            {products.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="number" min="0" step="0.01" value={item.qty}
              onChange={e => set(idx, 'qty', parseFloat(e.target.value) || 0)}
              placeholder="Qty" style={{ ...inp, width: '38%' }} />
            <input type="number" min="0" step="0.01"
              value={isSale ? (item.unit_price ?? 0) : (item.unit_cost ?? 0)}
              onChange={e => set(idx, isSale ? 'unit_price' : 'unit_cost', parseFloat(e.target.value) || 0)}
              placeholder={isSale ? 'Unit Price' : 'Unit Cost'}
              style={{ ...inp, flex: 1 }} />
          </div>
        </div>
      ))}
      <button onClick={() => onChange([...items, emptyItem(isSale)])}
        style={{ width: '100%', padding: '8px', background: 'none', border: '1px dashed var(--border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
        + Add Item
      </button>
    </div>
  )
}

export default function EntryForm({ masterData, prefill, onSaved }: Props) {
  const { show } = useToast()
  const [type, setType] = useState('sale')
  const [fields, setFieldsAll] = useState<Record<string, any>>(defaultFields('sale'))
  const [loading, setLoading] = useState(false)
  const [conversionPending, setConversionPending] = useState<{ token: string; details: any } | null>(null)
  const [localMaster, setLocalMaster] = useState(masterData)

  useEffect(() => { setLocalMaster(masterData) }, [masterData])

  useEffect(() => {
    if (!prefill) return
    const t = prefill.type || type
    setType(t)
    setFieldsAll({ ...defaultFields(t), ...prefill.fields })
    setConversionPending(null)
  }, [prefill])

  function setField(key: string, val: any) {
    setFieldsAll(f => ({ ...f, [key]: val }))
  }

  function changeType(t: string) {
    setType(t)
    setFieldsAll(defaultFields(t))
    setConversionPending(null)
  }

  async function handleSave(confirmToken?: string) {
    setLoading(true)
    try {
      const body: any = { type, fields: { ...fields } }
      if (confirmToken) { body.confirm_conversion = true; body.pending_save_token = confirmToken }
      const res = await api<any>('/api/entry/save', { method: 'POST', body: JSON.stringify(body) })
      if (res.status === 'needs_conversion_confirmation') {
        setConversionPending({ token: res.pending_save_token, details: res.details })
        return
      }
      show('Entry saved', 'success')
      setFieldsAll(defaultFields(type))
      setConversionPending(null)
      onSaved?.()
    } catch (err: any) {
      show(err.message || 'Save failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const f = fields
  const sf = setField
  const accts = localMaster.accounts

  function renderTypeFields() {
    switch (type) {
      case 'sale': return (
        <>
          <Field name="Customer">
            <EntityPicker value={f.customer || ''} onChange={v => sf('customer', v)}
              options={localMaster.customers} placeholder="Select customer"
              onAddNew={v => setLocalMaster(m => ({ ...m, customers: [...m.customers, v] }))} />
          </Field>
          <Field name="Items">
            <LineItemsEditor items={f.line_items || [emptyItem(true)]} isSale={true}
              onChange={v => sf('line_items', v)} products={localMaster.products} />
          </Field>
          <Field name="Payment Terms">
            <Pill value={f.credit_period ?? 0} options={[0, 7, 14, 30]} onChange={v => sf('credit_period', v)} />
          </Field>
          {(f.credit_period ?? 0) === 0 && (
            <Field name="Cash Account"><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
          )}
        </>
      )

      case 'purchase': return (
        <>
          <Field name="Supplier">
            <EntityPicker value={f.supplier || ''} onChange={v => sf('supplier', v)}
              options={localMaster.suppliers} placeholder="Select supplier"
              onAddNew={v => setLocalMaster(m => ({ ...m, suppliers: [...m.suppliers, v] }))} />
          </Field>
          <Field name="Items">
            <LineItemsEditor items={f.line_items || [emptyItem(false)]} isSale={false}
              onChange={v => sf('line_items', v)} products={localMaster.products} />
          </Field>
          <Field name="Payment Terms">
            <Pill value={f.credit_period ?? 0} options={[0, 7, 14, 30]} onChange={v => sf('credit_period', v)} />
          </Field>
          {(f.credit_period ?? 0) === 0 && (
            <Field name="Account"><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
          )}
        </>
      )

      case 'sales_return': return (
        <>
          <Field name="Customer">
            <EntityPicker value={f.customer || ''} onChange={v => sf('customer', v)}
              options={localMaster.customers} placeholder="Select customer"
              onAddNew={v => setLocalMaster(m => ({ ...m, customers: [...m.customers, v] }))} />
          </Field>
          <Field name="Items Returned">
            <LineItemsEditor items={f.line_items || [emptyItem(true)]} isSale={true}
              onChange={v => sf('line_items', v)} products={localMaster.products} />
          </Field>
          <Field name="Return Type">
            <select value={f.credit_period ?? 0} style={{ ...inp, cursor: 'pointer' }}
              onChange={e => { sf('credit_period', e.target.value === 'cash' ? 0 : 1) }}>
              <option value={0}>Cash Refund</option>
              <option value={1}>Credit (A/R)</option>
            </select>
          </Field>
          {(f.credit_period ?? 0) === 0 && (
            <Field name="Refund Account"><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
          )}
          <Field name="Discount (Rs.)"><TextInput type="number" value={f.discount || ''} onChange={v => sf('discount', v)} placeholder="0" /></Field>
        </>
      )

      case 'purchase_return': return (
        <>
          <Field name="Supplier">
            <EntityPicker value={f.supplier || ''} onChange={v => sf('supplier', v)}
              options={localMaster.suppliers} placeholder="Select supplier"
              onAddNew={v => setLocalMaster(m => ({ ...m, suppliers: [...m.suppliers, v] }))} />
          </Field>
          <Field name="Items Returned">
            <LineItemsEditor items={f.line_items || [emptyItem(false)]} isSale={false}
              onChange={v => sf('line_items', v)} products={localMaster.products} />
          </Field>
          <Field name="Return Type">
            <select value={f.credit_period ?? 0} style={{ ...inp, cursor: 'pointer' }}
              onChange={e => { sf('credit_period', e.target.value === 'cash' ? 0 : 1) }}>
              <option value={0}>Cash Refund Received</option>
              <option value={1}>Credit (A/P)</option>
            </select>
          </Field>
          {(f.credit_period ?? 0) === 0 && (
            <Field name="Refund Account"><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
          )}
        </>
      )

      case 'other_expense': return (
        <>
          <Field name="Vendor">
            <EntityPicker value={f.vendor || ''} onChange={v => sf('vendor', v)}
              options={localMaster.suppliers} placeholder="Select vendor"
              onAddNew={v => setLocalMaster(m => ({ ...m, suppliers: [...m.suppliers, v] }))} />
          </Field>
          <Field name="Category">
            <select value={f.category || ''} onChange={e => sf('category', e.target.value)} style={inp}>
              <option value="">Select category</option>
              {localMaster.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field name="Amount"><TextInput type="number" value={f.amount || ''} onChange={v => sf('amount', v)} placeholder="0.00" /></Field>
          <Field name="Account"><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
        </>
      )

      case 'payment_received': return (
        <>
          <Field name="Customer">
            <EntityPicker value={f.customer || ''} onChange={v => sf('customer', v)}
              options={localMaster.customers} placeholder="Select customer"
              onAddNew={v => setLocalMaster(m => ({ ...m, customers: [...m.customers, v] }))} />
          </Field>
          <Field name="Amount"><TextInput type="number" value={f.amount || ''} onChange={v => sf('amount', v)} placeholder="0.00" /></Field>
          <Field name="Account"><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
        </>
      )

      case 'payment_made': return (
        <>
          <Field name="Payee">
            <EntityPicker value={f.payee || ''} onChange={v => sf('payee', v)}
              options={[...localMaster.suppliers, ...localMaster.staff]} placeholder="Select payee"
              onAddNew={v => setLocalMaster(m => ({ ...m, suppliers: [...m.suppliers, v] }))} />
          </Field>
          <Field name="Amount"><TextInput type="number" value={f.amount || ''} onChange={v => sf('amount', v)} placeholder="0.00" /></Field>
          <Field name="Account"><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
        </>
      )

      case 'payroll': return (
        <>
          <Field name="Total Amount"><TextInput type="number" value={f.amount || ''} onChange={v => sf('amount', v)} placeholder="Total payroll" /></Field>
          <Field name="Account"><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
        </>
      )

      case 'salary_advance': return (
        <>
          <Field name="Employee">
            <EntityPicker value={f.employee || ''} onChange={v => sf('employee', v)}
              options={localMaster.staff} placeholder="Select employee"
              onAddNew={v => setLocalMaster(m => ({ ...m, staff: [...m.staff, v] }))} />
          </Field>
          <Field name="Amount"><TextInput type="number" value={f.amount || ''} onChange={v => sf('amount', v)} placeholder="0.00" /></Field>
          <Field name="Account"><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
        </>
      )

      case 'owner_drawing': return (
        <>
          <Field name="Amount"><TextInput type="number" value={f.amount || ''} onChange={v => sf('amount', v)} placeholder="0.00" /></Field>
          <Field name="Account"><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
        </>
      )

      case 'capital_injection': return (
        <>
          <Field name="Source / Description"><TextInput value={f.source || ''} onChange={v => sf('source', v)} placeholder="e.g. Owner investment" /></Field>
          <Field name="Amount"><TextInput type="number" value={f.amount || ''} onChange={v => sf('amount', v)} placeholder="0.00" /></Field>
          <Field name="Account"><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
        </>
      )

      case 'loan_disbursement': return (
        <>
          <Field name="Lender"><TextInput value={f.lender || ''} onChange={v => sf('lender', v)} placeholder="Lender name" /></Field>
          <Field name="Amount"><TextInput type="number" value={f.amount || ''} onChange={v => sf('amount', v)} placeholder="0.00" /></Field>
          <Field name="Account"><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
        </>
      )

      case 'loan_repayment': return (
        <>
          <Field name="Lender"><TextInput value={f.lender || ''} onChange={v => sf('lender', v)} placeholder="Lender name" /></Field>
          <Field name="Amount"><TextInput type="number" value={f.amount || ''} onChange={v => sf('amount', v)} placeholder="0.00" /></Field>
          <Field name="Account"><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
        </>
      )

      case 'asset_purchase': return (
        <>
          <Field name="Asset Name"><TextInput value={f.asset_name || ''} onChange={v => sf('asset_name', v)} placeholder="e.g. Laptop, Vehicle" /></Field>
          <Field name="Amount"><TextInput type="number" value={f.amount || ''} onChange={v => sf('amount', v)} placeholder="0.00" /></Field>
          <Field name="Account"><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
        </>
      )

      case 'inventory_adjustment': return (
        <>
          <Field name="Product">
            <select value={f.product || ''} onChange={e => sf('product', e.target.value)} style={inp}>
              <option value="">Select product</option>
              {localMaster.products.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field name="Quantity"><TextInput type="number" value={f.qty || ''} onChange={v => sf('qty', v)} placeholder="0" /></Field>
          <Field name="Direction">
            <div style={{ display: 'flex', gap: 8 }}>
              {['add', 'remove'].map(d => (
                <button key={d} onClick={() => sf('direction', d)}
                  style={{ flex: 1, padding: '9px 0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    border: f.direction === d ? 'none' : '1px solid var(--border)',
                    background: f.direction === d ? 'var(--accent)' : 'var(--bg-card)',
                    color: f.direction === d ? '#000' : 'var(--text-muted)',
                  }}>
                  {d === 'add' ? '+ Add Stock' : '− Remove Stock'}
                </button>
              ))}
            </div>
          </Field>
          <Field name="Reason"><TextInput value={f.reason || ''} onChange={v => sf('reason', v)} placeholder="e.g. Damaged goods, stock count" /></Field>
        </>
      )

      case 'intra_transfer': return (
        <>
          <Field name="From Account"><AccountSelect value={f.from_account || ''} onChange={v => sf('from_account', v)} accounts={accts} /></Field>
          <Field name="To Account"><AccountSelect value={f.to_account || ''} onChange={v => sf('to_account', v)} accounts={accts} /></Field>
          <Field name="Amount"><TextInput type="number" value={f.amount || ''} onChange={v => sf('amount', v)} placeholder="0.00" /></Field>
        </>
      )

      case 'conversion': return (
        <>
          <Field name="Finished Good">
            <select value={f.product || ''} onChange={e => sf('product', e.target.value)} style={inp}>
              <option value="">Select finished good</option>
              {localMaster.products.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field name="Quantity to Produce"><TextInput type="number" value={f.qty || ''} onChange={v => sf('qty', v)} placeholder="0" /></Field>
        </>
      )

      default: return null
    }
  }

  return (
    <div>
      <Field name="Entry Type">
        <select value={type} onChange={e => changeType(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
          {ENTRY_GROUPS.map(g => (
            <optgroup key={g.label} label={g.label}>
              {g.types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </optgroup>
          ))}
        </select>
      </Field>

      <Field name="Date">
        <input type="date" value={f.date || ''} onChange={e => sf('date', e.target.value)} style={inp} />
      </Field>

      {renderTypeFields()}

      {conversionPending && (
        <div style={{ background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.35)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#ffaa00' }}>Stock Conversion Required</p>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text-muted)' }}>
            Insufficient finished goods on hand. A production conversion will be posted automatically.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => handleSave(conversionPending.token)} disabled={loading}
              style={{ flex: 1, padding: '10px', background: '#ffaa00', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
              {loading ? 'Saving...' : 'Confirm & Save'}
            </button>
            <button onClick={() => setConversionPending(null)}
              style={{ padding: '10px 14px', background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!conversionPending && (
        <button onClick={() => handleSave()} disabled={loading}
          style={{ width: '100%', padding: '13px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4 }}>
          {loading ? 'Saving...' : 'Save Entry'}
        </button>
      )}
    </div>
  )
}
