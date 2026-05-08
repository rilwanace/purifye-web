import { useState } from 'react'
import type { Recipe } from './RecipesPage'

interface Props {
  recipes: Recipe[]
  loading: boolean
  onEdit: (recipe: Recipe | null) => void
  onBulk: () => void
}

export default function RecipeList({ recipes, loading, onEdit, onBulk }: Props) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? recipes.filter(r => r.output_name.toLowerCase().includes(search.toLowerCase()))
    : recipes

  const s: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', background: 'var(--bg-primary)' },
    hdr: {
      padding: '16px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    hdrTitle: { fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' },
    hdrCount: { fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' },
    actRow: { display: 'flex', gap: 8, padding: '12px 16px' },
    btnGreen: {
      flex: 1,
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
      gap: 6,
    },
    btnOutline: {
      flex: 1,
      minHeight: 44,
      background: 'var(--bg-card)',
      color: 'var(--accent)',
      border: '1.5px solid var(--accent)',
      borderRadius: 10,
      fontSize: 15,
      fontWeight: 600,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    searchWrap: { padding: '0 16px 12px' },
    searchInp: {
      width: '100%',
      background: 'var(--bg-input)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '10px 14px',
      color: 'var(--text-primary)',
      fontSize: 15,
      outline: 'none',
      minHeight: 44,
      boxSizing: 'border-box',
    },
    cards: { padding: '0 16px' },
    card: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '14px 16px',
      marginBottom: 10,
      cursor: 'pointer',
    },
    cardTop: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    cardName: { fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' },
    cardBadge: {
      fontSize: 9,
      fontWeight: 700,
      color: 'var(--accent)',
      background: 'rgba(93,202,165,0.1)',
      padding: '2px 6px',
      borderRadius: 6,
      fontFamily: 'var(--font-mono)',
    },
    cardInputs: { fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' },
    empty: {
      textAlign: 'center',
      padding: '60px 16px',
      color: 'var(--text-muted)',
      fontSize: 15,
    },
  }

  function inputSummary(recipe: Recipe) {
    const names = recipe.inputs.map(i => i.input_name)
    if (names.length <= 3) return names.join(', ')
    return names.slice(0, 3).join(', ') + ` +${names.length - 3} more`
  }

  return (
    <div style={s.page}>
      <div style={s.hdr}>
        <div style={s.hdrTitle}>Recipes</div>
        <div style={s.hdrCount}>{recipes.length > 0 ? `${recipes.length} recipe${recipes.length !== 1 ? 's' : ''}` : ''}</div>
      </div>
      <div style={s.actRow}>
        <button style={s.btnGreen} onClick={() => onEdit(null)}>
          + Add recipe
        </button>
        <button style={s.btnOutline} onClick={onBulk}>
          📷 Bulk add
        </button>
      </div>
      <div style={s.searchWrap}>
        <input
          style={s.searchInp}
          placeholder="Search recipes"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div style={s.cards}>
        {loading ? (
          <div style={s.empty}>
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>
            {search ? 'No recipes match your search' : 'No recipes yet — add one to get started'}
          </div>
        ) : (
          filtered.map(r => (
            <div key={r.output_sku_id} style={s.card} onClick={() => onEdit(r)}>
              <div style={s.cardTop}>
                <div style={s.cardName}>{r.output_name}</div>
                <div style={s.cardBadge}>{r.inputs.length} input{r.inputs.length !== 1 ? 's' : ''}</div>
              </div>
              {r.inputs.length > 0 && (
                <div style={s.cardInputs}>{inputSummary(r)}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{
      display: 'inline-block',
      width: 20,
      height: 20,
      border: '2px solid var(--border)',
      borderTopColor: 'var(--accent)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
