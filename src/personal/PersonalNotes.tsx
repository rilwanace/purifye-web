import { useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import ThreadManager from './ThreadManager'
import PersonalEntryDetail from './PersonalEntryDetail'

const NOTE_COLOR = '#CF5BA0'

interface Thread {
  id: string
  name: string
}

interface Note {
  id: string
  content: string
  tags?: string[]
  photo_url?: string
  thread_id?: string
  created_at: string
}

export default function PersonalNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [threads, setThreads] = useState<Thread[]>([])
  const [threadFilter, setThreadFilter] = useState<string | null>(null)
  const [showManager, setShowManager] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<Note | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const openedRef = useRef<string | null>(null)

  function loadThreads() {
    api<Thread[]>('/api/personal/threads?workflow=notes')
      .then(setThreads)
      .catch(() => setThreads([]))
  }

  function loadNotes(tid: string | null) {
    setLoading(true)
    const params = tid ? `?thread_id=${tid}` : ''
    api<Note[]>(`/api/personal/notes${params}`)
      .then(setNotes)
      .catch(() => setNotes([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadThreads() }, [])
  useEffect(() => { loadNotes(threadFilter) }, [threadFilter])

  useEffect(() => {
    const eid = (location.state as any)?.openEntryId
    if (eid && eid !== openedRef.current) {
      openedRef.current = eid
      navigate(location.pathname, { state: {}, replace: true })
      api<Note>(`/api/personal/entry/${eid}`)
        .then(entry => setSelectedEntry(entry))
        .catch(() => null)
    }
  }, [location.state])

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 12, scrollbarWidth: 'none', alignItems: 'center' }}>
        <button
          onClick={() => setThreadFilter(null)}
          style={{
            flexShrink: 0, padding: '6px 10px', borderRadius: 20,
            fontSize: 10, fontFamily: 'DM Mono', fontWeight: 600,
            border: threadFilter === null ? `1px solid ${NOTE_COLOR}33` : '1px solid transparent',
            background: threadFilter === null ? `${NOTE_COLOR}1a` : 'transparent',
            color: threadFilter === null ? NOTE_COLOR : '#6a6a64',
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
              border: threadFilter === t.id ? `1px solid ${NOTE_COLOR}33` : '1px solid transparent',
              background: threadFilter === t.id ? `${NOTE_COLOR}1a` : 'transparent',
              color: threadFilter === t.id ? NOTE_COLOR : '#6a6a64',
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
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
          <div style={{ width: 20, height: 20, border: `2px solid ${NOTE_COLOR}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : notes.length === 0 ? (
        <div style={{ fontSize: 12, fontFamily: 'DM Sans', color: '#6a6a64', textAlign: 'center', paddingTop: 40 }}>
          {threadFilter ? 'No notes in this thread' : 'No notes yet — capture an idea below'}
        </div>
      ) : (
        notes.map(note => (
          <div
            key={note.id}
            onClick={() => setSelectedEntry(note)}
            style={{
              background: '#1a1a18', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10, padding: '12px 14px', marginBottom: 6, cursor: 'pointer',
            }}
          >
            {note.photo_url && (
              <img src={note.photo_url} alt="" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, marginBottom: 8, display: 'block' }} />
            )}
            <div style={{ fontSize: 13, fontFamily: 'DM Sans', fontWeight: 500, color: '#e8e7e0', lineHeight: 1.5,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {note.content}
            </div>
            {note.tags && note.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                {note.tags.slice(0, 3).map(tag => (
                  <span key={tag} style={{ fontSize: 9, fontFamily: 'DM Mono', fontWeight: 700, background: `${NOTE_COLOR}1a`, color: NOTE_COLOR, borderRadius: 4, padding: '2px 6px' }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64', marginTop: 6 }}>{note.created_at?.slice(0, 10)}</div>
          </div>
        ))
      )}

      {showManager && (
        <ThreadManager
          workflow="notes"
          onClose={() => setShowManager(false)}
          onChanged={() => { loadThreads(); loadNotes(threadFilter) }}
        />
      )}

      {selectedEntry && (
        <PersonalEntryDetail
          entry={selectedEntry}
          workflow="notes"
          onClose={() => setSelectedEntry(null)}
          onUpdated={() => loadNotes(threadFilter)}
          onDeleted={() => loadNotes(threadFilter)}
        />
      )}
    </div>
  )
}