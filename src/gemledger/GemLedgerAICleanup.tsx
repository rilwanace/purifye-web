import { useState, useRef, useCallback, useEffect } from 'react'
import { gemApi } from './gemledger-api'

const C = {
  bg: '#0a0f0a', card: '#111a11', border: '#1e2e1e',
  t1: '#e0e8e0', t2: '#b0c0b0', t3: '#8a9a8a',
  green: '#34d399', greenDim: '#1a4a2a', err: '#f87171',
}

const PROGRESS_MESSAGES = [
  'Analyzing your spreadsheet…',
  'Mapping columns…',
  'Generating cleaned file…',
]

interface Props {
  onClose: () => void
}

export default function GemLedgerAICleanup({ onClose }: Props) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msgIdx, setMsgIdx] = useState(0)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!loading) { setMsgIdx(0); return }
    const t = setInterval(() => setMsgIdx(i => (i + 1) % PROGRESS_MESSAGES.length), 3500)
    return () => clearInterval(t)
  }, [loading])

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    }
  }, [])

  const handleFile = useCallback(async (file: File) => {
    setErr(null)
    setDone(false)
    setJobId(null)
    setLoading(true)
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }

    let jid: string
    try {
      const result = await gemApi.importAiCleanupStart(file)
      jid = result.job_id
    } catch (e: any) {
      setErr(e.message || 'Upload failed')
      setLoading(false)
      return
    }

    let failCount = 0
    const poll = async () => {
      try {
        const s = await gemApi.importCleanupStatus(jid)
        failCount = 0
        if (s.status === 'completed') {
          setJobId(jid)
          setDone(true)
          setLoading(false)
        } else if (s.status === 'failed') {
          setErr(s.error || 'Cleanup failed')
          setLoading(false)
        } else if (s.status === 'expired') {
          setErr(s.error || 'Job expired. Please upload again.')
          setLoading(false)
        } else {
          pollTimerRef.current = setTimeout(poll, 3000)
        }
      } catch {
        failCount++
        if (failCount >= 5) {
          setErr('Connection lost. Please try again.')
          setLoading(false)
        } else {
          pollTimerRef.current = setTimeout(poll, 3000)
        }
      }
    }
    pollTimerRef.current = setTimeout(poll, 3000)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
      e.target.value = ''
    }
  }, [handleFile])

  const handleDownload = async () => {
    if (!jobId) return
    try {
      const blob = await gemApi.importCleanupDownload(jobId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'cleaned_inventory.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setErr(e.message || 'Download failed')
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: C.bg, overflowY: 'auto',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <style>{`
        @keyframes glCleanupSlide {
          0%   { left: -50%; }
          100% { left: 110%; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid ' + C.border,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, background: C.bg, zIndex: 10,
      }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 16, color: C.t1 }}>
          Clean up Excel
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: C.t3, fontSize: 22, cursor: 'pointer', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >✕</button>
      </div>

      <div style={{ padding: '24px 16px', maxWidth: 430, margin: '0 auto' }}>
        {/* Explainer */}
        <div style={{ padding: '14px 16px', background: C.card, border: '1px solid ' + C.border, borderRadius: 10, marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.6 }}>
            Upload your messy spreadsheet. AI will parse it and return a cleaned Excel file in our template format — red cells need your attention (required field missing). Then use “Import Excel” to bring it in.
          </div>
        </div>

        {/* Upload area — hidden while loading or done */}
        {!done && !loading && (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed ' + (dragging ? C.green : C.border),
                borderRadius: 16, padding: '40px 20px', textAlign: 'center',
                cursor: 'pointer',
                background: dragging ? C.greenDim : C.card,
                transition: 'all 0.15s',
                minHeight: 200, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 14,
              }}
            >
              <div style={{ fontSize: 40 }}>🤖</div>
              <div style={{ fontSize: 15, color: C.t1, fontWeight: 600 }}>Tap to upload or drag file here</div>
              <div style={{ fontSize: 12, color: C.t3 }}>Supports .xlsx, .xls, .csv — max 10 MB</div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={onFileChange}
            />
          </>
        )}

        {/* Progress indicator */}
        {loading && (
          <div style={{
            padding: '32px 20px', background: C.card,
            border: '1px solid ' + C.border, borderRadius: 16,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          }}>
            <div style={{ fontSize: 36 }}>🤖</div>
            <div style={{ fontSize: 15, color: C.t1, fontWeight: 600, textAlign: 'center' }}>
              {PROGRESS_MESSAGES[msgIdx]}
            </div>
            {/* Indeterminate progress bar */}
            <div style={{
              width: '100%', height: 6, background: C.border,
              borderRadius: 3, overflow: 'hidden', position: 'relative',
            }}>
              <div style={{
                position: 'absolute', top: 0, height: '100%',
                width: '50%', background: C.green, borderRadius: 3,
                animation: 'glCleanupSlide 1.6s ease-in-out infinite',
              }} />
            </div>
            <div style={{ fontSize: 12, color: C.t3 }}>This may take 10–60 seconds for large files</div>
          </div>
        )}

        {/* Error */}
        {err && (
          <div style={{ marginTop: 14 }}>
            <div style={{ padding: '12px 14px', background: '#2a1010', border: '1px solid #5a2020', borderRadius: 8, color: C.err, fontSize: 13, marginBottom: 10 }}>
              {err}
            </div>
            <button
              onClick={() => { setErr(null); fileInputRef.current?.click() }}
              style={{
                width: '100%', padding: '13px 0',
                background: 'transparent', color: C.t2,
                border: '1px solid ' + C.border, borderRadius: 10, cursor: 'pointer',
                fontSize: 14, fontFamily: 'DM Sans, sans-serif', minHeight: 44,
              }}
            >
              Try again
            </button>
          </div>
        )}

        {/* Success */}
        {done && (
          <div style={{ textAlign: 'center', paddingTop: 16 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 18, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: C.t1, marginBottom: 6 }}>
              Cleanup complete
            </div>
            <div style={{ fontSize: 13, color: C.t3, marginBottom: 24 }}>
              Red cells = required field missing or couldn’t parse. Fix those, then use “Import Excel”.
            </div>
            <button
              onClick={handleDownload}
              style={{
                width: '100%', padding: '16px 0',
                background: C.green, color: '#0a0f0a',
                border: 'none', borderRadius: 12, cursor: 'pointer',
                fontSize: 16, fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
                minHeight: 52, marginBottom: 12,
              }}
            >
              Download cleaned_inventory.xlsx
            </button>
            <button
              onClick={() => { setDone(false); setJobId(null); setErr(null) }}
              style={{
                width: '100%', padding: '14px 0',
                background: 'transparent', color: C.t3,
                border: '1px solid ' + C.border, borderRadius: 12, cursor: 'pointer',
                fontSize: 14, fontFamily: 'DM Sans, sans-serif', minHeight: 48,
              }}
            >
              Clean another file
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
