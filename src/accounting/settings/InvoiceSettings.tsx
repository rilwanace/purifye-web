import { useState, useEffect, useRef } from 'react'
import { api, apiFormData } from '../../api'
import { useToast } from '../../shared/components/Toast'

interface InvSettings {
  logo_url: string | null
  business_name: string
  address_line_1: string
  address_line_2: string
  phone: string
  email: string
  bank_name: string
  bank_account_name: string
  bank_account_no: string
  bank_branch: string
  default_notes: string
  invoice_prefix: string
  next_invoice_number: number
  vat_registered: boolean
  theme: string
}

const THEMES = [
  { key: 'green', label: 'Professional Green', swatch: '#5DCAA5' },
  { key: 'mono', label: 'Minimal Mono', swatch: '#9c9b95' },
  { key: 'classic', label: 'Warm Classic', swatch: '#D4A843' },
]

const s: Record<string, React.CSSProperties> = {
  section: { padding: '20px 16px', borderBottom: '1px solid var(--border)' },
  title: { fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, fontFamily: 'var(--font-mono)' },
  fieldGroup: { marginBottom: 12 },
  label: { fontSize: 9, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block' },
  inp: { width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'var(--font-sans)' },
  ta: { width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, minHeight: 72, resize: 'vertical' as const, fontFamily: 'var(--font-sans)' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 },
  saveBtn: { height: 46, background: 'var(--accent)', color: '#131311', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '0 24px', fontFamily: 'var(--font-sans)', marginTop: 4 },
  subhead: { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', marginTop: 16, marginBottom: 10 },
}

export default function InvoiceSettings() {
  const { show } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const empty: InvSettings = {
    logo_url: null, business_name: '', address_line_1: '', address_line_2: '',
    phone: '', email: '', bank_name: '', bank_account_name: '', bank_account_no: '',
    bank_branch: '', default_notes: '', invoice_prefix: 'INV-',
    next_invoice_number: 1, vat_registered: false, theme: 'green',
  }
  const [data, setData] = useState<InvSettings>(empty)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    api<any>('/api/settings/invoice')
      .then(d => {
        if (d.ok) setData({
          logo_url: d.logo_url ?? null,
          business_name: d.business_name || '',
          address_line_1: d.address_line_1 || '',
          address_line_2: d.address_line_2 || '',
          phone: d.phone || '',
          email: d.email || '',
          bank_name: d.bank_name || '',
          bank_account_name: d.bank_account_name || '',
          bank_account_no: d.bank_account_no || '',
          bank_branch: d.bank_branch || '',
          default_notes: d.default_notes || '',
          invoice_prefix: d.invoice_prefix || 'INV-',
          next_invoice_number: d.next_invoice_number ?? 1,
          vat_registered: d.vat_registered ?? false,
          theme: d.theme || 'green',
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const set = (k: keyof InvSettings, v: any) => setData(d => ({ ...d, [k]: v }))

  async function save() {
    setSaving(true)
    try {
      await api('/api/settings/invoice', {
        method: 'PUT',
        body: JSON.stringify({
          business_name: data.business_name,
          address_line_1: data.address_line_1 || null,
          address_line_2: data.address_line_2 || null,
          phone: data.phone || null,
          email: data.email || null,
          bank_name: data.bank_name || null,
          bank_account_name: data.bank_account_name || null,
          bank_account_no: data.bank_account_no || null,
          bank_branch: data.bank_branch || null,
          default_notes: data.default_notes || null,
          invoice_prefix: data.invoice_prefix,
          next_invoice_number: data.next_invoice_number,
          vat_registered: data.vat_registered,
          theme: data.theme,
        }),
      })
      show('Invoice settings saved', 'success')
    } catch (err: any) {
      show(err.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function uploadLogo(file: File) {
    if (file.size > 1048576) { show('Logo must be under 1 MB', 'error'); return }
    if (!['image/png', 'image/jpeg'].includes(file.type)) { show('Only PNG or JPEG files allowed', 'error'); return }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await apiFormData<any>('/api/settings/invoice/logo', form)
      if (res.ok) { set('logo_url', res.logo_url); show('Logo uploaded', 'success') }
    } catch (err: any) {
      show(err.message || 'Upload failed', 'error')
    } finally {
      setUploading(false)
    }
  }

  async function removeLogo() {
    try {
      await api('/api/settings/invoice/logo', { method: 'DELETE' })
      set('logo_url', null)
      show('Logo removed', 'success')
    } catch (err: any) {
      show(err.message || 'Remove failed', 'error')
    }
  }

  if (loading) return <div style={{ ...s.section, color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>

  const API = (import.meta as any).env?.VITE_API_BASE || ''

  return (
    <div style={s.section}>
      <div style={s.title}>Invoice Settings</div>

      {/* Logo */}
      <div style={s.fieldGroup}>
        <div style={s.label}>Logo</div>
        {data.logo_url ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <img src={API + data.logo_url} alt="logo" style={{ height: 52, maxWidth: 120, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', padding: 4 }} />
            <button onClick={removeLogo} style={{ fontSize: 12, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
          </div>
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            style={{ border: '1.5px dashed var(--border)', borderRadius: 10, padding: '16px 12px', textAlign: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}
          >
            {uploading ? 'Uploading…' : 'Tap to upload logo (PNG, JPG, max 1 MB)'}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = '' }} />
      </div>

      <div style={s.fieldGroup}>
        <div style={s.label}>Business name</div>
        <input style={s.inp} value={data.business_name} onChange={e => set('business_name', e.target.value)} placeholder="As it appears on invoices" />
      </div>

      <div style={s.fieldGroup}>
        <div style={s.label}>Address line 1</div>
        <input style={s.inp} value={data.address_line_1} onChange={e => set('address_line_1', e.target.value)} placeholder="Street address" />
      </div>
      <div style={s.fieldGroup}>
        <div style={s.label}>Address line 2</div>
        <input style={s.inp} value={data.address_line_2} onChange={e => set('address_line_2', e.target.value)} placeholder="City, Province, Postal code" />
      </div>

      <div style={s.row2}>
        <div>
          <div style={s.label}>Phone</div>
          <input style={s.inp} type="tel" value={data.phone} onChange={e => set('phone', e.target.value)} placeholder="+94 XX XXX XXXX" />
        </div>
        <div>
          <div style={s.label}>Email</div>
          <input style={s.inp} type="email" value={data.email} onChange={e => set('email', e.target.value)} placeholder="billing@example.com" />
        </div>
      </div>

      <div style={{ ...s.subhead }}>Bank Details</div>
      <div style={s.row2}>
        <div>
          <div style={s.label}>Bank name</div>
          <input style={s.inp} value={data.bank_name} onChange={e => set('bank_name', e.target.value)} placeholder="Bank name" />
        </div>
        <div>
          <div style={s.label}>Branch</div>
          <input style={s.inp} value={data.bank_branch} onChange={e => set('bank_branch', e.target.value)} placeholder="Branch" />
        </div>
      </div>
      <div style={s.row2}>
        <div>
          <div style={s.label}>Account name</div>
          <input style={s.inp} value={data.bank_account_name} onChange={e => set('bank_account_name', e.target.value)} placeholder="Account name" />
        </div>
        <div>
          <div style={s.label}>Account number</div>
          <input style={s.inp} value={data.bank_account_no} onChange={e => set('bank_account_no', e.target.value)} placeholder="0000 0000 0000" />
        </div>
      </div>

      <div style={s.fieldGroup}>
        <div style={s.label}>Default notes / payment terms</div>
        <textarea style={s.ta} value={data.default_notes} onChange={e => set('default_notes', e.target.value)} placeholder="e.g. Payment due within 30 days. Thank you for your business." />
      </div>

      <div style={{ ...s.subhead }}>Numbering</div>
      <div style={s.row2}>
        <div>
          <div style={s.label}>Invoice prefix</div>
          <input style={s.inp} value={data.invoice_prefix} onChange={e => set('invoice_prefix', e.target.value.toUpperCase())} placeholder="INV-" maxLength={10} />
        </div>
        <div>
          <div style={s.label}>Starting number</div>
          <input style={s.inp} type="number" min={1} value={data.next_invoice_number} onChange={e => set('next_invoice_number', parseInt(e.target.value) || 1)} />
        </div>
      </div>

      <div style={{ ...s.subhead }}>Theme</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {THEMES.map(t => (
          <button
            key={t.key}
            onClick={() => set('theme', t.key)}
            style={{
              flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
              border: data.theme === t.key ? `2px solid ${t.swatch}` : '1px solid var(--border)',
              background: data.theme === t.key ? `${t.swatch}12` : 'var(--bg-input)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            }}
          >
            <div style={{ width: 28, height: 14, borderRadius: 4, background: t.swatch }} />
            <div style={{ fontSize: 9, color: data.theme === t.key ? t.swatch : 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', lineHeight: 1.3 }}>{t.label}</div>
          </button>
        ))}
      </div>

      <button style={s.saveBtn} onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save Invoice Settings'}
      </button>
    </div>
  )
}
