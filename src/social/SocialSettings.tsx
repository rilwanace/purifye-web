import { useState, useEffect } from 'react'
import { api } from '../api'

const ACC = '#7068D9'
const IG = '#CF5BA0', FB = '#7068D9', TK = '#5DCAA5'

const LANG_OPTIONS = [
  { value: 'none', label: 'English only' },
  { value: 'tamil', label: 'Tamil' },
  { value: 'sinhala', label: 'Sinhala' },
  { value: 'sinhala_mix', label: 'Singlish (Sinhala + English)' },
]

function Field({ label, value, onChange, multiline = false }: any) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#9c9b95', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', background: '#2a2a28', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px', fontSize: 13, color: '#e8e7e0', fontFamily: 'var(--font-sans)', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box', resize: 'none', minHeight: 80 }} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', background: '#2a2a28', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px', fontSize: 13, color: '#e8e7e0', fontFamily: 'var(--font-sans)', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box', minHeight: 44 }} />
      )}
    </div>
  )
}

function Sec({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 12px' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6a6a64', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
    </div>
  )
}

export default function SocialSettings() {
  const [profile, setProfile] = useState<any>(null)
  const [usage, setUsage] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [desc, setDesc] = useState('')
  const [area, setArea] = useState('')
  const [secLang, setSecLang] = useState('none')
  const [tone, setTone] = useState('')

  useEffect(() => {
    api('/api/social/profile').then(d => {
      if (d.profile) {
        setProfile(d.profile)
        setDesc(d.profile.business_description || '')
        setArea(d.profile.service_area || '')
        setSecLang(d.profile.caption_language_secondary || 'none')
        setTone(d.profile.tone_sample || '')
      }
    }).catch(() => {})
    api('/api/social/usage').then(d => setUsage(d)).catch(() => {})
  }, [])

  async function save() {
    setSaving(true)
    try {
      await api('/api/social/profile', {
        method: 'POST',
        body: JSON.stringify({ business_description: desc, service_area: area, caption_language_secondary: secLang, tone_sample: tone }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      alert('Failed: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function disconnect(platform: string) {
    if (!confirm('Disconnect ' + platform + '?')) return
    await api('/api/social/profile/connect/' + platform, { method: 'DELETE' })
    setProfile((p: any) => ({ ...p, ['platform_' + platform]: null }))
  }

  const isConnected = (plat: string) => !!(profile?.['platform_' + plat])



  return (
    <div style={{ padding: '4px 20px 120px' }}>
      <Sec label="Business profile" />
      <Field label="What you sell" value={desc} onChange={setDesc} multiline />
      <Field label="Service area" value={area} onChange={setArea} />

      <Sec label="Tone & voice" />
      <Field label="Tone sample (caption style you like)" value={tone} onChange={setTone} multiline />

      <Sec label="Caption language" />
      {LANG_OPTIONS.map(opt => (
        <div key={opt.value} onClick={() => setSecLang(opt.value)} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 8, cursor: 'pointer', minHeight: 44, marginBottom: 4,
          background: secLang === opt.value ? 'rgba(112,104,217,0.06)' : 'transparent',
        }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid ' + (secLang === opt.value ? ACC : '#6a6a64'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {secLang === opt.value && <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACC }} />}
          </div>
          <div style={{ fontSize: 13, color: secLang === opt.value ? '#e8e7e0' : '#9c9b95' }}>{opt.label}</div>
        </div>
      ))}

      <Sec label="Platform connections" />
      {[
        { id: 'instagram', label: 'Instagram', color: IG },
        { id: 'facebook', label: 'Facebook', color: FB },
        { id: 'tiktok', label: 'TikTok', color: TK },
      ].map(({ id, label, color }) => {
        const connected = isConnected(id)
        return (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#1a1a18', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 8, minHeight: 56 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#e8e7e0' }}>{label}</div>
            <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: connected ? 'rgba(93,202,165,0.1)' : 'rgba(255,255,255,0.04)', color: connected ? '#5DCAA5' : '#6a6a64', marginRight: 8 }}>
              {connected ? '??? Connected' : '??? Not connected'}
            </div>
            {connected ? (
              <button onClick={() => disconnect(id)} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', color: '#9c9b95', border: '1px solid rgba(255,255,255,0.06)' }}>
                Disconnect
              </button>
            ) : (
              <button style={{ padding: '6px 12px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', background: color + '1a', color, border: '1px solid ' + color + '33' }}>
                Connect
              </button>
            )}
          </div>
        )
      })}

      {usage && (
        <>
          <Sec label="Plan usage ??? this month" />
          <div style={{ background: '#1a1a18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14, marginBottom: 8 }}>
            {[
              { label: 'Photo uploads', used: usage.photo_uploads_used, limit: usage.photo_limit },
              { label: 'Posts scheduled', used: usage.posts_scheduled, limit: usage.post_limit },
            ].map(({ label, used, limit }) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#9c9b95' }}>{label}</span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: used >= limit ? '#E8894F' : ACC }}>{used} / {limit}</span>
                </div>
                <div style={{ height: 4, background: '#212120', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: Math.min(100, (used / limit) * 100) + '%', background: used >= limit ? '#E8894F' : ACC, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <button onClick={save} disabled={saving} style={{
        width: '100%', padding: 14, borderRadius: 10, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
        background: saved ? 'rgba(93,202,165,0.2)' : 'linear-gradient(135deg,#7068D9,#9b8ce8)',
        color: saved ? '#5DCAA5' : '#fff', minHeight: 48, marginTop: 8,
      }}>
        {saving ? 'Saving...' : saved ? '??? Saved' : 'Save changes'}
      </button>
    </div>
  )
}
