import { useState, useEffect, useRef } from 'react'
import { meal } from './mealApi'
import type { MealPlan as MealPlanType, GroceryList as GroceryListType, GroceryItemProduct } from './mealApi'

const CATEGORY_ORDER = ['protein', 'produce', 'dairy', 'grain', 'pantry', 'spice', 'condiment', 'frozen']

interface Props {
  plan: MealPlanType | null
}

export default function GroceryList({ plan }: Props) {
  const [grocery, setGrocery] = useState<GroceryListType | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
        const priceStr = item.pricing.marginal_cost > 0
          ? ' - Rs ' + Math.round(item.pricing.marginal_cost).toLocaleString()
          : ''
        text += '  ' + item.total_quantity + ' ' + item.unit + ' ' + item.ingredient_name +
          (item.is_optional ? ' (optional)' : '') + priceStr + '\n'
      }
      text += '\n'
    }
    navigator.clipboard.writeText(text).catch(() => {})
  }

  if (!plan) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>cart</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', fontFamily: 'var(--font-sans)' }}>Grocery List</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 280, fontFamily: 'var(--font-sans)' }}>Generate a meal plan first to get your grocery list.</p>
      </div>
    )
  }

  if (plan.status !== 'confirmed') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>cart</div>
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
        <button
          onClick={copyList}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
        >
          Copy list
        </button>
      </div>

      <div>
        {sortedCats.map(cat => {
          const items = grocery.categories[cat] || []
          if (!items.length) return null
          return (
            <div key={cat}>
              <div style={{
                fontFamily: 'var(--font-mono)',
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
                const itemKey = item.id || item.ingredient_name
                const isExpanded = expandedItem === itemKey
                const hasProducts = !!(item.products && item.products.length > 0)
                const hasCost = item.pricing.marginal_cost > 0

                return (
                  <div key={item.id || idx}>
                    <div
                      onClick={() => handleToggle(item.id, item.is_checked)}
                      onPointerDown={() => {
                        if (!hasProducts) return
                        longPressTimer.current = setTimeout(() => {
                          setExpandedItem(prev => prev === itemKey ? null : itemKey)
                        }, 500)
                      }}
                      onPointerUp={() => {
                        if (longPressTimer.current) clearTimeout(longPressTimer.current)
                      }}
                      onPointerLeave={() => {
                        if (longPressTimer.current) clearTimeout(longPressTimer.current)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '14px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        opacity: item.is_checked ? 0.35 : 1,
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{
                        flex: 1,
                        fontFamily: 'var(--font-sans)',
                        fontSize: 15,
                        fontWeight: 500,
                        color: '#fff',
                        textDecoration: item.is_checked ? 'line-through' : 'none',
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {item.ingredient_name}
                        {item.is_optional && (
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>(opt)</span>
                        )}
                      </span>

                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.4)',
                        whiteSpace: 'nowrap',
                        minWidth: 65,
                        textAlign: 'right',
                        marginRight: 12,
                      }}>
                        {item.total_quantity} {item.unit}
                      </span>

                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 15,
                        fontWeight: 600,
                        color: hasCost ? '#5DCAA5' : 'rgba(255,255,255,0.2)',
                        whiteSpace: 'nowrap',
                        minWidth: 72,
                        textAlign: 'right',
                      }}>
                        {hasCost ? 'Rs ' + Math.round(item.pricing.marginal_cost).toLocaleString() : '—'}
                      </span>

                      {hasProducts && (
                        <span
                          onClick={e => {
                            e.stopPropagation()
                            setExpandedItem(prev => prev === itemKey ? null : itemKey)
                          }}
                          style={{
                            marginLeft: 8,
                            fontSize: 10,
                            color: 'rgba(255,255,255,0.25)',
                            cursor: 'pointer',
                            userSelect: 'none',
                            flexShrink: 0,
                          }}
                        >
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      )}
                    </div>

                    {item.is_premade && item.premade_note && (
                      <div style={{ fontSize: 11, color: '#5DCAA5', padding: '0 16px 8px 16px', fontFamily: 'var(--font-sans)' }}>
                        {item.premade_note}
                      </div>
                    )}

                    {isExpanded && hasProducts && (
                      <DrillDown products={item.products} />
                    )}
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
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
              Meal cost this week
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: '#5DCAA5' }}>
              Rs {Math.round(grocery.meal_cost_total).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function DrillDown({ products }: { products: GroceryItemProduct[] }) {
  const grouped: Record<string, GroceryItemProduct[]> = {}
  for (const p of products) {
    if (!grouped[p.supermarket]) grouped[p.supermarket] = []
    grouped[p.supermarket].push(p)
  }

  return (
    <div style={{
      padding: '8px 16px 12px 20px',
      background: 'rgba(255,255,255,0.03)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      {Object.entries(grouped).map(([sm, prods]) => (
        <div key={sm} style={{ marginBottom: 8 }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: 4,
          }}>
            {sm === 'Manual Estimates' ? 'ESTIMATED' : sm.toUpperCase()}
          </div>
          {prods.map((p, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              padding: '3px 0',
            }}>
              <span style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                color: 'rgba(255,255,255,0.6)',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginRight: 8,
              }}>
                {p.product_name}
                {p.unit_size != null && (
                  <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>
                    {p.unit_size}{p.unit}
                  </span>
                )}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                color: 'rgba(255,255,255,0.5)',
                whiteSpace: 'nowrap',
              }}>
                Rs {Math.round(p.price).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}