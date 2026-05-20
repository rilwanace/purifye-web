import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../shared/components/Toast'
import PersonalDocViewer from './PersonalDocViewer'
import ThreadManager from './ThreadManager'

const DOC_COLOR = '#5B8DEF'

function toTitleCase(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function expiryLabel(dateStr: string): string {
  const exp = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((exp.getTime() - today.getTime()) / 86400000)
  if (diffDays < 0) {
    const n = Math.abs(diffDays)
    return `Expired ${n} ${n === 1 ? 'day' : 'days'} ago`
  }
  if (diffDays === 0) return 'Expires today'
  if (diffDays === 1) return 'Expires tomorrow'
  return `Expires in ${diffDays} days`
}

interface Thread {
  id: string
  name: string
}

interface DocEntry {
  id: string
  doc_type?: string
  key_details?: Record<string, string>
  expiry_date?: string
  issued_date?: string
  related_person?: string
  notes?: string
  thread_id?: string
  created_at: string
}

interface KVRow {
  key: string
  value: string
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#2a2a28', border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 8, color: '#e8e7e0', fontSize: 14, fontFamily: 'DM Sans',
  padding: '10px 12px', boxSizing: 'border-box', outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontFamily: 'DM Mono', color: '#9c9b95', marginBottom: 6, display: 'block',
}

function QuickAddDoc({ onClose, onSaved, threads }: {
  onClose: () => void
  onSaved: () => void
  threads: Thread[]
}) {
  const [docType, setDocType] = useState('')
  const [threadId, setThreadId] = useState('')
  const [kvRows, setKvRows] = useState<KVRow[]>([{ key: '', value: '' }])
  const [expiryDate, setExpiryDate] = useState('')
  const [issuedDate, setIssuedDate] = useState('')
  const [relatedPerson, setRelatedPerson] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const { show } = useToast()

  function addRow() {
    setKvRows(rows => [...rows, { key: '', value: '' }])
  }

  function removeRow(i: number) {
    setKvRows(rows => rows.filter((_, idx) => idx !== i))
  }

  function updateRow(i: number, field: 'key' | 'value', val: string) {
    setKvRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  async function save() {
    if (!docType.trim()) return
    setSaving(true)
    try {
      const key_details: Record<string, string> = {}
      kvRows.forEach(r => {
        if (r.key.trim()) key_details[r.key.trim()] = r.value.trim()
      })
      await api('/api/personal/confirm', {
        method: 'POST',
        body: JSON.stringify({
          source_input_id: null,
          workflow: 'documents',
          thread_id: threadId || null,
          fields: {
            doc_type: docType.trim(),
            key_details: Object.keys(key_details).length ? key_details : {},
            expiry_date: expiryDate || null,
            issued_date: issuedDate || null,
            related_person: relatedPerson || null,
            notes: notes || null,
            photo_urls: [],
            extracted_text: null,
          },
        }),
      })
      show('Saved', 'success')
      onSaved()
      onClose()
    } catch {
      show('Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430,
          background: '#1a1a18', borderRadius: '16px 16px 0 0',
          maxHeight: '85vh', overflowY: 'auto',
          padding: '0 20px 32px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 16px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#6a6a64' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <span style={labelStyle}>DOC TYPE</span>
            <input
              type="text"
              placeholder="e.g. Passport, Insurance Policy"
              value={docType}
              onChange={e => setDocType(e.target.value)}
              style={inputStyle}
              autoFocus
            />
          </div>

          <div>
            <span style={labelStyle}>THREAD</span>
            <select value={threadId} onChange={e => setThreadId(e.target.value)} style={{ ...inputStyle, appearance: 'none' as any }}>
              <option value="">No thread</option>
              {threads.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div>
            <span style={labelStyle}>KEY DETAILS</span>
            {kvRows.map((row, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Field name"
                  value={row.key}
                  onChange={e => updateRow(i, 'key', e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={row.value}
                  onChange={e => updateRow(i, 'value', e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={() => removeRow(i)}
                  style={{
                    flexShrink: 0, width: 28, height: 28, borderRadius: 6,
                    background: 'rgba(255,255,255,0.06)', border: 'none',
                    color: '#9c9b95', cursor: 'pointer', fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={addRow}
              style={{
                background: 'none', border: 'none', color: DOC_COLOR,
                fontSize: 13, fontFamily: 'DM Sans', cursor: 'pointer',
                padding: '4px 0', display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              + Add field
            </button>
          </div>

          <div>
            <span style={labelStyle}>EXPIRY DATE</span>
            <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <span style={labelStyle}>ISSUED DATE</span>
            <input type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <span style={labelStyle}>RELATED PERSON</span>
            <input
              type="text"
              placeholder="e.g. John Silva"
              value={relatedPerson}
              onChange={e => setRelatedPerson(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <span style={labelStyle}>NOTES</span>
            <textarea
              rows={2}
              placeholder="Optional note"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ ...inputStyle, resize: 'none' as any, lineHeight: '1.5' }}
            />
          </div>

          <button
            onClick={save}
            disabled={!docType.trim() || saving}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 12,
              background: !docType.trim() ? '#2a2a28' : DOC_COLOR,
              color: !docType.trim() ? '#6a6a64' : 'white',
              fontSize: 14, fontFamily: 'DM Sans', fontWeight: 600,
              border: 'none', cursor: !docType.trim() ? 'default' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DocList() {
  const [docs, setDocs] = useState<DocEntry[]>([])
  const [allDocs, setAllDocs] = useState<DocEntry[]>([])
  const [threads, setThreads] = useState<Thread[]>([])
  const [threadFilter, setThreadFilter] = useState<string | null>(null)
  const [showManager, setShowManager] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  function loadThreads() {
    api<Thread[]>('/api/personal/threads?workflow=documents')
      .then(setThreads)
      .catch(() => setThreads([]))
  }

  function loadAllDocs() {
    api<DocEntry[]>('/api/personal/documents')
      .then(setAllDocs)
      .catch(() => setAllDocs([]))
  }

  function loadDocs(tid: string | null) {
    setLoading(true)
    const params = tid ? `?thread_id=${tid}` : ''
    api<DocEntry[]>(`/api/personal/documents${params}`)
      .then(setDocs)
      .catch(() => setDocs([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadThreads(); loadAllDocs() }, [])
  useEffect(() => { loadDocs(threadFilter) }, [threadFilter])

  useEffect(() => {
    const eid = (location.state as any)?.openEntryId
    if (eid) {
      navigate(`/personal/docs/view/${eid}`, { replace: true })
    }
  }, [location.state])

  function reload() {
    loadThreads()
    loadAllDocs()
    loadDocs(threadFilter)
  }

  const expiringDocs = allDocs
    .filter(d => d.expiry_date)
    .sort((a, b) => (a.expiry_date! < b.expiry_date! ? -1 : 1))

  return (
    <div style={{ padding: '16px 20px', paddingBottom: 100 }}>
      {expiringDocs.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#9c9b95', letterSpacing: '0.08em', marginBottom: 8 }}>
            EXPIRING
          </div>
          <div style={{
            display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' as any,
            paddingBottom: 4,
          }}>
            {expiringDocs.map(doc => (
              <div
                key={doc.id}
                onClick={() => navigate(`/personal/docs/view/${doc.id}`)}
                style={{
                  flexShrink: 0, width: 140, background: '#1a1a18',
                  border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8,
                  padding: 10, cursor: 'pointer',
                }}
              >
                <div style={{
                  fontSize: 13, fontFamily: 'DM Sans', fontWeight: 500, color: '#e8e7e0',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  marginBottom: 4,
                }}>
                  {doc.doc_type || 'Document'}
                </div>
                <div style={{ fontSize: 11, fontFamily: 'DM Mono', color: '#9c9b95' }}>
                  {expiryLabel(doc.expiry_date!)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 12, scrollbarWidth: 'none' as any, alignItems: 'center' }}>
        <button
          onClick={() => setThreadFilter(null)}
          style={{
            flexShrink: 0, padding: '6px 10px', borderRadius: 20,
            fontSize: 10, fontFamily: 'DM Mono', fontWeight: 600,
            border: threadFilter === null ? `1px solid ${DOC_COLOR}33` : '1px solid transparent',
            background: threadFilter === null ? `${DOC_COLOR}1a` : 'transparent',
            color: threadFilter === null ? DOC_COLOR : '#6a6a64',
            cursor: 'pointer', minHeight: 32,
          }}
        >
          ALL
        </button>
        {threads.map(t => (
          <button
            key={t.id}
            onClick={() => setThreadFilter(t.id)}
            style={{
              flexShrink: 0, padding: '6px 10px', borderRadius: 20,
              fontSize: 10, fontFamily: 'DM Mono', fontWeight: 600,
              border: threadFilter === t.id ? `1px solid ${DOC_COLOR}33` : '1px solid transparent',
              background: threadFilter === t.id ? `${DOC_COLOR}1a` : 'transparent',
              color: threadFilter === t.id ? DOC_COLOR : '#6a6a64',
              cursor: 'pointer', minHeight: 32,
            }}
          >
            {t.name.toUpperCase()}
          </button>
        ))}
        <button
          onClick={() => setShowManager(true)}
          style={{
            flexShrink: 0, padding: '6px 8px', borderRadius: 20,
            fontSize: 12, fontFamily: 'DM Mono',
            border: '1px solid transparent', background: 'transparent',
            color: '#6a6a64', cursor: 'pointer', minHeight: 32,
            display: 'flex', alignItems: 'center',
          }}
          title="Manage threads"
        >
          &#x2699;
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <div style={{ width: 20, height: 20, border: `2px solid ${DOC_COLOR}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : docs.length === 0 ? (
        <div style={{ fontSize: 12, fontFamily: 'DM Sans', color: '#6a6a64', textAlign: 'center', paddingTop: 40 }}>
          {threadFilter ? 'No documents in this thread' : 'No documents — photograph a document to store it'}
        </div>
      ) : (
        docs.map(doc => {
          const details = doc.key_details || {}
          const detailExcerpt = Object.entries(details).slice(0, 2).map(([k, v]) => `${toTitleCase(k)}: ${v}`).join(' · ')
          const isExpiringSoon = doc.expiry_date && new Date(doc.expiry_date) <= new Date(Date.now() + 30 * 86400000)

          return (
            <div
              key={doc.id}
              onClick={() => navigate(`/personal/docs/view/${doc.id}`)}
              style={{
                background: '#1a1a18', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 10, marginBottom: 6, cursor: 'pointer',
                display: 'flex', alignItems: 'stretch', overflow: 'hidden', minHeight: 44,
              }}
            >
              <div style={{ width: 3, flexShrink: 0, background: DOC_COLOR }} />
              <div style={{ flex: 1, padding: '12px 14px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 9, fontFamily: 'DM Mono', fontWeight: 700, background: `${DOC_COLOR}1a`, color: DOC_COLOR, borderRadius: 4, padding: '2px 6px' }}>
                    {(doc.doc_type || 'DOC').toUpperCase()}
                  </span>
                  {isExpiringSoon && doc.expiry_date && (
                    <span style={{ fontSize: 9, fontFamily: 'DM Mono', fontWeight: 700, background: 'rgba(212,168,67,0.12)', color: '#D4A843', borderRadius: 4, padding: '2px 6px' }}>
                      EXPIRES {doc.expiry_date}
                    </span>
                  )}
                </div>
                {detailExcerpt && (
                  <div style={{ fontSize: 13, fontFamily: 'DM Sans', fontWeight: 500, color: '#e8e7e0', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {detailExcerpt}
                  </div>
                )}
                {doc.related_person && (
                  <div style={{ fontSize: 11, fontFamily: 'DM Sans', color: '#9c9b95' }}>{doc.related_person}</div>
                )}
              </div>
              <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64', flexShrink: 0, padding: '12px 14px 12px 0', alignSelf: 'center' }}>
                {doc.created_at?.slice(0, 10)}
              </div>
            </div>
          )
        })
      )}

      <button
        onClick={() => setShowQuickAdd(true)}
        style={{
          position: 'fixed', bottom: 80, right: 20,
          width: 48, height: 48, borderRadius: '50%',
          background: DOC_COLOR, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)', zIndex: 50,
          fontSize: 24, color: 'white', lineHeight: '1',
        }}
      >
        +
      </button>

      {showQuickAdd && (
        <QuickAddDoc
          onClose={() => setShowQuickAdd(false)}
          onSaved={reload}
          threads={threads}
        />
      )}

      {showManager && (
        <ThreadManager
          workflow="documents"
          onClose={() => setShowManager(false)}
          onChanged={() => { loadThreads(); loadDocs(threadFilter) }}
        />
      )}
    </div>
  )
}

export default function PersonalDocs() {
  return (
    <Routes>
      <Route index element={<DocList />} />
      <Route path="view/:id" element={<PersonalDocViewer />} />
    </Routes>
  )
}
