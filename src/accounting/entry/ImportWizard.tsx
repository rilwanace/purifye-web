import { useState } from 'react'
import { api } from '../../api'
import { useToast } from '../../shared/components/Toast'

interface SheetInfo {
  name: string
  headers: string[]
  sample_rows: any[][]
  row_count: number
  suggested_mapping: Record<string, string | null>
  suggested_entry_type?: string
}

interface SheetConfig {
  name: string
  entry_type: string
  mapping: Record<string, string | null>
}

interface ImportResult {
  imported: number
  skipped_dedup: number
  errors: { sheet: string; row: number | null; error: string }[]
}

const CANONICAL_OPTIONS = [
  { value: '', label: '— Skip —' },
  { value: 'date', label: 'Date' },
  { value: 'counterparty', label: 'Customer / Supplier / Party' },
  { value: 'description', label: 'Description / Item / Notes' },
  { value: 'amount', label: 'Amount / Total' },
  { value: 'tax_amount', label: 'Tax / VAT Amount' },
  { value: 'account', label: 'Account / Paid By' },
  { value: 'status', label: 'Status (paid/pending)' },
  { value: 'due_date', label: 'Due Date' },
  { value: 'product', label: 'Product Name' },
  { value: 'qty', label: 'Quantity' },
  { value: 'unit_price', label: 'Unit Price / Rate' },
  { value: 'payment_method', label: 'Payment Method' },
  { value: 'category', label: 'Category' },
]

const ENTRY_TYPES = [
  { value: 'sale', label: 'Sales' },
  { value: 'purchase', label: 'Purchases' },
  { value: 'expense', label: 'Expenses' },
  { value: 'payment_received', label: 'Payment Received' },
  { value: 'payment_made', label: 'Payment Made' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'mixed', label: 'Mixed (auto-detect per row)' },
]

const S = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500 } as React.CSSProperties,
  sheet: {
    position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: 480, background: '#1a1a18',
    borderRadius: '20px 20px 0 0', maxHeight: '88vh',
    display: 'flex', flexDirection: 'column', zIndex: 501,
  } as React.CSSProperties,
  handle: { width: 36, height: 4, background: 'rgba(106,106,100,0.3)', borderRadius: 2, margin: '12px auto 0' } as React.CSSProperties,
  header: { padding: '12px 16px 0', flexShrink: 0 } as React.CSSProperties,
  title: { fontSize: 13, fontFamily: 'var(--font-mono)', color: '#5DCAA5', textTransform: 'uppercase' as const, letterSpacing: '0.08em' },
  subtitle: { fontSize: 11, color: '#6a6a64', marginTop: 2 } as React.CSSProperties,
  body: { flex: 1, overflowY: 'auto', padding: '12px 16px' } as React.CSSProperties,
  footer: { padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8, flexShrink: 0 } as React.CSSProperties,
  btnPrimary: {
    flex: 1, padding: 12, borderRadius: 10, border: 'none',
    background: 'linear-gradient(135deg, #28997A, #13654C)',
    color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
  } as React.CSSProperties,
  btnSecondary: {
    flex: 1, padding: 12, borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.06)', background: 'transparent',
    color: '#6a6a64', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-mono)',
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,
  label: { fontSize: 9, fontFamily: 'var(--font-mono)', color: '#6a6a64', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 4 } as React.CSSProperties,
  select: {
    width: '100%', background: '#2a2a28', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 7, padding: '8px 10px', color: '#e8e7e0', fontSize: 12,
    fontFamily: 'var(--font-sans)', outline: 'none',
  } as React.CSSProperties,
}

export default function ImportWizard({
  uploadId,
  sheets,
  onDone,
  onCancel,
}: {
  uploadId: string
  sheets: SheetInfo[]
  onDone: () => void
  onCancel: () => void
}) {
  const { show } = useToast()
  const [step, setStep] = useState(sheets.length > 1 ? 0 : 1)
  const [selectedSheets, setSelectedSheets] = useState<Set<string>>(new Set(sheets.map(s => s.name)))
  const [currentSheetIdx, setCurrentSheetIdx] = useState(0)
  const [configs, setConfigs] = useState<Record<string, SheetConfig>>(() => {
    const out: Record<string, SheetConfig> = {}
    for (const s of sheets) {
      out[s.name] = {
        name: s.name,
        entry_type: s.suggested_entry_type || 'mixed',
        mapping: { ...s.suggested_mapping },
      }
    }
    return out
  })
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const activeSheets = sheets.filter(s => selectedSheets.has(s.name))
  const currentSheet = activeSheets[currentSheetIdx]

  function toggleSheet(name: string) {
    setSelectedSheets(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function setMapping(sheetName: string, col: string, canon: string | null) {
    setConfigs(prev => ({
      ...prev,
      [sheetName]: {
        ...prev[sheetName],
        mapping: { ...prev[sheetName].mapping, [col]: canon || null },
      },
    }))
  }

  function setEntryType(sheetName: string, et: string) {
    setConfigs(prev => ({ ...prev, [sheetName]: { ...prev[sheetName], entry_type: et } }))
  }

  async function doImport() {
    setImporting(true)
    try {
      const sheetsPayload = activeSheets.map(s => {
        const cfg = configs[s.name]
        const cleanMapping: Record<string, string> = {}
        for (const [col, canon] of Object.entries(cfg.mapping)) {
          if (canon) cleanMapping[col] = canon
        }
        return { name: s.name, entry_type: cfg.entry_type, mapping: cleanMapping }
      })
      const res = await api<ImportResult>('/api/settings/import-custom', {
        method: 'POST',
        body: JSON.stringify({ upload_id: uploadId, sheets: sheetsPayload }),
        headers: { 'Content-Type': 'application/json' },
      })
      setResult(res)
      setStep(3)
    } catch (err: any) {
      show(err.message || 'Import failed', 'error')
    } finally {
      setImporting(false)
    }
  }

  // Step 0: Sheet picker
  if (step === 0) {
    return (
      <>
        <div style={S.overlay} onClick={onCancel} />
        <div style={S.sheet}>
          <div style={S.handle} />
          <div style={S.header}>
            <div style={S.title}>Select Sheets</div>
            <div style={S.subtitle}>{sheets.length} sheets detected — choose which to import</div>
          </div>
          <div style={S.body}>
            {sheets.map(s => {
              const selected = selectedSheets.has(s.name)
              return (
                <div
                  key={s.name}
                  onClick={() => toggleSheet(s.name)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 12px', borderRadius: 10, marginBottom: 8,
                    background: selected ? 'rgba(93,202,165,0.08)' : '#131311',
                    border: selected ? '1px solid rgba(93,202,165,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                    background: selected ? '#5DCAA5' : 'transparent',
                    border: selected ? 'none' : '1px solid rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selected && <span style={{ color: '#131311', fontSize: 11, fontWeight: 700 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#e8e7e0', fontFamily: 'var(--font-sans)' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: '#6a6a64', marginTop: 2 }}>{s.row_count} rows · {s.headers.length} columns</div>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={S.footer}>
            <button style={S.btnSecondary} onClick={onCancel}>Cancel</button>
            <button
              style={{ ...S.btnPrimary, opacity: selectedSheets.size === 0 ? 0.4 : 1 }}
              onClick={() => { setCurrentSheetIdx(0); setStep(1) }}
              disabled={selectedSheets.size === 0}
            >
              Next →
            </button>
          </div>
        </div>
      </>
    )
  }

  // Step 1: Column mapping
  if (step === 1 && currentSheet) {
    const cfg = configs[currentSheet.name]
    const sheetIdx = activeSheets.indexOf(currentSheet)
    const isLastSheet = sheetIdx === activeSheets.length - 1

    return (
      <>
        <div style={S.overlay} onClick={onCancel} />
        <div style={S.sheet}>
          <div style={S.handle} />
          <div style={S.header}>
            <div style={S.title}>Map Columns — {currentSheet.name}</div>
            <div style={S.subtitle}>Sheet {sheetIdx + 1} of {activeSheets.length} · {currentSheet.row_count} rows</div>
          </div>
          <div style={S.body}>
            {/* Entry type */}
            <div style={{ marginBottom: 16 }}>
              <div style={S.label}>Transaction Type</div>
              <select
                value={cfg.entry_type}
                onChange={e => setEntryType(currentSheet.name, e.target.value)}
                style={S.select}
              >
                {ENTRY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {cfg.entry_type === 'mixed' && (
              <div style={{ fontSize: 11, color: '#9c9b95', marginTop: -8, marginBottom: 12, padding: '6px 10px', background: 'rgba(93,202,165,0.06)', borderRadius: 6, border: '1px solid rgba(93,202,165,0.15)' }}>
                Each row's type will be detected from the Category column. Make sure Category is mapped.
              </div>
            )}
            {/* Column mapping */}
            <div style={{ marginBottom: 12 }}>
              <div style={S.label}>Column Mapping</div>
              <div style={{ background: '#131311', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Header row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 9, color: '#6a6a64', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>File Column</span>
                  <span style={{ fontSize: 9, color: '#6a6a64', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Maps To</span>
                </div>
                {currentSheet.headers.map((col, i) => (
                  <div key={col + i} style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                    padding: '8px 12px',
                    borderBottom: i < currentSheet.headers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 12, color: '#e8e7e0', fontFamily: 'var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col}</span>
                    <select
                      value={cfg.mapping[col] || ''}
                      onChange={e => setMapping(currentSheet.name, col, e.target.value || null)}
                      style={{ ...S.select, padding: '5px 8px', fontSize: 11 }}
                    >
                      {CANONICAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Sample preview */}
            {currentSheet.sample_rows.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={S.label}>Sample Data (first {Math.min(3, currentSheet.sample_rows.length)} rows)</div>
                <div style={{ overflowX: 'auto', background: '#131311', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', padding: 10 }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                    <thead>
                      <tr>
                        {currentSheet.headers.map((h, i) => (
                          <td key={i} style={{ color: '#5DCAA5', padding: '2px 8px', whiteSpace: 'nowrap', paddingBottom: 4 }}>{h}</td>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentSheet.sample_rows.slice(0, 3).map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td key={ci} style={{ color: '#9c9b95', padding: '2px 8px', whiteSpace: 'nowrap' }}>
                              {cell === null ? '—' : String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <div style={S.footer}>
            <button style={S.btnSecondary} onClick={() => {
              if (sheetIdx === 0) setStep(sheets.length > 1 ? 0 : -1)
              else setCurrentSheetIdx(sheetIdx - 1)
            }}>← Back</button>
            <button style={S.btnPrimary} onClick={() => {
              if (isLastSheet) setStep(2)
              else setCurrentSheetIdx(sheetIdx + 1)
            }}>
              {isLastSheet ? 'Review →' : 'Next Sheet →'}
            </button>
          </div>
        </div>
      </>
    )
  }

  // Step 2: Confirmation
  if (step === 2) {
    return (
      <>
        <div style={S.overlay} onClick={onCancel} />
        <div style={S.sheet}>
          <div style={S.handle} />
          <div style={S.header}>
            <div style={S.title}>Ready to Import</div>
            <div style={S.subtitle}>Review and confirm</div>
          </div>
          <div style={S.body}>
            {activeSheets.map(s => {
              const cfg = configs[s.name]
              const mappedCount = Object.values(cfg.mapping).filter(Boolean).length
              const etLabel = ENTRY_TYPES.find(t => t.value === cfg.entry_type)?.label || cfg.entry_type.charAt(0).toUpperCase() + cfg.entry_type.slice(1)
              return (
                <div key={s.name} style={{ background: '#131311', borderRadius: 10, padding: '14px 12px', marginBottom: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e7e0', marginBottom: 6 }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: '#6a6a64' }}>{s.row_count} rows · {etLabel} · {mappedCount} columns mapped</div>
                </div>
              )
            })}
            <div style={{ fontSize: 11, color: '#6a6a64', marginTop: 6 }}>
              Duplicate rows will be skipped automatically.
            </div>
          </div>
          <div style={S.footer}>
            <button style={S.btnSecondary} onClick={() => { setCurrentSheetIdx(activeSheets.length - 1); setStep(1) }}>← Back</button>
            <button style={{ ...S.btnPrimary, opacity: importing ? 0.6 : 1 }} onClick={doImport} disabled={importing}>
              {importing ? 'Importing…' : 'Import'}
            </button>
          </div>
        </div>
      </>
    )
  }

  // Step 3: Results
  if (step === 3 && result) {
    return (
      <>
        <div style={S.overlay} />
        <div style={S.sheet}>
          <div style={S.handle} />
          <div style={S.header}>
            <div style={S.title}>{result.errors.length === 0 ? 'Import Complete' : 'Import Done'}</div>
          </div>
          <div style={S.body}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, background: 'rgba(93,202,165,0.08)', border: '1px solid rgba(93,202,165,0.2)', borderRadius: 10, padding: '14px 12px', textAlign: 'center' as const }}>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#5DCAA5' }}>{result.imported}</div>
                <div style={{ fontSize: 11, color: '#6a6a64', marginTop: 4 }}>Imported</div>
              </div>
              {result.skipped_dedup > 0 && (
                <div style={{ flex: 1, background: '#131311', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 12px', textAlign: 'center' as const }}>
                  <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#9c9b95' }}>{result.skipped_dedup}</div>
                  <div style={{ fontSize: 11, color: '#6a6a64', marginTop: 4 }}>Skipped (duplicate)</div>
                </div>
              )}
              {result.errors.length > 0 && (
                <div style={{ flex: 1, background: 'rgba(232,84,84,0.07)', border: '1px solid rgba(232,84,84,0.2)', borderRadius: 10, padding: '14px 12px', textAlign: 'center' as const }}>
                  <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#e85454' }}>{result.errors.length}</div>
                  <div style={{ fontSize: 11, color: '#6a6a64', marginTop: 4 }}>Errors</div>
                </div>
              )}
            </div>
            {result.errors.length > 0 && (
              <div>
                <div style={{ ...S.label, marginBottom: 8 }}>Error Details</div>
                {result.errors.slice(0, 10).map((err, i) => (
                  <div key={i} style={{ background: '#131311', borderRadius: 7, padding: '8px 10px', marginBottom: 6, border: '1px solid rgba(232,84,84,0.15)' }}>
                    <div style={{ fontSize: 11, color: '#e85454', fontFamily: 'var(--font-mono)' }}>
                      {err.sheet}{err.row ? ' · Row ' + err.row : ''}
                    </div>
                    <div style={{ fontSize: 12, color: '#9c9b95', marginTop: 2 }}>{err.error}</div>
                  </div>
                ))}
                {result.errors.length > 10 && (
                  <div style={{ fontSize: 11, color: '#6a6a64' }}>...and {result.errors.length - 10} more</div>
                )}
              </div>
            )}
          </div>
          <div style={S.footer}>
            <button style={{ ...S.btnPrimary, flex: 'none', width: '100%' }} onClick={onDone}>Done</button>
          </div>
        </div>
      </>
    )
  }

  return null
}