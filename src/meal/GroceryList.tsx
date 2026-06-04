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
        const priceStr = item.pricing?.marginal_cost != null ? ` — Rs ${item.pricing.marginal_cost}` : ''
        text += '  ' + item.total_quantity + ' ' + item.unit + ' ' + item.ingredient_name + (item.is_optional ? ' (optional)' : '') + priceStr + '\n'
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

      <div>
        {sortedCats.map(cat => {
          const items = grocery.categories[cat] || []
          if (!items.length) return null
          return (
            <div key={cat}>
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                padding: '20px 16px 8px',
              }}>
                {cat} ({items.length})
              </div>
              {items.map((item, idx) => {
                const pricing = item.pricing
                const hasPricing = !!(pricing && pricing.marginal_cost != null)
                return (
                  <div
                    key={item.id || idx}
                    onClick={() => handleToggle(item.id, item.is_checked)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '14px 16px',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      opacity: item.is_checked ? 0.4 : 1,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: 12,
                      }}>
                        <span style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 15,
                          fontWeight: 500,
                          color: '#fff',
                          textDecoration: item.is_checked ? 'line-through' : 'none',
                          flex: 1,
                          minWidth: 0,
                        }}>
                          {item.ingredient_name}
                          {item.is_optional && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>(optional)</span>}
                        </span>

                        {hasPricing && pricing ? (
                          <span style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: 15,
                            fontWeight: 600,
                            color: '#5DCAA5',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}>
                            Rs {Math.round(pricing.marginal_cost as number).toLocaleString()}
                          </span>
                        ) : (
                          <span style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: 14,
                            fontWeight: 500,
                            color: '#E8A838',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}>
                            {item.total_quantity} {item.unit}
                          </span>
                        )}
                      </div>

                      {item.is_premade && item.premade_note && (
                        <div style={{ fontSize: 11, color: '#5DCAA5', marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>↳ {item.premade_note}</div>
                      )}

                      {hasPricing && pricing && (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          marginTop: 4,
                          gap: 12,
                        }}>
                          <span style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: 11,
                            color: 'rgba(255,255,255,0.3)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '60%',
                          }}>
                            {pricing.pack_size != null
                              ? `${pricing.pack_size}${pricing.pack_unit || 'g'} · Rs ${Math.round(pricing.pack_price).toLocaleString()}`
                              : `Rs ${Math.round(pricing.pack_price).toLocaleString()}`
                            }
                          </span>

                          <span style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: 11,
                            color: 'rgba(255,255,255,0.4)',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}>
                            {item.total_quantity} {item.unit}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}

        {(grocery.meal_cost_total ?? 0) > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 16px',
            marginTop: 4,
            borderTop: '2px solid rgba(255,255,255,0.1)',
          }}>
            <span style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 15,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
            }}>
              Meal cost this week
            </span>
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 18,
              fontWeight: 700,
              color: '#5DCAA5',
            }}>
              Rs {Math.round(grocery.meal_cost_total).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
