import { useState, useRef } from 'react'
import { useToast } from '../../shared/components/Toast'
import { apiFormData } from '../../api'

export default function ImportData() {
  const { show } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [summary, setSummary] = useState<Record<string, any> | null>(null)
  const [error, setError] = useState('')

  async function doImport() {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { show('File must be under 5 MB', 'error'); return }
    if (!file.name.match(/\.xlsx?$/i)) { show('Please select an Excel file (.xlsx or .xls)', 'error'); return }
    setUploading(true)
    setError('')
    setSummary(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const data = await apiFormData<any>('/api/settings/import-v4', form)
      setSummary(data.summary || {})
      show('Import complete', 'success')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err: any) {
      setError(err.message || 'Import failed')
      show(err.message || 'Import failed', 'error')
    } finally {
      setUploading(false)
    }
  }

  const s: Record<string, React.CSSProperties> = {
    section: { padding: '20px 16px', borderBottom: '1px solid var(--border)' },
    sectionTitle: { fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, fontFamily: 'var(--font-mono)' },
    uploadArea: {
      border: '2px dashed var(--border)',
      borderRadius: 10,
      padding: '24px 16px',
      textAlign: 'center' as const,
      cursor: 'pointer',
      marginBottom: 12,
      background: file ? 'var(--accent-dim)' : undefined,
      borderColor: file ? 'var(--accent-border)' : undefined,
    },
    fileLabel: { fontSize: 13, color: file ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'var(--font-sans)' },
    importBtn: {
      minHeight: 48,
      background: file && !uploading ? 'var(--accent)' : 'var(--bg-input)',
      color: file && !uploading ? '#131311' : 'var(--text-muted)',
      border: 'none',
      borderRadius: 10,
      fontSize: 14,
      fontWeight: 600,
      cursor: file && !uploading ? 'pointer' : 'not-allowed',
      width: '100%',
      fontFamily: 'var(--font-sans)',
    },
    summary: {
      marginTop: 14,
      background: 'var(--bg-card)',
      borderRadius: 10,
      padding: 14,
      border: '1px solid var(--accent-border)',
    },
    summaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' },
    error: { marginTop: 10, color: 'var(--danger)', fontSize: 13, fontFamily: 'var(--font-sans)' },
  }

  return (
    <div style={s.section}>
      <div style={s.sectionTitle}>Import Data</div>
      <div style={s.uploadArea} onClick={() => fileRef.current?.click()}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>📊</div>
        <div style={s.fileLabel}>
          {file ? file.name : 'Tap to select V4 Excel template (.xlsx)'}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={e => { setFile(e.target.files?.[0] || null); setSummary(null); setError('') }}
      />
      <button style={s.importBtn} onClick={doImport} disabled={!file || uploading}>
        {uploading ? 'Importing…' : 'Upload & Import'}
      </button>

      {error && <div style={s.error}>{error}</div>}

      {summary && (
        <div style={s.summary}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 8, fontFamily: 'var(--font-sans)' }}>Import complete</div>
          {Object.entries(summary).map(([tab, stats]: [string, any]) => (
            <div key={tab} style={s.summaryRow}>
              <span style={{ textTransform: 'capitalize' }}>{tab.replace(/_/g, ' ')}</span>
              <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                {typeof stats === 'object'
                  ? `${stats.inserted ?? 0} added, ${stats.skipped ?? 0} skipped`
                  : String(stats)
                }
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
