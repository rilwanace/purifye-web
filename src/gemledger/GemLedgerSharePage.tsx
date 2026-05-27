import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { gemApi } from './gemledger-api'

const C = {
  bg: '#0a0f0a', bg2: '#111a11', bg3: '#1a2a1a', border: '#1e2e1e',
  t1: '#e0e8e0', t2: '#c0ccc0', t3: '#8a9a8a', green: '#34d399',
}

export default function GemLedgerSharePage() {
  const { token } = useParams<{ token: string }>()
  const [lot, setLot] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [imgIdx, setImgIdx] = useState(0)

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return }
    gemApi.getShare(token)
      .then(setLot)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    if (!lot) return
    document.title = `${lot.name} — ${lot.total_weight_ct} ct`
    // OG meta tags for WhatsApp preview
    const setMeta = (prop: string, content: string) => {
      let el = document.querySelector(`meta[property="${prop}"]`) as HTMLMetaElement
      if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el) }
      el.content = content
    }
    setMeta('og:title', `${lot.name} — ${lot.total_weight_ct} ct`)
    setMeta('og:description', [lot.origin, lot.shape, lot.treatment].filter(Boolean).join(' · '))
    const firstPhoto = lot.photos?.[0]?.thumb_url || lot.photos?.[0]?.url
    if (firstPhoto) setMeta('og:image', firstPhoto)
  }, [lot])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh', background: C.bg }}>
      <div style={{ width: 28, height: 28, border: `2px solid ${C.green}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (notFound) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh', background: C.bg, flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 40 }}>💎</div>
      <div style={{ color: C.t2, fontFamily: 'DM Sans', fontSize: 18, fontWeight: 600 }}>Link not found or expired</div>
    </div>
  )

  const photos = lot.photos || []
  const stonePhotos = photos.filter((p: any) => p.photo_type === 'stone')
  const certPhotos = photos.filter((p: any) => p.photo_type === 'certificate')
  const allPhotos = [...stonePhotos, ...certPhotos]

  const specs = [
    ['Stone type', lot.stone_type_name],
    ['Weight', `${lot.total_weight_ct} ct`],
    ['Stones', String(lot.stone_count)],
    lot.shape && ['Shape', lot.shape],
    lot.color && ['Color', lot.color],
    lot.origin && ['Origin', lot.origin],
    lot.treatment && ['Treatment', lot.treatment],
    lot.dimensions && ['Dimensions', lot.dimensions],
    lot.certified && ['Certificate', lot.cert_body || 'Yes'],
  ].filter(Boolean) as [string, string][]

  return (
    <div style={{ background: C.bg, minHeight: '100dvh', fontFamily: 'DM Sans, sans-serif', maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: C.green, fontSize: 20 }}>💎</span>
        <span style={{ color: C.green, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 16 }}>GemLedger</span>
      </div>

      {/* Photo gallery */}
      {allPhotos.length > 0 && (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: C.bg2, overflow: 'hidden' }}>
          <img
            src={allPhotos[imgIdx]?.url || allPhotos[imgIdx]?.thumb_url || ''}
            alt={lot.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
          {allPhotos.length > 1 && (
            <>
              <button onClick={() => setImgIdx(i => (i - 1 + allPhotos.length) % allPhotos.length)}
                style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: 16, fontSize: 16, cursor: 'pointer' }}>‹</button>
              <button onClick={() => setImgIdx(i => (i + 1) % allPhotos.length)}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: 16, fontSize: 16, cursor: 'pointer' }}>›</button>
              <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4 }}>
                {allPhotos.map((_, i) => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: 3, background: i === imgIdx ? C.green : 'rgba(255,255,255,0.3)' }} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ padding: '20px' }}>
        {/* Stone name */}
        <h1 style={{ color: C.t1, fontFamily: 'DM Sans', fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>{lot.name}</h1>
        <div style={{ color: C.t3, fontSize: 13, marginBottom: 20 }}>
          {[lot.origin, lot.stone_type_name].filter(Boolean).join(' · ')}
        </div>

        {/* Specs grid */}
        <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
          {specs.map(([label, val], i) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 16px',
              borderBottom: i < specs.length - 1 ? `1px solid ${C.border}` : 'none',
            }}>
              <span style={{ color: C.t3, fontSize: 13 }}>{label}</span>
              <span style={{ color: C.t1, fontFamily: ['Weight', 'Stones'].includes(label) ? 'JetBrains Mono' : 'DM Sans', fontSize: 14, fontWeight: 600 }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Branding */}
        <div style={{ textAlign: 'center', color: C.t3, fontSize: 12, paddingTop: 8 }}>
          Powered by <span style={{ color: C.green, fontWeight: 600 }}>GemLedger</span> · purifyeai.com
        </div>
      </div>
    </div>
  )
}
