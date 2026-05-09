import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const ACC = '#7068D9'

const AUDIENCE_CHIPS = [
  'Local families', 'Young professionals', 'Food lovers', 'SME owners',
  'Tourists', 'Students', 'Corporate clients', 'Home cooks',
]

const LANG_OPTIONS = [
  { value: 'none', label: 'English only', note: '' },
  { value: 'tamil', label: 'Tamil', note: 'AI-generated Tamil may need light editing for natural flow' },
  { value: 'sinhala', label: 'Sinhala', note: 'AI-generated Sinhala may need light editing for natural flow' },
  { value: 'sinhala_mix', label: 'Singlish (Sinhala + English mix)', note: 'Romanized Sinhala mixed with English, like local Sri Lankan social posts' },
]

function Step({ n, label, active }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
        background: active ? ACC : 'rgba(255,255,255,0.06)',
        color: active ? '#fff' : '#6a6a64',
      }}>{n}</div>
      <span style={{ fontSize: 11, color: active ? '#e8e7e0' : '#6a6a64', fontWeight: active ? 600 : 400 }}>{label}</span>
    </div>
  )
}

export default function SocialOnboarding() {
  const nav = useNavigate()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [area, setArea] = useState('')
  const [audience, setAudience] = useState<string[]>([])
  const [tone, setTone] = useState('')
  const [toneSamples, setToneSamples] = useState<{ professional: string; casual: string; warm: string } | null>(null)
  const [loadingTone, setLoadingTone] = useState(false)
  const [secLang, setSecLang] = useState('none')
  const [loading, setLoading] = useState(false)

  function toggleAudience(a: string) {
    setAudience(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])
  }

  async function goToStep2() {
    if (!name.trim() || !desc.trim()) return
    setLoadingTone(true)
    try {
      const res = await api('/api/social/generate/onboarding', {
        method: 'POST',
        body: JSON.stringify({ business_name: name, business_description: desc, service_area: area }),
      })
      setToneSamples(res)
      setStep(2)
    } catch (e) {
      setStep(2)
    } finally {
      setLoadingTone(false)
    }
  }

  async function finish() {
    setLoading(true)
    try {
      await api('/api/social/profile', {
        method: 'POST',
        body: JSON.stringify({
          business_description: desc,
          target_audience: audience,
          service_area: area,
          tone_sample: tone,
          caption_language_secondary: secLang,
          onboarding_completed: true,
        }),
      })
      nav('/social/analytics')
    } catch (e: any) {
      alert('Failed: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const stepLabels = ['Business', 'Tone', 'Language']

  return (
    <div style={{ minHeight: '100vh', background: '#131311', padding: '20px 20px 120px', maxWidth: 430, margin: '0 auto' }}>
      {/* Progress */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 32, flexWrap: 'wrap' }}>
        {stepLabels.map((l, i) => (
          <Step key={l} n={i + 1} label={l} active={step === i + 1} />
        ))}
      </div>

      {/* Step 1 ??? Business profile */}
      {step === 1 && (
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#e8e7e0', marginBottom: 4 }}>Tell us about your business</div>
          <div style={{ fontSize: 13, color: '#9c9b95', marginBottom: 24 }}>This helps us write captions that sound like you</div>

          {[
            { label: 'Business name', val: name, set: setName, ph: 'e.g. Ceylon Bakes' },
            { label: 'What do you sell?', val: desc, set: setDesc, ph: 'e.g. Handmade pastries and cakes, fresh daily' },
            { label: 'Service area', val: area, set: setArea, ph: 'e.g. Colombo 3, Sri Lanka' },
          ].map(({ label, val, set, ph }) => (
            <div key={label} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#9c9b95', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
              <input
                value={val}
                onChange={e => set(e.target.value)}
                placeholder={ph}
                style={{
                  width: '100%', background: '#2a2a28', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8, padding: '12px', fontSize: 13, color: '#e8e7e0',
                  fontFamily: 'var(--font-sans)', outline: 'none', colorScheme: 'dark',
                  boxSizing: 'border-box', minHeight: 44,
                }}
              />
            </div>
          ))}

          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#9c9b95', marginBottom: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Target audience</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
            {AUDIENCE_CHIPS.map(a => (
              <button key={a} onClick={() => toggleAudience(a)} style={{
                padding: '8px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer', minHeight: 36, border: '1px solid',
                color: audience.includes(a) ? ACC : '#9c9b95',
                background: audience.includes(a) ? 'rgba(112,104,217,0.1)' : 'rgba(255,255,255,0.04)',
                borderColor: audience.includes(a) ? 'rgba(112,104,217,0.3)' : 'rgba(255,255,255,0.06)',
              }}>{a}</button>
            ))}
          </div>

          <button onClick={goToStep2} disabled={!name.trim() || !desc.trim() || loadingTone} style={{
            width: '100%', padding: 14, borderRadius: 10, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#7068D9,#9b8ce8)', color: '#fff', minHeight: 48,
            opacity: (!name.trim() || !desc.trim()) ? 0.5 : 1,
          }}>
            {loadingTone ? 'Generating tone samples...' : 'Continue ???'}
          </button>
        </div>
      )}

      {/* Step 2 ??? Tone */}
      {step === 2 && (
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#e8e7e0', marginBottom: 4 }}>How should your posts sound?</div>
          <div style={{ fontSize: 13, color: '#9c9b95', marginBottom: 24 }}>Tap the style that sounds most like you</div>

          {toneSamples ? (
            [
              { key: 'professional', label: 'Professional & Polished', emoji: '????' },
              { key: 'casual', label: 'Casual & Fun', emoji: '????' },
              { key: 'warm', label: 'Warm & Storytelling', emoji: '??????' },
            ].map(({ key, label, emoji }) => {
              const sample = toneSamples[key as keyof typeof toneSamples]
              return (
                <div key={key} onClick={() => setTone(sample)} style={{
                  background: '#1a1a18', border: '1px solid ' + (tone === sample ? 'rgba(112,104,217,0.4)' : 'rgba(255,255,255,0.06)'),
                  borderRadius: 10, padding: 16, marginBottom: 10, cursor: 'pointer',
                  background: tone === sample ? 'rgba(112,104,217,0.04)' : '#1a1a18',
                } as any}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span>{emoji}</span>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#e8e7e0' }}>{label}</div>
                    {tone === sample && <div style={{ marginLeft: 'auto', fontSize: 12, color: ACC }}>??? Selected</div>}
                  </div>
                  <div style={{ fontSize: 12, color: '#9c9b95', lineHeight: 1.5, fontStyle: 'italic' }}>"{sample}"</div>
                </div>
              )
            })
          ) : (
            <div style={{ color: '#6a6a64', fontSize: 13, padding: '20px 0' }}>Could not generate tone samples. You can skip and set your tone later in Settings.</div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button onClick={() => setStep(1)} style={{ flex: 1, padding: 14, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#212120', color: '#e8e7e0', border: '1px solid rgba(255,255,255,0.06)', minHeight: 48 }}>Back</button>
            <button onClick={() => setStep(3)} style={{ flex: 2, padding: 14, borderRadius: 10, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#7068D9,#9b8ce8)', color: '#fff', minHeight: 48 }}>
              {tone ? 'Continue ???' : 'Skip ???'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 ??? Language */}
      {step === 3 && (
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#e8e7e0', marginBottom: 4 }}>Caption language</div>
          <div style={{ fontSize: 13, color: '#9c9b95', marginBottom: 6 }}>Primary: <strong style={{ color: '#e8e7e0' }}>English</strong> (always included)</div>
          <div style={{ fontSize: 11, color: '#6a6a64', marginBottom: 24 }}>Add a secondary language for posts targeting local Sri Lankan audiences</div>

          {LANG_OPTIONS.map(opt => (
            <div key={opt.value} onClick={() => setSecLang(opt.value)} style={{
              background: '#1a1a18', border: '1px solid ' + (secLang === opt.value ? 'rgba(112,104,217,0.4)' : 'rgba(255,255,255,0.06)'),
              borderRadius: 10, padding: 14, marginBottom: 8, cursor: 'pointer',
              background: secLang === opt.value ? 'rgba(112,104,217,0.04)' : '#1a1a18',
            } as any}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid ' + (secLang === opt.value ? ACC : '#6a6a64'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {secLang === opt.value && <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACC }} />}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#e8e7e0' }}>{opt.label}</div>
              </div>
              {opt.note && <div style={{ fontSize: 10, color: '#6a6a64', marginTop: 6, marginLeft: 24 }}>{opt.note}</div>}
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
            <button onClick={() => setStep(2)} style={{ flex: 1, padding: 14, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#212120', color: '#e8e7e0', border: '1px solid rgba(255,255,255,0.06)', minHeight: 48 }}>Back</button>
            <button onClick={finish} disabled={loading} style={{ flex: 2, padding: 14, borderRadius: 10, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#7068D9,#9b8ce8)', color: '#fff', minHeight: 48 }}>
              {loading ? 'Saving...' : "You're all set ????"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
