import { useState, useRef, useCallback } from 'react'
import { gemApi } from './gemledger-api'
import type { TemplateImportResult } from './gemledger-types'

const C = {
  bg: '#0a0f0a', card: '#111a11', border: '#1e2e1e',
  t1: '#e0e8e0', t2: '#b0c0b0', t3: '#8a9a8a',
  green: '#34d399', greenDim: '#1a4a2a', err: '#f87171',
}

type Step = 'upload' | 'confirm' | 'result'

interface Props {
  onClose: () => void
  onDone: () => void
}

export default function GemLedgerTemplateImport({ onClose, onDone }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [lotCount, setLotCount] = useState(0)
  const [partyNames, setPartyNames] = useState<string[]>([])
  const [previewErrors, setPreviewErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<TemplateImportResult | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setUploadErr(null)
    setUploading(true)
    try {
      const res = await gemApi.importTemplateUpload(file)
      setUploadId(res.upload_id)
      setLotCount(res.lot_count)
      setPartyNames(res.party_names)
      setPreviewErrors(res.errors)
      setStep('confirm')
    } catch (e: any) {
      setUploadErr(e.message || 'Upload failed')
    } finally {
      setUploading(false)
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

  const handleImport = async () => {
    if (!uploadId) return
    setImporting(true)
    try {
      const res = await gemApi.importTemplateExecute({ upload_id: uploadId })
      setResult(res)
      setStep('result')
    } catch (e: any) {
      setUploadErr(e.message || 'Import failed')
      setStep('upload')
    } finally {
      setImporting(false)
    }
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {step === 'confirm' && (
            <button
              onClick={() => setStep('upload')}
              style={{ background: 'none', border: 'none', color: C.t3, fontSize: 18, cursor: 'pointer', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center' }}
            >←</button>
          )}
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 16, color: C.t1 }}>
            Import Excel
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: C.t3, fontSize: 22, cursor: 'pointer', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >✕</button>
      </div>

      <div style={{ padding: '24px 16px', maxWidth: 430, margin: '0 auto' }}>

        {/* ── Upload ── */}
        {step === 'upload' && (
          <>
            <div style={{ padding: '12px 14px', background: C.card, border: '1px solid ' + C.border, borderRadius: 10, marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.6 }}>
                Upload a file that matches our template format. Headers must be exactly: <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: C.green }}>stone_type, weight_ct, total_cost</span> and others. Download the blank template first if needed.
              </div>
            </div>

            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              style={{
                border: '2px dashed ' + (dragging ? C.green : C.border),
                borderRadius: 16, padding: '40px 20px', textAlign: 'center',
                cursor: uploading ? 'default' : 'pointer',
                background: dragging ? C.greenDim : C.card,
                transition: 'all 0.15s',
                minHeight: 200, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 14,
              }}
            >
              <div style={{ fontSize: 40 }}>📥</div>
              <div style={{ fontSize: 15, color: C.t1, fontWeight: 600 }}>
                {uploading ? 'Reading file…' : 'Tap to upload or drag file here'}
              </div>
              <div style={{ fontSize: 12, color: C.t3 }}>Supports .xlsx, .xls, .csv — max 10 MB</div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={onFileChange}
            />

            {uploadErr && (
              <div style={{ marginTop: 14, padding: '12px 14px', background: '#2a1010', border: '1px solid #5a2020', borderRadius: 8, color: C.err, fontSize: 13 }}>
                {uploadErr}
              </div>
            )}
          </>
        )}

        {/* ── Confirm ── */}
        {step === 'confirm' && (
          <>
            {previewErrors.length > 0 && (
              <div style={{ marginBottom: 16, padding: '12px 14px', background: '#2a1a0a', border: '1px solid #5a3a0a', borderRadius: 8 }}>
                {previewErrors.map((e, i) => (
                  <div key={i} style={{ color: '#fbbf24', fontSize: 13 }}>⚠ {e}</div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, padding: '16px', background: C.card, border: '1px solid ' + C.border, borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontFamily: 'JetBrains Mono, monospace', color: C.green, fontWeight: 700 }}>
                  {lotCount.toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>Lots found</div>
              </div>
              <div style={{ flex: 1, padding: '16px', background: C.card, border: '1px solid ' + C.border, borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontFamily: 'JetBrains Mono, monospace', color: '#fbbf24', fontWeight: 700 }}>
                  {partyNames.length}
                </div>
                <div style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>Parties</div>
              </div>
            </div>

            {partyNames.length > 0 && (
              <div style={{ padding: '12px 14px', background: C.card, border: '1px solid ' + C.border, borderRadius: 10, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: C.t3, marginBottom: 8 }}>Parties that will be created if new:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {partyNames.map(p => (
                    <span key={p} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 10, background: '#1a3a2a', color: C.green, fontFamily: 'DM Sans' }}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ padding: '12px 14px', background: C.card, border: '1px solid ' + C.border, borderRadius: 10, marginBottom: 20, fontSize: 12, color: C.t3 }}>
              Duplicate rows (same stone type, weight, cost, date) will be skipped automatically.
            </div>

            <button
              onClick={handleImport}
              disabled={importing || previewErrors.length > 0}
              style={{
                width: '100%', padding: '16px 0',
                background: (importing || previewErrors.length > 0) ? C.border : C.green,
                color: (importing || previewErrors.length > 0) ? C.t3 : '#0a0f0a',
                border: 'none', borderRadius: 12,
                cursor: (importing || previewErrors.length > 0) ? 'not-allowed' : 'pointer',
                fontSize: 16, fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
                minHeight: 52,
              }}
            >
              {importing ? 'Importing…' : `Import ${lotCount.toLocaleString()} lots`}
            </button>
          </>
        )}

        {/* ── Result ── */}
        {step === 'result' && result && (
          <>
            <div style={{ textAlign: 'center', padding: '24px 0 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>
                {result.imported > 0 ? '✓' : '⚠'}
              </div>
              <div style={{ fontSize: 22, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: C.t1 }}>
                Import complete
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 120px', padding: '14px', background: C.card, border: '1px solid ' + C.border, borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontFamily: 'JetBrains Mono, monospace', color: C.green, fontWeight: 700 }}>{result.imported}</div>
                <div style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>Lots created</div>
              </div>
              {result.imported_parties > 0 && (
                <div style={{ flex: '1 1 120px', padding: '14px', background: C.card, border: '1px solid ' + C.border, borderRadius: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontFamily: 'JetBrains Mono, monospace', color: '#fbbf24', fontWeight: 700 }}>{result.imported_parties}</div>
                  <div style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>New parties</div>
                </div>
              )}
              {result.skipped_dedup > 0 && (
                <div style={{ flex: '1 1 120px', padding: '14px', background: C.card, border: '1px solid ' + C.border, borderRadius: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontFamily: 'JetBrains Mono, monospace', color: C.t3, fontWeight: 700 }}>{result.skipped_dedup}</div>
                  <div style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>Duplicates skipped</div>
                </div>
              )}
              {result.failed_rows.length > 0 && (
                <div style={{ flex: '1 1 120px', padding: '14px', background: C.card, border: '1px solid #5a2020', borderRadius: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontFamily: 'JetBrains Mono, monospace', color: C.err, fontWeight: 700 }}>{result.failed_rows.length}</div>
                  <div style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>Failed rows</div>
                </div>
              )}
            </div>

            {result.failed_rows.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <button
                  onClick={() => setShowErrors(v => !v)}
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'transparent', border: '1px solid ' + C.border,
                    borderRadius: 8, color: C.t2, cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif', fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    minHeight: 44,
                  }}
                >
                  <span>Failed rows ({result.failed_rows.length})</span>
                  <span>{showErrors ? '▲' : '▼'}</span>
                </button>
                {showErrors && (
                  <div style={{ marginTop: 6, maxHeight: 240, overflowY: 'auto', border: '1px solid ' + C.border, borderRadius: 8 }}>
                    {result.failed_rows.map((e, i) => (
                      <div key={i} style={{ padding: '8px 12px', borderBottom: i < result.failed_rows.length - 1 ? '1px solid ' + C.border : 'none', fontSize: 12 }}>
                        <span style={{ color: C.t3, fontFamily: 'JetBrains Mono, monospace' }}>Row {e.row}</span>
                        <span style={{ color: C.err, marginLeft: 8 }}>{e.error}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => { onDone(); onClose() }}
              style={{
                width: '100%', padding: '16px 0',
                background: C.green, color: '#0a0f0a',
                border: 'none', borderRadius: 12, cursor: 'pointer',
                fontSize: 16, fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
                minHeight: 52,
              }}
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  )
}
