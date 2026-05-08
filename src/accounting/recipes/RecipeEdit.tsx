import { useState, useRef } from 'react'
import { api } from '../../api'
import { useToast } from '../../shared/components/Toast'
import type { Product, Recipe } from './RecipesPage'

interface InputRow {
  id: string
  product_id: string
  product_name: string
  unit: string
  qty: string
}

interface Props {
  recipe: Recipe | null
  products: Product[]
  onBack: (reload?: boolean) => void
  onProductsChanged: () => void
}

let _rowId = 0
function nextId() { return String(++_rowId) }

export default function RecipeEdit({ recipe, products, onBack, onProductsChanged }: Props) {
  const { show } = useToast()
  const [outId, setOutId] = useState(recipe?.output_sku_id || '')
  const [outName, setOutName] = useState(recipe?.output_name || '')
  const [outSearch, setOutSearch] = useState(recipe?.output_name || '')
  const [outDdOpen, setOutDdOpen] = useState(false)
  const [rows, setRows] = useState<InputRow[]>(() =>
    recipe?.inputs.map(inp => ({
      id: nextId(),
      product_id: inp.input_sku_id,
      product_name: inp.input_name,
      unit: inp.unit || '',
      qty: String(inp.qty_per_unit),
    })) || []
  )
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDelModal, setShowDelModal] = useState(false)
  const [newProdModal, setNewProdModal] = useState<{ forRow: string | null }>({ forRow: null })
  const [newProdName, setNewProdName] = useState('')
  const [newProdUnit, setNewProdUnit] = useState('')
  const [creatingProd, setCreatingProd] = useState(false)
  const outRef = useRef<HTMLInputElement>(null)

  const isEdit = !!recipe

  const outFiltered = products.filter(p =>
    p.name.toLowerCase().includes(outSearch.toLowerCase()) && p.id !== outId
  )

  function selectOut(p: Product) {
    setOutId(p.id)
    setOutName(p.name)
    setOutSearch(p.name)
    setOutDdOpen(false)
  }

  function addRow() {
    setRows(prev => [...prev, { id: nextId(), product_id: '', product_name: '', unit: '', qty: '1' }])
  }

  function removeRow(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
  }

  function updateRowProduct(id: string, p: Product) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, product_id: p.id, product_name: p.name, unit: p.unit } : r))
  }

  function updateRowQty(id: string, qty: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, qty } : r))
  }

  async function save() {
    if (!outId) { show('Select an output product', 'error'); return }
    if (rows.length === 0) { show('Add at least one input', 'error'); return }
    const bad = rows.find(r => !r.product_id || !r.qty || parseFloat(r.qty) <= 0)
    if (bad) { show('All inputs must have a product and quantity > 0', 'error'); return }
    const inputIds = rows.map(r => r.product_id)
    if (new Set(inputIds).size !== inputIds.length) { show('Duplicate input products', 'error'); return }
    if (inputIds.includes(outId)) { show('Output cannot be its own input', 'error'); return }
    setSaving(true)
    try {
      await api('/api/recipes/save', {
        method: 'POST',
        body: JSON.stringify({
          output_sku_id: outId,
          inputs: rows.map(r => ({ input_sku_id: r.product_id, qty_per_unit: parseFloat(r.qty) })),
        }),
      })
      show('Recipe saved', 'success')
      onBack(true)
    } catch (err: any) {
      show(err.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function doDelete() {
    setDeleting(true)
    try {
      await api('/api/recipes/delete', {
        method: 'POST',
        body: JSON.stringify({ output_sku_id: outId }),
      })
      show('Recipe deleted', 'success')
      onBack(true)
    } catch (err: any) {
      show(err.message || 'Delete failed', 'error')
    } finally {
      setDeleting(false)
      setShowDelModal(false)
    }
  }

  async function createNewProduct(forRowId: string | null) {
    if (!newProdName.trim()) return
    setCreatingProd(true)
    try {
      const res = await api<{ ok: boolean; item: Product }>('/api/settings/master-data', {
        method: 'POST',
        body: JSON.stringify({ kind: 'product', name: newProdName.trim(), unit: newProdUnit.trim() || null }),
      })
      onProductsChanged()
      if (forRowId === null) {
        selectOut(res.item)
      } else {
        updateRowProduct(forRowId, res.item)
      }
      setNewProdModal({ forRow: null })
      setNewProdName('')
      setNewProdUnit('')
      show('Product created', 'success')
    } catch (err: any) {
      show(err.message || 'Failed to create product', 'error')
    } finally {
      setCreatingProd(false)
    }
  }

  const s: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 140 },
    hdr: {
      padding: '16px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    },
    backBtn: {
      background: 'none',
      border: 'none',
      color: 'var(--text-muted)',
      cursor: 'pointer',
      fontSize: 20,
      padding: '0 4px',
      lineHeight: 1,
    },
    hdrTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' },
    sec: { padding: '16px' },
    lbl: {
      fontSize: 9,
      color: 'var(--text-muted)',
      marginBottom: 6,
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.1em',
      fontFamily: 'var(--font-mono)',
    },
    grp: { marginBottom: 20 },
    pkWrap: { position: 'relative' as const },
    pkInp: {
      width: '100%',
      background: 'var(--bg-input)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '12px',
      color: 'var(--text-primary)',
      fontSize: 13,
      outline: 'none',
      minHeight: 44,
      boxSizing: 'border-box' as const,
      fontFamily: 'var(--font-sans)',
    },
    pkDd: {
      position: 'absolute' as const,
      top: 'calc(100% + 4px)',
      left: 0,
      right: 0,
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      maxHeight: 220,
      overflowY: 'auto' as const,
      zIndex: 200,
    },
    pkOpt: {
      padding: '12px 14px',
      cursor: 'pointer',
      fontSize: 14,
      borderBottom: '1px solid var(--border)',
      minHeight: 44,
      display: 'flex',
      alignItems: 'center',
      color: 'var(--text-primary)',
    },
    pkSec: {
      padding: '6px 14px 4px',
      fontSize: 9,
      color: 'var(--text-muted)',
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.1em',
      fontFamily: 'var(--font-mono)',
    },
    irow: {
      display: 'grid',
      gridTemplateColumns: '1fr 68px auto auto',
      gap: 8,
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: '1px solid var(--border)',
    },
    qtyInp: {
      background: 'var(--bg-input)',
      borderRadius: 8,
      padding: 8,
      color: 'var(--text-primary)',
      fontSize: 14,
      border: '1px solid var(--border)',
      textAlign: 'center' as const,
      width: '100%',
      outline: 'none',
      minHeight: 36,
      boxSizing: 'border-box' as const,
    },
    unitLbl: { fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' as const },
    delBtn: {
      background: 'none',
      border: 'none',
      color: 'var(--danger)',
      fontSize: 20,
      cursor: 'pointer',
      padding: '4px 8px',
      minHeight: 36,
      lineHeight: 1,
    },
    btnOutline: {
      width: '100%',
      minHeight: 44,
      background: 'var(--bg-card)',
      color: 'var(--accent)',
      border: '1.5px solid var(--accent)',
      borderRadius: 10,
      fontSize: 15,
      fontWeight: 600,
      cursor: 'pointer',
      marginTop: 6,
    },
    fixedBot: {
      position: 'fixed' as const,
      bottom: 0,
      left: 0,
      right: 0,
      background: 'var(--bg-primary)',
      borderTop: '1px solid var(--border)',
      padding: '12px 16px',
      paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 8,
      zIndex: 100,
    },
    btnGreen: {
      width: '100%',
      height: 48,
      background: 'var(--accent)',
      color: '#131311',
      border: 'none',
      borderRadius: 10,
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
    },
    btnRed: {
      width: '100%',
      height: 48,
      background: 'rgba(216,90,48,0.1)',
      color: '#D85A30',
      border: '1px solid rgba(216,90,48,0.2)',
      borderRadius: 10,
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
    },
    overlay: {
      position: 'fixed' as const,
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      zIndex: 500,
    },
    modal: {
      position: 'fixed' as const,
      bottom: 0,
      left: 0,
      right: 0,
      maxWidth: 430,
      margin: '0 auto',
      borderRadius: '14px 14px 0 0',
      background: '#1a1a18',
      padding: 20,
    },
    modalTitle: { fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' },
    modalMsg: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, fontFamily: 'var(--font-sans)' },
    modalActs: { display: 'flex', gap: 8 },
  }

  return (
    <div style={s.page}>
      <div style={s.hdr}>
        <button style={s.backBtn} onClick={() => onBack(false)}>←</button>
        <div style={s.hdrTitle}>{isEdit ? 'Edit recipe' : 'Add recipe'}</div>
      </div>
      <div style={s.sec}>
        <div style={s.grp}>
          <div style={s.lbl}>Output product</div>
          <div style={s.pkWrap}>
            <input
              ref={outRef}
              style={s.pkInp}
              placeholder="Search product..."
              value={outSearch}
              autoComplete="off"
              onChange={e => { setOutSearch(e.target.value); setOutDdOpen(true) }}
              onFocus={() => setOutDdOpen(true)}
              onBlur={() => setTimeout(() => setOutDdOpen(false), 200)}
            />
            {outDdOpen && (
              <div style={s.pkDd}>
                {outFiltered.slice(0, 30).map(p => (
                  <div key={p.id} style={s.pkOpt} onMouseDown={() => selectOut(p)}>
                    {p.name}{p.unit ? ` (${p.unit})` : ''}
                  </div>
                ))}
                <div style={{ ...s.pkOpt, color: 'var(--accent)' }} onMouseDown={() => { setNewProdModal({ forRow: null }); setOutDdOpen(false) }}>
                  + Add new product
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={s.grp}>
          <div style={s.lbl}>Inputs (per 1 output unit)</div>
          <div>
            {rows.map((row, idx) => (
              <InputRowComponent
                key={row.id}
                row={row}
                products={products}
                excludeId={outId}
                isLast={idx === rows.length - 1}
                onSelect={p => updateRowProduct(row.id, p)}
                onQtyChange={q => updateRowQty(row.id, q)}
                onDelete={() => removeRow(row.id)}
                onAddNew={() => setNewProdModal({ forRow: row.id })}
                styles={s}
              />
            ))}
          </div>
          <button style={s.btnOutline} onClick={addRow}>+ Add input</button>
        </div>
      </div>

      <div style={s.fixedBot}>
        <button style={s.btnGreen} onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save recipe'}
        </button>
        {isEdit && (
          <button style={s.btnRed} onClick={() => setShowDelModal(true)}>
            Delete recipe
          </button>
        )}
      </div>

      {showDelModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />
            <div style={s.modalTitle}>Delete recipe?</div>
            <div style={s.modalMsg}>This will remove the recipe for <strong>{outName}</strong>. This cannot be undone.</div>
            <div style={s.modalActs}>
              <button style={{ ...s.btnRed, flex: 1 }} onClick={() => setShowDelModal(false)}>Cancel</button>
              <button style={{ ...s.btnGreen, flex: 1 }} onClick={doDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {(newProdModal.forRow !== undefined) && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />
            <div style={s.modalTitle}>New product</div>
            <input
              style={{ ...s.pkInp, marginBottom: 10 }}
              placeholder="Product name"
              value={newProdName}
              onChange={e => setNewProdName(e.target.value)}
              autoFocus
            />
            <input
              style={{ ...s.pkInp, marginBottom: 20 }}
              placeholder="Unit (kg, pcs, litre…)"
              value={newProdUnit}
              onChange={e => setNewProdUnit(e.target.value)}
            />
            <div style={s.modalActs}>
              <button style={{ ...s.btnRed, flex: 1 }} onClick={() => { setNewProdModal({ forRow: undefined as any }); setNewProdName(''); setNewProdUnit('') }}>Cancel</button>
              <button style={{ ...s.btnGreen, flex: 1 }} onClick={() => createNewProduct(newProdModal.forRow)} disabled={creatingProd || !newProdName.trim()}>
                {creatingProd ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface RowProps {
  row: InputRow
  products: Product[]
  excludeId: string
  isLast: boolean
  onSelect: (p: Product) => void
  onQtyChange: (q: string) => void
  onDelete: () => void
  onAddNew: () => void
  styles: Record<string, React.CSSProperties>
}

function InputRowComponent({ row, products, excludeId, isLast, onSelect, onQtyChange, onDelete, onAddNew, styles: s }: RowProps) {
  const [search, setSearch] = useState(row.product_name)
  const [ddOpen, setDdOpen] = useState(false)

  const filtered = products.filter(p =>
    p.id !== excludeId && p.name.toLowerCase().includes(search.toLowerCase())
  )

  function pick(p: Product) {
    onSelect(p)
    setSearch(p.name)
    setDdOpen(false)
  }

  return (
    <div style={{ ...s.irow, borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
      <div style={{ position: 'relative' }}>
        <input
          style={{ ...s.pkInp, padding: '8px 10px', fontSize: 14 }}
          placeholder="Ingredient…"
          value={search}
          onChange={e => { setSearch(e.target.value); setDdOpen(true) }}
          onFocus={() => setDdOpen(true)}
          onBlur={() => setTimeout(() => setDdOpen(false), 200)}
          autoComplete="off"
        />
        {ddOpen && (
          <div style={{ ...s.pkDd, zIndex: 300 }}>
            {filtered.slice(0, 20).map(p => (
              <div key={p.id} style={s.pkOpt} onMouseDown={() => pick(p)}>
                {p.name}{p.unit ? ` (${p.unit})` : ''}
              </div>
            ))}
            <div style={{ ...s.pkOpt, color: 'var(--accent)' }} onMouseDown={() => { setDdOpen(false); onAddNew() }}>
              + Add new product
            </div>
          </div>
        )}
      </div>
      <input
        style={s.qtyInp}
        type="number"
        min="0.001"
        step="any"
        value={row.qty}
        onChange={e => onQtyChange(e.target.value)}
      />
      <span style={s.unitLbl}>{row.unit || '–'}</span>
      <button style={s.delBtn} onClick={onDelete}>×</button>
    </div>
  )
}
