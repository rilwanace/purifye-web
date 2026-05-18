import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { api } from '../api'
import PersonalDocViewer from './PersonalDocViewer'

const ACCENT = '#7068D9'

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

function DocList() {
  const [docs, setDocs] = useState<DocEntry[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api<DocEntry[]>('/api/personal/documents')
      .then(setDocs)
      .catch(() => setDocs([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
        <div style={{ width: 20, height: 20, border: `2px solid ${ACCENT}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px 20px' }}>
      {docs.length === 0 ? (
        <div style={{ fontSize: 12, fontFamily: 'DM Sans', color: '#6a6a64', textAlign: 'center', paddingTop: 40 }}>
          No documents — photograph a document to store it
        </div>
      ) : (
        docs.map(doc => {
          const details = doc.key_details || {}
          const detailExcerpt = Object.entries(details).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(' · ')
          const isExpiringSoon = doc.expiry_date && new Date(doc.expiry_date) <= new Date(Date.now() + 30 * 86400000)

          return (
            <div
              key={doc.id}
              onClick={() => navigate(`/personal/docs/view/${doc.id}`)}
              style={{
                background: '#1a1a18', border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: 12, padding: '12px 14px', marginBottom: 8, cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 9, fontFamily: 'DM Mono', fontWeight: 700, background: `${ACCENT}1a`, color: ACCENT, borderRadius: 4, padding: '2px 6px' }}>
                      {(doc.doc_type || 'DOC').toUpperCase()}
                    </span>
                    {isExpiringSoon && doc.expiry_date && (
                      <span style={{ fontSize: 9, fontFamily: 'DM Mono', fontWeight: 700, background: 'rgba(212,168,67,0.12)', color: '#D4A843', borderRadius: 4, padding: '2px 6px' }}>
                        EXPIRES {doc.expiry_date}
                      </span>
                    )}
                  </div>
                  {detailExcerpt && (
                    <div style={{ fontSize: 11, fontFamily: 'DM Sans', color: '#c4c3bc', marginBottom: 2 }}>{detailExcerpt}</div>
                  )}
                  {doc.related_person && (
                    <div style={{ fontSize: 10, fontFamily: 'DM Sans', color: '#9c9b95' }}>{doc.related_person}</div>
                  )}
                </div>
                <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64', marginLeft: 8, flexShrink: 0 }}>
                  {doc.created_at?.slice(0, 10)}
                </div>
              </div>
            </div>
          )
        })
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
