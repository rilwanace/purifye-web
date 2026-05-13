import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import { useToast } from '../../shared/components/Toast'
import EntryForm from './EntryForm'
import VoiceInput from './VoiceInput'
import PhotoInput from './PhotoInput'
import RecentEntries from './RecentEntries'

interface MasterData {
  customers: string[]
  suppliers: string[]
  staff: string[]
  accounts: string[]
  categories: string[]
  products: string[]
}

interface RecentEntry {
  entry_group: string
  type: string
  date: string
  counterparty: string | null
  amount: number
  description: string | null
  created_at: string
}

export default function EntryPage() {
  const { show } = useToast()
  const [masterData, setMasterData] = useState<MasterData | null>(null)
  const [recent, setRecent] = useState<RecentEntry[]>([])
  const [prefill, setPrefill] = useState<{ type?: string; fields?: Record<string, any>; entryGroup?: string } | null>(null)
  const [loadingMaster, setLoadingMaster] = useState(true)

  const loadMaster = useCallback(async () => {
    try {
      const res = await api<any>('/api/entry/master-data')
      setMasterData({
        customers: (res.customers || []).map((c: any) => c.name ?? c),
        suppliers: (res.suppliers || []).map((s: any) => s.name ?? s),
        staff: (res.employees || []).map((e: any) => e.name ?? e),
        accounts: (res.cash_accounts || []).map((a: any) => a.name ?? a),
        categories: res.expense_categories || [],
        products: (res.products || []).map((p: any) => p.name ?? p),
      })
    } catch (err: any) {
      show('Failed to load master data', 'error')
    } finally {
      setLoadingMaster(false)
    }
  }, [])

  const loadRecent = useCallback(async () => {
    try {
      const res = await api<{ ok: boolean; entries: RecentEntry[] }>('/api/entry/recent')
      setRecent(res.entries || [])
    } catch {
      // non-critical — just don't show recent entries
    }
  }, [])

  useEffect(() => {
    loadMaster()
    loadRecent()
  }, [])

  function handleParsed(result: any) {
    const entries: any[] = result.entries || []
    if (!entries.length) { show('No entries detected', 'info'); return }
    const first = entries[0]
    setPrefill({ type: first.type, fields: first.fields || first })
    show(entries.length > 1 ? `${entries.length} entries detected — showing first` : 'Entry detected — review and save', 'info')
  }

  async function handleUndo(entryGroup: string) {
    try {
      await api('/api/entry/undo', { method: 'POST', body: JSON.stringify({ entry_group: entryGroup }) })
      show('Entry undone', 'success')
      loadRecent()
    } catch (err: any) {
      show(err.message || 'Undo failed', 'error')
    }
  }

  async function handleEdit(entryGroup: string) {
    try {
      const res = await api<any>(`/api/entry/by-group/${entryGroup}`)
      setPrefill({ type: res.type, fields: res.fields || {}, entryGroup: entryGroup })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: any) {
      show('Could not load entry for editing', 'error')
    }
  }

  function handleSaved() {
    setPrefill(null)
    loadRecent()
  }

  if (loadingMaster) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading...</span>
      </div>
    )
  }

  if (!masterData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Failed to load. Refresh to retry.</span>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 0 60px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
          {prefill?.entryGroup ? 'Edit Entry' : 'New Entry'}
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
          {prefill?.entryGroup ? 'Modify and save to replace the original' : 'Record a transaction manually, by voice, or from a photo'}
        </p>
      </div>

      {/* Capture row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1, fontFamily: 'var(--font-mono)' }}>
          AUTO-FILL VIA
        </div>
        <VoiceInput onParsed={handleParsed} />
        <PhotoInput onParsed={handleParsed} />
      </div>

      {/* Entry form */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 16px', marginBottom: 24 }}>
        <EntryForm
          masterData={masterData}
          prefill={prefill}
          onSaved={handleSaved}
        />
      </div>

      {/* Recent entries */}
      {recent.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 10px' }}>
            <span style={{ font: '600 9px/1 DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6a6a64', whiteSpace: 'nowrap' }}>RECENT ENTRIES</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>
          <RecentEntries entries={recent} onUndo={handleUndo} onEdit={handleEdit} />
        </div>
      )}
    </div>
  )
}
