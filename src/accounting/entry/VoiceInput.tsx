import { useState, useRef } from 'react'
import { useToast } from '../../shared/components/Toast'

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
  const { show } = useToast()

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        uploadAudio(blob)
      }
      recorder.start(100)
      mediaRef.current = recorder
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
    setState('parsing')
    const timeout = setTimeout(() => { setState('error'); show('Parsing timed out', 'error') }, 30000)
    try {
      const form = new FormData()
      form.append('audio', blob, 'recording.webm')
      const res = await fetch('/api/voice/parse', { method: 'POST', credentials: 'include', body: form })
      clearTimeout(timeout)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setState('idle')
      onParsed(data)
    } catch (err) {
      clearTimeout(timeout)
      setState('error')
      show('Voice parsing failed, try again', 'error')
      setTimeout(() => setState('idle'), 2000)
    }
  }

  function handleClick() {
    if (disabled) return
    if (state === 'recording') { stopRecording(); return }
    if (state === 'idle') { startRecording() }
  }

  const isRecording = state === 'recording'
  const isParsing = state === 'parsing'

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isParsing}
      title={isRecording ? 'Tap to stop' : 'Voice entry'}
      style={{
        width: 44, height: 44, borderRadius: '50%', border: `1px solid ${isRecording ? 'rgba(255,69,58,0.5)' : 'var(--accent-border)'}`,
        background: isRecording ? 'rgba(255,69,58,0.12)' : 'var(--accent-dim)',
        color: isRecording ? '#ff453a' : 'var(--accent)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0, position: 'relative',
        animation: isRecording ? 'pulse 1.2s ease-in-out infinite' : 'none',
        transition: 'all 0.2s',
      }}
    >
      {isParsing ? (
        <span style={{ fontSize: 12, animation: 'spin 1s linear infinite' }}>⟳</span>
      ) : isRecording ? (
        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{seconds}s</span>
      ) : '🎤'}
    </button>
  )
}