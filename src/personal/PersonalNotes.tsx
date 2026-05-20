import { useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../shared/components/Toast'
import ThreadManager from './ThreadManager'
import PersonalEntryDetail from './PersonalEntryDetail'

const NOTE_COLOR = '#D4A843'
const DUE_COLOR = '#9c9b95'
const DONE_COLOR = '#6a6a64'
const BLUE = '#5B8DEF'

interface Thread {
  id: string
  name: string
}

interface Task {
  id: string
  description: string
  due_date?: string
  status: string
  recurrence?: string
  created_at: string
}

interface Note {
  id: string
  content: string
  tags?: string[]
  photo_url?: string
  thread_id?: string
  created_at: string
}

interface UnifiedItem {
  id: string
  type: 'task' | 'note'
  content: string
  due_date?: string
  status?: string
  thread_id?: string
  created_at: string
  _raw: Task | Note
}

function formatDueLabel(dateStr: string): string {
  const due = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  if (diffDays < 0) {
    const n = Math.abs(diffDays)
    return `${n} ${n === 1 ? 'day' : 'days'} overdue`
  }
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  return `${months[due.getMonth()]} ${due.getDate()}`
}

function CheckIcon({ filled }: { filled: boolean }) {
  if (!filled) return null
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

type SubTab = 'due' | 'other'

export default function PersonalNotes() {
  const [subTab, setSubTab] = useState<SubTab>('due')
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [threads, setThreads] = useState<Thread[]>([])
  const [threadFilter, setThreadFilter] = useState<string | null>(null)
  const [showManager, setShowManager] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<UnifiedItem | null>(null)
  const { show } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const openedRef = useRef<string | null>(null)

  function loadData() {
    setLoading(true)
    Promise.all([
      api<Task[]>('/api/personal/tasks').catch(() => [] as Task[]),
      api<Note[]>('/api/personal/notes').catch(() => [] as Note[]),
      api<Thread[]>('/api/personal/threads?workflow=notes').catch(() => [] as Thread[]),
    ]).then(([t, n, th]) => {
      setTasks(t)
      setNotes(n)
      setThreads(th)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    const eid = (location.state as any)?.openEntryId
    if (eid && eid !== openedRef.current) {
      openedRef.current = eid
      navigate(location.pathname, { state: {}, replace: true })
      api<any>(`/api/personal/entry/${eid}`)
        .then(entry => {
          const isTask = 'description' in entry
          const unified: UnifiedItem = isTask
            ? { id: entry.id, type: 'task', content: entry.description, due_date: entry.due_date, status: entry.status, created_at: entry.created_at, _raw: entry }
            : { id: entry.id, type: 'note', content: entry.content, thread_id: entry.thread_id, created_at: entry.created_at, _raw: entry }
          setSelectedEntry(unified)
        })
        .catch(() => null)
    }
  }, [location.state])

  async function toggleTask(id: string) {
    setToggling(id)
    try {
      await api(`/api/personal/tasks/${id}/toggle`, { method: 'PATCH' })
      loadData()
    } catch {
      show("Couldn't update task", 'error')
    } finally {
      setToggling(null)
    }
  }

  // Build unified items
  const allItems: UnifiedItem[] = [
    ...tasks.map(t => ({
      id: t.id, type: 'task' as const, content: t.description,
      due_date: t.due_date, status: t.status, created_at: t.created_at, _raw: t,
    })),
    ...notes.map(n => ({
      id: n.id, type: 'note' as const, content: n.content,
      thread_id: n.thread_id, created_at: n.created_at, _raw: n,
    })),
  ]

  const dueActive = allItems
    .filter(i => i.due_date && i.status !== 'done')
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))

  const dueDone = allItems
    .filter(i => i.due_date && i.status === 'done')
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))

  const otherItems = allItems.filter(i => !i.due_date)
  const otherFiltered = threadFilter
    ? otherItems.filter(i => i.type === 'note' && i.thread_id === threadFilter)
    : otherItems

  const otherSorted = [...otherFiltered].sort((a, b) =>
    (b.created_at > a.created_at ? 1 : -1)
  )

  function openEntry(item: UnifiedItem) {
    setSelectedEntry(item)
  }

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* Sub-tab segmented control */}
      <div style={{
        display: 'flex', background: '#212120', borderRadius: 10, padding: 3,
        marginBottom: 16,
      }}>
        {(['due', 'other'] as SubTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 8,
              fontSize: 11, fontFamily: 'DM Mono', fontWeight: 600,
              background: subTab === tab ? '#2a2a28' : 'transparent',
              border: subTab === tab ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
              color: subTab === tab ? '#e8e7e0' : '#6a6a64',
              cursor: 'pointer', letterSpacing: '0.05em',
            }}
          >
            {tab === 'due' ? 'DUE' : 'OTHER'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
          <div style={{ width: 20, height: 20, border: `2px solid ${NOTE_COLOR}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : subTab === 'due' ? (
        <>
          {dueActive.length === 0 && !showDone && (
            <div style={{ fontSize: 12, fontFamily: 'DM Sans', color: '#6a6a64', textAlign: 'center', paddingTop: 40 }}>
              Nothing due ??? capture a task below
            </div>
          )}

          {dueActive.map(item => (
            <div
              key={item.id}
              onClick={() => openEntry(item)}
              style={{
                background: '#1a1a18', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 10, marginBottom: 6, cursor: 'pointer',
                display: 'flex', alignItems: 'stretch', overflow: 'hidden', minHeight: 44,
              }}
            >
              <div style={{ width: 3, flexShrink: 0, background: DUE_COLOR }} />
              <div style={{ flex: 1, padding: '12px 14px', minWidth: 0 }}>
                <div style={{ fontSize: 13, fontFamily: 'DM Sans', fontWeight: 500, color: '#e8e7e0', lineHeight: 1.5, marginBottom: 4 }}>
                  {item.content}
                </div>
                {item.due_date && (
                  <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: DUE_COLOR }}>
                    {formatDueLabel(item.due_date)}
                  </div>
                )}
              </div>
              {item.type === 'task' && (
                <button
                  onClick={e => { e.stopPropagation(); toggleTask(item.id) }}
                  disabled={toggling === item.id}
                  style={{
                    flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.15)',
                    background: 'transparent', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    alignSelf: 'center', marginRight: 14,
                  }}
                />
              )}
            </div>
          ))}

          {/* Show done toggle */}
          {(dueActive.length > 0 || dueDone.length > 0) && (
            <button
              onClick={() => setShowDone(s => !s)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                padding: '12px 0', marginTop: 4,
                fontSize: 12, fontFamily: 'DM Sans',
                color: showDone ? BLUE : '#6a6a64',
              }}
            >
              {showDone ? 'Hide done' : 'Show done'}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: showDone ? 'rotate(180deg)' : 'none' }}>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}

          {showDone && dueDone.map(item => (
            <div
              key={item.id}
              onClick={() => openEntry(item)}
              style={{
                background: '#1a1a18', border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: 10, marginBottom: 6, cursor: 'pointer',
                display: 'flex', alignItems: 'stretch', overflow: 'hidden',
                opacity: 0.5, minHeight: 44,
              }}
            >
              <div style={{ width: 3, flexShrink: 0, background: DONE_COLOR }} />
              <div style={{ flex: 1, padding: '12px 14px', minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontFamily: 'DM Sans', fontWeight: 500,
                  color: DONE_COLOR, lineHeight: 1.5,
                  textDecoration: 'line-through', marginBottom: 4,
                }}>
                  {item.content}
                </div>
                {item.due_date && (
                  <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: DONE_COLOR }}>
                    {formatDueLabel(item.due_date)}
                  </div>
                )}
              </div>
              {item.type === 'task' && (
                <button
                  onClick={e => { e.stopPropagation(); toggleTask(item.id) }}
                  disabled={toggling === item.id}
                  style={{
                    flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
                    border: 'none', background: BLUE,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    alignSelf: 'center', marginRight: 14,
                  }}
                >
                  <CheckIcon filled />
                </button>
              )}
            </div>
          ))}
        </>
      ) : (
        <>
          {/* Thread filter pills */}
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

          {otherSorted.length === 0 ? (
            <div style={{ fontSize: 12, fontFamily: 'DM Sans', color: '#6a6a64', textAlign: 'center', paddingTop: 40 }}>
              {threadFilter ? 'No notes in this thread' : 'No notes yet ??? capture an idea below'}
            </div>
          ) : (
            otherSorted.map(item => (
              <div
                key={item.id}
                onClick={() => openEntry(item)}
                style={{
                  background: '#1a1a18', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 10, marginBottom: 6, cursor: 'pointer',
                  display: 'flex', alignItems: 'stretch', overflow: 'hidden', minHeight: 44,
                }}
              >
                <div style={{ width: 3, flexShrink: 0, background: NOTE_COLOR }} />
                <div style={{ flex: 1, padding: '12px 14px', minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontFamily: 'DM Sans', fontWeight: 500, color: '#e8e7e0',
                    lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 4,
                  }}>
                    {item.content}
                  </div>
                  <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: NOTE_COLOR }}>
                    {item.created_at?.slice(0, 10)}
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {showManager && (
        <ThreadManager
          workflow="notes"
          onClose={() => setShowManager(false)}
          onChanged={() => loadData()}
        />
      )}

      {selectedEntry && (
        <PersonalEntryDetail
          entry={selectedEntry._raw as any}
          workflow={selectedEntry.type === 'task' ? 'tasks' : 'notes'}
          onClose={() => setSelectedEntry(null)}
          onUpdated={loadData}
          onDeleted={loadData}
        />
      )}
    </div>
  )
}

