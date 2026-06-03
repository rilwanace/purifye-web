import { useState, useEffect, useRef } from 'react'
import { meal } from './mealApi'
import type { Recipe } from './mealApi'

interface Props {
  onSelectRecipe: (id: string) => void
}

const MEAL_SLOTS = [
  { key: '', label: 'All' },
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'dessert', label: 'Dessert' },
]

const PROTEINS = [
  { key: '', label: 'All' },
  { key: 'chicken', label: '\u{1F414} Chicken' },
  { key: 'beef', label: '\u{1F969} Beef' },
  { key: 'fish', label: '\u{1F41F} Fish' },
  { key: 'egg', label: '\u{1F95A} Egg' },
  { key: 'vegetarian', label: '\u{1F96C} Veggie' },
]

const PROTEIN_COLORS: Record<string, string> = {
  chicken: '#5DCAA5',
  beef: '#E86B3A',
  fish: '#6BB4E8',
  egg: '#D4A843',
  eggs: '#D4A843',
  vegetarian: '#82C27A',
  lamb: '#CF5BA0',
}

const CUISINE_COLORS = ['#E8734A', '#5DCAA5', '#7068D9', '#D4A843', '#CF5BA0', '#6BB4E8']

function getPlaceholderColor(r: Recipe): string {
  return PROTEIN_COLORS[(r.protein_type || '').toLowerCase()] ||
    CUISINE_COLORS[(r.cuisine?.charCodeAt(0) || 0) % CUISINE_COLORS.length]
}

function proteinEmoji(pt: string): string {
  const p = (pt || '').toLowerCase()
  if (p === 'chicken') return '\u{1F414}'
  if (p === 'beef') return '\u{1F969}'
  if (p === 'fish') return '\u{1F41F}'
  if (p === 'egg' || p === 'eggs') return '\u{1F95A}'
  if (p === 'vegetarian') return '\u{1F96C}'
  return '\u{1F37D}️'
}


function SkeletonCard() {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ height: 110, background: 'var(--bg-surface)' }} />
      <div style={{ padding: 10 }}>
        <div style={{ height: 13, background: 'var(--bg-surface)', borderRadius: 4, marginBottom: 6 }} />
        <div style={{ height: 13, width: '70%', background: 'var(--bg-surface)', borderRadius: 4 }} />
      </div>
    </div>
  )
}

export default function RecipeList({ onSelectRecipe }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [mealSlot, setMealSlot] = useState('')
  const [protein, setProtein] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    meal.recipes()
      .then(r => setRecipes(r || []))
      .catch(() => setRecipes([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current) }
  }, [search])

  const matchesProtein = (r: Recipe) => {
    if (!protein) return true
    const rp = (r.protein_type || '').toLowerCase()
    return rp === protein || rp.startsWith(protein) || protein.startsWith(rp)
  }

  const filtered = recipes.filter(r => {
    if (debouncedSearch) {
      const s = debouncedSearch.toLowerCase()
      if (!(r.name || '').toLowerCase().includes(s) && !(r.description || '').toLowerCase().includes(s)) return false
    }
    if (mealSlot && !(r.meal_slots || []).map((s: string) => s.toLowerCase()).includes(mealSlot)) return false
    if (!matchesProtein(r)) return false
    return true
  })

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 20, fontSize: 11, whiteSpace: 'nowrap',
    fontFamily: 'var(--font-mono)', fontWeight: 500, cursor: 'pointer',
    background: active ? '#E8734A' : 'var(--bg-surface)',
    color: active ? '#fff' : 'var(--text-secondary)',
    border: 'none', flexShrink: 0,
  })

  return (
    <div>
      {/* Search */}
      <div style={{ padding: '12px 16px 8px' }}>
        <div style={{ position: 'relative' }}>
          <svg
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search recipes..."
            style={{
              width: '100%', height: 42, paddingLeft: 38, paddingRight: 12,
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: 10, color: 'var(--text-primary)',
              fontSize: 14, fontFamily: 'var(--font-sans)',
              boxSizing: 'border-box', outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Meal slot chips */}
      <div className="no-scrollbar" style={{ overflowX: 'auto', padding: '6px 16px 4px', display: 'flex', gap: 8, scrollbarWidth: 'none' }}>
        {MEAL_SLOTS.map(s => (
          <button key={s.key} onClick={() => setMealSlot(s.key)} style={chipStyle(mealSlot === s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Protein chips */}
      <div className="no-scrollbar" style={{ overflowX: 'auto', padding: '4px 16px 8px', display: 'flex', gap: 8, scrollbarWidth: 'none' }}>
        {PROTEINS.map(p => (
          <button key={p.key} onClick={() => setProtein(p.key)} style={chipStyle(protein === p.key)}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Count */}
      {!loading && (
        <div style={{ padding: '0 16px 8px', fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          {filtered.length} recipe{filtered.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 16px 24px' }}>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
        ) : filtered.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            No recipes found
          </div>
        ) : filtered.map(r => {
          const placeholderBg = getPlaceholderColor(r)
          return (
            <button
              key={r.id}
              onClick={() => onSelectRecipe(r.id)}
              style={{ background: 'var(--bg-card)', borderRadius: 10, overflow: 'hidden', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}
            >
              {r.image_url ? (
                <img
                  src={r.image_url}
                  alt={r.name}
                  style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{
                  width: '100%', aspectRatio: '4/3',
                  background: `linear-gradient(135deg, ${placeholderBg}33, ${placeholderBg}66)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28,
                }}>
                  {proteinEmoji(r.protein_type)}
                </div>
              )}
              <div style={{ padding: '8px 8px 10px' }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, lineHeight: 1.3,
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                }}>
                  {r.name}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
