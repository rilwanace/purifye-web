import { useState, useEffect } from 'react'
import { meal } from './mealApi'
import type { RecipeDetail as RecipeDetailType } from './mealApi'
import CookingMode from './CookingMode'

interface Props {
  recipeId: string
  elevationNote?: string | null
  onBack: () => void
}

const PROTEIN_COLORS: Record<string, string> = {
  chicken: '#5DCAA5', beef: '#E86B3A', fish: '#6BB4E8',
  egg: '#D4A843', eggs: '#D4A843', vegetarian: '#82C27A', lamb: '#CF5BA0',
}

function proteinEmoji(pt: string): string {
  const p = (pt || '').toLowerCase()
  if (p === 'chicken') return '\u{1F414}'
  if (p === 'beef') return '\u{1F969}'
  if (p === 'fish') return '\u{1F41F}'
  if (p === 'egg' || p === 'eggs') return '\u{1F95A}'
  return '\u{1F37D}️'
}

function EffortDots({ level }: { level: number }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[1,2,3,4,5].map(n => (
        <div key={n} style={{ width: 6, height: 6, borderRadius: '50%', background: n <= level ? '#E8734A' : 'rgba(255,255,255,0.12)' }} />
      ))}
    </div>
  )
}

function BackBtn({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 13, padding: '8px 0' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m15 18-6-6 6-6"/>
      </svg>
      Back
    </button>
  )
}

export default function RecipeDetail({ recipeId, elevationNote, onBack }: Props) {
  const [recipe, setRecipe] = useState<RecipeDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'ingredients' | 'method'>('ingredients')
  const [cookingMode, setCookingMode] = useState(false)

  useEffect(() => {
    meal.recipeDetail(recipeId)
      .then(r => setRecipe(r))
      .catch(e => setError(e.message || 'Failed to load recipe'))
      .finally(() => setLoading(false))
  }, [recipeId])

  if (loading) {
    return (
      <div style={{ padding: '12px 16px' }}>
        <BackBtn onBack={onBack} />
        <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 20 }}>Loading recipe...</div>
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div style={{ padding: '12px 16px' }}>
        <BackBtn onBack={onBack} />
        <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 20 }}>{error || 'Recipe not found'}</div>
      </div>
    )
  }

  const pColor = PROTEIN_COLORS[(recipe.protein_type || '').toLowerCase()] || '#888'
  const totalTime = (recipe.prep_time_min || 0) + (recipe.cook_time_min || 0)
  const sortedSteps = [...(recipe.steps || [])].sort((a, b) => a.step_number - b.step_number)

  return (
    <div style={{ paddingBottom: 80 }}>
      {cookingMode && <CookingMode recipe={recipe} onClose={() => setCookingMode(false)} />}

      <div style={{ padding: '12px 16px 0' }}>
        <BackBtn onBack={onBack} />
      </div>

      {recipe.image_url ? (
        <img src={recipe.image_url} alt={recipe.name} style={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: 180, background: 'linear-gradient(135deg,' + pColor + '33,' + pColor + '66)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52 }}>
          {proteinEmoji(recipe.protein_type)}
        </div>
      )}

      <div style={{ padding: '16px 16px 0' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, letterSpacing: '-0.4px', lineHeight: 1.2 }}>{recipe.name}</h1>
        {elevationNote && (
          <div style={{ fontSize: 13, fontStyle: 'italic', color: '#5DCAA5', fontFamily: 'var(--font-sans)', marginBottom: 8 }}>with {elevationNote}</div>
        )}
        {recipe.description && (
          <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{recipe.description}</p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {recipe.protein_type && (
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: pColor + '22', color: pColor, fontFamily: 'var(--font-mono)' }}>{recipe.protein_type}</span>
          )}
          {recipe.cuisine && (
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{recipe.cuisine}</span>
          )}
          <EffortDots level={recipe.effort_level || 1} />
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{totalTime}m total</span>
        </div>

        <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: 'var(--bg-card)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {[{ val: recipe.prep_time_min || 0, unit: 'min prep' }, { val: recipe.cook_time_min || 0, unit: 'min cook' }, { val: recipe.base_servings || 4, unit: 'servings' }].map((m, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', padding: '14px 8px', borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{m.val}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{m.unit}</div>
            </div>
          ))}
        </div>

        {(recipe.equipment_required || []).length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {recipe.equipment_required.map(eq => (
              <span key={eq} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: 'var(--bg-surface)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{eq}</span>
            ))}
          </div>
        )}

        {recipe.dessert_formula && (
          <div style={{ marginBottom: 16, background: 'linear-gradient(135deg,rgba(212,168,67,0.12),rgba(212,168,67,0.06))', borderRadius: 12, padding: 16, border: '1px solid rgba(212,168,67,0.2)' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#D4A843', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Dessert Formula</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{recipe.dessert_formula.base}</div>
            {recipe.dessert_formula.elevators.map((e, i) => (
              <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 8, marginTop: 4 }}>+ {e}</div>
            ))}
          </div>
        )}
      </div>

      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)', display: 'flex', padding: '0 16px' }}>
        {(['ingredients', 'method'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ flex: 1, padding: '12px 4px', fontSize: 13, fontWeight: activeTab === tab ? 600 : 500, color: activeTab === tab ? '#E8734A' : 'var(--text-muted)', background: 'none', border: 'none', borderBottom: activeTab === tab ? '2px solid #E8734A' : '2px solid transparent', cursor: 'pointer', fontFamily: 'var(--font-sans)', textTransform: 'capitalize', letterSpacing: '-0.2px' }}
          >
            {tab === 'ingredients' ? 'Ingredients' : 'Method'}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {activeTab === 'ingredients' && (recipe.ingredients || []).length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recipe.ingredients.map(ing => (
                <div key={ing.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', background: 'var(--bg-card)', borderRadius: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#E8734A', minWidth: 72, flexShrink: 0 }}>{ing.quantity} {ing.unit}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13 }}>
                      {ing.name}
                      {ing.is_optional && <span style={{ color: 'var(--text-dim)', fontSize: 11, marginLeft: 6 }}>(optional)</span>}
                    </span>
                    {ing.is_premade_available && ing.premade_note && (
                      <div style={{ fontSize: 11, color: '#5DCAA5', marginTop: 2 }}>↳ {ing.premade_note}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'method' && sortedSteps.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sortedSteps.map(step => (
                <div key={step.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px', background: step.is_prep_step ? 'var(--bg-surface)' : 'var(--bg-card)', borderRadius: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: step.is_prep_step ? 'rgba(212,168,67,0.2)' : 'rgba(232,115,74,0.15)', color: step.is_prep_step ? '#D4A843' : '#E8734A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', flexShrink: 0, marginTop: 1 }}>
                    {step.step_number}
                  </div>
                  <div style={{ flex: 1 }}>
                    {step.is_prep_step && (
                      <span style={{ fontSize: 10, background: 'rgba(212,168,67,0.15)', color: '#D4A843', borderRadius: 8, padding: '2px 7px', fontFamily: 'var(--font-mono)', marginBottom: 6, display: 'inline-block' }}>🌅 morning prep</span>
                    )}
                    <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-primary)' }}>{step.instruction}</div>
                    {step.time_minutes > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>{step.time_minutes} min</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {recipe.batch_prep_friendly && recipe.batch_prep_notes && (
          <div style={{ marginBottom: 20, padding: 14, background: 'var(--bg-surface)', borderRadius: 10, borderLeft: '3px solid #E8734A' }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>⏰ Batch prep tip</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{recipe.batch_prep_notes}</div>
          </div>
        )}

        {recipe.source && (
          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textAlign: 'center', marginTop: 16, marginBottom: 16 }}>Recipe from {recipe.source}</div>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, padding: '0 16px', zIndex: 40, boxSizing: 'border-box' }}>
        <button
          onClick={() => setCookingMode(true)}
          style={{ width: '100%', height: 48, borderRadius: 12, background: '#E8734A', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px', fontFamily: 'var(--font-sans)' }}
        >
          👨‍🍳 Start Cooking
        </button>
      </div>
    </div>
  )
}
