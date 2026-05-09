import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const QUICK_IDEAS = [
  { emoji: '????', text: 'New product today' },
  { emoji: '???', text: 'Customer review' },
  { emoji: '????', text: 'Behind the scenes' },
  { emoji: '????', text: 'Weekend promo' },
  { emoji: '????', text: 'Quick tip' },
  { emoji: '????', text: 'Milestone celebration' },
]

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', color: '#CF5BA0' },
  { id: 'facebook', label: 'Facebook', color: '#7068D9' },
  { id: 'tiktok', label: 'TikTok', color: '#5DCAA5' },
]

const ACC = '#7068D9'

export default function SocialCreate() {
  const [selectedPlatforms, setSelectedPlatforms] = useState(['instagram', 'facebook', 'tiktok'])
  const [brief, setBrief] = useState('')
  const [loading, setLoading] = useState(false)
  const [showTextInput, setShowTextInput] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const nav = useNavigate()

  function togglePlatform(id: string) {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  async function handleGenerate(inputType: string, content: string, imageId?: string, imageUrls?: any) {
    if (selectedPlatforms.length === 0) return
    setLoading(true)
    try {
      const res = await api('/api/social/generate', {
        method: 'POST',
        body: JSON.stringify({ input_type: inputType, content, platforms: selectedPlatforms }),
      })
      nav('/social/editor', {
        state: {
          variations: res.variations,
          group_id: res.group_id,
          image_id: imageId,
          image_urls: imageUrls,
          platforms: selectedPlatforms,
        }
      })
    } catch (e: any) {
      alert('Generation failed: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/social/images/process', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      }).then(r => r.json())
      if (res.detail) throw new Error(res.detail)
      await handleGenerate('photo', brief, res.image_id, res.urls)
    } catch (e: any) {
      alert('Upload failed: ' + e.message)
      setLoading(false)
    }
  }

  const Card = ({ icon, label, desc, color, onClick }: any) => (
    <div onClick={onClick} style={{
      background: '#1a1a18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10,
      padding: 14, marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, minHeight: 44,
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: color, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#e8e7e0' }}>{label}</div>
        <div style={{ fontSize: 11, color: '#9c9b95', marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
      </div>
      <span style={{ color: '#6a6a64', fontSize: 14 }}>???</span>
    </div>
  )

  return (
    <div style={{ padding: '4px 20px 120px' }}>
      {loading && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
        }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(112,104,217,0.3)', borderTopColor: ACC, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ color: '#e8e7e0', fontSize: 13 }}>Generating captions...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <div style={{ textAlign: 'center', padding: '16px 0 4px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e7e0' }}>What do you want to post about?</div>
        <div style={{ fontSize: 11, color: '#9c9b95', marginTop: 3 }}>Social Bot will generate captions for all your platforms</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 12px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6a6a64', whiteSpace: 'nowrap' }}>Quick ideas</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      </div>
      <div style={{ marginBottom: 4 }}>
        {QUICK_IDEAS.map(idea => (
          <button key={idea.text} onClick={() => handleGenerate('text', idea.text)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 12px',
            background: 'rgba(112,104,217,0.06)', border: '1px solid rgba(112,104,217,0.10)',
            borderRadius: 20, fontSize: 11, color: '#9c9b95', cursor: 'pointer',
            margin: '0 6px 6px 0', minHeight: 36,
          }}>
            <span style={{ fontSize: 13 }}>{idea.emoji}</span> {idea.text}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 12px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6a6a64', whiteSpace: 'nowrap' }}>Or start from scratch</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      </div>

      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
      <Card icon="????" label="Upload a photo" desc="Drop an image, Social Bot writes captions for all platforms" color="rgba(112,104,217,0.08)" onClick={() => fileRef.current?.click()} />
      <Card icon="??????" label="Describe an idea" desc="Type a brief, bot creates the post" color="rgba(207,91,160,0.06)" onClick={() => setShowTextInput(true)} />
      <Card icon="????" label="Use a template" desc="Pick a reusable format from your library" color="rgba(232,137,79,0.06)" onClick={() => nav('/social/library')} />
      <Card icon="????" label="Post ready content" desc="Skip AI ??? go straight to editor with your own artwork" color="rgba(93,202,165,0.06)" onClick={() => nav('/social/editor', { state: { variations: [], platforms: selectedPlatforms } })} />

      {showTextInput && (
        <div style={{ margin: '12px 0' }}>
          <textarea
            autoFocus
            value={brief}
            onChange={e => setBrief(e.target.value)}
            placeholder="Describe what you want to post about..."
            style={{
              width: '100%', background: '#2a2a28', border: '1px solid rgba(112,104,217,0.3)',
              borderRadius: 8, padding: '12px', fontSize: 13, color: '#e8e7e0',
              fontFamily: 'var(--font-sans)', outline: 'none', resize: 'none',
              minHeight: 80, colorScheme: 'dark', boxSizing: 'border-box',
            }}
          />
          <button onClick={() => { if (brief.trim()) handleGenerate('text', brief) }} disabled={!brief.trim()} style={{
            width: '100%', padding: '12px', borderRadius: 10, marginTop: 8,
            background: 'linear-gradient(135deg,#7068D9,#9b8ce8)', color: '#fff',
            fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
          }}>
            Generate captions ???
          </button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 12px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6a6a64', whiteSpace: 'nowrap' }}>Post to</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PLATFORMS.map(({ id, label, color }) => (
          <button key={id} onClick={() => togglePlatform(id)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
            borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
            cursor: 'pointer', minHeight: 38, border: '1px solid',
            color, background: 'rgba(0,0,0,0)',
            borderColor: selectedPlatforms.includes(id) ? color + '66' : color + '22',
            opacity: selectedPlatforms.includes(id) ? 1 : 0.4,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
            {label}
            <span style={{ marginLeft: 'auto' }}>{selectedPlatforms.includes(id) ? '???' : ''}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
