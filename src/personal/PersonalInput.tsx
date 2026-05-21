import { useState, useRef } from 'react'
import { apiFormData } from '../api'
import { useToast } from '../shared/components/Toast'
import PersonalConfirmCard from './PersonalConfirmCard'

const ACCENT = '#5B8DEF'

interface ParsedData {
  source_input_id: string
  workflow: string
  confidence: number
  fields: Record<string, unknown>
  photo_url?: string
  preview_url?: string
  r2_key?: string
  preview_key?: string
}

interface Props {
  mode: 'docs' | 'notes'
  onSaved: () => void
}

export default function PersonalInput({ mode, onSaved }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState<ParsedData | null>(null)
  const [recording, setRecording] = useState(false)
  const { show } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const placeholder = mode === 'docs' ? 'Snap a document...' : 'Type or speak a note...'

  async function submitText() {
    if (!text.trim()) return
    setLoading(true)
    try {
      const form = new FormData()
      form.append('input_type', 'text')
      form.append('text_input', text.trim())
      const result = await apiFormData<ParsedData>('/api/personal/parse', form)
      setParsed(result)
      setText('')
    } catch {
      show("Couldn't process that — please try again", 'error')
    } finally {
      setLoading(false)
    }
  }

  async function submitFile(file: File, inputType: 'photo' | 'voice') {
    setLoading(true)
    try {
      const form = new FormData()
      form.append('input_type', inputType)
      form.append('file', file, file.name)
      const result = await apiFormData<ParsedData>('/api/personal/parse', form)
      setParsed(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('Monthly upload limit') || msg === 'HTTP 429') {
        show('Upload limit reached for this month (200 photos). Resets on the 1st.', 'error')
      } else {
        show("Couldn't process that — please try again", 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const isAudio = file.type.startsWith('audio/')
    submitFile(file, isAudio ? 'voice' : 'photo')
    e.target.value = ''
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = e => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        submitFile(file, 'voice')
      }
      recorder.start()
      mediaRef.current = recorder
      setRecording(true)
    } catch {
      show('Microphone access denied', 'error')
    }
  }

  function stopRecording() {
    mediaRef.current?.stop()
    mediaRef.current = null
    setRecording(false)
  }

  return (
    <>
      <div style={{ position: 'fixed', bottom: 48, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, padding: '8px 12px', background: '#131311', borderTop: '1px solid rgba(255,255,255,0.04)', zIndex: 39, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#1a1a18', borderRadius: 14, padding: '8px 10px', border: '1px solid rgba(255,255,255,0.06)', height: 48, boxSizing: 'border-box' }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitText()}
            placeholder={placeholder}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontFamily: 'DM Sans', color: '#e8e7e0', minWidth: 0 }}
          />

          {mode === 'docs' ? (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: loading ? '#4a4a44' : '#9c9b95', minWidth: 32, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>
          ) : (
            <button
              onPointerDown={startRecording}
              onPointerUp={stopRecording}
              onPointerLeave={recording ? stopRecording : undefined}
              disabled={loading}
              style={{ background: recording ? `${ACCENT}22` : 'none', border: recording ? `1px solid ${ACCENT}` : 'none', borderRadius: 8, cursor: 'pointer', padding: 4, minWidth: 32, minHeight: 32, color: recording ? ACCENT : (loading ? '#4a4a44' : '#9c9b95'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={recording ? ACCENT : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <rect x="9" y="2" width="6" height="12" rx="3"/>
                <path d="M5 10a7 7 0 0014 0M12 19v4M8 23h8"/>
              </svg>
            </button>
          )}

          {text.trim() && (
            <button
              onClick={submitText}
              disabled={loading}
              style={{ background: loading ? '#2a2a28' : `linear-gradient(135deg, ${ACCENT}, #3A63B8)`, border: 'none', borderRadius: 8, cursor: 'pointer', padding: '6px 12px', color: '#fff', fontSize: 12, fontFamily: 'DM Sans', fontWeight: 600, minHeight: 32 }}
            >
              {loading ? '...' : 'Send'}
            </button>
          )}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', marginTop: 5 }}>
            <span style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#6a6a64' }}>
              {recording ? 'Processing audio...' : 'Parsing with AI...'}
            </span>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*,audio/*" capture="environment" style={{ display: 'none' }} onChange={handleFileChange} />

      {parsed && (
        <PersonalConfirmCard
          parsed={parsed}
          onClose={() => setParsed(null)}
          onSaved={() => { setParsed(null); onSaved() }}
        />
      )}
    </>
  )
}
