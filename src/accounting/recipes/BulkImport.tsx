import { useState, useRef } from 'react'
import { api, apiFormData } from '../../api'
import { useToast } from '../../shared/components/Toast'
import type { Product } from './RecipesPage'

interface ExtractedInput {
  input_name: string
  input_match_id: string | null
  qty: number
  unit_hint: string
}

interface ExtractedRecipe {
  output_name: string
  output_match_id: string | null
  inputs: ExtractedInput[]
  included: boolean
  status: 'matched' | 'new-prod' | 'needs-review'
}

interface Props {
  products?: Product[]
  onBack: () => void
  onProductsChanged: () => void
}

export default function BulkImport({ onBack, onProductsChanged }: Props) {
  const { show } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [extracting, setExtracting] = useState(false)
  const [results, setResults] = useState<ExtractedRecipe[]>([])
  const [saving, setSaving] = useState(false)

  function onPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const fs = Array.from(e.target.files || [])
    if (fs.length > 10) { show('Maximum 10 photos at a time', 'error'); return }
    const tooBig = fs.find(f => f.size > 10 * 1024 * 1024)
    if (tooBig) { show(`"${tooBig.name}" exceeds 10 MB limit`, 'error'); return }
    const badType = fs.find(f => !f.type.startsWith('image/'))
    if (badType) { show(`"${badType.name}" is not an image`, 'error'); return }
    setFiles(fs)
    setResults([])
  }

  async function extractRecipes() {
    if (!files.length) return
    setExtracting(true)
    try {
      const form = new FormData()
      files.forEach((f, i) => form.append(`photo_${i}`, f))
      const data = await apiFormData<any>('/api/recipes/bulk-extract', form)
      const recipes: ExtractedRecipe[] = (data.recipes || []).map((r: any) => {
        const anyNew = !r.output_match_id || r.inputs.some((i: any) => !i.input_match_id)
        const hasInputs = r.inputs && r.inputs.length > 0
        let status: ExtractedRecipe['status'] = 'matched'
        if (!r.output_match_id || !hasInputs) status = 'needs-review'
        else if (anyNew) status = 'new-prod'
        return { ...r, included: status !== 'needs-review', status }
      })
      setResults(recipes)
      if (recipes.length === 0) show('No recipes found in photos', 'info')
    } catch (err: any) {
      show(err.message || 'Extraction failed', 'error')
    } finally {
      setExtracting(false)
    }
  }

  function toggleInclude(idx: number) {
    setResults(prev => prev.map((r, i) => i === idx ? { ...r, included: !r.included } : r))
  }

  async function saveAll() {
    const included = results.filter(r => r.included && r.output_match_id)
    if (!included.length) { show('No recipes to save', 'error'); return }
    setSaving(true)
    try {
      const newProds: { name: string; unit?: string }[] = []
      included.forEach(r => {
        r.inputs.forEach(inp => {
          if (!inp.input_match_id) newProds.push({ name: inp.input_name, unit: inp.unit_hint || undefined })
        })
        if (!r.output_match_id) newProds.push({ name: r.output_name })
      })
      await api('/api/recipes/bulk-save', {
        method: 'POST',
        body: JSON.stringify({ recipes: included, new_products: newProds }),
      })
      onProductsChanged()
      show(`Saved ${included.length} recipe${included.length !== 1 ? 's' : ''}`, 'success')
      onBack()
    } catch (err: any) {
      show(err.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const includedCount = results.filter(r => r.included).length

  const statusColor = (s: ExtractedRecipe['status']) =>
    s === 'matched' ? 'var(--accent)' : s === 'new-prod' ? 'var(--warning)' : 'var(--danger)'

  const statusLabel = (s: ExtractedRecipe['status']) =>
    s === 'matched' ? 'matched' : s === 'new-prod' ? 'new product' : 'needs review'

  const s: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 140 },
    hdr: {
      padding: '16px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    },
    backBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, padding: '0 4px', lineHeight: 1 },
    hdrTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' },
    hdrSub: { fontSize: 13, color: 'var(--text-muted)' },
    sec: { padding: 16 },
    uploadArea: {
      border: '2px dashed var(--border)',
      borderRadius: 12,
      padding: '40px 16px',
      textAlign: 'center' as const,
      cursor: 'pointer',
      marginBottom: 12,
    },
    btnGreen: {
      width: '100%',
      minHeight: 44,
      background: 'var(--accent)',
      color: '#000',
      border: 'none',
      borderRadius: 10,
      fontSize: 15,
      fontWeight: 600,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    card: {
      background: 'var(--bg-card)',
      borderRadius: 10,
      marginBottom: 10,
      overflow: 'hidden',
    },
    cardHead: {
      padding: '12px 14px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardName: { fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' },
    cardBody: { padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 },
    badge: { display: 'inline-block', padding: '2px 6px', borderRadius: 6, fontSize: 9, fontWeight: 700, marginLeft: 6, fontFamily: 'var(--font-mono)' },
    fixedBot: {
      position: 'fixed' as const,
      bottom: 0,
      left: 0,
      right: 0,
      background: 'var(--bg-primary)',
      borderTop: '1px solid var(--border)',
      padding: '12px 16px',
      paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      zIndex: 100,
    },
  }

  return (
    <div style={s.page}>
      <div style={s.hdr}>
        <button style={s.backBtn} onClick={() => onBack()}>←</button>
        <div>
          <div style={s.hdrTitle}>Bulk add</div>
          <div style={s.hdrSub}>Scan photos to extract recipes</div>
        </div>
      </div>
      <div style={s.sec}>
        <div style={s.uploadArea} onClick={() => fileRef.current?.click()}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Tap to select photos of recipe sheets</div>
          {files.length > 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
              {files.length} photo{files.length !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={onPhotos}
        />
        <button
          style={{ ...s.btnGreen, opacity: (!files.length || extracting) ? 0.5 : 1 }}
          onClick={extractRecipes}
          disabled={!files.length || extracting}
        >
          {extracting ? (
            <>
              <Spinner /> Extracting…
            </>
          ) : (
            'Extract recipes'
          )}
        </button>

        {results.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
              {results.length} recipe{results.length !== 1 ? 's' : ''} extracted
            </div>
            {results.map((r, idx) => (
              <div key={idx} style={{ ...s.card, borderLeft: `3px solid ${statusColor(r.status)}` }}>
                <div style={s.cardHead}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={r.included}
                      onChange={() => toggleInclude(idx)}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <div style={s.cardName}>{r.output_name}</div>
                  </div>
                  <span
                    style={{
                      ...s.badge,
                      background: `${statusColor(r.status)}20`,
                      color: statusColor(r.status),
                    }}
                  >
                    {statusLabel(r.status)}
                  </span>
                </div>
                <div style={s.cardBody}>
                  {r.inputs.map((inp, j) => (
                    <div key={j}>
                      {inp.qty} {inp.unit_hint || ''} {inp.input_name}
                      {!inp.input_match_id && <span style={{ color: 'var(--warning)', marginLeft: 4 }}>(new)</span>}
                    </div>
                  ))}
                  {r.inputs.length === 0 && <div>No inputs detected</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div style={s.fixedBot}>
          <button
            style={{ ...s.btnGreen, opacity: saving ? 0.7 : 1 }}
            onClick={saveAll}
            disabled={saving || includedCount === 0}
          >
            {saving ? 'Saving…' : `Save all (${includedCount})`}
          </button>
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{
      display: 'inline-block',
      width: 16,
      height: 16,
      border: '2px solid rgba(0,0,0,0.2)',
      borderTopColor: '#000',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  )
}
