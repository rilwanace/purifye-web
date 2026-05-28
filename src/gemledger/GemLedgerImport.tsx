import { useState, useRef, useCallback } from 'react'
import { gemApi } from './gemledger-api'
import type {
  ImportSheetInfo, ImportSheetConfig, ImportResult,
  LotField,
} from './gemledger-types'
import { ALL_LOT_FIELDS, LOT_FIELD_LABELS } from './gemledger-types'

const C = {
  bg: '#0a0f0a', card: '#111a11', border: '#1e2e1e',
  t1: '#e0e8e0', t2: '#b0c0b0', t3: '#8a9a8a',
  green: '#34d399', greenDim: '#1a4a2a', err: '#f87171',
}

type Step = 'upload' | 'map' | 'confirm' | 'result'

interface Props {
  onClose: () => void
  onDone: () => void
}

function FieldSelect({
  value, onChange,
}: {
  value: LotField | null
  onChange: (v: LotField | null) => void
}) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange((e.target.value as LotField) || null)}
      style={{
        background: '#1a2a1a', border: '1px solid ' + C.border,
        color: value ? C.t1 : C.t3, borderRadius: 6, padding: '6px 8px',
        fontFamily: 'DM Sans, sans-serif', fontSize: 13, width: '100%',
        minHeight: 36, cursor: 'pointer',
      }}
    >
      <option value="">— Skip —</option>
      {ALL_LOT_FIELDS.map(f => (
        <option key={f} value={f}>{LOT_FIELD_LABELS[f]}</option>
      ))}
    </select>
  )
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'upload', label: 'Upload' },
    { id: 'map', label: 'Map Columns' },
    { id: 'confirm', label: 'Confirm' },
  ]
  const idx = steps.findIndex(s => s.id === step)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20 }}>
      {steps.map((s, i) => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: i <= idx ? C.green : C.border,
              color: i <= idx ? '#0a0f0a' : C.t3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
            }}>{i + 1}</div>
            <span style={{ fontSize: 10, color: i <= idx ? C.green : C.t3, fontFamily: 'DM Sans', whiteSpace: 'nowrap' }}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < idx ? C.green : C.border, margin: '0 6px', marginBottom: 16 }} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function GemLedgerImport({ onClose, onDone }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [sheets, setSheets] = useState<ImportSheetInfo[]>([])
  const [selectedSheets, setSelectedSheets] = useState<Set<string>>(new Set())
  const [mappings, setMappings] = useState<Record<string, Record<string, LotField | null>>>({})
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setUploadErr(null)
    setUploading(true)
    try {
      const res = await gemApi.importUpload(file)
      setUploadId(res.upload_id)
      setSheets(res.sheets)
      const sel = new Set(res.sheets.map(s => s.name))
      setSelectedSheets(sel)
      const initMappings: Record<string, Record<string, LotField | null>> = {}
      for (const sh of res.sheets) {
        initMappings[sh.name] = { ...sh.suggested_mapping } as Record<string, LotField | null>
      }
      setMappings(initMappings)
      setStep('map')
    } catch (err: any) {
      setUploadErr(err.message || 'Upload failed')
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
    if (file) handleFile(file)
  }, [handleFile])

  const toggleSheet = (name: string) => {
    setSelectedSheets(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const setColumnMapping = (sheetName: string, header: string, field: LotField | null) => {
    setMappings(prev => ({
      ...prev,
      [sheetName]: { ...prev[sheetName], [header]: field },
    }))
  }

  const getSheetConfigs = (): ImportSheetConfig[] =>
    sheets
      .filter(s => selectedSheets.has(s.name))
      .map(s => ({ name: s.name, mapping: mappings[s.name] || {} }))

  const totalRows = sheets
    .filter(s => selectedSheets.has(s.name))
    .reduce((n, s) => n + s.row_count, 0)

  const handleExecute = async () => {
    if (!uploadId) return
    setExecuting(true)
    try {
      const res = await gemApi.importExecute({ upload_id: uploadId, sheets: getSheetConfigs() })
      setResult(res)
      setStep('result')
    } catch (err: any) {
      alert(err.message || 'Import failed')
    } finally {
      setExecuting(false)
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
          {step !== 'upload' && step !== 'result' && (
            <button
              onClick={() => setStep(step === 'confirm' ? 'map' : 'upload')}
              style={{ background: 'none', border: 'none', color: C.t3, fontSize: 18, cursor: 'pointer', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center' }}
            >←</button>
          )}
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 16, color: C.t1 }}>
            Import from Excel
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: C.t3, fontSize: 22, cursor: 'pointer', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >✕</button>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 430, margin: '0 auto' }}>
        {step !== 'result' && <StepIndicator step={step} />}

        {/* ── Step 1: Upload ── */}
        {step === 'upload' && (
          <div>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed ' + (dragging ? C.green : C.border),
                borderRadius: 16, padding: '40px 20px', textAlign: 'center',
                cursor: 'pointer', background: dragging ? C.greenDim : C.card,
                transition: 'all 0.15s',
                minHeight: 180, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 12,
              }}
            >
              <div style={{ fontSize: 40 }}>📊</div>
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
              <div style={{ marginTop: 12, padding: '10px 14px', background: '#2a1010', border: '1px solid #5a2020', borderRadius: 8, color: C.err, fontSize: 13 }}>
                {uploadErr}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Map Columns ── */}
        {step === 'map' && (
          <div>
            {sheets.length > 1 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: C.t2, marginBottom: 8, fontWeight: 600 }}>Select sheets to import</div>
                {sheets.map(sh => (
                  <label key={sh.name} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', background: C.card, borderRadius: 8,
                    border: '1px solid ' + C.border, marginBottom: 6, cursor: 'pointer',
                    minHeight: 44,
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedSheets.has(sh.name)}
                      onChange={() => toggleSheet(sh.name)}
                      style={{ width: 18, height: 18, accentColor: C.green }}
                    />
                    <span style={{ color: C.t1, fontSize: 14 }}>{sh.name}</span>
                    <span style={{ marginLeft: 'auto', color: C.t3, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>{sh.row_count} rows</span>
                  </label>
                ))}
              </div>
            )}

            {sheets.filter(s => selectedSheets.has(s.name)).map(sh => (
              <div key={sh.name} style={{ marginBottom: 24 }}>
                {sheets.length > 1 && (
                  <div style={{ fontSize: 13, color: C.green, fontWeight: 700, marginBottom: 10, fontFamily: 'JetBrains Mono, monospace' }}>
                    Sheet: {sh.name}
                  </div>
                )}
                <div style={{ fontSize: 12, color: C.t3, marginBottom: 10 }}>
                  Map each column to a lot field, or skip it.
                </div>

                {sh.headers.map(header => (
                  <div key={header} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{
                        flex: '0 0 auto', maxWidth: 140,
                        fontSize: 12, color: C.t2, fontFamily: 'JetBrains Mono, monospace',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }} title={header}>{header}</div>
                      <div style={{ flex: 1 }}>
                        <FieldSelect
                          value={mappings[sh.name]?.[header] ?? null}
                          onChange={v => setColumnMapping(sh.name, header, v)}
                        />
                      </div>
                    </div>
                    {sh.sample_rows.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, paddingLeft: 4, flexWrap: 'wrap' }}>
                        {sh.sample_rows.slice(0, 3).map((row, ri) => {
                          const idx = sh.headers.indexOf(header)
                          const val = row[idx]
                          return val !== null && val !== '' ? (
                            <span key={ri} style={{
                              fontSize: 11, color: C.t3, background: '#1a2a1a',
                              padding: '2px 6px', borderRadius: 4,
                              fontFamily: 'JetBrains Mono, monospace',
                              maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }} title={String(val)}>{String(val)}</span>
                          ) : null
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}

            <button
              onClick={() => selectedSheets.size > 0 && setStep('confirm')}
              disabled={selectedSheets.size === 0}
              style={{
                width: '100%', padding: '14px 0', marginTop: 8,
                background: selectedSheets.size > 0 ? C.green : C.border,
                color: selectedSheets.size > 0 ? '#0a0f0a' : C.t3,
                border: 'none', borderRadius: 10, cursor: selectedSheets.size > 0 ? 'pointer' : 'not-allowed',
                fontSize: 15, fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
                minHeight: 48,
              }}
            >
              Next: Confirm →
            </button>
          </div>
        )}

        {/* ── Step 3: Confirm ── */}
        {step === 'confirm' && (
          <div>
            <div style={{ padding: '16px', background: C.card, borderRadius: 10, border: '1px solid ' + C.border, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: C.t3, marginBottom: 6 }}>Ready to import</div>
              <div style={{ fontSize: 28, fontFamily: 'JetBrains Mono, monospace', color: C.green, fontWeight: 700 }}>
                {totalRows.toLocaleString()}
              </div>
              <div style={{ fontSize: 13, color: C.t2 }}>rows across {selectedSheets.size} sheet{selectedSheets.size !== 1 ? 's' : ''}</div>
            </div>

            {sheets.filter(s => selectedSheets.has(s.name)).map(sh => {
              const sheetMapping = mappings[sh.name] || {}
              const mapped = Object.entries(sheetMapping).filter(([, v]) => v !== null)
              const hasWeight = mapped.some(([, v]) => v === 'weight_ct')
              const hasType = mapped.some(([, v]) => v === 'stone_type')
              return (
                <div key={sh.name} style={{ marginBottom: 12, padding: '12px 14px', background: C.card, borderRadius: 8, border: '1px solid ' + C.border }}>
                  {sheets.length > 1 && (
                    <div style={{ fontSize: 12, color: C.green, fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{sh.name}</div>
                  )}
                  <div style={{ fontSize: 12, color: C.t3, marginBottom: 6 }}>
                    {sh.row_count} rows · {mapped.length} columns mapped
                  </div>
                  {(!hasWeight || !hasType) && (
                    <div style={{ fontSize: 12, color: '#fbbf24', marginTop: 4 }}>
                      {!hasWeight && !hasType ? '⚠ Weight and Stone Type columns not mapped — rows will fail'
                        : !hasWeight ? '⚠ Weight column not mapped — rows will fail'
                        : '⚠ Stone Type column not mapped — rows will fail'}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {mapped.map(([col, field]) => (
                      <span key={col} style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 10,
                        background: C.greenDim, color: C.green,
                        fontFamily: 'DM Sans, sans-serif',
                      }}>
                        {LOT_FIELD_LABELS[field as LotField]}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}

            <button
              onClick={handleExecute}
              disabled={executing}
              style={{
                width: '100%', padding: '14px 0', marginTop: 8,
                background: executing ? C.border : C.green,
                color: executing ? C.t3 : '#0a0f0a',
                border: 'none', borderRadius: 10,
                cursor: executing ? 'not-allowed' : 'pointer',
                fontSize: 15, fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
                minHeight: 48,
              }}
            >
              {executing ? 'Importing…' : 'Import Now'}
            </button>
          </div>
        )}

        {/* ── Result screen ── */}
        {step === 'result' && result && (
          <div>
            <div style={{ textAlign: 'center', padding: '24px 0 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>
                {result.imported > 0 ? '✓' : '⚠'}
              </div>
              <div style={{ fontSize: 22, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: C.t1 }}>
                Import complete
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, padding: '14px', background: C.card, borderRadius: 10, border: '1px solid ' + C.border, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontFamily: 'JetBrains Mono, monospace', color: C.green, fontWeight: 700 }}>{result.imported}</div>
                <div style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>Lots created</div>
              </div>
              {result.skipped_dedup > 0 && (
                <div style={{ flex: 1, padding: '14px', background: C.card, borderRadius: 10, border: '1px solid ' + C.border, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontFamily: 'JetBrains Mono, monospace', color: '#fbbf24', fontWeight: 700 }}>{result.skipped_dedup}</div>
                  <div style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>Duplicates skipped</div>
                </div>
              )}
              {result.errors.length > 0 && (
                <div style={{ flex: 1, padding: '14px', background: C.card, borderRadius: 10, border: '1px solid #5a2020', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontFamily: 'JetBrains Mono, monospace', color: C.err, fontWeight: 700 }}>{result.errors.length}</div>
                  <div style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>Failed rows</div>
                </div>
              )}
            </div>

            {result.errors.length > 0 && (
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
                  <span>Show failed rows ({result.errors.length})</span>
                  <span>{showErrors ? '▲' : '▼'}</span>
                </button>
                {showErrors && (
                  <div style={{ marginTop: 6, maxHeight: 240, overflowY: 'auto', border: '1px solid ' + C.border, borderRadius: 8 }}>
                    {result.errors.map((e, i) => (
                      <div key={i} style={{
                        padding: '8px 12px', borderBottom: i < result.errors.length - 1 ? '1px solid ' + C.border : 'none',
                        fontSize: 12,
                      }}>
                        <span style={{ color: C.t3, fontFamily: 'JetBrains Mono, monospace' }}>
                          {e.sheet} row {e.row ?? '?'}
                        </span>
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
                width: '100%', padding: '14px 0',
                background: C.green, color: '#0a0f0a',
                border: 'none', borderRadius: 10, cursor: 'pointer',
                fontSize: 15, fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
                minHeight: 48,
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
