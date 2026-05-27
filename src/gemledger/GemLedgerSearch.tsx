import { useEffect, useRef, useState } from 'react'
import { gemApi } from './gemledger-api'
import type { Lot } from './gemledger-types'
import { LotCard } from './GemLedgerCards'

const C = {
  bg: '#0a0f0a', bg2: '#111a11', bg3: '#1a2a1a', border: '#1e2e1e',
  t1: '#e0e8e0', t2: '#c0ccc0', t3: '#8a9a8a', green: '#34d399',
}

interface Props {
  onClose: () => void
  onLot: (id: string) => void
}

export default function GemLedgerSearch({ onClose, onLot }: Props) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Lot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    const t = setTimeout(() => {
      setLoading(true)
      setError(null)
      gemApi.lots({ search: q, page_size: 50 })
        .then(r => setResults(r.items))
        .catch((err: any) => { setError(err?.message || 'Search failed') })
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.bg, zIndex: 90, display: 'flex', flexDirection: 'column' }}>
      {/* Search bar */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.t2, fontSize: 14, cursor: 'pointer', fontFamily: 'DM Sans', padding: '4px 0', flexShrink: 0 }}>← Back</button>
        <input
          ref={inputRef}
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search stones, origin, color…"
          style={{
            flex: 1, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.t1, fontSize: 15, padding: '10px 12px', fontFamily: 'DM Sans',
            outline: 'none',
          }}
        />
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {q && (
          <div style={{ color: C.t3, fontSize: 12, fontFamily: 'DM Sans', marginBottom: 10 }}>
            {loading ? 'Searching…' : `${results.length} result${results.length !== 1 ? 's' : ''}`}
          </div>
        )}
        {results.map(lot => (
          <LotCard key={lot.id} lot={lot} onTap={() => onLot(lot.id)} showApprovalBadge={lot.location === 'on_approval'} />
        ))}
        {error && <div style={{ color: '#f87171', fontFamily: 'DM Sans', textAlign: 'center', padding: 20, fontSize: 13 }}>{error}</div>}
        {!q && (
          <div style={{ color: C.t3, fontFamily: 'DM Sans', textAlign: 'center', padding: 40, fontSize: 14 }}>
            Type to search your inventory
          </div>
        )}
      </div>
    </div>
  )
}
