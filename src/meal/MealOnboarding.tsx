import { useState } from 'react'
import { meal } from './mealApi'
import type { Preferences } from './mealApi'
import Button from '../shared/components/Button'
import { useToast } from '../shared/components/Toast'

const ACC = '#E8734A'

const EQUIPMENT = [
  { id: 'stovetop', label: 'Stovetop', required: true },
  { id: 'oven', label: 'Oven', required: false },
  { id: 'steamer', label: 'Steamer', required: false },
  { id: 'blender', label: 'Blender', required: false },
  { id: 'air_fryer', label: 'Air Fryer', required: false },
  { id: 'rice_cooker', label: 'Rice Cooker', required: false },
]

const PROTEINS = [
  { id: 'chicken', label: '\u{1F414} Chicken' },
  { id: 'beef', label: '\u{1F969} Beef' },
  { id: 'fish', label: '\u{1F41F} Fish' },
  { id: 'lamb', label: '\u{1F411} Lamb' },
  { id: 'eggs', label: '\u{1F95A} Eggs' },
]

interface Props {
  onComplete: (prefs: Preferences) => void
}

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: value ? ACC : 'var(--bg-surface)',
        border: '1px solid var(--border)',
        cursor: 'pointer', position: 'relative', flexShrink: 0,
        transition: 'background 0.2s',
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 2,
        left: value ? 22 : 2,
        transition: 'left 0.2s',
      }} />
    </button>
  )
}

export default function MealOnboarding({ onComplete }: Props) {
  const toast = useToast()
  const [step, setStep] = useState(1)
  const [adults, setAdults] = useState(2)
  const [kids, setKids] = useState(2)
  const [equipment, setEquipment] = useState<string[]>(['stovetop'])
  const [excludedProteins, setExcludedProteins] = useState<string[]>([])
  const [premiumIngredients, setPremiumIngredients] = useState(false)
  const [includeDessert, setIncludeDessert] = useState(true)
  const [saving, setSaving] = useState(false)

  function toggleEquipment(id: string) {
    if (id === 'stovetop') return
    setEquipment(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id])
  }

  function toggleProtein(id: string) {
    setExcludedProteins(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  async function finish() {
    setSaving(true)
    try {
      const data: Preferences = {
        family_adults: adults,
        family_kids: kids,
        equipment_available: equipment,
        excluded_proteins: excludedProteins,
        premium_ingredients: premiumIngredients,
        preferred_cuisines: [],
        plan_days: 7,
        include_dessert: includeDessert,
      }
      const saved = await meal.updatePreferences(data)
      onComplete(saved)
    } catch (e: any) {
      toast.show('Failed to save preferences', 'error')
    } finally {
      setSaving(false)
    }
  }

  const servings = adults + kids * 0.5

  const counterBtn = (onClick: () => void, symbol: string, accent: boolean) => (
    <button
      onClick={onClick}
      style={{
        width: 36, height: 36, borderRadius: '50%',
        background: accent ? ACC : 'var(--bg-surface)',
        border: accent ? 'none' : '1px solid var(--border)',
        fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: accent ? '#fff' : 'var(--text-primary)',
      }}
    >{symbol}</button>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '24px 20px 100px', maxWidth: 430, margin: '0 auto' }}>
      {/* Step dots */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 28 }}>
        {[1, 2, 3].map(n => (
          <div key={n} style={{
            width: n === step ? 24 : 8, height: 8, borderRadius: 4,
            background: n === step ? ACC : n < step ? 'rgba(232,115,74,0.4)' : 'rgba(255,255,255,0.1)',
            transition: 'all 0.3s',
          }} />
        ))}
      </div>

      {step === 1 && (
        <div>
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.4px' }}>
            Your family
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 24px', fontFamily: 'var(--font-sans)' }}>
            We will size recipe servings to fit your household.
          </p>

          <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, marginBottom: 16, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Adults</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Ages 12+</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {counterBtn(() => setAdults(a => Math.max(1, a - 1)), '−', false)}
                <span style={{ fontSize: 22, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{adults}</span>
                {counterBtn(() => setAdults(a => a + 1), '+', true)}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Kids</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Under 12</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {counterBtn(() => setKids(k => Math.max(0, k - 1)), '−', false)}
                <span style={{ fontSize: 22, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{kids}</span>
                {counterBtn(() => setKids(k => k + 1), '+', true)}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 28, fontFamily: 'var(--font-mono)' }}>
            {`That's ${servings} servings per meal`}
          </div>

          <Button style={{ width: '100%', height: 48, fontSize: 15 }} onClick={() => setStep(2)}>
            Next →
          </Button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.4px' }}>
            Your kitchen
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 24px', fontFamily: 'var(--font-sans)' }}>
            Select all the equipment you have available.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
            {EQUIPMENT.map(eq => {
              const active = equipment.includes(eq.id)
              return (
                <button
                  key={eq.id}
                  onClick={() => toggleEquipment(eq.id)}
                  style={{
                    padding: '9px 16px', borderRadius: 20, fontSize: 13,
                    fontWeight: 500, fontFamily: 'var(--font-sans)',
                    background: active ? ACC : 'var(--bg-surface)',
                    color: active ? '#fff' : 'var(--text-secondary)',
                    border: active ? 'none' : '1px solid var(--border)',
                    cursor: eq.required ? 'default' : 'pointer',
                  }}
                >
                  {eq.label}{eq.required ? ' ✓' : ''}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" style={{ flex: 1, height: 48 }} onClick={() => setStep(1)}>← Back</Button>
            <Button style={{ flex: 2, height: 48, fontSize: 15 }} onClick={() => setStep(3)}>Next →</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.4px' }}>
            Food preferences
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 24px', fontFamily: 'var(--font-sans)' }}>
            Tap a protein to exclude it from your meal plan.
          </p>

          <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>
              Proteins
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PROTEINS.map(p => {
                const excluded = excludedProteins.includes(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleProtein(p.id)}
                    style={{
                      padding: '8px 14px', borderRadius: 20, fontSize: 13,
                      fontFamily: 'var(--font-sans)', cursor: 'pointer',
                      background: excluded ? 'rgba(100,100,100,0.1)' : 'rgba(232,115,74,0.12)',
                      color: excluded ? 'var(--text-dim)' : ACC,
                      border: excluded ? '1px solid rgba(100,100,100,0.2)' : '1px solid rgba(232,115,74,0.25)',
                      textDecoration: excluded ? 'line-through' : 'none',
                      opacity: excluded ? 0.6 : 1,
                    }}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Premium ingredients</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Prawns and lamb cost more</div>
              </div>
              <Toggle value={premiumIngredients} onChange={() => setPremiumIngredients(v => !v)} />
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, marginBottom: 28, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Include dessert in daily plan</div>
              <Toggle value={includeDessert} onChange={() => setIncludeDessert(v => !v)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" style={{ flex: 1, height: 48 }} onClick={() => setStep(2)}>← Back</Button>
            <Button style={{ flex: 2, height: 48, fontSize: 15 }} onClick={finish} loading={saving}>
              Set up Meal Bot
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
