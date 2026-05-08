import { useState, useRef } from 'react'
import { inv } from './api'

const INV = '#E86B3A'
const GRN = '#5DCAA5'
const AMB = '#D4A843'
const RED = '#D85A30'

type Step = 'upload' | 'map' | 'confirm' | 'done'
type EntryType = 'purchases' | 'sales' | 'adjustments'

const ENTRY_TYPES: { id: EntryType; label: string; icon: string }[] = [
  { id: 'purchases', label: 'Purchases', icon: '📦' },
  { id: 'sales', label: 'Sales', icon: '🛒' },
  { id: 'adjustments', label: 'Stock List', icon: '⚖️' },
]

function confidenceColor(conf: number) {
  if (conf >= 0.8) return GRN
  if (conf >= 0.5) return AMB
  return RED
}

function confidenceLabel(conf: number) {
  if (conf >= 0.8) return 'HIGH'
  if (conf >= 0.5) return 'MED'
  return 'LOW'
}

export default function ImportWizard({ stock: _stock, onDone, onBack: _onBack }: { stock: any[]; onDone: () => void; onBack: () => void }) {
  const [step, setStep] = useState<Step>('upload')
  const [entryType, setEntryType] = useState<EntryType>('purchases')
  const [uploadData, setUploadData] = useState<any>(null)
  const [mapping, setMapping] = useState<Record<string, string | null>>({})
  const [unmatched, _setUnmatched] = useState<Record<string, 'create' | 'skip'>>({})
  const [result, setResult] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    try {
      const data = await inv.importUpload(file, entryType)
      setUploadData(data)
      // Initialize mapping from suggestions
      const initMap: Record<string, string | null> = {}
      if (data.suggestions) {
        Object.entries(data.suggestions).forEach(([field, sug]: [string, any]) => {
          initMap[field] = sug.column || null
        })
      }
      if (data.saved_mapping) {
        Object.entries(data.saved_mapping).forEach(([field, col]: [string, any]) => {
          initMap[field] = col
        })
      }
      setMapping(initMap)
      setStep('map')
    } catch (e: any) {
      alert(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function confirmMapping() {
    setImporting(true)
    try {
      const res = await inv.importCommit({
        file_data: uploadData.file_data,
        mapping,
        entry_type: entryType,
        filename: uploadData.filename,
        header_hash: uploadData.header_hash,
        unmatched_actions: unmatched,
      })
      // Save mapping for future use
      await inv.saveMapping({ header_hash: uploadData.header_hash, mapping }).catch(() => {})
      setResult(res)
      setStep('done')
    } catch (e: any) {
      alert(e.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  // ── UPLOAD step ─────────────────────────────────────────────────────────────
  if (step === 'upload') {
    return (
      <div style={{ padding: '0 16px 80px' }}>
        {/* Entry type selector */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, marginBottom: 14 }}>
          {ENTRY_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => setEntryType(t.id)}
              style={{
                flex: 1,
                padding: '10px 6px',
                background: entryType === t.id ? `${INV}18` : '#1a1a18',
                border: `1px solid ${entryType === t.id ? INV : 'rgba(255,255,255,.07)'}`,
                borderRadius: 10,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span style={{ fontSize: 20 }}>{t.icon}</span>
              <span style={{ color: entryType === t.id ? INV : '#9c9b95', fontSize: 11, fontWeight: 600 }}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            background: '#1a1a18',
            border: '2px dashed rgba(255,255,255,.12)',
            borderRadius: 12,
            padding: '40px 20px',
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
          <div style={{ color: '#e8e7e0', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
            {uploading ? 'Uploading…' : 'Tap to upload file'}
          </div>
          <div style={{ color: '#9c9b95', fontSize: 12 }}>CSV, XLSX, or XLS</div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </div>
    )
  }

  // ── MAP step ────────────────────────────────────────────────────────────────
  if (step === 'map' && uploadData) {
    const suggestions = uploadData.suggestions || {}
    const columns = uploadData.columns || []
    const sample = uploadData.sample || {}

    const fields = Object.keys(suggestions)

    return (
      <div style={{ padding: '0 16px 120px' }}>
        <div style={{ color: '#9c9b95', fontSize: 12, marginTop: 12, marginBottom: 14 }}>
          {uploadData.filename} · {uploadData.row_count} rows
        </div>

        {fields.map((field: string) => {
          const sug = suggestions[field] || {}
          const currentCol = mapping[field] || ''
          return (
            <div key={field} style={{ background: '#1a1a18', borderRadius: 10, padding: '10px 12px', marginBottom: 8, border: '1px solid rgba(255,255,255,.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ color: '#e8e7e0', fontSize: 12, fontWeight: 600, textTransform: 'capitalize', flex: 1 }}>{field.replace('_', ' ')}</span>
                {sug.column && (
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 10,
                    fontFamily: 'var(--font-mono)',
                    background: `${confidenceColor(sug.confidence)}20`,
                    color: confidenceColor(sug.confidence),
                  }}>
                    {confidenceLabel(sug.confidence)}
                  </span>
                )}
              </div>
              <select
                value={currentCol}
                onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value || null }))}
                style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, color: '#e8e7e0', padding: '8px 10px', fontSize: 12, outline: 'none', appearance: 'none' }}
              >
                <option value="">— Skip —</option>
                {columns.map((col: string) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
              {currentCol && sample[currentCol] && (
                <div style={{ color: '#9c9b95', fontSize: 10, marginTop: 4 }}>
                  Sample: <span style={{ fontFamily: 'var(--font-mono)' }}>{sample[currentCol]}</span>
                </div>
              )}
            </div>
          )
        })}

        <div style={{ position: 'fixed', bottom: 64, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, padding: '10px 16px', boxSizing: 'border-box', background: '#131311', borderTop: '1px solid rgba(255,255,255,.06)', zIndex: 40 }}>
          <button
            onClick={confirmMapping}
            disabled={importing}
            style={{ width: '100%', padding: 14, background: importing ? 'rgba(255,255,255,.08)' : `linear-gradient(135deg, #EE7844, #B84D22)`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            {importing ? 'Importing…' : 'Confirm Mapping & Import'}
          </button>
        </div>
      </div>
    )
  }

  // ── DONE step ───────────────────────────────────────────────────────────────
  if (step === 'done' && result) {
    return (
      <div style={{ padding: '0 16px 80px' }}>
        <div style={{ background: '#1a1a18', borderRadius: 12, padding: 20, marginTop: 16, border: '1px solid rgba(255,255,255,.07)', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>{result.imported > 0 ? '✅' : '⚠️'}</div>
          <div style={{ color: '#e8e7e0', fontWeight: 700, fontSize: 20, marginBottom: 4 }}>{result.imported} Imported</div>
          <div style={{ color: '#9c9b95', fontSize: 13 }}>{result.skipped} skipped</div>
        </div>

        {result.errors?.length > 0 && (
          <div style={{ background: `${RED}10`, border: `1px solid ${RED}30`, borderRadius: 10, padding: '12px 14px', marginTop: 10 }}>
            <div style={{ color: RED, fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Errors ({result.errors.length})</div>
            {result.errors.slice(0, 5).map((e: string, i: number) => (
              <div key={i} style={{ color: '#c4c3bc', fontSize: 11, marginBottom: 3 }}>{e}</div>
            ))}
          </div>
        )}

        <button
          onClick={onDone}
          style={{ width: '100%', padding: 14, background: `linear-gradient(135deg, #EE7844, #B84D22)`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 16 }}
        >
          Done
        </button>
      </div>
    )
  }

  return null
}
