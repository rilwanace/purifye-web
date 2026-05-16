import { useState, useEffect, useRef } from 'react'
import { api, apiFormData } from '../../api'
import { useToast } from '../../shared/components/Toast'
import EntryForm from '../entry/EntryForm'
import VoiceInput from '../entry/VoiceInput'
import PhotoInput from '../entry/PhotoInput'

interface MasterData {
  customers: string[]; suppliers: string[]; staff: string[]
  accounts: string[]; categories: string[]; products: string[]
}

type ChatState = 'idle' | 'processing' | 'confirmed' | 'import_done' | 'error'

const AccountingIcon = () => (
  <div style={{
    width: 48, height: 48, borderRadius: 14,
    background: 'linear-gradient(145deg, #28997A, #13654C)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  }}>
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  </div>
)

export default function ChatPage() {
  const { show } = useToast()
  const [masterData, setMasterData] = useState<MasterData | null>(null)
  const [masterDataLoading, setMasterDataLoading] = useState(true)
  const [masterDataError, setMasterDataError] = useState(false)
  const [text, setText] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [chatState, setChatState] = useState<ChatState>('idle')
  const [processingMsg, setProcessingMsg] = useState('Parsing entry...')
  const [errorMsg, setErrorMsg] = useState('')
  const [confirmData, setConfirmData] = useState<{ type: string } | null>(null)
  const [importData, setImportData] = useState<any>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [prefill, setPrefill] = useState<{ type?: string; fields?: Record<string, any> } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function fetchMasterData() {
    setMasterDataLoading(true)
    setMasterDataError(false)
    api<any>('/api/entry/master-data').then(res => {
      setMasterData({
        customers: (res.customers || []).map((c: any) => c.name ?? c),
        suppliers: (res.suppliers || []).map((s: any) => s.name ?? s),
        staff: (res.employees || []).map((e: any) => e.name ?? e),
        accounts: (res.cash_accounts || []).map((a: any) => a.name ?? a),
        categories: res.expense_categories || [],
        products: (res.products || []).map((p: any) => p.name ?? p),
      })
      setMasterDataLoading(false)
    }).catch(() => {
      setMasterDataError(true)
      setMasterDataLoading(false)
    })
  }

  useEffect(() => { fetchMasterData() }, [])

  const clearTimer = () => { if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null } }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current)
    }
  }, [])

  function handleParsed(result: any) {
    clearTimer()
    const entries: any[] = result.entries || []
    if (!entries.length) {
      setChatState('error'); setErrorMsg('No entries detected. Try Quick Entry.'); return
    }
    const first = entries[0]
    setPrefill({ type: first.type, fields: first.fields || first })
    setChatState('idle'); setSheetOpen(true)
    if (entries.length > 1) show(entries.length + ' entries detected — showing first', 'info')
  }

  async function handleTextSubmit() {
    const val = text.trim()
    if (!val) return
    setText('')
    setChatState('processing'); setProcessingMsg('Parsing entry...'); setPanelOpen(false)
    const controller = new AbortController()
    timeoutRef.current = setTimeout(() => {
      controller.abort()
      setChatState('error'); setErrorMsg("Couldn't process that. Try Quick Entry.")
    }, 15000)
    try {
      const res = await api<any>('/api/text/parse', { method: 'POST', body: JSON.stringify({ text: val }), headers: { 'Content-Type': 'application/json' }, signal: controller.signal })
      handleParsed(res)
    } catch (e: any) {
      clearTimer()
      if (e?.name !== 'AbortError') {
        const msg = e?.message?.includes('unavailable') ? e.message : "Couldn't process that. Try Quick Entry."
        setChatState('error'); setErrorMsg(msg)
      }
    }
  }

  function openQuickEntry(type: string) {
    setPrefill({ type, fields: {} }); setSheetOpen(true); setPanelOpen(false)
  }

  async function handleFile(file: File) {
    setPanelOpen(false); setChatState('processing'); setProcessingMsg('Importing file...')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await apiFormData<any>('/api/settings/import-v4', form)
      setImportData(res); setChatState('import_done')
    } catch { setChatState('error'); setErrorMsg('Import failed. Check file format.') }
  }

  function handleSaved() {
    setConfirmData({ type: (prefill?.type || 'entry').replace(/_/g, ' ') })
    setSheetOpen(false); setPrefill(null); setChatState('confirmed')
    if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current)
    confirmTimeoutRef.current = setTimeout(() => setChatState('idle'), 3000)
  }

  const isBusy = chatState === 'processing'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 128px)', position: 'relative', background: '#131311' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px', overflowY: 'auto' }}>
        {chatState === 'idle' && (
          <div style={{ textAlign: 'center', opacity: 0.5 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <AccountingIcon />
            </div>
            <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: '#6a6a64', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Entry Assistant</div>
            <div style={{ fontSize: 14, color: '#6a6a64', maxWidth: 280, lineHeight: 1.5, fontFamily: 'var(--font-sans)', margin: '0 auto' }}>
              Record entries using text, voice, camera, or file upload
            </div>
          </div>
        )}
        {chatState === 'processing' && (
          <div style={{ textAlign: 'center' }}>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{ width: 48, height: 48, border: '2px solid rgba(93,202,165,0.2)', borderTop: '2px solid #5DCAA5', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#5DCAA5', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{processingMsg}</div>
          </div>
        )}
        {chatState === 'error' && (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 24, marginBottom: 12, color: '#D4A843' }}>&#9888;</div>
            <div style={{ fontSize: 14, color: '#9c9b95', fontFamily: 'var(--font-sans)', marginBottom: 16 }}>{errorMsg}</div>
            <button onClick={() => setChatState('idle')} style={{ padding: '8px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, color: '#6a6a64', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>Dismiss</button>
          </div>
        )}
        {chatState === 'confirmed' && confirmData && (
          <div style={{ background: 'rgba(93,202,165,0.1)', border: '1px solid rgba(93,202,165,0.25)', borderRadius: 12, padding: 24, maxWidth: 340, textAlign: 'center' }}>
            <div style={{ fontSize: 28, color: '#5DCAA5', marginBottom: 8 }}>&#10003;</div>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#5DCAA5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{confirmData.type}</div>
            <div style={{ fontSize: 14, color: '#e8e7e0', fontFamily: 'var(--font-sans)' }}>Entry saved successfully</div>
          </div>
        )}
        {chatState === 'import_done' && importData && (
          <div style={{ background: '#1a1a18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20, width: '100%', maxWidth: 340 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#5DCAA5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Import Complete</div>
            <div style={{ fontSize: 14, color: '#e8e7e0', marginBottom: 6 }}>{importData.row_count || importData.rows_processed || 0} entries imported</div>
            <button onClick={() => setChatState('idle')} style={{ marginTop: 12, padding: '8px 0', width: '100%', background: 'transparent', border: '1px solid rgba(93,202,165,0.2)', borderRadius: 8, color: '#5DCAA5', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Done</button>
          </div>
        )}
      </div>

      {panelOpen && (
        <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', background: '#1a1a18' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {([
              { type: 'sale', label: 'Sale', border: 'rgba(93,202,165,0.25)', bg: 'rgba(93,202,165,0.07)', color: '#5DCAA5' },
              { type: 'purchase', label: 'Purchase', border: 'rgba(232,107,58,0.25)', bg: 'rgba(232,107,58,0.07)', color: '#E86B3A' },
              { type: 'other_expense', label: 'Expense', border: 'rgba(212,168,67,0.25)', bg: 'rgba(212,168,67,0.07)', color: '#D4A843' },
              { type: '', label: 'Other', border: 'rgba(112,104,217,0.25)', bg: 'rgba(112,104,217,0.07)', color: '#7068D9' },
            ] as const).map((q: any) => (
              <button key={q.label} onClick={() => openQuickEntry(q.type)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid ' + q.border, background: q.bg, color: q.color, fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', cursor: 'pointer' }}>{q.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '8px 0', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
              <VoiceInput onParsed={handleParsed} disabled={isBusy} />
            </div>
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '8px 0', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
              <PhotoInput onParsed={handleParsed} disabled={isBusy} />
            </div>
            <button onClick={() => fileRef.current?.click()} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: '#6a6a64', fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', cursor: 'pointer' }}>File</button>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
        </div>
      )}

      <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8, background: '#131311', paddingBottom: 82 }}>
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !isBusy && handleTextSubmit()}
            disabled={isBusy}
            placeholder="type or speak your entry here..."
            style={{ width: '100%', background: '#1a1a18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 42px 10px 12px', color: '#e8e7e0', fontSize: 14, fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box', opacity: isBusy ? 0.5 : 1 }}
          />
          {text && !isBusy && (
            <button onClick={handleTextSubmit} style={{ position: 'absolute', right: 8, width: 24, height: 24, borderRadius: 6, background: '#5DCAA5', border: 'none', color: '#131311', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>&#8593;</button>
          )}
        </div>
        <button onClick={() => { if (!isBusy) setPanelOpen(v => !v) }} disabled={isBusy} style={{ width: 40, height: 40, borderRadius: 10, cursor: isBusy ? 'not-allowed' : 'pointer', border: panelOpen ? '1px solid #5DCAA5' : '1px solid rgba(255,255,255,0.06)', background: panelOpen ? 'rgba(93,202,165,0.1)' : 'transparent', color: panelOpen ? '#5DCAA5' : '#6a6a64', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: isBusy ? 0.5 : 1, alignSelf: 'flex-start' }}>+</button>
      </div>

      {sheetOpen && (
        <>
          <div onClick={() => { setSheetOpen(false); setPrefill(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400 }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: '#1a1a18', borderTop: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px 20px 0 0', maxHeight: '78vh', display: 'flex', flexDirection: 'column', zIndex: 401 }}>
            <div style={{ width: 36, height: 4, background: 'rgba(106,106,100,0.3)', borderRadius: 2, margin: '12px auto 4px' }} />
            {masterDataLoading && (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#6a6a64', fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Loading form...</div>
            )}
            {masterDataError && !masterDataLoading && (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#9c9b95', marginBottom: 12, fontFamily: 'var(--font-sans)' }}>Couldn&#39;t load form data</div>
                <button onClick={fetchMasterData} style={{ padding: '8px 18px', background: 'transparent', border: '1px solid rgba(93,202,165,0.3)', borderRadius: 8, color: '#5DCAA5', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Tap to retry</button>
              </div>
            )}
            {!masterDataLoading && !masterDataError && masterData && (
              <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px 0' }}>
                <EntryForm masterData={masterData} prefill={prefill} onSaved={handleSaved} />
              </div>
            )}
            <div style={{ padding: '10px 16px 82px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => { setSheetOpen(false); setPrefill(null) }} style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: '#6a6a64', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Cancel</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
