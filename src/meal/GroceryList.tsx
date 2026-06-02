import { useState, useEffect } from 'react'
import { meal } from './mealApi'
import type { MealPlan as MealPlanType, GroceryList as GroceryListType } from './mealApi'

const CATEGORY_ORDER = ['protein', 'produce', 'dairy', 'grain', 'pantry', 'spice', 'condiment', 'frozen']

interface Props {
  plan: MealPlanType | null
}

export default function GroceryList({ plan }: Props) {
  const [grocery, setGrocery] = useState<GroceryListType | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!plan || plan.status !== 'confirmed') { setGrocery(null); return }
    setLoading(true)
    meal.fetchGroceryList(plan.id)
      .then(g => setGrocery(g))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [plan?.id, plan?.status])

  const handleToggle = async (itemId: string, currentChecked: boolean) => {
    if (!grocery) return
    const updated: GroceryListType = {
      ...grocery,
      categories: Object.fromEntries(
        Object.entries(grocery.categories).map(([cat, items]) => [
          cat,
          items.map(item => item.id === itemId ? { ...item, is_checked: !currentChecked } : item),
        ])
      ),
    }
    setGrocery(updated)
    try { await meal.toggleGroceryItem(itemId) }
    catch { setGrocery(grocery) }
  }

  const copyList = () => {
    if (!grocery) return
    const sortedCats = Object.keys(grocery.categories).sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a), bi = CATEGORY_ORDER.indexOf(b)
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi)
    })
    let text = 'Grocery List\n\n'
    for (const cat of sortedCats) {
      const items = grocery.categories[cat]
      if (!items?.length) continue
      text += cat.toUpperCase() + '\n'
      for (const item of items) {
        text += '  ' + item.total_quantity + ' ' + item.unit + ' ' + item.ingredient_name + (item.is_optional ? ' (optional)' : '') + '\n'
      }
      text += '\n'
    }
    navigator.clipboard.writeText(text).catch(() => {})
  }

  if (!plan) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🛒</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', fontFamily: 'var(--font-sans)' }}>Grocery List</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 280, fontFamily: 'var(--font-sans)' }}>Generate a meal plan first to get your grocery list.</p>
      </div>
    )
  }

  if (plan.status !== 'confirmed') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🛒</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', fontFamily: 'var(--font-sans)' }}>Confirm your plan first</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 280, fontFamily: 'var(--font-sans)' }}>Tap Confirm on the Plan tab to auto-generate your grocery list.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Loading grocery list...</span>
      </div>
    )
  }

  if (!grocery) return null

  const allItems = Object.values(grocery.categories).flat()
  const total = allItems.length
  const checked = allItems.filter(i => i.is_checked).length
  const progress = total > 0 ? checked / total : 0

  const sortedCats = Object.keys(grocery.categories).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a), bi = CATEGORY_ORDER.indexOf(b)
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi)
  })

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ padding: '12px 16px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>{checked}/{total} items</div>
          <div style={{ marginTop: 6, height: 3, width: 160, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: (progress * 100) + '%', background: '#5DCAA5', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
        </div>
        <button onClick={copyList} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          📋 Copy list
        </button>
      </div>

      <div style={{ padding: '4px 16px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {sortedCats.map(cat => {
          const items = grocery.categories[cat] || []
          if (!items.length) return null
          return (
            <div key={cat}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                {cat} ({items.length} item{items.length !== 1 ? 's' : ''})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleToggle(item.id, item.is_checked)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', background: 'var(--bg-card)', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1, background: item.is_checked ? '#5DCAA5' : 'transparent', border: item.is_checked ? 'none' : '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {item.is_checked && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div style={{ flex: 1, opacity: item.is_checked ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                      <div style={{ fontSize: 14, fontWeight: 500, textDecoration: item.is_checked ? 'line-through' : 'none', fontFamily: 'var(--font-sans)' }}>
                        {item.ingredient_name}
                        {item.is_optional && <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 6, fontFamily: 'var(--font-sans)' }}>(optional)</span>}
                      </div>
                      {item.is_premade && item.premade_note && (
                        <div style={{ fontSize: 11, color: '#5DCAA5', marginTop: 2, fontFamily: 'var(--font-sans)' }}>↳ {item.premade_note}</div>
                      )}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#E8734A', flexShrink: 0, paddingTop: 1 }}>
                      {item.total_quantity} {item.unit}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
