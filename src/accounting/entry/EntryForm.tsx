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
  prefill?: { type?: string; fields?: Record<string, any>; entryGroup?: string } | null
  onSaved?: () => void
}

const ENTRY_GROUPS = [
  { label: 'Sales & Purchases', types: [
    { value: 'sale',               label: 'Sale' },
    { value: 'purchase',           label: 'Purchase' },
    { value: 'other_expense',      label: 'Other Expense' },
  ]},
  { label: 'Money In', types: [
    { value: 'payment_received',   label: 'Payment Received' },
    { value: 'capital_injection',  label: 'Capital Injection' },
    { value: 'loan_disbursement',  label: 'Loan Disbursement' },
  ]},
  { label: 'Money Out', types: [
    { value: 'payment_made',       label: 'Payment Made' },
    { value: 'payroll',            label: 'Payroll' },
    { value: 'salary_advance',     label: 'Salary Advance' },
    { value: 'owner_drawing',      label: 'Owner Drawing' },
    { value: 'loan_repayment',     label: 'Loan Repayment' },
  ]},
  { label: 'Adjustments', types: [
    { value: 'sales_return',       label: 'Sales Return' },
    { value: 'purchase_return',    label: 'Purchase Return' },
    { value: 'asset_purchase',     label: 'Asset Purchase' },
    { value: 'inventory_adjustment', label: 'Inventory Adjustment' },
    { value: 'intra_transfer',     label: 'Intra-Transfer' },
    { value: 'conversion',         label: 'Conversion (FG)' },
  ]},
]

function emptyItem(isSale: boolean): LineItem {
  return isSale ? { product: '', qty: 1, unit_price: 0 } : { product: '', qty: 1, unit_cost: 0 }
}

function defaultFields(type: string): Record<string, any> {
  const base = { date: new Date().toISOString().slice(0, 10) }
  switch (type) {
    case 'sale': return { ...base, customer: '', line_items: [emptyItem(true)], credit_period: 0, tax_amount: '', account: '' }
    case 'purchase': return { ...base, supplier: '', line_items: [emptyItem(false)], credit_period: 0, tax_amount: '', account: '' }
    case 'sales_return': return { ...base, customer: '', line_items: [emptyItem(true)], account: '' }
    case 'purchase_return': return { ...base, supplier: '', line_items: [emptyItem(false)], account: '' }
    case 'other_expense': return { ...base, vendor: '', category: '', amount: '', tax_amount: '', account: '' }
    case 'payment_received': return { ...base, customer: '', amount: '', account: '' }
    case 'payment_made': return { ...base, payee: '', amount: '', account: '' }
    case 'payroll': return { ...base, month: new Date().toISOString().slice(0, 7), account: '', employees: [] }
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

function Field({ name, children, error }: { name: string; children: React.ReactNode; error?: boolean }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ ...lbl, ...(error ? { color: '#D4A843' } : {}) }}>
        {name}{error ? ' *' : ''}
      </label>
      <div style={error ? { borderRadius: 11, outline: '1.5px solid #D4A843' } : {}}>
        {children}
      </div>
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
          ???
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
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: 0 }}>???</button>
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


function validate(type: string, f: Record<string, any>): Set<string> {
  const err = new Set<string>()
  const empty = (v: any) => !v || String(v).trim() === ''
  const noAmt = (v: any) => !v || parseFloat(String(v)) <= 0
  if (empty(f.date) || isNaN(new Date(f.date).getTime())) err.add('date')
  const noItems = (items: any[]) =>
    !items || items.length === 0 ||
    items.every(it => empty(it.product) || (it.qty || 0) <= 0)

  switch (type) {
    case 'sale':
      if (empty(f.customer)) err.add('customer')
      if (noItems(f.line_items)) err.add('line_items')
      if ((f.credit_period ?? 0) === 0 && empty(f.account)) err.add('account')
      break
    case 'purchase':
      if (empty(f.supplier)) err.add('supplier')
      if (noItems(f.line_items)) err.add('line_items')
      if ((f.credit_period ?? 0) === 0 && empty(f.account)) err.add('account')
      break
    case 'sales_return':
      if (empty(f.customer)) err.add('customer')
      if (noItems(f.line_items)) err.add('line_items')
      if ((f.credit_period ?? 0) === 0 && empty(f.account)) err.add('account')
      break
    case 'purchase_return':
      if (empty(f.supplier)) err.add('supplier')
      if (noItems(f.line_items)) err.add('line_items')
      if ((f.credit_period ?? 0) === 0 && empty(f.account)) err.add('account')
      break
    case 'other_expense':
      if (empty(f.category)) err.add('category')
      if (noAmt(f.amount)) err.add('amount')
      if (empty(f.account)) err.add('account')
      break
    case 'payment_received':
      if (empty(f.customer)) err.add('customer')
      if (noAmt(f.amount)) err.add('amount')
      if (empty(f.account)) err.add('account')
      break
    case 'payment_made':
      if (empty(f.payee)) err.add('payee')
      if (noAmt(f.amount)) err.add('amount')
      if (empty(f.account)) err.add('account')
      break
    case 'payroll': {
      const emps: any[] = f.employees || []
      if (!emps.length) err.add('employees')
      const anyPaying = emps.some((e: any) => parseFloat(String(e.paying_now || 0)) > 0)
      if (anyPaying && empty(f.account)) err.add('account')
      break
    }
    case 'salary_advance':
      if (empty(f.employee)) err.add('employee')
      if (noAmt(f.amount)) err.add('amount')
      if (empty(f.account)) err.add('account')
      break
    case 'owner_drawing':
      if (noAmt(f.amount)) err.add('amount')
      if (empty(f.account)) err.add('account')
      break
    case 'capital_injection':
      if (empty(f.source)) err.add('source')
      if (noAmt(f.amount)) err.add('amount')
      if (empty(f.account)) err.add('account')
      break
    case 'loan_disbursement':
      if (empty(f.lender)) err.add('lender')
      if (noAmt(f.amount)) err.add('amount')
      if (empty(f.account)) err.add('account')
      break
    case 'loan_repayment':
      if (empty(f.lender)) err.add('lender')
      if (noAmt(f.amount)) err.add('amount')
      if (empty(f.account)) err.add('account')
      break
    case 'asset_purchase':
      if (empty(f.asset_name)) err.add('asset_name')
      if (noAmt(f.amount)) err.add('amount')
      if (empty(f.account)) err.add('account')
      break
    case 'intra_transfer':
      if (empty(f.from_account)) err.add('from_account')
      if (empty(f.to_account)) err.add('to_account')
      if (noAmt(f.amount)) err.add('amount')
      break
    case 'inventory_adjustment':
      if (empty(f.product)) err.add('product')
      if (!f.qty || parseFloat(String(f.qty)) <= 0) err.add('qty')
      if (empty(f.direction)) err.add('direction')
      if (empty(f.reason)) err.add('reason')
      break
    case 'conversion':
      if (empty(f.product)) err.add('product')
      if (!f.qty || parseFloat(String(f.qty)) <= 0) err.add('qty')
      break
  }
  return err
}

export default function EntryForm({ masterData, prefill, onSaved }: Props) {
  const { show } = useToast()
  const [type, setType] = useState('sale')
  const [fields, setFieldsAll] = useState<Record<string, any>>(defaultFields('sale'))
  const [loading, setLoading] = useState(false)
  const [editEntryGroup, setEditEntryGroup] = useState<string | null>(null)
  const [conversionPending, setConversionPending] = useState<{ token: string; details: any } | null>(null)
  const [localMaster, setLocalMaster] = useState(masterData)
  const [payrollAdvances, setPayrollAdvances] = useState<Record<string, number>>({})

  useEffect(() => { setLocalMaster(masterData) }, [masterData])

  useEffect(() => {
    if (type !== 'payroll') return
    api<any>('/api/payroll/advances')
      .then(res => {
        const m: Record<string, number> = {}
        for (const a of (res.advances || [])) m[a.employee] = a.outstanding_advance
        setPayrollAdvances(m)
      })
      .catch(() => {})
  }, [type])

  useEffect(() => {
    if (!prefill) return
    setEditEntryGroup(prefill.entryGroup || null)
    const t = prefill.type || type
    setType(t)
    setFieldsAll({ ...defaultFields(t), ...prefill.fields })
    setConversionPending(null)
  }, [prefill])

  function setField(key: string, val: any) {
    setFieldsAll(f => ({ ...f, [key]: val }))
  }

  function changeType(t: string) {
    setEditEntryGroup(null)
    setType(t)
    setFieldsAll(defaultFields(t))
    setConversionPending(null)
  }

  async function handlePayrollSave() {
    setLoading(true)
    try {
      const emps: any[] = fields.employees || []
      if (!emps.length) { show('Add at least one employee', 'error'); return }
      for (const e of emps) {
        if (!(e.employee || '').trim()) { show('Employee name required for all rows', 'error'); return }
        if (!(parseFloat(String(e.salary || 0)) > 0)) { show(`Salary must be > 0 for ${e.employee || 'employee'}`, 'error'); return }
        const pay = parseFloat(String(e.paying_now || 0))
        const sal = parseFloat(String(e.salary || 0))
        const adv = payrollAdvances[e.employee] || 0
        if (pay > sal + adv + 0.01) { show(`Payment for ${e.employee} exceeds salary + advance (Rs. ${(sal + adv).toLocaleString()})`, 'error'); return }
      }
      const anyPaying = emps.some(e => parseFloat(String(e.paying_now || 0)) > 0)
      if (anyPaying && !fields.account) { show('Select payment account', 'error'); return }
      const body = {
        month: fields.month,
        payment_date: fields.date,
        account: fields.account || undefined,
        employees: emps.map(e => {
          const basic = parseFloat(String(e.basic || 0))
          const row: any = {
            employee: e.employee,
            salary: parseFloat(String(e.salary || 0)),
            paying_now: parseFloat(String(e.paying_now || 0)),
            deduct_advance: e.deduct_advance !== false,
          }
          if (basic > 0) {
            row.basic = basic
            row.allowances = parseFloat(String(e.allowances || 0))
            row.ot = parseFloat(String(e.ot || 0))
            row.deductions = parseFloat(String(e.deductions || 0))
            row.employee_epf = parseFloat(String(e.employee_epf || 0))
            row.etf = parseFloat(String(e.etf || 0))
          }
          return row
        }),
      }
      await api<any>('/api/payroll/save', { method: 'POST', body: JSON.stringify(body) })
      show('Payroll saved', 'success')
      setFieldsAll(defaultFields('payroll'))
      onSaved?.()
    } catch (err: any) {
      show(err.message || 'Save failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(confirmToken?: string, withInvoice = false) {
    if (type === 'payroll') { await handlePayrollSave(); return }
    setLoading(true)
    try {
      const body: any = { type, fields: { ...fields } }
      if (confirmToken) { body.confirm_conversion = true; body.pending_save_token = confirmToken }
      if (withInvoice) body.generate_invoice = true
      const endpoint = editEntryGroup ? '/api/entry/replace' : '/api/entry/save'
      if (editEntryGroup) body.original_entry_group = editEntryGroup
      const res = await api<any>(endpoint, { method: 'POST', body: JSON.stringify(body) })
      if (res.status === 'needs_conversion_confirmation') {
        setConversionPending({ token: res.pending_save_token, details: res.details })
        return
      }
      show(editEntryGroup ? 'Entry updated' : 'Entry saved', 'success')
      if (res.invoice_no) {
        const apiBase = (import.meta as any).env?.VITE_API_BASE || ''
        window.open(`${apiBase}/api/settings/invoice/${encodeURIComponent(res.invoice_no)}/pdf`, '_blank', 'noopener,noreferrer')
      }
      setFieldsAll(defaultFields(type))
      setConversionPending(null)
      setEditEntryGroup(null)
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
  const errors = validate(type, f)

  function renderTypeFields() {
    switch (type) {
      case 'sale': return (
        <>
          <Field name="Customer" error={errors.has('customer')}>
            <EntityPicker value={f.customer || ''} onChange={v => sf('customer', v)}
              options={localMaster.customers} placeholder="Select customer"
              onAddNew={v => setLocalMaster(m => ({ ...m, customers: [...m.customers, v] }))} />
          </Field>
          <Field name="Items" error={errors.has('line_items')}>
            <LineItemsEditor items={f.line_items || [emptyItem(true)]} isSale={true}
              onChange={v => sf('line_items', v)} products={localMaster.products} />
          </Field>
          <Field name="Tax Amount (Rs.)"><TextInput type="number" value={f.tax_amount || ''} onChange={v => sf('tax_amount', v)} placeholder="0" /></Field>
          <Field name="Payment Terms">
            <Pill value={f.credit_period ?? 0} options={[0, 7, 14, 30]} onChange={v => sf('credit_period', v)} />
          </Field>
          {(f.credit_period ?? 0) === 0 && (
            <Field name="Cash Account" error={errors.has('account')}><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
          )}
        </>
      )

      case 'purchase': return (
        <>
          <Field name="Supplier" error={errors.has('supplier')}>
            <EntityPicker value={f.supplier || ''} onChange={v => sf('supplier', v)}
              options={localMaster.suppliers} placeholder="Select supplier"
              onAddNew={v => setLocalMaster(m => ({ ...m, suppliers: [...m.suppliers, v] }))} />
          </Field>
          <Field name="Items" error={errors.has('line_items')}>
            <LineItemsEditor items={f.line_items || [emptyItem(false)]} isSale={false}
              onChange={v => sf('line_items', v)} products={localMaster.products} />
          </Field>
          <Field name="Tax Amount (Rs.)"><TextInput type="number" value={f.tax_amount || ''} onChange={v => sf('tax_amount', v)} placeholder="0" /></Field>
          <Field name="Payment Terms">
            <Pill value={f.credit_period ?? 0} options={[0, 7, 14, 30]} onChange={v => sf('credit_period', v)} />
          </Field>
          {(f.credit_period ?? 0) === 0 && (
            <Field name="Account" error={errors.has('account')}><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
          )}
        </>
      )

      case 'sales_return': return (
        <>
          <Field name="Customer" error={errors.has('customer')}>
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
              onChange={e => { sf('credit_period', e.target.value === '0' ? 0 : 1) }}>
              <option value={0}>Cash Refund</option>
              <option value={1}>Credit (A/R)</option>
            </select>
          </Field>
          {(f.credit_period ?? 0) === 0 && (
            <Field name="Refund Account" error={errors.has('account')}><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
          )}
          <Field name="Discount (Rs.)"><TextInput type="number" value={f.discount || ''} onChange={v => sf('discount', v)} placeholder="0" /></Field>
        </>
      )

      case 'purchase_return': return (
        <>
          <Field name="Supplier" error={errors.has('supplier')}>
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
              onChange={e => { sf('credit_period', e.target.value === '0' ? 0 : 1) }}>
              <option value={0}>Cash Refund Received</option>
              <option value={1}>Credit (A/P)</option>
            </select>
          </Field>
          {(f.credit_period ?? 0) === 0 && (
            <Field name="Refund Account" error={errors.has('account')}><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
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
          <Field name="Category" error={errors.has('category')}>
            <select value={f.category || ''} onChange={e => sf('category', e.target.value)} style={inp}>
              <option value="">Select category</option>
              {localMaster.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field name="Amount" error={errors.has('amount')}><TextInput type="number" value={f.amount || ''} onChange={v => sf('amount', v)} placeholder="0.00" /></Field>
          <Field name="Tax Amount (Rs.)"><TextInput type="number" value={f.tax_amount || ''} onChange={v => sf('tax_amount', v)} placeholder="0" /></Field>
          <Field name="Account" error={errors.has('account')}><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
        </>
      )

      case 'payment_received': return (
        <>
          <Field name="Customer" error={errors.has('customer')}>
            <EntityPicker value={f.customer || ''} onChange={v => sf('customer', v)}
              options={localMaster.customers} placeholder="Select customer"
              onAddNew={v => setLocalMaster(m => ({ ...m, customers: [...m.customers, v] }))} />
          </Field>
          <Field name="Amount" error={errors.has('amount')}><TextInput type="number" value={f.amount || ''} onChange={v => sf('amount', v)} placeholder="0.00" /></Field>
          <Field name="Account" error={errors.has('account')}><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
        </>
      )

      case 'payment_made': return (
        <>
          <Field name="Payee" error={errors.has('payee')}>
            <EntityPicker value={f.payee || ''} onChange={v => sf('payee', v)}
              options={[...localMaster.suppliers, ...localMaster.staff]} placeholder="Select payee"
              onAddNew={v => setLocalMaster(m => ({ ...m, suppliers: [...m.suppliers, v] }))} />
          </Field>
          <Field name="Amount" error={errors.has('amount')}><TextInput type="number" value={f.amount || ''} onChange={v => sf('amount', v)} placeholder="0.00" /></Field>
          <Field name="Account" error={errors.has('account')}><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
        </>
      )

      case 'payroll': return (
        <>
          <Field name="Payroll Month">
            <input type="month" value={f.month || ''} onChange={e => sf('month', e.target.value)} style={inp} />
          </Field>

          {(f.employees || []).map((emp: any, idx: number) => {
            const outstanding = payrollAdvances[emp.employee] || 0
            const salary = parseFloat(String(emp.salary || 0))
            const payingNow = parseFloat(String(emp.paying_now || 0))
            const maxPay = salary + outstanding
            const overpay = payingNow > maxPay + 0.01

            function updEmp(key: string, val: any) {
              sf('employees', (fields.employees || []).map((e: any, i: number) => i === idx ? { ...e, [key]: val } : e))
            }

            function onDetailChange(key: string, val: string) {
              const next = { ...emp, [key]: val }
              const b = parseFloat(String(next.basic || 0))
              const a = parseFloat(String(next.allowances || 0))
              const o = parseFloat(String(next.ot || 0))
              const d = parseFloat(String(next.deductions || 0))
              const epf = parseFloat(String(next.employee_epf || 0))
              const auto = Math.round(Math.max(0, b + a + o - d - epf) * 100) / 100
              sf('employees', (fields.employees || []).map((e: any, i: number) =>
                i === idx ? { ...next, salary: b > 0 ? String(auto) : next.salary } : e
              ))
            }

            function toggleExpand() {
              if (!emp.expanded && !(emp.basic)) {
                sf('employees', (fields.employees || []).map((e: any, i: number) =>
                  i === idx ? { ...e, expanded: true, basic: e.salary || '' } : e
                ))
              } else {
                updEmp('expanded', !emp.expanded)
              }
            }

            return (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${overpay ? '#D4A843' : 'var(--border)'}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <select value={emp.employee || ''} onChange={e => updEmp('employee', e.target.value)} style={{ ...inp, flex: 1 }}>
                    <option value="">Select employee</option>
                    {localMaster.staff.map((s: string) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={toggleExpand} title="Toggle detail"
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, padding: '0 8px', flexShrink: 0 }}>
                    {emp.expanded ? '???' : '???'}
                  </button>
                  {(f.employees || []).length > 1 && (
                    <button onClick={() => sf('employees', (fields.employees || []).filter((_: any, i: number) => i !== idx))}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, padding: '0 2px', flexShrink: 0 }}>???</button>
                  )}
                </div>

                {emp.expanded && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div><label style={lbl}>Basic</label><input type="number" value={emp.basic || ''} onChange={e => onDetailChange('basic', e.target.value)} placeholder="0" style={inp} /></div>
                    <div><label style={lbl}>Allowances</label><input type="number" value={emp.allowances || ''} onChange={e => onDetailChange('allowances', e.target.value)} placeholder="0" style={inp} /></div>
                    <div><label style={lbl}>OT</label><input type="number" value={emp.ot || ''} onChange={e => onDetailChange('ot', e.target.value)} placeholder="0" style={inp} /></div>
                    <div><label style={lbl}>Deductions</label><input type="number" value={emp.deductions || ''} onChange={e => onDetailChange('deductions', e.target.value)} placeholder="0" style={inp} /></div>
                    <div><label style={lbl}>Emp EPF</label><input type="number" value={emp.employee_epf || ''} onChange={e => onDetailChange('employee_epf', e.target.value)} placeholder="0" style={inp} /></div>
                    <div><label style={lbl}>ETF</label><input type="number" value={emp.etf || ''} onChange={e => onDetailChange('etf', e.target.value)} placeholder="0" style={inp} /></div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div>
                    <label style={lbl}>{emp.expanded ? 'Net Salary (Auto)' : 'Salary'}</label>
                    {emp.expanded ? (
                      <div style={{ ...inp, background: 'rgba(93,202,165,0.06)', color: 'var(--accent)', cursor: 'default' }}>
                        {salary > 0 ? salary.toLocaleString() : '???'}
                      </div>
                    ) : (
                      <input type="number" value={emp.salary || ''} onChange={e => updEmp('salary', e.target.value)} placeholder="0" style={inp} />
                    )}
                  </div>
                  <div>
                    <label style={{ ...lbl, ...(overpay ? { color: '#D4A843' } : {}) }}>Paying Now{overpay ? ' ???' : ''}</label>
                    <input type="number" value={emp.paying_now || ''} onChange={e => updEmp('paying_now', e.target.value)} placeholder="0"
                      style={{ ...inp, ...(overpay ? { outline: '1.5px solid #D4A843' } : {}) }} />
                  </div>
                </div>

                {emp.employee && outstanding > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: 'var(--text-muted)' }}>
                      <input type="checkbox" checked={emp.deduct_advance !== false} onChange={e => updEmp('deduct_advance', e.target.checked)} />
                      Deduct advance
                    </label>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                      Rs. {outstanding.toLocaleString()} outstanding
                    </span>
                  </div>
                )}

                {overpay && (
                  <div style={{ fontSize: 11, color: '#D4A843', marginTop: 5, fontFamily: 'var(--font-mono)' }}>
                    Max: Rs. {maxPay.toLocaleString()} (salary + advance)
                  </div>
                )}
              </div>
            )
          })}

          <button onClick={() => sf('employees', [...(f.employees || []),
            { employee: '', salary: '', paying_now: '', deduct_advance: true, basic: '', allowances: '', ot: '', deductions: '', employee_epf: '', etf: '', expanded: false }
          ])} style={{ width: '100%', padding: 8, background: 'none', border: '1px dashed var(--border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, marginBottom: 14 }}>
            + Add Employee
          </button>

          {(f.employees || []).length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              {[
                ['Total salary', (f.employees || []).reduce((s: number, e: any) => s + (parseFloat(String(e.salary || 0)) || 0), 0)],
                ['Total paying', (f.employees || []).reduce((s: number, e: any) => s + (parseFloat(String(e.paying_now || 0)) || 0), 0)],
              ].map(([label, val]: any) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span>Rs. {Number(val).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {(f.employees || []).some((e: any) => parseFloat(String(e.paying_now || 0)) > 0) && (
            <Field name="Payment Account" error={errors.has('account')}>
              <AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} />
            </Field>
          )}
        </>
      )

      case 'salary_advance': return (
        <>
          <Field name="Employee" error={errors.has('employee')}>
            <EntityPicker value={f.employee || ''} onChange={v => sf('employee', v)}
              options={localMaster.staff} placeholder="Select employee"
              onAddNew={v => setLocalMaster(m => ({ ...m, staff: [...m.staff, v] }))} />
          </Field>
          <Field name="Amount" error={errors.has('amount')}><TextInput type="number" value={f.amount || ''} onChange={v => sf('amount', v)} placeholder="0.00" /></Field>
          <Field name="Account" error={errors.has('account')}><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
        </>
      )

      case 'owner_drawing': return (
        <>
          <Field name="Amount" error={errors.has('amount')}><TextInput type="number" value={f.amount || ''} onChange={v => sf('amount', v)} placeholder="0.00" /></Field>
          <Field name="Account" error={errors.has('account')}><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
        </>
      )

      case 'capital_injection': return (
        <>
          <Field name="Source / Description" error={errors.has('source')}><TextInput value={f.source || ''} onChange={v => sf('source', v)} placeholder="e.g. Owner investment" /></Field>
          <Field name="Amount" error={errors.has('amount')}><TextInput type="number" value={f.amount || ''} onChange={v => sf('amount', v)} placeholder="0.00" /></Field>
          <Field name="Account" error={errors.has('account')}><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
        </>
      )

      case 'loan_disbursement': return (
        <>
          <Field name="Lender" error={errors.has('lender')}><TextInput value={f.lender || ''} onChange={v => sf('lender', v)} placeholder="Lender name" /></Field>
          <Field name="Amount" error={errors.has('amount')}><TextInput type="number" value={f.amount || ''} onChange={v => sf('amount', v)} placeholder="0.00" /></Field>
          <Field name="Account" error={errors.has('account')}><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
        </>
      )

      case 'loan_repayment': return (
        <>
          <Field name="Lender" error={errors.has('lender')}><TextInput value={f.lender || ''} onChange={v => sf('lender', v)} placeholder="Lender name" /></Field>
          <Field name="Amount" error={errors.has('amount')}><TextInput type="number" value={f.amount || ''} onChange={v => sf('amount', v)} placeholder="0.00" /></Field>
          <Field name="Account" error={errors.has('account')}><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
        </>
      )

      case 'asset_purchase': return (
        <>
          <Field name="Asset Name" error={errors.has('asset_name')}><TextInput value={f.asset_name || ''} onChange={v => sf('asset_name', v)} placeholder="e.g. Laptop, Vehicle" /></Field>
          <Field name="Amount" error={errors.has('amount')}><TextInput type="number" value={f.amount || ''} onChange={v => sf('amount', v)} placeholder="0.00" /></Field>
          <Field name="Account" error={errors.has('account')}><AccountSelect value={f.account || ''} onChange={v => sf('account', v)} accounts={accts} /></Field>
        </>
      )

      case 'inventory_adjustment': return (
        <>
          <Field name="Product" error={errors.has('product')}>
            <select value={f.product || ''} onChange={e => sf('product', e.target.value)} style={inp}>
              <option value="">Select product</option>
              {localMaster.products.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field name="Quantity" error={errors.has('qty')}><TextInput type="number" value={f.qty || ''} onChange={v => sf('qty', v)} placeholder="0" /></Field>
          <Field name="Direction">
            <div style={{ display: 'flex', gap: 8 }}>
              {['add', 'remove'].map(d => (
                <button key={d} onClick={() => sf('direction', d)}
                  style={{ flex: 1, padding: '9px 0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    border: f.direction === d ? 'none' : '1px solid var(--border)',
                    background: f.direction === d ? 'var(--accent)' : 'var(--bg-card)',
                    color: f.direction === d ? '#000' : 'var(--text-muted)',
                  }}>
                  {d === 'add' ? '+ Add Stock' : '??? Remove Stock'}
                </button>
              ))}
            </div>
          </Field>
          <Field name="Reason" error={errors.has('reason')}><TextInput value={f.reason || ''} onChange={v => sf('reason', v)} placeholder="e.g. Damaged goods, stock count" /></Field>
        </>
      )

      case 'intra_transfer': return (
        <>
          <Field name="From Account" error={errors.has('from_account')}><AccountSelect value={f.from_account || ''} onChange={v => sf('from_account', v)} accounts={accts} /></Field>
          <Field name="To Account" error={errors.has('to_account')}><AccountSelect value={f.to_account || ''} onChange={v => sf('to_account', v)} accounts={accts} /></Field>
          <Field name="Amount" error={errors.has('amount')}><TextInput type="number" value={f.amount || ''} onChange={v => sf('amount', v)} placeholder="0.00" /></Field>
        </>
      )

      case 'conversion': return (
        <>
          <Field name="Finished Good" error={errors.has('product')}>
            <select value={f.product || ''} onChange={e => sf('product', e.target.value)} style={inp}>
              <option value="">Select finished good</option>
              {localMaster.products.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field name="Quantity to Produce" error={errors.has('qty')}><TextInput type="number" value={f.qty || ''} onChange={v => sf('qty', v)} placeholder="0" /></Field>
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

      <Field name={type === 'payroll' ? 'Payment Date' : 'Date'} error={errors.has('date')}>
        <input type="date" value={f.date || ''} onChange={e => sf('date', e.target.value)} style={inp} />
      </Field>

      <div key={type}>{renderTypeFields()}</div>

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
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={() => handleSave()} disabled={loading || errors.size > 0}
            style={{ flex: 1, padding: '13px', background: errors.size > 0 ? '#3a3a38' : 'var(--accent)', color: errors.size > 0 ? '#6a6a64' : '#000', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: (loading || errors.size > 0) ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Saving...' : editEntryGroup ? 'Update Entry' : 'Save Entry'}
          </button>
          {type === 'sale' && !editEntryGroup && (
            <button onClick={() => handleSave(undefined, true)} disabled={loading || errors.size > 0}
              style={{ flex: 1, padding: '13px', background: errors.size > 0 ? '#3a3a38' : 'rgba(93,202,165,0.12)', color: errors.size > 0 ? '#6a6a64' : '#5DCAA5', border: errors.size > 0 ? 'none' : '1px solid rgba(93,202,165,0.3)', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: (loading || errors.size > 0) ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? '\u2026' : '+ Invoice'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
