import { useState, useRef, useCallback } from 'react'
import { gemApi } from './gemledger-api'

const C = {
  bg: '#0a0f0a', card: '#111a11', border: '#1e2e1e',
  t1: '#e0e8e0', t2: '#b0c0b0', t3: '#8a9a8a',
  green: '#34d399', greenDim: '#1a4a2a', err: '#f87171',
}

interface Props {
  onClose: () => void
}

export default function GemLedgerAICleanup({ onClose }: Props) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [cleanedBlob, setCleanedBlob] = useState<Blob | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setErr(null)
    setDone(false)
    setCleanedBlob(null)
    setLoading(true)
    try {
      const blob = await gemApi.importAiCleanup(file)
      setCleanedBlob(blob)
      setDone(true)
    } catch (e: any) {
      setErr(e.message || 'Cleanup failed')
    } finally {
      setLoading(false)
    }
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

  const handleDownload = () => {
    if (!cleanedBlob) return
    const url = URL.createObjectURL(cleanedBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cleaned_inventory.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: C.bg, overflowY: 'auto',
      fontFamily: 'DM Sans, sans-serif',
    }}>
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
            Upload your messy spreadsheet. AI will parse it and return a new Excel file in our template format — yellow cells are uncertain, red cells need your attention. Then use "Import Excel" to bring it in.
          </div>
        </div>

        {/* Upload area */}
        {!done && (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => !loading && fileInputRef.current?.click()}
              style={{
                border: '2px dashed ' + (dragging ? C.green : C.border),
                borderRadius: 16, padding: '40px 20px', textAlign: 'center',
                cursor: loading ? 'default' : 'pointer',
                background: dragging ? C.greenDim : C.card,
                transition: 'all 0.15s',
                minHeight: 200, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 14,
              }}
            >
              {loading ? (
                <>
                  <div style={{ fontSize: 40 }}>⏳</div>
                  <div style={{ fontSize: 15, color: C.t1, fontWeight: 600 }}>Cleaning up your data…</div>
                  <div style={{ fontSize: 12, color: C.t3 }}>This may take 30–60 seconds for large files</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 40 }}>🤖</div>
                  <div style={{ fontSize: 15, color: C.t1, fontWeight: 600 }}>Tap to upload or drag file here</div>
                  <div style={{ fontSize: 12, color: C.t3 }}>Supports .xlsx, .xls, .csv — max 10 MB</div>
                </>
              )}
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

        {/* Error */}
        {err && (
          <div style={{ marginTop: 14, padding: '12px 14px', background: '#2a1010', border: '1px solid #5a2020', borderRadius: 8, color: C.err, fontSize: 13 }}>
            {err}
          </div>
        )}

        {/* Success */}
        {done && cleanedBlob && (
          <div style={{ textAlign: 'center', paddingTop: 16 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 18, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: C.t1, marginBottom: 6 }}>
              Cleanup complete
            </div>
            <div style={{ fontSize: 13, color: C.t3, marginBottom: 24 }}>
              Yellow cells = uncertain mapping. Red cells = couldn't parse or required field missing. Fix those, then import.
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
              onClick={() => { setDone(false); setCleanedBlob(null); setErr(null) }}
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
