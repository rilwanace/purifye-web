import { useState, useRef, useEffect } from 'react'
import { useToast } from '../../shared/components/Toast'
import { apiFormData } from '../../api'

interface VoiceInputProps {
  onParsed: (result: any) => void
  disabled?: boolean
}

export default function VoiceInput({ onParsed, disabled }: VoiceInputProps) {
  const [state, setState] = useState<'idle' | 'recording' | 'parsing' | 'error'>('idle')
  const [seconds, setSeconds] = useState(0)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const parseTimeoutRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const recordingStartRef = useRef<number>(0)
  const { show } = useToast()

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (parseTimeoutRef.current) clearTimeout(parseTimeoutRef.current)
      abortRef.current?.abort()
    }
  }, [])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const duration = Date.now() - recordingStartRef.current
        if (duration < 500) {
          setState('idle')
          return
        }
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        uploadAudio(blob)
      }
      recorder.start(100)
      mediaRef.current = recorder
      recordingStartRef.current = Date.now()
      setState('recording')
      setSeconds(0)
      timerRef.current = window.setInterval(() => {
        setSeconds(s => {
          if (s >= 59) {
            stopRecording()
            return 60
          }
          return s + 1
        })
      }, 1000)
    } catch (err) {
      show('Microphone access needed', 'error')
    }
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.stop()
    }
  }

  async function uploadAudio(blob: Blob) {
    if (blob.size > 5 * 1024 * 1024) { show('Recording too large (max 5 MB)', 'error'); setState('idle'); return }
    setState('parsing')
    const controller = new AbortController()
    abortRef.current = controller
    parseTimeoutRef.current = window.setTimeout(() => {
      controller.abort()
      setState('error')
      show('Parsing timed out', 'error')
      setTimeout(() => setState('idle'), 2000)
    }, 30000)
    try {
      const form = new FormData()
      form.append('audio', blob, 'recording.webm')
      const data = await apiFormData<any>('/api/voice/parse', form, 'POST', controller.signal)
      if (parseTimeoutRef.current) { clearTimeout(parseTimeoutRef.current); parseTimeoutRef.current = null }
      setState('idle')
      onParsed(data)
    } catch (err: any) {
      if (parseTimeoutRef.current) { clearTimeout(parseTimeoutRef.current); parseTimeoutRef.current = null }
      if (err?.name === 'AbortError') return
      setState('error')
      const msg = err?.message?.includes('unavailable') ? err.message : 'Voice parsing failed, try again'
      show(msg, 'error')
      setTimeout(() => setState('idle'), 2000)
    }
  }

  function handlePointerDown(_e: React.PointerEvent) {
    if (disabled || state !== 'idle') return
    startRecording()
  }

  function handlePointerUp() {
    if (state !== 'recording') return
    stopRecording()
  }

  function handlePointerLeave() {
    if (state !== 'recording') return
    stopRecording()
  }

  const isRecording = state === 'recording'
  const isParsing = state === 'parsing'

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%, 100% { opacity: 0.7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.2); } }
      `}</style>
      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        disabled={disabled || isParsing}
        title={isRecording ? 'Release to send' : isParsing ? 'Processing...' : 'Hold to record'}
        style={{
          width: 44, height: 44, borderRadius: '50%',
          border: `1px solid ${isRecording ? 'rgba(255,69,58,0.5)' : isParsing ? 'rgba(93,202,165,0.5)' : 'var(--accent-border)'}`,
          background: isRecording ? 'rgba(255,69,58,0.12)' : isParsing ? 'rgba(93,202,165,0.12)' : 'var(--accent-dim)',
          color: isRecording ? '#ff453a' : isParsing ? '#5DCAA5' : 'var(--accent)',
          cursor: disabled ? 'not-allowed' : isRecording ? 'grabbing' : isParsing ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0, position: 'relative',
          animation: isRecording ? 'pulse 1.2s ease-in-out infinite' : 'none',
          transition: 'background 0.2s, border-color 0.2s, transform 0.15s',
          transform: isRecording ? 'scale(1.15)' : 'scale(1)',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        {isParsing ? (
          <span style={{
            width: 18, height: 18, borderRadius: '50%',
            border: '2.5px solid rgba(93,202,165,0.3)',
            borderTopColor: '#5DCAA5',
            animation: 'spin 0.8s linear infinite',
            display: 'inline-block',
            flexShrink: 0,
          }} />
        ) : isRecording ? (
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{seconds}s</span>
        ) : '??'}
      </button>
    </>
  )
}
