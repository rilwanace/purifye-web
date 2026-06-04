import { useEffect, useState, useRef } from 'react'
import { api } from '../api'

interface Thread {
  id: string
  name: string
  color?: string
}

interface Props {
  workflow: 'documents' | 'notes'
  onClose: () => void
  onChanged: () => void
}

const ACCENT = '#5B8DEF'

export default function ThreadManager({ workflow, onClose, onChanged }: Props) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const editInputRef = useRef<HTMLInputElement>(null)

  function load() {
    api<Thread[]>(`/api/personal/threads?workflow=${workflow}`)
      .then(setThreads)
      .catch(() => setThreads([]))
  }

  useEffect(() => { load() }, [workflow])

  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.focus()
  }, [editingId])

  async function addThread() {
    const name = newName.trim()
    if (!name || saving) return
    setSaving(true)
    try {
      await api('/api/personal/threads', {
        method: 'POST',
        body: JSON.stringify({ workflow, name }),
      })
      setNewName('')
      load()
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  async function saveRename(id: string) {
    const name = editingName.trim()
    setEditingId(null)
    if (!name) return
    try {
      await api(`/api/personal/threads/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name }),
      })
      load()
      onChanged()
    } catch {
      load()
    }
  }

  async function deleteThread(id: string) {
    try {
      await api(`/api/personal/threads/${id}`, { method: 'DELETE' })
      setConfirmDeleteId(null)
      load()
      onChanged()
    } catch {
      setConfirmDeleteId(null)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ flex: 1, background: 'rgba(0,0,0,0.6)' }} />
      <div style={{ background: '#1a1a18', borderRadius: '18px 18px 0 0', padding: '20px', maxHeight: '80dvh', overflowY: 'auto' }}>
        <div style={{ width: 32, height: 3, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 16px' }} />
        <div style={{ fontSize: 14, fontFamily: 'DM Sans', fontWeight: 600, color: '#e8e7e0', marginBottom: 16 }}>
          Manage Threads
        </div>

        {/* Thread list */}
        {threads.map(t => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
            minHeight: 44,
          }}>
            {editingId === t.id ? (
              <input
                ref={editInputRef}
                value={editingName}
                onChange={e => setEditingName(e.target.value)}
                onBlur={() => saveRename(t.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveRename(t.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                style={{
                  flex: 1, background: '#2a2a28', border: `1px solid ${ACCENT}`,
                  borderRadius: 6, padding: '6px 10px', fontSize: 13,
                  fontFamily: 'DM Sans', color: '#e8e7e0', outline: 'none',
                }}
              />
            ) : (
              <div
                onClick={() => { setEditingId(t.id); setEditingName(t.name) }}
                style={{
                  flex: 1, fontSize: 13, fontFamily: 'DM Sans', color: '#e8e7e0',
                  cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center',
                }}
              >
                {t.name}
              </div>
            )}

            {confirmDeleteId === t.id ? (
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  style={{
                    padding: '5px 10px', background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
                    color: '#9c9b95', fontSize: 11, fontFamily: 'DM Sans', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteThread(t.id)}
                  style={{
                    padding: '5px 10px', background: 'rgba(216,90,48,0.15)',
                    border: '1px solid rgba(216,90,48,0.3)', borderRadius: 6,
                    color: '#D85A30', fontSize: 11, fontFamily: 'DM Sans', cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDeleteId(t.id)}
                style={{
                  flexShrink: 0, background: 'none', border: 'none', color: '#6a6a64',
                  cursor: 'pointer', minWidth: 44, minHeight: 44,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                }}
                title="Delete thread"
              >
                &#x1F5D1;
              </button>
            )}
          </div>
        ))}

        {threads.length === 0 && (
          <div style={{ fontSize: 12, fontFamily: 'DM Sans', color: '#6a6a64', textAlign: 'center', padding: '20px 0' }}>
            No threads yet
          </div>
        )}

        {confirmDeleteId && (
          <div style={{ marginTop: 12, fontSize: 11, fontFamily: 'DM Sans', color: '#D4A843', padding: '8px 12px', background: 'rgba(212,168,67,0.08)', borderRadius: 8, border: '1px solid rgba(212,168,67,0.2)' }}>
            Delete thread? Entries in this thread will move to General.
          </div>
        )}

        {/* Add new thread */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addThread() }}
            placeholder="New thread name..."
            style={{
              flex: 1, background: '#2a2a28', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8, padding: '10px 12px', fontSize: 13,
              fontFamily: 'DM Sans', color: '#e8e7e0', outline: 'none',
            }}
          />
          <button
            onClick={addThread}
            disabled={saving || !newName.trim()}
            style={{
              width: 44, height: 44, borderRadius: 8, border: 'none', flexShrink: 0,
              background: newName.trim() && !saving ? ACCENT : '#2a2a28',
              color: '#fff', fontSize: 22, cursor: newName.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
