import { useRef, useState } from 'react'
import { useToast } from '../../shared/components/Toast'

interface PhotoInputProps {
  onParsed: (result: any) => void
  disabled?: boolean
}

export default function PhotoInput({ onParsed, disabled }: PhotoInputProps) {
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { show } = useToast()

  async function handleFile(file: File) {
    setParsing(true)
    try {
      const form = new FormData()
      form.append('image', file)
      const res = await fetch('/api/ocr/parse', { method: 'POST', credentials: 'include', body: form })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setParsing(false)
      onParsed(data)
    } catch (err) {
      setParsing(false)
      setError(true)
      show('Photo parsing failed, try again', 'error')
      setTimeout(() => setError(false), 2000)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
      />
      <button
        onClick={() => !disabled && !parsing && inputRef.current?.click()}
        disabled={disabled || parsing}
        title="Photo entry"
        style={{
          width: 44, height: 44, borderRadius: '50%', border: `1px solid ${error ? 'rgba(255,69,58,0.5)' : 'var(--accent-border)'}`,
          background: error ? 'rgba(255,69,58,0.12)' : 'var(--accent-dim)',
          color: error ? '#ff453a' : 'var(--accent)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}
      >
        {parsing ? <span style={{ fontSize: 12, animation: 'spin 1s linear infinite' }}>⟳</span> : '📷'}
      </button>
    </>
  )
}