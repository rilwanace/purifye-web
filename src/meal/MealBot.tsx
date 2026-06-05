import { useState, useEffect, useRef } from 'react'
import { meal } from './mealApi'
import type { MealPlan as MealPlanType } from './mealApi'
import MealOnboarding from './MealOnboarding'
import RecipeList from './RecipeList'
import RecipeDetail from './RecipeDetail'
import MealPlan from './MealPlan'
import GroceryList from './GroceryList'

const ACC = '#E8734A'
type Tab = 'recipes' | 'plan' | 'grocery'

export default function MealBot() {
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [tab, setTab] = useState<Tab>('recipes')
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [plan, setPlan] = useState<MealPlanType | null>(null)
  const [planLoaded, setPlanLoaded] = useState(false)
  const prevTabRef = useRef<Tab>('recipes')

  const viewRecipe = (id: string) => {
    prevTabRef.current = tab
    setSelectedRecipeId(id)
    window.scrollTo(0, 0)
  }

  useEffect(() => {
    Promise.all([
      meal.preferences().then(p => { if (p === null) setShowOnboarding(true) }).catch(() => {}),
      meal.fetchCurrentPlan().then(p => { setPlan(p); setPlanLoaded(true) }).catch(() => { setPlanLoaded(true) }),
    ]).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Loading...</span>
      </div>
    )
  }

  if (showOnboarding) {
    return <MealOnboarding onComplete={() => setShowOnboarding(false)} />
  }

  if (selectedRecipeId) {
    return (
      <RecipeDetail
        recipeId={selectedRecipeId}
        onBack={() => { setTab(prevTabRef.current); setSelectedRecipeId(null); window.scrollTo(0, 0) }}
      />
    )
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'recipes', label: 'Recipes', icon: '🍳' },
    { key: 'plan',    label: 'Plan',    icon: '📅' },
    { key: 'grocery', label: 'Grocery', icon: '🛒' },
  ]

  return (
    <div style={{ maxWidth: 430, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px 10px', position: 'sticky', top: 0, zIndex: 100, background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 10, background: 'linear-gradient(145deg,#E8734A,#B84D22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🍳</div>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.4px' }}>Meal Bot</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: '8px 16px', position: 'sticky', top: 53, zIndex: 99, background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); window.scrollTo(0, 0) }}
            style={{ flex: 1, padding: '8px 4px', fontSize: 11, fontWeight: tab === t.key ? 600 : 500, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', textTransform: 'uppercase', color: tab === t.key ? ACC : 'var(--text-muted)', borderRadius: 10, background: tab === t.key ? 'rgba(232,115,74,0.1)' : 'transparent', border: tab === t.key ? '1px solid rgba(232,115,74,0.2)' : '1px solid transparent', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}
          >
            <span>{t.icon}</span> <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div>
        {tab === 'recipes' && (
          <RecipeList onSelectRecipe={viewRecipe} />
        )}
        {tab === 'plan' && (
          <MealPlan
            plan={plan}
            planLoaded={planLoaded}
            onPlanChange={p => setPlan(p)}
            onConfirmed={() => { setTab('grocery'); window.scrollTo(0, 0) }}
            onViewRecipe={viewRecipe}
          />
        )}
        {tab === 'grocery' && <GroceryList plan={plan} />}
      </div>
    </div>
  )
}
