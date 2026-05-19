import { useEffect, useState } from 'react'
import { api } from '../api'

const NOTE_COLOR = '#CF5BA0'

interface Note {
  id: string
  content: string
  tags?: string[]
  photo_url?: string
  created_at: string
}

export default function PersonalNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Note | null>(null)

  function load() {
    setLoading(true)
    api<Note[]>('/api/personal/notes')
      .then(setNotes)
      .catch(() => setNotes([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  if (selected) {
    return (
      <div style={{ padding: '16px 20px' }}>
        <button
          onClick={() => setSelected(null)}
          style={{ background: 'none', border: 'none', color: '#9c9b95', cursor: 'pointer', fontSize: 20, marginBottom: 12, minHeight: 44, padding: '4px 8px' }}
        >←</button>
        {selected.photo_url && (
          <img src={selected.photo_url} alt="" style={{ width: '100%', borderRadius: 12, marginBottom: 12, display: 'block' }} />
        )}
        <div style={{ fontSize: 13, fontFamily: 'DM Sans', color: '#e8e7e0', lineHeight: 1.6, marginBottom: 14, whiteSpace: 'pre-wrap' }}>
          {selected.content}
        </div>
        {selected.tags && selected.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {selected.tags.map(tag => (
              <span key={tag} style={{ fontSize: 9, fontFamily: 'DM Mono', fontWeight: 700, background: `${NOTE_COLOR}1a`, color: NOTE_COLOR, borderRadius: 4, padding: '3px 8px' }}>
                {tag}
              </span>
            ))}
          </div>
        )}
        <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64' }}>{selected.created_at?.slice(0, 10)}</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px 20px' }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
          <div style={{ width: 20, height: 20, border: `2px solid ${NOTE_COLOR}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : notes.length === 0 ? (
        <div style={{ fontSize: 12, fontFamily: 'DM Sans', color: '#6a6a64', textAlign: 'center', paddingTop: 40 }}>
          No notes yet — capture an idea below
        </div>
      ) : (
        notes.map(note => (
          <div
            key={note.id}
            onClick={() => setSelected(note)}
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
    </div>
  )
}
