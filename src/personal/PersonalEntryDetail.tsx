import { useState } from 'react'
import { api } from '../api'
import { useToast } from '../shared/components/Toast'

const ACCENT = '#5B8DEF'
const ERROR = '#D85A30'

type Workflow = 'documents' | 'notes'

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

function InputField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', background: '#2a2a28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'DM Sans', color: '#e8e7e0', outline: 'none', minHeight: 44 }} />
    </div>
  )
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
      <textarea value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', background: '#2a2a28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'DM Sans', color: '#e8e7e0', outline: 'none', minHeight: 100, resize: 'vertical' }} />
    </div>
  )
}

function initFields(entry: Record<string, any>, workflow: Workflow): Record<string, string> {
  if (workflow === 'documents') return {
    doc_type: entry.doc_type || '',
    related_person: entry.related_person || '',
    issued_date: entry.issued_date || '',
    expiry_date: entry.expiry_date || '',
    notes: entry.notes || '',
  }
  return {
    content: entry.content || '',
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
      const saveBase = workflow === 'documents' ? 'documents' : 'notes'
      await api(`/api/personal/${saveBase}/${entry.id}`, { method: 'PUT', body: JSON.stringify(fields) })
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
      const deleteBase = workflow === 'documents' ? 'documents' : 'notes'
      await api(`/api/personal/${deleteBase}/${entry.id}`, { method: 'DELETE' })
      show('Deleted', 'success')
      onDeleted()
      onClose()
    } catch {
      show('Could not delete', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const btnBase: React.CSSProperties = { flex: 1, padding: '12px', borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans', fontWeight: 600, cursor: 'pointer', border: 'none', minHeight: 44 }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 50 }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 430, margin: '0 auto', background: '#1a1a18', borderRadius: '16px 16px 0 0', padding: '16px 20px 48px', zIndex: 51, maxHeight: '88dvh', overflowY: 'auto', boxShadow: '0 -8px 40px rgba(0,0,0,0.6)' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)', margin: '0 auto 20px' }} />

        {mode === 'confirm_delete' ? (
          <>
            <div style={{ fontSize: 15, fontFamily: 'DM Sans', fontWeight: 600, color: '#e8e7e0', marginBottom: 6 }}>Delete this entry?</div>
            <div style={{ fontSize: 12, fontFamily: 'DM Sans', color: '#9c9b95', marginBottom: 24 }}>This cannot be undone.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setMode('view')} style={{ ...btnBase, background: '#212120', color: '#e8e7e0' }}>Cancel</button>
              <button onClick={doDelete} disabled={deleting} style={{ ...btnBase, background: ERROR, color: '#fff', opacity: deleting ? 0.6 : 1 }}>{deleting ? '...' : 'Delete'}</button>
            </div>
          </>
        ) : mode === 'edit' ? (
          <>
            <div style={{ fontSize: 10, fontFamily: 'DM Mono', fontWeight: 700, color: '#6a6a64', letterSpacing: '0.1em', marginBottom: 16 }}>EDIT</div>
            {workflow === 'documents' && (
              <>
                <InputField label="DOC TYPE" value={fields.doc_type} onChange={v => set('doc_type', v)} />
                <InputField label="PERSON / OWNER" value={fields.related_person} onChange={v => set('related_person', v)} />
                <InputField label="ISSUED DATE" value={fields.issued_date} onChange={v => set('issued_date', v)} type="date" />
                <InputField label="EXPIRY DATE" value={fields.expiry_date} onChange={v => set('expiry_date', v)} type="date" />
                <InputField label="NOTES" value={fields.notes} onChange={v => set('notes', v)} />
              </>
            )}
            {workflow === 'notes' && (
              <TextArea label="CONTENT" value={fields.content} onChange={v => set('content', v)} />
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={() => setMode('view')} style={{ ...btnBase, background: '#212120', color: '#e8e7e0' }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ ...btnBase, background: ACCENT, color: '#fff', opacity: saving ? 0.6 : 1 }}>{saving ? '...' : 'Save'}</button>
            </div>
          </>
        ) : (
          <>
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
                {(entry.photo_url || entry.preview_url) && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64', letterSpacing: '0.08em', marginBottom: 6 }}>DOCUMENT</div>
                    <img
                      src={entry.preview_url || entry.photo_url}
                      alt="document"
                      onClick={() => window.open(entry.photo_url || entry.preview_url, '_blank')}
                      style={{ width: '100%', borderRadius: 8, cursor: 'pointer', maxHeight: 200, objectFit: 'cover' }}
                    />
                  </div>
                )}
              </>
            )}
            {workflow === 'notes' && (
              <>
                <div style={{ fontSize: 13, fontFamily: 'DM Sans', color: '#e8e7e0', lineHeight: 1.6, marginBottom: 14, whiteSpace: 'pre-wrap' }}>
                  {entry.content}
                </div>
                {entry.photo_url && (
                  <img src={entry.photo_url} alt="note photo" onClick={() => window.open(entry.photo_url, '_blank')} style={{ width: '100%', borderRadius: 8, marginBottom: 12, cursor: 'pointer', maxHeight: 200, objectFit: 'cover' }} />
                )}
                <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64' }}>{(entry.created_at || '').slice(0, 10)}</div>
              </>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setMode('edit')} style={{ ...btnBase, background: `${ACCENT}1a`, border: `1px solid ${ACCENT}33`, color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2L12 4.5L4.5 12H2V9.5L9.5 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                Edit
              </button>
              <button onClick={() => setMode('confirm_delete')} style={{ ...btnBase, background: `${ERROR}1a`, border: `1px solid ${ERROR}33`, color: ERROR, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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
