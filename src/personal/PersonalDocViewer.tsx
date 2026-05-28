import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import PersonalEntryDetail from './PersonalEntryDetail'

interface DocData {
  id: string
  doc_type?: string
  key_details?: Record<string, string>
  expiry_date?: string
  issued_date?: string
  related_person?: string
  notes?: string
  created_at: string
  photo_urls?: PhotoPair[]
}

interface PhotoPair {
  original?: string
  preview?: string
}

function toTitleCase(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default function PersonalDocViewer() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [doc, setDoc] = useState<DocData | null>(null)
  const [photos, setPhotos] = useState<PhotoPair[]>([])
  const [page, setPage] = useState(0)
  const [scale, setScale] = useState(1)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const startDist = useRef<number>(0)

  function loadDoc() {
    if (!id) return
    setLoading(true)
    api<DocData>(`/api/personal/documents/${id}`)
      .then(data => { setDoc(data); setPhotos((data.photo_urls as PhotoPair[] | undefined) || []) })
      .catch(() => setDoc(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadDoc() }, [id])

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      startDist.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && startDist.current > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
      setScale(s => Math.max(1, Math.min(4, s * (dist / startDist.current))))
      startDist.current = dist
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80dvh', background: '#131311' }}>
        <div style={{ width: 24, height: 24, border: '2px solid #7068D9', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }
  if (!doc) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80dvh', background: '#131311', gap: 12 }}>
        <div style={{ fontSize: 13, fontFamily: 'DM Sans', color: '#6a6a64' }}>Document not found</div>
      </div>
    )
  }

  return (
    <div style={{ background: '#131311', minHeight: '100dvh' }}>
      <div style={{
        padding: '12px 16px', background: '#1a1a18',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#9c9b95', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '4px 0', minHeight: 44, minWidth: 44 }}>
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontFamily: 'DM Sans', fontWeight: 600, color: '#e8e7e0' }}>
            {doc.doc_type || 'Document'}
          </div>
          {doc.related_person && (
            <div style={{ fontSize: 11, fontFamily: 'DM Sans', color: '#9c9b95' }}>{doc.related_person}</div>
          )}
        </div>
        {photos.length > 1 && (
          <div style={{ fontSize: 11, fontFamily: 'DM Mono', color: '#6a6a64' }}>{page + 1}/{photos.length}</div>
        )}
        {photos[page]?.original && (
          <button
            disabled={downloading}
            onClick={async () => {
              const url = photos[page]?.original
              if (!url) return
              setDownloading(true)
              try {
                const resp = await fetch(url)
                const blob = await resp.blob()
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = doc?.doc_type ? doc.doc_type.replace(/\s+/g, '_') + '_original' : 'document_original'
                a.click()
                URL.revokeObjectURL(a.href)
              } finally {
                setDownloading(false)
              }
            }}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: downloading ? '#4a4a44' : '#9c9b95', cursor: 'pointer', padding: '5px 10px', fontSize: 11, fontFamily: 'DM Mono', flexShrink: 0 }}
          >
            {downloading ? '...' : 'Download'}
          </button>
        )}
        <button
          onClick={() => setShowDetail(true)}
          style={{
            background: 'rgba(91,141,239,0.1)', border: '1px solid rgba(91,141,239,0.2)',
            borderRadius: 8, color: '#5B8DEF', cursor: 'pointer',
            padding: '5px 10px', fontSize: 11, fontFamily: 'DM Mono', fontWeight: 600, flexShrink: 0,
          }}
        >
          Edit
        </button>
      </div>

      {photos.length > 0 && (
        <div style={{ position: 'relative', background: '#0a0a0a', overflow: 'hidden' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => { startDist.current = 0 }}>
          <img
            ref={imgRef}
            src={photos[page]?.preview || photos[page]?.original}
            alt="document"
            style={{
              width: '100%', display: 'block',
              transform: `scale(${scale})`,
              transformOrigin: 'center',
              transition: scale === 1 ? 'transform 0.2s' : 'none',
            }}
          />
          {photos.length > 1 && (
            <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8 }}>
              {photos.map((_, i) => (
                <button key={i} onClick={() => { setPage(i); setScale(1) }}
                  style={{ width: 8, height: 8, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: i === page ? '#7068D9' : 'rgba(255,255,255,0.3)' }} />
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ padding: '16px 20px' }}>
        {doc.key_details && Object.entries(doc.key_details).length > 0 && (
          <div style={{ background: '#1a1a18', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: '14px', marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono', fontWeight: 700, color: '#6a6a64', letterSpacing: '0.1em', marginBottom: 10 }}>KEY DETAILS</div>
            {Object.entries(doc.key_details).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontFamily: 'DM Sans', color: '#9c9b95' }}>{toTitleCase(k)}</span>
                <span style={{ fontSize: 11, fontFamily: 'DM Mono', fontWeight: 500, color: '#e8e7e0' }}>{v as string}</span>
              </div>
            ))}
          </div>
        )}

        {(doc.expiry_date || doc.issued_date) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {doc.issued_date && (
              <div style={{ background: '#1a1a18', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64' }}>ISSUED</div>
                <div style={{ fontSize: 13, fontFamily: 'DM Mono', color: '#e8e7e0', marginTop: 4 }}>{doc.issued_date}</div>
              </div>
            )}
            {doc.expiry_date && (
              <div style={{ background: '#1a1a18', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64' }}>EXPIRES</div>
                <div style={{ fontSize: 13, fontFamily: 'DM Mono', color: '#D4A843', marginTop: 4 }}>{doc.expiry_date}</div>
              </div>
            )}
          </div>
        )}

        {doc.notes && (
          <div style={{ background: '#1a1a18', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64', marginBottom: 6 }}>NOTES</div>
            <div style={{ fontSize: 12, fontFamily: 'DM Sans', color: '#c4c3bc', lineHeight: 1.5 }}>{doc.notes}</div>
          </div>
        )}
      </div>

      {showDetail && (
        <PersonalEntryDetail
          entry={doc}
          workflow="documents"
          onClose={() => setShowDetail(false)}
          onUpdated={() => { loadDoc(); setShowDetail(false) }}
          onDeleted={() => navigate(-1)}
        />
      )}
    </div>
  )
}