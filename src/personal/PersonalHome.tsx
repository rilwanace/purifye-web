import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import PersonalInput from './PersonalInput'
import { useToast } from '../shared/components/Toast'

const ACCENT = '#5B8DEF'
const NOTE_COLOR = '#D4A843'
const DOC_COLOR = '#5B8DEF'
const MONEY_COLOR = '#5DCAA5'

const WF_OPTIONS = [
  { id: 'all', label: 'ALL' },
  { id: 'money', label: 'MONEY' },
  { id: 'documents', label: 'DOCS' },
  { id: 'notes', label: 'NOTES' },
]

interface HomeData {
  money_summary: { spent: number; earned: number }
  expiring_documents: { id: string; doc_type: string; expiry_date: string; related_person?: string }[]
  recent_entries: { id: string; workflow: string; title: string; date: string; meta?: string }[]
  alerts: { id: string; title: string; body: string; delivered_at: string }[]
}

interface SearchResult {
  id: string
  workflow: string
  title: string
  date: string
  snippet?: string
}

function wfColor(wf: string) {
  const m: Record<string, string> = {
    money: MONEY_COLOR,
    documents: DOC_COLOR,
    tasks: NOTE_COLOR,
    notes: NOTE_COLOR,
  }
  return m[wf] || ACCENT
}

function wfNav(wf: string): string {
  const m: Record<string, string> = {
    money: '/personal/money',
    documents: '/personal/docs',
    tasks: '/personal/notes',
    notes: '/personal/notes',
  }
  return m[wf] || '/personal'
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function PersonalHome() {
  const [data, setData] = useState<HomeData | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFilter, setSearchFilter] = useState('all')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [deepSearch, setDeepSearch] = useState(false)

  const [selectedDocs, setSelectedDocs] = useState<Record<string, SearchResult>>({})
  const selectedCount = Object.keys(selectedDocs).length

  const [showActions, setShowActions] = useState(false)
  const [actionView, setActionView] = useState<'list' | 'email'>('list')
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('Documents from Purifye')
  const [emailSending, setEmailSending] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()
  const { show } = useToast()

  useEffect(() => {
    api<HomeData>('/api/personal/home').then(setData).catch(() => null)
  }, [refreshKey])

  function runSearch(q: string, wf: string, deep: boolean) {
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    const params = new URLSearchParams({ q: q.trim() })
    if (wf !== 'all') params.set('workflow', wf)
    if (deep) params.set('deep', 'true')
    api<SearchResult[]>(`/api/personal/search?${params}`)
      .then(setSearchResults)
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false))
  }

  function handleSearch(q: string) {
    setSearchQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setSearchResults([]); return }
    debounceRef.current = setTimeout(() => runSearch(q, searchFilter, deepSearch), 400)
  }

  function handleFilterChange(f: string) {
    setSearchFilter(f)
    if (searchQuery.trim()) runSearch(searchQuery, f, deepSearch)
  }

  function handleDeepToggle() {
    const next = !deepSearch
    setDeepSearch(next)
    if (searchQuery.trim()) runSearch(searchQuery, searchFilter, next)
  }

  function handleResultTap(r: SearchResult) {
    if (r.workflow === 'documents') {
      navigate(`/personal/docs/view/${r.id}`)
    } else {
      navigate(wfNav(r.workflow), { state: { openEntryId: r.id } })
    }
  }

  function toggleDocSelection(r: SearchResult) {
    setSelectedDocs(prev => {
      if (prev[r.id]) {
        const next = { ...prev }
        delete next[r.id]
        return next
      }
      return { ...prev, [r.id]: r }
    })
  }

  function clearSelection() {
    setSelectedDocs({})
    setShowActions(false)
    setActionView('list')
    setEmailTo('')
    setEmailError(null)
    setConfirmingDelete(false)
  }

  function openActions() {
    setActionView('list')
    setEmailTo('')
    setEmailError(null)
    setConfirmingDelete(false)
    setShowActions(true)
  }

  async function handleEmailSend() {
    if (!emailTo.trim() || emailSending) return
    setEmailSending(true)
    setEmailError(null)
    try {
      await api('/api/personal/documents/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_email: emailTo.trim(),
          subject: emailSubject || 'Documents from Purifye',
          document_ids: Object.keys(selectedDocs),
        }),
      })
      show('Documents sent!', 'success')
      clearSelection()
    } catch (err: any) {
      const msg = err?.detail || err?.message || 'Failed to send email'
      setEmailError(msg)
    } finally {
      setEmailSending(false)
    }
  }

  async function handleDownload() {
    for (const doc of Object.values(selectedDocs)) {
      try {
        const photos = await api<{ photos: { original?: string }[] }>(
          `/api/personal/documents/${doc.id}/photos`
        )
        const url = photos.photos?.[0]?.original
        if (url) {
          const a = document.createElement('a')
          a.href = url
          a.download = doc.title || 'document'
          a.target = '_blank'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          await new Promise(r => setTimeout(r, 300))
        }
      } catch {}
    }
    setShowActions(false)
  }

  async function handleDeleteSelected() {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    try {
      await Promise.all(
        Object.keys(selectedDocs).map(id =>
          api(`/api/personal/entry/${id}`, { method: 'DELETE' })
        )
      )
      show(`${selectedCount} document${selectedCount !== 1 ? 's' : ''} deleted`, 'success')
      setSearchResults(prev => prev.filter(r => !selectedDocs[r.id]))
      clearSelection()
    } catch {
      show('Some documents could not be deleted', 'error')
    }
  }

  function isValidEmail(s: string) {
    return /^[^@]+@[^@]+\.[^@]+$/.test(s.trim())
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
        <div style={{ width: 20, height: 20, border: `2px solid ${ACCENT}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const { alerts } = data

  return (
    <>
    <div style={{ padding: '16px 20px' }}>
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

      {/* Search bar */}
      <div style={{ marginBottom: 16 }}>
        <input
          value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search everything..."
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#2a2a28', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8, padding: '10px 12px',
            fontSize: 13, fontFamily: 'DM Sans', color: '#e8e7e0',
            outline: 'none', marginBottom: 8,
          }}
        />
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', alignItems: 'center' }}>
          {WF_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => handleFilterChange(opt.id)}
              style={{
                flexShrink: 0, padding: '6px 10px', borderRadius: 20,
                fontSize: 10, fontFamily: 'DM Mono', fontWeight: 600,
                border: searchFilter === opt.id ? `1px solid ${ACCENT}33` : '1px solid transparent',
                background: searchFilter === opt.id ? `${ACCENT}1a` : 'transparent',
                color: searchFilter === opt.id ? ACCENT : '#6a6a64', cursor: 'pointer', minHeight: 44,
              }}
            >
              {opt.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button
            onClick={handleDeepToggle}
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
              padding: '6px 10px', borderRadius: 20, cursor: 'pointer',
              fontSize: 10, fontFamily: 'DM Mono', fontWeight: 600,
              border: deepSearch ? `1px solid ${ACCENT}33` : '1px solid transparent',
              background: deepSearch ? 'rgba(91,141,239,0.15)' : 'transparent',
              color: deepSearch ? ACCENT : '#6a6a64', minHeight: 44,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M4.5 6.5h4M6.5 4.5v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            FULL TEXT
          </button>
        </div>
      </div>

      {/* Persistent selection bar */}
      {selectedCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'rgba(91,141,239,0.1)', border: '1px solid rgba(91,141,239,0.3)',
          borderRadius: 8, padding: '8px 12px', marginBottom: 10, gap: 8,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%', background: ACCENT, color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontFamily: 'DM Mono', fontWeight: 700, flexShrink: 0,
          }}>
            {selectedCount}
          </div>
          <span style={{ fontSize: 12, fontFamily: 'DM Sans', color: '#c4c3bc', flex: 1 }}>selected</span>
          <button
            onClick={openActions}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Mono', fontWeight: 600, color: ACCENT, padding: '4px 8px', minHeight: 44 }}
          >
            Actions
          </button>
          <button
            onClick={clearSelection}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6a6a64', padding: 4, display: 'flex', alignItems: 'center', minHeight: 44 }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}

      {/* Search results */}
      {searchQuery.trim() && (
        <div>
          {searching ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 30 }}>
              <div style={{ width: 18, height: 18, border: `2px solid ${ACCENT}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            </div>
          ) : searchResults.length === 0 ? (
            <div style={{ fontSize: 12, fontFamily: 'DM Sans', color: '#6a6a64', textAlign: 'center', paddingTop: 30 }}>
              No results for &quot;{searchQuery}&quot;
            </div>
          ) : (
            searchResults.map((r, i) => {
              const color = wfColor(r.workflow)
              const isDoc = r.workflow === 'documents'
              const isSelected = !!selectedDocs[r.id]
              return (
                <div
                  key={`${r.id}-${i}`}
                  style={{
                    background: '#1a1a18',
                    border: isSelected ? '1px solid rgba(91,141,239,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 10, marginBottom: 6,
                    display: 'flex', alignItems: 'stretch', overflow: 'hidden', minHeight: 44,
                  }}
                >
                  <div style={{ width: 3, flexShrink: 0, background: color }} />
                  <div
                    onClick={() => handleResultTap(r)}
                    style={{ flex: 1, padding: '12px 14px', minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontFamily: 'DM Sans', fontWeight: 500, color: '#e8e7e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.title}
                      </div>
                      {r.snippet && r.snippet !== r.title && (
                        <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#9c9b95', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.snippet}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64', flexShrink: 0 }}>
                      {(r.date || '').slice(0, 10)}
                    </div>
                  </div>
                  {isDoc && (
                    <button
                      onClick={e => { e.stopPropagation(); toggleDocSelection(r) }}
                      style={{
                        flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
                        border: isSelected ? 'none' : '2px solid rgba(255,255,255,0.15)',
                        background: isSelected ? ACCENT : 'transparent',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        alignSelf: 'center', marginRight: 14, minWidth: 22,
                      }}
                    >
                      {isSelected && <CheckIcon />}
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>

    <PersonalInput onSaved={() => setRefreshKey(k => k + 1)} />

    {/* Actions bottom sheet */}
    {showActions && (
      <>
        <div
          onClick={() => setShowActions(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }}
        />
        <div style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430,
          background: '#1a1a18', borderRadius: '16px 16px 0 0',
          border: '1px solid rgba(255,255,255,0.08)', zIndex: 101,
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#6a6a64' }} />
          </div>

          {actionView === 'list' ? (
            <div style={{ padding: '8px 20px 24px' }}>
              <div style={{ fontSize: 11, fontFamily: 'DM Mono', color: '#9c9b95', marginBottom: 12, letterSpacing: '0.08em' }}>
                {selectedCount} DOCUMENT{selectedCount !== 1 ? 'S' : ''} SELECTED
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                {Object.values(selectedDocs).map(doc => (
                  <div key={doc.id} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'rgba(91,141,239,0.15)', borderRadius: 6, padding: '4px 8px',
                  }}>
                    <span style={{ fontSize: 11, fontFamily: 'DM Sans', color: ACCENT }}>{doc.title}</span>
                    <button
                      onClick={() => toggleDocSelection(doc)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6a6a64', padding: 0, fontSize: 14, lineHeight: 1 }}
                    >
                      ??
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={() => setActionView('email')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: ACCENT, borderRadius: 10, padding: '14px 16px',
                    border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="4" width="20" height="16" rx="2" stroke="white" strokeWidth="1.5"/>
                    <path d="M2 7l10 7 10-7" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                  <div>
                    <div style={{ fontSize: 14, fontFamily: 'DM Sans', fontWeight: 600, color: 'white' }}>Email documents</div>
                    <div style={{ fontSize: 11, fontFamily: 'DM Sans', color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>Send as attachments to any email</div>
                  </div>
                </button>
                <button
                  onClick={handleDownload}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: '#212120', borderRadius: 10, padding: '14px 16px',
                    border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3v12m0 0l-4-4m4 4l4-4" stroke="#e8e7e0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="#e8e7e0" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <div>
                    <div style={{ fontSize: 14, fontFamily: 'DM Sans', fontWeight: 600, color: '#e8e7e0' }}>Download originals</div>
                    <div style={{ fontSize: 11, fontFamily: 'DM Sans', color: '#9c9b95', marginTop: 1 }}>Save full quality files to your device</div>
                  </div>
                </button>
                <button
                  onClick={handleDeleteSelected}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: '#212120', borderRadius: 10, padding: '14px 16px',
                    border: confirmingDelete ? '1px solid rgba(216,90,48,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke="#D85A30" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <div>
                    <div style={{ fontSize: 14, fontFamily: 'DM Sans', fontWeight: 600, color: '#D85A30' }}>
                      {confirmingDelete ? 'Tap again to confirm delete' : 'Delete selected'}
                    </div>
                    <div style={{ fontSize: 11, fontFamily: 'DM Sans', color: '#9c9b95', marginTop: 1 }}>Remove these documents permanently</div>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '8px 20px 24px' }}>
              <div style={{ fontSize: 11, fontFamily: 'DM Mono', color: '#9c9b95', marginBottom: 16, letterSpacing: '0.08em' }}>
                EMAIL {selectedCount} DOCUMENT{selectedCount !== 1 ? 'S' : ''}
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#6a6a64', marginBottom: 4 }}>TO</div>
                <input
                  type="email"
                  value={emailTo}
                  onChange={e => setEmailTo(e.target.value)}
                  placeholder="recipient@email.com"
                  autoFocus
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: '#2a2a28', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, padding: '10px 12px',
                    fontSize: 13, fontFamily: 'DM Sans', color: '#e8e7e0', outline: 'none',
                  }}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#6a6a64', marginBottom: 4 }}>SUBJECT</div>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: '#2a2a28', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, padding: '10px 12px',
                    fontSize: 13, fontFamily: 'DM Sans', color: '#e8e7e0', outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                {Object.values(selectedDocs).map(doc => (
                  <div key={doc.id} style={{ background: 'rgba(91,141,239,0.15)', borderRadius: 6, padding: '4px 8px' }}>
                    <span style={{ fontSize: 11, fontFamily: 'DM Sans', color: ACCENT }}>{doc.title}</span>
                  </div>
                ))}
              </div>
              {emailError && (
                <div style={{ fontSize: 12, fontFamily: 'DM Sans', color: '#D85A30', marginBottom: 12 }}>{emailError}</div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setActionView('list'); setEmailError(null) }}
                  style={{
                    flex: 0, padding: '12px 16px', borderRadius: 10,
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                    fontSize: 13, fontFamily: 'DM Sans', color: '#9c9b95', cursor: 'pointer',
                  }}
                >
                  Back
                </button>
                <button
                  onClick={handleEmailSend}
                  disabled={!isValidEmail(emailTo) || emailSending}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 10,
                    background: isValidEmail(emailTo) ? ACCENT : '#2a2a28',
                    border: 'none', cursor: isValidEmail(emailTo) ? 'pointer' : 'default',
                    fontSize: 13, fontFamily: 'DM Sans', fontWeight: 600,
                    color: isValidEmail(emailTo) ? 'white' : '#6a6a64',
                    opacity: emailSending ? 0.7 : 1,
                  }}
                >
                  {emailSending ? 'Sending???' : 'Send'}
                </button>
              </div>
            </div>
          )}
        </div>
      </>
    )}
    </>
  )
}

