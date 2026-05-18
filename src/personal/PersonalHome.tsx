import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const ACCENT = '#5B8DEF'

interface HomeData {
  money_summary: { spent: number; earned: number }
  tasks_summary: { pending: number; overdue: number }
  expiring_documents: { id: string; doc_type: string; expiry_date: string; related_person?: string }[]
  recent_entries: { id: string; workflow: string; title: string; date: string; meta?: string }[]
  alerts: { id: string; title: string; body: string; delivered_at: string }[]
}

function fmt(n: number) {
  return n.toLocaleString('en', { maximumFractionDigits: 0 })
}

function wfColor(wf: string) {
  const m: Record<string, string> = {
    money: '#5DCAA5', documents: '#7068D9', tasks: '#D4A843', notes: '#CF5BA0',
  }
  return m[wf] || ACCENT
}

function wfLabel(wf: string) {
  const m: Record<string, string> = {
    money: 'MONEY', documents: 'DOC', tasks: 'TASK', notes: 'NOTE',
  }
  return m[wf] || wf.toUpperCase()
}

export default function PersonalHome({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<HomeData | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    api<HomeData>('/api/personal/home').then(setData).catch(() => null)
  }, [refreshKey])

  if (!data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
        <div style={{ width: 20, height: 20, border: `2px solid ${ACCENT}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const { money_summary, tasks_summary, expiring_documents, recent_entries, alerts } = data

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* Alert strip */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {alerts.map(a => (
            <div key={a.id} style={{
              background: 'rgba(91,141,239,0.08)', border: '1px solid rgba(91,141,239,0.2)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 8,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans', color: ACCENT }}>{a.title}</div>
              <div style={{ fontSize: 11, fontFamily: 'DM Sans', color: '#c4c3bc', marginTop: 2 }}>{a.body}</div>
            </div>
          ))}
        </div>
      )}

      {/* Morning briefing card */}
      <div style={{
        background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.2)',
        borderRadius: 14, padding: '16px', marginBottom: 16,
      }}>
        <div style={{ fontSize: 9, fontFamily: 'DM Mono', fontWeight: 700, color: '#6a6a64', letterSpacing: '0.1em', marginBottom: 10 }}>TODAY'S SUMMARY</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64', letterSpacing: '0.08em' }}>SPENT THIS MONTH</div>
            <div style={{ fontSize: 18, fontFamily: 'DM Mono', fontWeight: 500, color: '#D85A30', marginTop: 2 }}>{fmt(money_summary.spent)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64', letterSpacing: '0.08em' }}>EARNED</div>
            <div style={{ fontSize: 18, fontFamily: 'DM Mono', fontWeight: 500, color: '#5DCAA5', marginTop: 2 }}>{fmt(money_summary.earned)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64', letterSpacing: '0.08em' }}>TASKS PENDING</div>
            <div style={{ fontSize: 18, fontFamily: 'DM Mono', fontWeight: 500, color: '#e8e7e0', marginTop: 2 }}>{tasks_summary.pending}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64', letterSpacing: '0.08em' }}>OVERDUE</div>
            <div style={{ fontSize: 18, fontFamily: 'DM Mono', fontWeight: 500, color: tasks_summary.overdue > 0 ? '#D85A30' : '#e8e7e0', marginTop: 2 }}>{tasks_summary.overdue}</div>
          </div>
        </div>
      </div>

      {/* Expiring documents */}
      {expiring_documents.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 9, fontFamily: 'DM Mono', fontWeight: 700, color: '#6a6a64', letterSpacing: '0.1em', marginBottom: 8 }}>EXPIRING SOON</div>
          {expiring_documents.map(d => (
            <div key={d.id} onClick={() => navigate('/personal/docs')} style={{
              background: '#1a1a18', border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 6, cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 12, fontFamily: 'DM Sans', fontWeight: 500, color: '#e8e7e0' }}>{d.doc_type || 'Document'}</div>
                {d.related_person && <div style={{ fontSize: 11, fontFamily: 'DM Sans', color: '#9c9b95', marginTop: 1 }}>{d.related_person}</div>}
              </div>
              <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#D4A843' }}>{d.expiry_date}</div>
            </div>
          ))}
        </div>
      )}

      {/* Recent activity */}
      <div>
        <div style={{ fontSize: 9, fontFamily: 'DM Mono', fontWeight: 700, color: '#6a6a64', letterSpacing: '0.1em', marginBottom: 8 }}>RECENT ACTIVITY</div>
        {recent_entries.length === 0 && (
          <div style={{ fontSize: 12, fontFamily: 'DM Sans', color: '#6a6a64', textAlign: 'center', paddingTop: 20 }}>
            No entries yet — use the input bar below to capture something
          </div>
        )}
        {recent_entries.map((e, i) => {
          const color = wfColor(e.workflow)
          return (
            <div
              key={`${e.id}-${i}`}
              onClick={() => navigate(`/personal/${e.workflow === 'documents' ? 'docs' : e.workflow === 'money' ? 'money' : e.workflow === 'tasks' ? 'tasks' : 'notes'}`)}
              style={{
                background: '#1a1a18', border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 6, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10,
                animation: 'fadeIn 0.3s ease forwards',
              }}
            >
              <div style={{
                flexShrink: 0,
                fontSize: 9, fontFamily: 'DM Mono', fontWeight: 700,
                background: `${color}1a`, color, borderRadius: 4, padding: '3px 6px',
              }}>
                {wfLabel(e.workflow)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontFamily: 'DM Sans', fontWeight: 500, color: '#e8e7e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.title}
                </div>
                {e.meta && <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#9c9b95', marginTop: 1 }}>{e.meta}</div>}
              </div>
              <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64', flexShrink: 0 }}>
                {(e.date || '').slice(0, 10)}
              </div>
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  )
}
