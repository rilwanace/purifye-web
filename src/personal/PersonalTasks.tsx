import { useEffect, useState } from 'react'
import { api } from '../api'
import { useToast } from '../shared/components/Toast'

const ACCENT = '#D4A843'

type TaskFilter = 'all' | 'pending' | 'done' | 'recurring'

interface Task {
  id: string
  description: string
  due_date?: string
  priority?: 'high' | 'medium' | 'low'
  status: 'pending' | 'done'
  recurrence?: string
  streak_count?: number
  notes?: string
  completed_at?: string
}

const PRIORITY_COLOR: Record<string, string> = {
  high: '#D85A30',
  medium: '#D4A843',
  low: '#5B8DEF',
}

function isOverdue(task: Task) {
  if (!task.due_date || task.status === 'done') return false
  return new Date(task.due_date) < new Date(new Date().toDateString())
}

export default function PersonalTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const { show } = useToast()

  function load() {
    setLoading(true)
    api<Task[]>('/api/personal/tasks')
      .then(setTasks)
      .catch(() => setTasks([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function toggle(id: string) {
    setToggling(id)
    try {
      await api(`/api/personal/tasks/${id}/toggle`, { method: 'PATCH' })
      load()
    } catch (err) {
      console.error('[personal] task toggle error', err)
      show("Couldn't update task — please try again", 'error')
    } finally {
      setToggling(null)
    }
  }

  const filtered = tasks.filter(t => {
    if (filter === 'pending') return t.status === 'pending'
    if (filter === 'done') return t.status === 'done'
    if (filter === 'recurring') return t.recurrence && t.recurrence !== 'none'
    return true
  })

  const tabs: { id: TaskFilter; label: string }[] = [
    { id: 'all', label: 'ALL' },
    { id: 'pending', label: 'PENDING' },
    { id: 'done', label: 'DONE' },
    { id: 'recurring', label: 'RECURRING' },
  ]

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            style={{
              flex: 1,
              padding: '6px 4px',
              borderRadius: 8,
              fontSize: 10,
              fontFamily: 'DM Mono',
              fontWeight: 600,
              border: filter === tab.id ? `1px solid ${ACCENT}33` : '1px solid transparent',
              background: filter === tab.id ? `${ACCENT}1a` : 'transparent',
              color: filter === tab.id ? ACCENT : '#6a6a64',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
          <div style={{ width: 20, height: 20, border: `2px solid ${ACCENT}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ fontSize: 12, fontFamily: 'DM Sans', color: '#6a6a64', textAlign: 'center', paddingTop: 40 }}>
          No {filter !== 'all' ? filter : ''} tasks
        </div>
      ) : (
        filtered.map(task => {
          const overdue = isOverdue(task)
          return (
            <div key={task.id} style={{
              background: '#1a1a18', border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: 10, padding: '12px 14px', marginBottom: 6,
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              {/* Check circle */}
              <button
                onClick={() => toggle(task.id)}
                disabled={toggling === task.id}
                style={{
                  flexShrink: 0,
                  width: 22, height: 22,
                  borderRadius: '50%',
                  border: task.status === 'done' ? `2px solid #5DCAA5` : '2px solid rgba(255,255,255,0.15)',
                  background: task.status === 'done' ? 'rgba(93,202,165,0.13)' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: 1,
                }}
              >
                {task.status === 'done' && <span style={{ color: '#5DCAA5', fontSize: 12, lineHeight: 1 }}>✓</span>}
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontFamily: 'DM Sans', fontWeight: 500,
                  color: task.status === 'done' ? '#6a6a64' : '#e8e7e0',
                  textDecoration: task.status === 'done' ? 'line-through' : 'none',
                  marginBottom: 4,
                }}>
                  {task.description}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {task.priority && (
                    <span style={{ fontSize: 9, fontFamily: 'DM Mono', fontWeight: 700, background: `${PRIORITY_COLOR[task.priority]}1a`, color: PRIORITY_COLOR[task.priority], borderRadius: 4, padding: '2px 6px' }}>
                      {task.priority.toUpperCase()}
                    </span>
                  )}
                  {task.due_date && (
                    <span style={{ fontSize: 9, fontFamily: 'DM Mono', color: overdue ? '#D85A30' : '#6a6a64' }}>
                      {overdue ? 'OVERDUE · ' : ''}{task.due_date}
                    </span>
                  )}
                  {task.recurrence && task.recurrence !== 'none' && (
                    <span style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#D4A843' }}>{task.recurrence}</span>
                  )}
                  {(task.streak_count ?? 0) > 0 && (
                    <span style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#5DCAA5' }}>{task.streak_count} streak</span>
                  )}
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
