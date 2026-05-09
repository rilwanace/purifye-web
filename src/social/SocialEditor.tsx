import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../api'

const IG = '#CF5BA0', FB = '#7068D9', TK = '#5DCAA5', ACC = '#7068D9'

const FONTS = [
  { id: 'sans', label: 'Sans', style: 'DM Sans, sans-serif', weight: 600 },
  { id: 'serif', label: 'Serif', style: 'Georgia, serif', weight: 400 },
  { id: 'script', label: 'Script', style: 'cursive', weight: 400 },
  { id: 'bold', label: 'BOLD', style: 'Impact, sans-serif', weight: 900 },
  { id: 'mono', label: 'Mono', style: 'monospace', weight: 500 },
]

const COLORS = ['#ffffff', '#131311', '#F5F0E8', ACC, IG, TK, '#E8894F']

const PLAT_INFO: Record<string, { color: string; label: string }> = {
  instagram: { color: IG, label: 'IG' },
  facebook: { color: FB, label: 'FB' },
  tiktok: { color: TK, label: 'TK' },
}

export default function SocialEditor() {
  const nav = useNavigate()
  const { state } = useLocation()
  const variations: any[] = state?.variations || []
  const imageUrls: Record<string, string> = state?.image_urls || {}
  const platforms: string[] = state?.platforms || ['instagram', 'facebook', 'tiktok']
  const existingPost = state?.post

  const [mode, setMode] = useState<'edit' | 'review'>('edit')
  const [capIdx, setCapIdx] = useState(0)
  const [treatment, setTreatment] = useState<'original' | 'vivid' | 'warm' | 'cool'>('original')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [font, setFont] = useState(FONTS[0])
  const [color, setColor] = useState('#ffffff')
  const [fontSize, setFontSize] = useState(20)
  const [pillOn, setPillOn] = useState(true)
  const [textPos, setTextPos] = useState({ x: 20, y: 200 })
  const [logoPos, setLogoPos] = useState({ x: 300, y: 340 })
  const [hashtags, setHashtags] = useState<string[]>([])
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d.toISOString().slice(0, 16)
  })
  const [activeReviewPlat, setActiveReviewPlat] = useState(platforms[0] || 'instagram')
  const [saving, setSaving] = useState(false)

  const photoRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)

  const currentVar = variations[capIdx]
  const caption = existingPost?.caption || currentVar?.caption || 'Your caption here...'
  const imageUrl = imageUrls[treatment] || existingPost?.image_url || ''

  useEffect(() => {
    if (currentVar?.hashtags) setHashtags(currentVar.hashtags)
    else if (existingPost?.hashtags) setHashtags(existingPost.hashtags)
  }, [capIdx])

  // Draggable logic
  function makeDraggable(ref: React.RefObject<HTMLDivElement | null>, _pos: { x: number; y: number }, setPos: (p: { x: number; y: number }) => void) {
    const el = ref.current as HTMLDivElement
    if (!el) return
    let startX = 0, startY = 0, startLeft = 0, startTop = 0, dragging = false
    const bounds = photoRef.current?.getBoundingClientRect()

    function onDown(e: PointerEvent) {
      e.preventDefault()
      dragging = true
      const r = el.getBoundingClientRect()
      startX = e.clientX; startY = e.clientY
      startLeft = r.left - (bounds?.left || 0)
      startTop = r.top - (bounds?.top || 0)
      el.setPointerCapture(e.pointerId)
    }
    function onMove(e: PointerEvent) {
      if (!dragging) return
      const b = photoRef.current?.getBoundingClientRect()
      if (!b) return
      const nx = Math.max(0, Math.min(startLeft + e.clientX - startX, b.width - el.offsetWidth))
      const ny = Math.max(0, Math.min(startTop + e.clientY - startY, b.height - el.offsetHeight))
      setPos({ x: nx, y: ny })
    }
    function onUp() { dragging = false }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
    }
  }

  useEffect(() => makeDraggable(textRef, textPos, setTextPos), [mode])
  useEffect(() => makeDraggable(logoRef, logoPos, setLogoPos), [mode])

  async function handleSave() {
    setMode('review')
  }

  async function handleApprove() {
    setSaving(true)
    try {
      const body = {
        platform: activeReviewPlat,
        post_type: currentVar?.post_type || 'post',
        caption,
        hashtags,
        image_url: imageUrl,
        scheduled_at: scheduleDate,
        status: 'approved',
        generation_group_id: state?.group_id,
      }
      if (existingPost?.id) {
        await api('/api/social/posts/' + existingPost.id, { method: 'PUT', body: JSON.stringify(body) })
      } else {
        await api('/api/social/posts', { method: 'POST', body: JSON.stringify(body) })
      }
      nav('/social/feed')
    } catch (e: any) {
      alert('Save failed: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  function removeHashtag(tag: string) {
    setHashtags(prev => prev.filter(t => t !== tag))
  }

  const treatFilters: Record<string, string> = {
    original: 'none',
    vivid: 'contrast(1.2) saturate(1.3) brightness(1.05)',
    warm: 'sepia(0.15) saturate(1.2) brightness(1.05)',
    cool: 'saturate(0.9) brightness(1.05) hue-rotate(10deg)',
  }

  if (mode === 'edit') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 150, background: '#0e0e0c', display: 'flex', flexDirection: 'column', maxWidth: 430, margin: '0 auto' }}>
        {/* Full-bleed photo */}
        <div ref={photoRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#212120' }}>
          {imageUrl ? (
            <img src={imageUrl} alt="post" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: treatFilters[treatment] }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6a6a64', fontSize: 13 }}>
              No image selected
            </div>
          )}

          {/* Floating top nav */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'linear-gradient(to bottom,rgba(0,0,0,0.5),transparent)' }}>
            <button onClick={() => nav(-1)} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', border: 'none', fontSize: 18 }}>???</button>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {platforms.map(p => (
                <div key={p} style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.1)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 3, background: PLAT_INFO[p]?.color || '#fff' }} />
                </div>
              ))}
            </div>
            <button onClick={handleSave} style={{ padding: '8px 18px', borderRadius: 10, background: 'rgba(112,104,217,0.9)', backdropFilter: 'blur(8px)', color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              Save ???
            </button>
          </div>

          {/* Draggable caption */}
          <div
            ref={textRef}
            style={{
              position: 'absolute', left: textPos.x, top: textPos.y,
              cursor: 'grab', userSelect: 'none', padding: '10px 16px', maxWidth: '85%',
              lineHeight: 1.3, borderRadius: 8, touchAction: 'none',
              fontSize: fontSize, fontFamily: font.style, fontWeight: font.weight, color,
              background: pillOn ? 'rgba(0,0,0,0.5)' : 'transparent',
            }}
          >
            {caption}
          </div>

          {/* Draggable logo */}
          <div
            ref={logoRef}
            style={{
              position: 'absolute', left: logoPos.x, top: logoPos.y,
              width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#7068D9,#9b8ce8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab',
              fontSize: 13, fontWeight: 700, color: '#fff', touchAction: 'none',
            }}
          >
            P
          </div>

          {/* Treatment strip */}
          <div style={{ position: 'absolute', bottom: drawerOpen ? 190 : 115, left: 0, right: 0, zIndex: 15, display: 'flex', justifyContent: 'center', gap: 8, padding: 8 }}>
            {(['original', 'vivid', 'warm', 'cool'] as const).map(t => (
              <div key={t} onClick={() => setTreatment(t)} style={{
                width: 48, height: 48, borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                border: '2px solid ' + (treatment === t ? '#fff' : 'transparent'),
                boxShadow: treatment === t ? '0 2px 10px rgba(0,0,0,0.4)' : 'none',
                position: 'relative', background: '#1a1a18',
              }}>
                {imageUrl && <img src={imageUrl} alt={t} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: treatFilters[t] }} />}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, fontSize: 6, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff', textAlign: 'center', padding: '2px 0', background: 'rgba(0,0,0,0.6)', textTransform: 'capitalize' }}>{t}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Caption drawer */}
        <div style={{ background: '#1a1a18', borderRadius: '16px 16px 0 0', zIndex: 20, paddingBottom: 8 }}>
          <div onClick={() => setDrawerOpen(!drawerOpen)} style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '10px auto 8px', cursor: 'pointer' }} />

          {/* Caption cards */}
          <div style={{ display: 'flex', gap: 8, padding: '0 16px 10px', overflowX: 'auto', scrollbarWidth: 'none', scrollSnapType: 'x mandatory' }}>
            {variations.length > 0 ? variations.map((v, i) => (
              <div key={i} onClick={() => setCapIdx(i)} style={{
                flexShrink: 0, width: 'calc(85% - 8px)', scrollSnapAlign: 'start',
                background: capIdx === i ? 'rgba(112,104,217,0.04)' : '#212120',
                border: '1px solid ' + (capIdx === i ? 'rgba(112,104,217,0.3)' : 'rgba(255,255,255,0.06)'),
                borderRadius: 8, padding: 12, cursor: 'pointer', position: 'relative',
              }}>
                <div style={{ position: 'absolute', top: 8, right: 10, fontFamily: 'var(--font-mono)', fontSize: 8, color: '#6a6a64' }}>{i + 1}/{variations.length}</div>
                <div style={{ fontSize: 12, color: '#e8e7e0', lineHeight: 1.5 }}>{v.caption}</div>
              </div>
            )) : (
              <div style={{ flexShrink: 0, width: 'calc(85% - 8px)', background: '#212120', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, color: '#6a6a64', lineHeight: 1.5 }}>No captions generated yet. Type your own or go back to Create.</div>
              </div>
            )}
          </div>

          {/* Progress dots */}
          {variations.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 5, padding: '4px 0 8px' }}>
              {variations.map((_, i) => (
                <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: capIdx === i ? ACC : 'rgba(255,255,255,0.15)' }} />
              ))}
            </div>
          )}

          {/* Toolbar */}
          {drawerOpen && (
            <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {/* Font row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6a6a64', width: 36, flexShrink: 0 }}>Font</div>
                {FONTS.map(f => (
                  <button key={f.id} onClick={() => setFont(f)} style={{
                    padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', minHeight: 30, flexShrink: 0,
                    background: font.id === f.id ? 'rgba(112,104,217,0.08)' : '#2a2a28',
                    border: '1px solid ' + (font.id === f.id ? 'rgba(112,104,217,0.3)' : 'rgba(255,255,255,0.06)'),
                    color: '#e8e7e0', fontFamily: f.style, fontWeight: f.weight,
                  }}>{f.label}</button>
                ))}
              </div>
              {/* Color row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6a6a64', width: 36, flexShrink: 0 }}>Color</div>
                {COLORS.map(c => (
                  <div key={c} onClick={() => setColor(c)} style={{
                    width: 26, height: 26, borderRadius: 6, cursor: 'pointer', background: c, flexShrink: 0,
                    border: '2px solid ' + (color === c ? '#e8e7e0' : 'transparent'),
                    boxShadow: color === c ? '0 0 0 2px rgba(112,104,217,0.3)' : 'none',
                    ...(c === '#131311' ? { border: '2px solid rgba(255,255,255,0.2)' } : {}),
                  }} />
                ))}
              </div>
              {/* Size row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6a6a64', width: 36, flexShrink: 0 }}>Size</div>
                <input type="range" min={14} max={40} value={fontSize} onChange={e => setFontSize(+e.target.value)} style={{ flex: 1, accentColor: ACC }} />
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#9c9b95', width: 30, textAlign: 'right' }}>{fontSize}px</div>
                <button onClick={() => setPillOn(!pillOn)} style={{
                  padding: '5px 10px', borderRadius: 6, fontSize: 10, cursor: 'pointer',
                  background: '#2a2a28', border: '1px solid ' + (pillOn ? 'rgba(112,104,217,0.3)' : 'rgba(255,255,255,0.06)'),
                  color: pillOn ? ACC : '#9c9b95', display: 'flex', alignItems: 'center', gap: 5,
                }}>Pill {pillOn ? '???' : ''}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Review mode
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 150, background: '#131311', maxWidth: 430, margin: '0 auto', overflowY: 'auto' }}>
      {/* Nav */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#131311', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#e8e7e0' }}>Review Post</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: 'rgba(232,137,79,0.10)', color: '#E8894F' }}>Draft</div>
      </div>

      {/* Photo preview */}
      <div style={{ margin: '12px 20px', borderRadius: 10, overflow: 'hidden', position: 'relative', aspectRatio: '1/1', background: '#1a1a18', border: '1px solid rgba(255,255,255,0.06)' }}>
        {imageUrl ? (
          <img src={imageUrl} alt="post" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: treatFilters[treatment] }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6a6a64', fontSize: 12 }}>No image</div>
        )}
        <div style={{ position: 'absolute', padding: '10px 14px', borderRadius: 8, maxWidth: '80%', lineHeight: 1.3, left: '10%', bottom: '15%', fontSize: 14, fontFamily: font.style, fontWeight: font.weight, color, background: pillOn ? 'rgba(0,0,0,0.5)' : 'transparent' }}>
          {caption}
        </div>
        <div style={{ position: 'absolute', right: 12, bottom: 16, width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#7068D9,#9b8ce8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>P</div>
      </div>

      {/* Platform tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '0 20px', marginBottom: 12 }}>
        {platforms.map(p => {
          const info = PLAT_INFO[p]
          return (
            <button key={p} onClick={() => setActiveReviewPlat(p)} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6,
              fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, cursor: 'pointer',
              border: '1px solid ' + (activeReviewPlat === p ? info?.color + '66' : info?.color + '22'),
              background: 'transparent', color: info?.color,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: 2, background: info?.color }} />
              {info?.label} {activeReviewPlat === p ? '???' : ''}
            </button>
          )
        })}
      </div>

      {/* Hashtags */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px', margin: '16px 0 10px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6a6a64' }}>Hashtags</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '0 20px' }}>
        {hashtags.map(tag => (
          <div key={tag} onClick={() => removeHashtag(tag)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, color: ACC, padding: '5px 10px', background: 'rgba(112,104,217,0.08)', borderRadius: 6, cursor: 'pointer' }}>
            {tag} <span style={{ color: '#6a6a64', fontSize: 10 }}>??</span>
          </div>
        ))}
        <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#6a6a64', padding: '5px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 6, border: '1px dashed rgba(255,255,255,0.10)', cursor: 'pointer' }}>+ Add</div>
      </div>

      {/* Schedule */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px', margin: '16px 0 10px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6a6a64' }}>Schedule</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      </div>
      <div style={{ margin: '0 20px' }}>
        <input
          type="datetime-local"
          value={scheduleDate}
          onChange={e => setScheduleDate(e.target.value)}
          style={{
            width: '100%', background: '#1a1a18', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, padding: '14px', fontSize: 13, color: '#e8e7e0',
            fontFamily: 'var(--font-sans)', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box', cursor: 'pointer',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 8, color: '#6a6a64' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#5DCAA5' }} />
          Optimal time for your audience
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, padding: '20px', paddingBottom: 90 }}>
        <button onClick={handleApprove} disabled={saving} style={{ flex: 1, padding: 14, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg,#7068D9,#9b8ce8)', color: '#fff', minHeight: 48 }}>
          {saving ? 'Saving...' : 'Approve'}
        </button>
        <button onClick={() => setMode('edit')} style={{ flex: 1, padding: 14, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#212120', color: '#e8e7e0', border: '1px solid rgba(255,255,255,0.06)', minHeight: 48 }}>
          Edit
        </button>
        <button onClick={() => nav(-1)} style={{ flex: 1, padding: 14, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#6a6a64', border: '1px solid rgba(255,255,255,0.06)', minHeight: 48 }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
