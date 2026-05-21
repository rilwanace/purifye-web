import { useEffect, useState, useRef } from 'react'
import { api } from '../api'
import { useToast } from '../shared/components/Toast'
import ThreadManager from './ThreadManager'
import PersonalEntryDetail from './PersonalEntryDetail'
import PersonalInput from './PersonalInput'

const NOTE_COLOR = '#D4A843'

interface Thread {
  id: string
  name: string
  count?: number
}

interface Note {
  id: string
  content: string
  tags?: string[]
  photo_url?: string
  thread_id?: string
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

function QuickAddNote({ onClose, onSaved, threads }: { onClose: () => void; onSaved: () => void; threads: Thread[] }) {
  const [content, setContent] = useState('')
  const [threadId, setThreadId] = useState('')
  const [saving, setSaving] = useState(false)
  const { show } = useToast()

  async function save() {
    if (!content.trim()) return
    setSaving(true)
    try {
      await api('/api/personal/confirm', {
        method: 'POST',
        body: JSON.stringify({
          source_input_id: null,
          workflow: 'notes',
          thread_id: threadId || null,
          fields: { content: content.trim() },
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
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: '#1a1a18', borderRadius: '16px 16px 0 0', maxHeight: '85vh', overflowY: 'auto', padding: '0 20px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 16px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#6a6a64' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <span style={labelStyle}>CONTENT</span>
            <textarea rows={4} placeholder="What's on your mind?" value={content} onChange={e => setContent(e.target.value)} autoFocus style={{ ...inputStyle, resize: 'none', lineHeight: '1.5' } as React.CSSProperties} />
          </div>
          <div>
            <span style={labelStyle}>THREAD</span>
            <select value={threadId} onChange={e => setThreadId(e.target.value)} style={{ ...inputStyle, appearance: 'none' } as React.CSSProperties}>
              <option value="">No thread</option>
              {threads.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <button onClick={save} disabled={!content.trim() || saving} style={{ width: '100%', padding: '14px 0', borderRadius: 12, background: !content.trim() ? '#2a2a28' : NOTE_COLOR, color: !content.trim() ? '#6a6a64' : '#131311', fontSize: 14, fontFamily: 'DM Sans', fontWeight: 600, border: 'none', cursor: !content.trim() ? 'default' : 'pointer' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ThreadFilter({ threads, threadFilter, onSelect, totalCount, accentColor }: {
  threads: Thread[]
  threadFilter: string | null
  onSelect: (id: string | null) => void
  totalCount: number
  accentColor: string
}) {
  const [expanded, setExpanded] = useState(false)
  const activeThread = threads.find(t => t.id === threadFilter)
  const activeLabel = threadFilter === null ? 'All notes' : (activeThread?.name || 'Unknown')

  function select(id: string | null) {
    onSelect(id)
    setExpanded(false)
  }

  return (
    <div style={{ marginBottom: 0 }}>
      {/* Collapsed row */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '0 0 8px 0', height: 36 }}
      >
        <span style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#9c9b95', letterSpacing: '0.06em', flexShrink: 0 }}>THREAD</span>
        <span style={{ fontSize: 12, fontFamily: 'DM Sans', color: accentColor, fontWeight: 500, flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeLabel}</span>
        <span style={{ fontSize: 10, color: '#9c9b95', flexShrink: 0 }}>{expanded ? '▴' : '▾'}</span>
      </button>

      {/* Expanded list */}
      {expanded && (
        <div style={{ background: '#1a1a18', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
          {/* All notes item */}
          <button
            onClick={() => select(null)}
            style={{ width: '100%', height: 36, display: 'flex', alignItems: 'center', padding: '0 12px', background: threadFilter === null ? `rgba(${accentColor === NOTE_COLOR ? '212,168,67' : '91,141,239'},0.08)` : 'transparent', border: 'none', borderLeft: threadFilter === null ? `2px solid ${accentColor}` : '2px solid transparent', cursor: 'pointer' }}
          >
            <span style={{ flex: 1, fontSize: 12, fontFamily: 'DM Sans', color: threadFilter === null ? accentColor : '#e8e7e0', textAlign: 'left' }}>All notes</span>
            <span style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#9c9b95' }}>{totalCount}</span>
          </button>
          {threads.map(t => (
            <button
              key={t.id}
              onClick={() => select(t.id)}
              style={{ width: '100%', height: 36, display: 'flex', alignItems: 'center', padding: '0 12px', background: threadFilter === t.id ? `rgba(${accentColor === NOTE_COLOR ? '212,168,67' : '91,141,239'},0.08)` : 'transparent', border: 'none', borderLeft: threadFilter === t.id ? `2px solid ${accentColor}` : '2px solid transparent', cursor: 'pointer', borderTop: '1px solid rgba(255,255,255,0.04)' }}
            >
              <span style={{ flex: 1, fontSize: 12, fontFamily: 'DM Sans', color: threadFilter === t.id ? accentColor : '#e8e7e0', textAlign: 'left' }}>{t.name}</span>
              {t.count !== undefined && <span style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#9c9b95' }}>{t.count}</span>}
            </button>
          ))}
        </div>
      )}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 12 }} />
    </div>
  )
}

export default function PersonalNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [threads, setThreads] = useState<Thread[]>([])
  const [threadFilter, setThreadFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showManager, setShowManager] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<Note | null>(null)
  const { show } = useToast()
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function loadThreads() {
    api<Thread[]>('/api/personal/threads?workflow=notes')
      .then(setThreads)
      .catch(() => setThreads([]))
  }

  function loadNotes(q: string = '', tid: string | null = null) {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (tid) params.set('thread_id', tid)
    const qs = params.toString() ? `?${params.toString()}` : ''
    api<Note[]>(`/api/personal/notes${qs}`)
      .then(setNotes)
      .catch(() => setNotes([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadThreads(); loadNotes() }, [])

  function handleSearch(q: string) {
    setSearchQuery(q)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => loadNotes(q, threadFilter), 300)
  }

  function handleThreadSelect(tid: string | null) {
    setThreadFilter(tid)
    loadNotes(searchQuery, tid)
  }

  function reload() {
    loadThreads()
    loadNotes(searchQuery, threadFilter)
  }

  const totalCount = threads.reduce((s, t) => s + (t.count ?? 0), 0) || notes.length

  return (
    <div style={{ padding: '16px 20px', paddingBottom: 120 }}>
      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <input
          value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search notes..."
          style={{ width: '100%', boxSizing: 'border-box', background: '#2a2a28', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 14px', fontSize: 13, fontFamily: 'DM Sans', color: '#e8e7e0', outline: 'none' }}
        />
      </div>

      {/* Collapsible thread filter */}
      <ThreadFilter
        threads={threads}
        threadFilter={threadFilter}
        onSelect={handleThreadSelect}
        totalCount={totalCount}
        accentColor={NOTE_COLOR}
      />

      {/* Note cards */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
          <div style={{ width: 20, height: 20, border: `2px solid ${NOTE_COLOR}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : notes.length === 0 ? (
        <div style={{ fontSize: 12, fontFamily: 'DM Sans', color: '#6a6a64', textAlign: 'center', paddingTop: 40 }}>
          {threadFilter ? 'No notes in this thread' : 'No notes yet — capture an idea below'}
        </div>
      ) : (
        notes.map(note => {
          const threadName = threads.find(t => t.id === note.thread_id)?.name
          return (
            <div
              key={note.id}
              onClick={() => setSelectedEntry(note)}
              style={{ background: '#1a1a18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, marginBottom: 6, cursor: 'pointer', display: 'flex', alignItems: 'stretch', overflow: 'hidden', minHeight: 60 }}
            >
              <div style={{ width: 3, flexShrink: 0, background: NOTE_COLOR }} />
              <div style={{ flex: 1, padding: '12px 14px', minWidth: 0 }}>
                <div style={{ fontSize: 13, fontFamily: 'DM Sans', fontWeight: 500, color: '#e8e7e0', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 4 }}>
                  {note.content}
                </div>
                <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#9c9b95', display: 'flex', gap: 6 }}>
                  {threadName && <span style={{ color: NOTE_COLOR }}>{threadName}</span>}
                  <span>{note.created_at?.slice(0, 10)}</span>
                </div>
              </div>
              {note.photo_url && (
                <div style={{ flexShrink: 0, width: 52, padding: '8px 8px 8px 0', display: 'flex', alignItems: 'center' }}>
                  <img src={note.photo_url} alt="" style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover' }} />
                </div>
              )}
            </div>
          )
        })
      )}

      {/* FAB */}
      <button
        onClick={() => setShowQuickAdd(true)}
        style={{ position: 'fixed', bottom: 120, right: 20, width: 48, height: 48, borderRadius: '50%', background: NOTE_COLOR, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', zIndex: 50, fontSize: 24, color: '#131311', lineHeight: '1' }}
      >
        +
      </button>

      {showQuickAdd && (
        <QuickAddNote onClose={() => setShowQuickAdd(false)} onSaved={reload} threads={threads} />
      )}

      {showManager && (
        <ThreadManager workflow="notes" onClose={() => setShowManager(false)} onChanged={reload} />
      )}

      {selectedEntry && (
        <PersonalEntryDetail
          entry={selectedEntry}
          workflow="notes"
          onClose={() => setSelectedEntry(null)}
          onUpdated={reload}
          onDeleted={reload}
        />
      )}

      {/* Input bar */}
      <PersonalInput mode="notes" onSaved={reload} />
    </div>
  )
}
