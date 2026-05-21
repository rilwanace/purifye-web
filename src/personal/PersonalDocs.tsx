import { useEffect, useState, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../shared/components/Toast'
import PersonalDocViewer from './PersonalDocViewer'
import ThreadManager from './ThreadManager'
import PersonalInput from './PersonalInput'
import PersonalEntryDetail from './PersonalEntryDetail'

const DOC_COLOR = '#5B8DEF'

function toTitleCase(key: string): string {
  return key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function expiryDiffDays(dateStr: string): number {
  const exp = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((exp.getTime() - today.getTime()) / 86400000)
}

function expiryLabel(dateStr: string): string {
  const d = expiryDiffDays(dateStr)
  if (d < 0) return `Expired ${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'} ago`
  if (d === 0) return 'Expires today'
  if (d === 1) return 'Expires tomorrow'
  return `Expires in ${d} days`
}

function ExpiryBadge({ dateStr }: { dateStr: string }) {
  const d = expiryDiffDays(dateStr)
  let bg: string, color: string, border: string | undefined
  if (d < 0) {
    bg = 'rgba(216,90,48,0.25)'; color = '#D85A30'; border = '1px solid rgba(216,90,48,0.3)'
  } else if (d <= 3) {
    bg = 'rgba(216,90,48,0.15)'; color = '#D85A30'; border = '1px solid rgba(216,90,48,0.3)'
  } else if (d <= 7) {
    bg = 'rgba(212,168,67,0.15)'; color = '#D4A843'
  } else {
    bg = 'rgba(93,202,165,0.15)'; color = '#5DCAA5'
  }
  return (
    <span style={{ background: bg, color, border, borderRadius: 4, padding: '2px 8px', fontSize: 10, fontFamily: 'DM Mono', fontWeight: d < 0 ? 700 : 400 }}>
      {expiryLabel(dateStr)}
    </span>
  )
}

interface Thread {
  id: string
  name: string
  count?: number
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
  photo_url?: string
  preview_url?: string
  created_at: string
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#2a2a28', border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 8, color: '#e8e7e0', fontSize: 14, fontFamily: 'DM Sans',
  padding: '10px 12px', boxSizing: 'border-box', outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontFamily: 'DM Mono', color: '#9c9b95', marginBottom: 6, display: 'block',
}

function QuickAddDoc({ onClose, onSaved, threads }: { onClose: () => void; onSaved: () => void; threads: Thread[] }) {
  const [docType, setDocType] = useState('')
  const [threadId, setThreadId] = useState('')
  const [kvRows, setKvRows] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }])
  const [expiryDate, setExpiryDate] = useState('')
  const [issuedDate, setIssuedDate] = useState('')
  const [relatedPerson, setRelatedPerson] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const { show } = useToast()

  function addRow() { setKvRows(r => [...r, { key: '', value: '' }]) }
  function removeRow(i: number) { setKvRows(r => r.filter((_, idx) => idx !== i)) }
  function updateRow(i: number, field: 'key' | 'value', val: string) {
    setKvRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }

  async function save() {
    if (!docType.trim()) return
    setSaving(true)
    try {
      const key_details: Record<string, string> = {}
      kvRows.forEach(r => { if (r.key.trim()) key_details[r.key.trim()] = r.value.trim() })
      await api('/api/personal/confirm', {
        method: 'POST',
        body: JSON.stringify({
          source_input_id: null, workflow: 'documents', thread_id: threadId || null,
          fields: { doc_type: docType.trim(), key_details, expiry_date: expiryDate || null, issued_date: issuedDate || null, related_person: relatedPerson || null, notes: notes || null, photo_urls: [], extracted_text: null },
        }),
      })
      show('Saved', 'success')
      onSaved(); onClose()
    } catch { show('Failed to save', 'error') } finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: '#1a1a18', borderRadius: '16px 16px 0 0', maxHeight: '85vh', overflowY: 'auto', padding: '0 20px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 16px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#6a6a64' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <span style={labelStyle}>DOC TYPE</span>
            <input type="text" placeholder="e.g. Passport, Insurance Policy" value={docType} onChange={e => setDocType(e.target.value)} style={inputStyle} autoFocus />
          </div>
          <div>
            <span style={labelStyle}>THREAD</span>
            <select value={threadId} onChange={e => setThreadId(e.target.value)} style={{ ...inputStyle, appearance: 'none' } as React.CSSProperties}>
              <option value="">No thread</option>
              {threads.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <span style={labelStyle}>KEY DETAILS</span>
            {kvRows.map((row, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                <input type="text" placeholder="Field" value={row.key} onChange={e => updateRow(i, 'key', e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                <input type="text" placeholder="Value" value={row.value} onChange={e => updateRow(i, 'value', e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                <button onClick={() => removeRow(i)} style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: 'none', color: '#9c9b95', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            ))}
            <button onClick={addRow} style={{ background: 'none', border: 'none', color: DOC_COLOR, fontSize: 13, fontFamily: 'DM Sans', cursor: 'pointer', padding: '4px 0' }}>+ Add field</button>
          </div>
          <div><span style={labelStyle}>EXPIRY DATE</span><input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} style={inputStyle} /></div>
          <div><span style={labelStyle}>ISSUED DATE</span><input type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} style={inputStyle} /></div>
          <div><span style={labelStyle}>RELATED PERSON</span><input type="text" placeholder="e.g. John Silva" value={relatedPerson} onChange={e => setRelatedPerson(e.target.value)} style={inputStyle} /></div>
          <div><span style={labelStyle}>NOTES</span><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} style={{ ...inputStyle, resize: 'none', lineHeight: '1.5' } as React.CSSProperties} /></div>
          <button onClick={save} disabled={!docType.trim() || saving} style={{ width: '100%', padding: '14px 0', borderRadius: 12, background: !docType.trim() ? '#2a2a28' : DOC_COLOR, color: !docType.trim() ? '#6a6a64' : 'white', fontSize: 14, fontFamily: 'DM Sans', fontWeight: 600, border: 'none', cursor: !docType.trim() ? 'default' : 'pointer' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ThreadFilter({ threads, threadFilter, onSelect, totalCount }: {
  threads: Thread[]
  threadFilter: string | null
  onSelect: (id: string | null) => void
  totalCount: number
}) {
  const [expanded, setExpanded] = useState(false)
  const activeThread = threads.find(t => t.id === threadFilter)
  const activeLabel = threadFilter === null ? 'All documents' : (activeThread?.name || 'Unknown')

  function select(id: string | null) { onSelect(id); setExpanded(false) }

  return (
    <div>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '0 0 8px 0', height: 36 }}
      >
        <span style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#9c9b95', letterSpacing: '0.06em', flexShrink: 0 }}>THREAD</span>
        <span style={{ fontSize: 12, fontFamily: 'DM Sans', color: DOC_COLOR, fontWeight: 500, flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeLabel}</span>
        <span style={{ fontSize: 10, color: '#9c9b95', flexShrink: 0 }}>{expanded ? '▴' : '▾'}</span>
      </button>

      {expanded && (
        <div style={{ background: '#1a1a18', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
          <button onClick={() => select(null)} style={{ width: '100%', height: 36, display: 'flex', alignItems: 'center', padding: '0 12px', background: threadFilter === null ? 'rgba(91,141,239,0.08)' : 'transparent', border: 'none', borderLeft: threadFilter === null ? `2px solid ${DOC_COLOR}` : '2px solid transparent', cursor: 'pointer' }}>
            <span style={{ flex: 1, fontSize: 12, fontFamily: 'DM Sans', color: threadFilter === null ? DOC_COLOR : '#e8e7e0', textAlign: 'left' }}>All documents</span>
            <span style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#9c9b95' }}>{totalCount}</span>
          </button>
          {threads.map(t => (
            <button key={t.id} onClick={() => select(t.id)} style={{ width: '100%', height: 36, display: 'flex', alignItems: 'center', padding: '0 12px', background: threadFilter === t.id ? 'rgba(91,141,239,0.08)' : 'transparent', border: 'none', borderLeft: threadFilter === t.id ? `2px solid ${DOC_COLOR}` : '2px solid transparent', cursor: 'pointer', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ flex: 1, fontSize: 12, fontFamily: 'DM Sans', color: threadFilter === t.id ? DOC_COLOR : '#e8e7e0', textAlign: 'left' }}>{t.name}</span>
              {t.count !== undefined && <span style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#9c9b95' }}>{t.count}</span>}
            </button>
          ))}
        </div>
      )}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 12 }} />
    </div>
  )
}

function ActionsSheet({ count, onEmail, onDelete, onClose }: { count: number; onEmail: () => void; onDelete: () => void; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: '#1a1a18', borderRadius: '16px 16px 0 0', padding: '16px 20px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#6a6a64' }} />
        </div>
        <div style={{ fontSize: 12, fontFamily: 'DM Mono', color: '#9c9b95', marginBottom: 16 }}>{count} selected</div>
        {[
          { label: 'Email', icon: '✉️', action: onEmail },
          { label: 'Delete', icon: '🗑️', action: onDelete, danger: true },
        ].map(item => (
          <button key={item.label} onClick={item.action} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', color: item.danger ? '#D85A30' : '#e8e7e0', fontSize: 14, fontFamily: 'DM Sans' }}>
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function DocList() {
  const [docs, setDocs] = useState<DocEntry[]>([])
  const [expiringDocs, setExpiringDocs] = useState<DocEntry[]>([])
  const [threads, setThreads] = useState<Thread[]>([])
  const [threadFilter, setThreadFilter] = useState<string | null>(null)
  const [subTab, setSubTab] = useState<'all' | 'expiring'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showManager, setShowManager] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<DocEntry | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { show } = useToast()
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function loadThreads() {
    api<Thread[]>('/api/personal/threads?workflow=documents')
      .then(setThreads).catch(() => setThreads([]))
  }

  function loadDocs(q: string = '', tid: string | null = null) {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (tid) params.set('thread_id', tid)
    const qs = params.toString() ? `?${params.toString()}` : ''
    api<DocEntry[]>(`/api/personal/documents${qs}`)
      .then(setDocs).catch(() => setDocs([]))
      .finally(() => setLoading(false))
  }

  function loadExpiring() {
    api<DocEntry[]>('/api/personal/documents/expiring')
      .then(setExpiringDocs).catch(() => setExpiringDocs([]))
  }

  useEffect(() => {
    loadThreads(); loadDocs(); loadExpiring()
  }, [])

  useEffect(() => {
    const eid = (location.state as any)?.openEntryId
    if (eid) navigate(`/personal/docs/view/${eid}`, { replace: true })
  }, [location.state])

  function handleSearch(q: string) {
    setSearchQuery(q)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => loadDocs(q, threadFilter), 300)
  }

  function handleThreadSelect(tid: string | null) {
    setThreadFilter(tid)
    loadDocs(searchQuery, tid)
  }

  function reload() {
    loadThreads(); loadDocs(searchQuery, threadFilter); loadExpiring()
  }

  function startLongPress(id: string) {
    longPressTimer.current = setTimeout(() => {
      setSelectionMode(true)
      setSelectedIds(new Set([id]))
    }, 500)
  }

  function cancelLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      if (next.size === 0) setSelectionMode(false)
      return next
    })
  }

  function exitSelection() {
    setSelectionMode(false)
    setSelectedIds(new Set())
    setShowActions(false)
  }

  async function deleteSelected() {
    try {
      await Promise.all([...selectedIds].map(id => api(`/api/personal/entry/${id}`, { method: 'DELETE' })))
      show(`Deleted ${selectedIds.size} document${selectedIds.size > 1 ? 's' : ''}`, 'success')
      exitSelection()
      reload()
    } catch {
      show('Delete failed', 'error')
    }
    setShowActions(false)
  }

  const threadMap: Record<string, string> = {}
  threads.forEach(t => { threadMap[t.id] = t.name })
  const totalCount = threads.reduce((s, t) => s + (t.count ?? 0), 0) || docs.length
  const displayDocs = subTab === 'expiring' ? expiringDocs : docs

  return (
    <div style={{ padding: '16px 20px', paddingBottom: 120 }}>
      {/* Selection bar */}
      {selectionMode && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '8px 12px', background: '#1a1a18', borderRadius: 10, border: `1px solid ${DOC_COLOR}33` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={exitSelection} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9c9b95', fontSize: 18, padding: 0 }}>✕</button>
            <span style={{ fontSize: 13, fontFamily: 'DM Sans', color: '#e8e7e0' }}>{selectedIds.size} selected</span>
          </div>
          <button onClick={() => setShowActions(true)} style={{ background: DOC_COLOR, border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontFamily: 'DM Sans', fontWeight: 600, color: 'white', cursor: 'pointer' }}>Actions</button>
        </div>
      )}

      {/* Search bar */}
      <div style={{ marginBottom: 12 }}>
        <input
          value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search documents..."
          style={{ width: '100%', boxSizing: 'border-box', background: '#2a2a28', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 14px', fontSize: 13, fontFamily: 'DM Sans', color: '#e8e7e0', outline: 'none' }}
        />
      </div>

      {/* Sub-tabs: All / Expiring */}
      <div style={{ display: 'flex', marginBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {(['all', 'expiring'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            style={{ flex: 1, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Mono', fontWeight: 600, color: subTab === tab ? DOC_COLOR : '#6a6a64', borderBottom: subTab === tab ? `2px solid ${DOC_COLOR}` : '2px solid transparent', letterSpacing: '0.05em' }}
          >
            {tab === 'all' ? 'ALL' : 'EXPIRING'}
          </button>
        ))}
      </div>

      {/* Thread filter (only in All tab) */}
      {subTab === 'all' && (
        <ThreadFilter threads={threads} threadFilter={threadFilter} onSelect={handleThreadSelect} totalCount={totalCount} />
      )}

      {/* Document list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
          <div style={{ width: 20, height: 20, border: `2px solid ${DOC_COLOR}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : displayDocs.length === 0 ? (
        <div style={{ fontSize: 12, fontFamily: 'DM Sans', color: '#6a6a64', textAlign: 'center', paddingTop: 40 }}>
          {subTab === 'expiring' ? 'No expiring documents' : threadFilter ? 'No documents in this thread' : 'No documents — photograph one to store it'}
        </div>
      ) : (
        displayDocs.map(doc => {
          const details = doc.key_details || {}
          const firstDetail = Object.entries(details)[0]
          const detailLine = firstDetail ? `${toTitleCase(firstDetail[0])}: ${firstDetail[1]}` : ''
          const title = [doc.doc_type, doc.related_person].filter(Boolean).join(' — ') || 'Document'
          const threadName = doc.thread_id ? threadMap[doc.thread_id] : null
          const isSelected = selectedIds.has(doc.id)

          return (
            <div
              key={doc.id}
              onPointerDown={() => !selectionMode && startLongPress(doc.id)}
              onPointerUp={cancelLongPress}
              onPointerLeave={cancelLongPress}
              onClick={() => {
                if (selectionMode) { toggleSelect(doc.id); return }
                if (subTab === 'expiring') { setSelectedEntry(doc); return }
                navigate(`/personal/docs/view/${doc.id}`)
              }}
              style={{ background: isSelected ? 'rgba(91,141,239,0.08)' : '#1a1a18', border: isSelected ? `1px solid ${DOC_COLOR}44` : '1px solid rgba(255,255,255,0.06)', borderRadius: 10, marginBottom: 6, cursor: 'pointer', display: 'flex', alignItems: 'stretch', overflow: 'hidden', minHeight: 60 }}
            >
              {selectionMode ? (
                <div style={{ width: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${isSelected ? DOC_COLOR : 'rgba(255,255,255,0.2)'}`, background: isSelected ? DOC_COLOR : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isSelected && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 4.5-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                </div>
              ) : (
                <div style={{ width: 3, flexShrink: 0, background: DOC_COLOR }} />
              )}
              <div style={{ flex: 1, padding: '12px 14px', minWidth: 0 }}>
                <div style={{ fontSize: 13, fontFamily: 'DM Sans', fontWeight: 600, color: '#e8e7e0', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {title}
                </div>
                {detailLine && (
                  <div style={{ fontSize: 12, fontFamily: 'DM Sans', color: '#9c9b95', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {detailLine}
                  </div>
                )}
                <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#9c9b95', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {threadName && <span style={{ color: DOC_COLOR }}>{threadName}</span>}
                  {doc.expiry_date && (subTab === 'expiring' ? <ExpiryBadge dateStr={doc.expiry_date} /> : <span>{doc.expiry_date}</span>)}
                </div>
              </div>
            </div>
          )
        })
      )}

      {/* FAB */}
      <button
        onClick={() => setShowQuickAdd(true)}
        style={{ position: 'fixed', bottom: 120, right: 20, width: 48, height: 48, borderRadius: '50%', background: DOC_COLOR, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', zIndex: 50, fontSize: 24, color: 'white', lineHeight: '1' }}
      >
        +
      </button>

      {showQuickAdd && <QuickAddDoc onClose={() => setShowQuickAdd(false)} onSaved={reload} threads={threads} />}
      {showManager && <ThreadManager workflow="documents" onClose={() => setShowManager(false)} onChanged={reload} />}
      {showActions && (
        <ActionsSheet
          count={selectedIds.size}
          onEmail={() => { show('Email feature coming soon', 'success'); setShowActions(false) }}
          onDelete={deleteSelected}
          onClose={() => setShowActions(false)}
        />
      )}
      {selectedEntry && (
        <PersonalEntryDetail
          entry={selectedEntry}
          workflow="documents"
          onClose={() => setSelectedEntry(null)}
          onUpdated={reload}
          onDeleted={reload}
        />
      )}

      {/* Input bar */}
      <PersonalInput mode="docs" onSaved={reload} />
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
