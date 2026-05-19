import { useState } from 'react'
import { api } from '../api'
import { useToast } from '../shared/components/Toast'

const ACCENT = '#5B8DEF'
const ERROR = '#D85A30'

type Workflow = 'money' | 'documents' | 'tasks' | 'notes'

interface Props {
  entry: Record<string, any>
  workflow: Workflow
  onClose: () => void
  onUpdated: () => void
  onDeleted: () => void
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64', letterSpacing: '0.08em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontFamily: 'DM Sans', color: '#e8e7e0', lineHeight: 1.5 }}>{value}</div>
    </div>
  )
}

function InputField({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: '#2a2a28', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8, padding: '9px 12px',
          fontSize: 13, fontFamily: 'DM Sans', color: '#e8e7e0', outline: 'none', minHeight: 44,
        }}
      />
    </div>
  )
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: '#2a2a28', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8, padding: '9px 12px',
          fontSize: 13, fontFamily: 'DM Sans', color: '#e8e7e0', outline: 'none',
          minHeight: 100, resize: 'vertical',
        }}
      />
    </div>
  )
}

function initFields(entry: Record<string, any>, workflow: Workflow): Record<string, string> {
  if (workflow === 'money') return {
    direction: entry.direction || 'out',
    amount: String(entry.amount || ''),
    currency: entry.currency || 'LKR',
    vendor_or_person: entry.vendor_or_person || '',
    category: entry.category || '',
    payment_method: entry.payment_method || '',
    date: entry.date || '',
    recurrence: entry.recurrence || 'none',
    notes: entry.notes || '',
  }
  if (workflow === 'documents') return {
    doc_type: entry.doc_type || '',
    related_person: entry.related_person || '',
    issued_date: entry.issued_date || '',
    expiry_date: entry.expiry_date || '',
    notes: entry.notes || '',
  }
  if (workflow === 'tasks') return {
    description: entry.description || '',
    due_date: entry.due_date || '',
    recurrence: entry.recurrence || 'none',
    notes: entry.notes || '',
  }
  return {
    content: entry.content || '',
    tags: Array.isArray(entry.tags) ? entry.tags.join(', ') : (entry.tags || ''),
  }
}

export default function PersonalEntryDetail({ entry, workflow, onClose, onUpdated, onDeleted }: Props) {
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm_delete'>('view')
  const [fields, setFields] = useState<Record<string, string>>(() => initFields(entry, workflow))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { show } = useToast()

  function set(k: string, v: string) {
    setFields(prev => ({ ...prev, [k]: v }))
  }

  async function save() {
    setSaving(true)
    try {
      const payload: Record<string, any> = { ...fields }
      if (workflow === 'money') payload.amount = parseFloat(payload.amount) || 0
      if (workflow === 'notes') {
        payload.tags = typeof payload.tags === 'string'
          ? payload.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : payload.tags
      }
      await api(`/api/personal/entry/${entry.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      show('Saved', 'success')
      onUpdated()
      onClose()
    } catch {
      show('Could not save', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function doDelete() {
    setDeleting(true)
    try {
      await api(`/api/personal/entry/${entry.id}`, { method: 'DELETE' })
      show('Deleted', 'success')
      onDeleted()
      onClose()
    } catch {
      show('Could not delete', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const btnBase: React.CSSProperties = {
    flex: 1, padding: '12px', borderRadius: 10,
    fontSize: 13, fontFamily: 'DM Sans', fontWeight: 600, cursor: 'pointer', border: 'none',
    minHeight: 44,
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 50 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 430, margin: '0 auto',
        background: '#1a1a18', borderRadius: '16px 16px 0 0',
        padding: '16px 20px 48px', zIndex: 51,
        maxHeight: '88dvh', overflowY: 'auto',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)', margin: '0 auto 20px' }} />

        {mode === 'confirm_delete' ? (
          <>
            <div style={{ fontSize: 15, fontFamily: 'DM Sans', fontWeight: 600, color: '#e8e7e0', marginBottom: 6 }}>Delete this entry?</div>
            <div style={{ fontSize: 12, fontFamily: 'DM Sans', color: '#9c9b95', marginBottom: 24 }}>This cannot be undone.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setMode('view')} style={{ ...btnBase, background: '#212120', color: '#e8e7e0' }}>Cancel</button>
              <button onClick={doDelete} disabled={deleting} style={{ ...btnBase, background: ERROR, color: '#fff', opacity: deleting ? 0.6 : 1 }}>
                {deleting ? '...' : 'Delete'}
              </button>
            </div>
          </>
        ) : mode === 'edit' ? (
          <>
            <div style={{ fontSize: 10, fontFamily: 'DM Mono', fontWeight: 700, color: '#6a6a64', letterSpacing: '0.1em', marginBottom: 16 }}>EDIT</div>
            {workflow === 'money' && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64', letterSpacing: '0.08em', marginBottom: 4 }}>DIRECTION</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['out', 'in'] as const).map(d => (
                      <button key={d} onClick={() => set('direction', d)} style={{
                        flex: 1, padding: '9px', borderRadius: 8, fontSize: 12, fontFamily: 'DM Sans', fontWeight: 600,
                        background: fields.direction === d
                          ? (d === 'out' ? 'rgba(216,90,48,0.15)' : 'rgba(93,202,165,0.15)')
                          : '#212120',
                        border: fields.direction === d
                          ? `1px solid ${d === 'out' ? '#D85A30' : '#5DCAA5'}55`
                          : '1px solid rgba(255,255,255,0.06)',
                        color: fields.direction === d ? (d === 'out' ? '#D85A30' : '#5DCAA5') : '#9c9b95',
                        cursor: 'pointer', minHeight: 44,
                      }}>{d === 'out' ? 'Expense (Out)' : 'Income (In)'}</button>
                    ))}
                  </div>
                </div>
                <InputField label="AMOUNT" value={fields.amount} onChange={v => set('amount', v)} type="number" />
                <InputField label="VENDOR / PERSON" value={fields.vendor_or_person} onChange={v => set('vendor_or_person', v)} />
                <InputField label="CATEGORY" value={fields.category} onChange={v => set('category', v)} />
                <InputField label="DATE" value={fields.date} onChange={v => set('date', v)} type="date" />
                <InputField label="PAYMENT METHOD" value={fields.payment_method} onChange={v => set('payment_method', v)} />
                <InputField label="NOTES" value={fields.notes} onChange={v => set('notes', v)} />
              </>
            )}
            {workflow === 'documents' && (
              <>
                <InputField label="DOC TYPE" value={fields.doc_type} onChange={v => set('doc_type', v)} />
                <InputField label="PERSON / OWNER" value={fields.related_person} onChange={v => set('related_person', v)} />
                <InputField label="ISSUED DATE" value={fields.issued_date} onChange={v => set('issued_date', v)} type="date" />
                <InputField label="EXPIRY DATE" value={fields.expiry_date} onChange={v => set('expiry_date', v)} type="date" />
                <InputField label="NOTES" value={fields.notes} onChange={v => set('notes', v)} />
              </>
            )}
            {workflow === 'tasks' && (
              <>
                <TextArea label="DESCRIPTION" value={fields.description} onChange={v => set('description', v)} />
                <InputField label="DUE DATE" value={fields.due_date} onChange={v => set('due_date', v)} type="date" />
                <InputField label="NOTES" value={fields.notes} onChange={v => set('notes', v)} />
              </>
            )}
            {workflow === 'notes' && (
              <>
                <TextArea label="CONTENT" value={fields.content} onChange={v => set('content', v)} />
                <InputField label="TAGS (comma-separated)" value={fields.tags} onChange={v => set('tags', v)} />
              </>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={() => setMode('view')} style={{ ...btnBase, background: '#212120', color: '#e8e7e0' }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ ...btnBase, background: ACCENT, color: '#fff', opacity: saving ? 0.6 : 1 }}>
                {saving ? '...' : 'Save'}
              </button>
            </div>
          </>
        ) : (
          <>
            {workflow === 'money' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: entry.direction === 'out' ? 'rgba(216,90,48,0.12)' : 'rgba(93,202,165,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, color: entry.direction === 'out' ? '#D85A30' : '#5DCAA5',
                  }}>{entry.direction === 'out' ? '−' : '+'}</div>
                  <div>
                    <div style={{ fontSize: 22, fontFamily: 'DM Mono', fontWeight: 600, color: entry.direction === 'out' ? '#D85A30' : '#5DCAA5' }}>
                      {entry.currency} {Number(entry.amount).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, fontFamily: 'DM Sans', color: '#9c9b95' }}>{entry.vendor_or_person || entry.category || ''}</div>
                  </div>
                </div>
                <Field label="CATEGORY" value={entry.category} />
                <Field label="DATE" value={entry.date} />
                <Field label="PAYMENT METHOD" value={entry.payment_method} />
                {entry.recurrence && entry.recurrence !== 'none' && <Field label="RECURRENCE" value={entry.recurrence} />}
                <Field label="NOTES" value={entry.notes} />
              </>
            )}
            {workflow === 'documents' && (
              <>
                <div style={{ fontSize: 18, fontFamily: 'DM Sans', fontWeight: 600, color: '#e8e7e0', marginBottom: 16 }}>
                  {entry.doc_type || 'Document'}
                </div>
                <Field label="PERSON / OWNER" value={entry.related_person} />
                {entry.key_details && Object.entries(entry.key_details as Record<string, string>).map(([k, v]) => (
                  <Field key={k} label={k.replace(/_/g, ' ').toUpperCase()} value={v} />
                ))}
                <Field label="ISSUED" value={entry.issued_date} />
                {entry.expiry_date && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64', letterSpacing: '0.08em', marginBottom: 3 }}>EXPIRES</div>
                    <div style={{ fontSize: 13, fontFamily: 'DM Sans', color: '#D4A843' }}>{entry.expiry_date}</div>
                  </div>
                )}
                <Field label="NOTES" value={entry.notes} />
              </>
            )}
            {workflow === 'tasks' && (
              <>
                <div style={{ fontSize: 15, fontFamily: 'DM Sans', fontWeight: 600, color: '#e8e7e0', marginBottom: 16, lineHeight: 1.4 }}>
                  {entry.description}
                </div>
                <Field label="DUE DATE" value={entry.due_date} />
                <Field label="STATUS" value={entry.status} />
                {entry.recurrence && entry.recurrence !== 'none' && <Field label="RECURRENCE" value={entry.recurrence} />}
                {(entry.streak_count ?? 0) > 0 && <Field label="STREAK" value={`${entry.streak_count} days`} />}
                <Field label="NOTES" value={entry.notes} />
              </>
            )}
            {workflow === 'notes' && (
              <>
                <div style={{ fontSize: 13, fontFamily: 'DM Sans', color: '#e8e7e0', lineHeight: 1.6, marginBottom: 14, whiteSpace: 'pre-wrap' }}>
                  {entry.content}
                </div>
                {Array.isArray(entry.tags) && entry.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    {entry.tags.map((tag: string) => (
                      <span key={tag} style={{ fontSize: 9, fontFamily: 'DM Mono', fontWeight: 700, background: 'rgba(207,91,160,0.1)', color: '#CF5BA0', borderRadius: 4, padding: '3px 8px' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64' }}>{(entry.created_at || '').slice(0, 10)}</div>
              </>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setMode('edit')} style={{
                ...btnBase,
                background: `${ACCENT}1a`, border: `1px solid ${ACCENT}33`, color: ACCENT,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2L12 4.5L4.5 12H2V9.5L9.5 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                Edit
              </button>
              <button onClick={() => setMode('confirm_delete')} style={{
                ...btnBase,
                background: `${ERROR}1a`, border: `1px solid ${ERROR}33`, color: ERROR,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5H12M5 3.5V2.5H9V3.5M5.5 6V10.5M8.5 6V10.5M3 3.5L3.5 12H10.5L11 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}