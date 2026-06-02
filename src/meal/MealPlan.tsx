import { useState } from 'react'
import { meal } from './mealApi'
import type { MealPlan as MealPlanType, PlanSlot, Recipe } from './mealApi'

const ACC = '#E8734A'
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const SLOT_ORDER = ['breakfast', 'lunch', 'dinner', 'dessert']
const PROTEIN_COLORS: Record<string, string> = {
  chicken: '#5DCAA5', beef: '#E86B3A', fish: '#6BB4E8',
  egg: '#D4A843', eggs: '#D4A843', vegetarian: '#82C27A', lamb: '#CF5BA0',
}

function getDominantProtein(slots: PlanSlot[]): string | null {
  const main = slots.filter(s => s.meal_slot === 'lunch' || s.meal_slot === 'dinner')
  if (!main.length) return null
  const counts: Record<string, number> = {}
  for (const s of main) counts[s.protein_type || ''] = (counts[s.protein_type || ''] || 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null
}

function generatePrepNote(day: { slots: PlanSlot[]; batch_prep_notes: string[] }): string {
  const batchSlots = day.slots.filter(s => s.batch_prep_friendly)
  if (!batchSlots.length) return 'No morning prep needed — all quick-cook today.'
  const totalMin = batchSlots.reduce((sum, s) => sum + (s.prep_time_min || 0), 0)
  const notes = (day.batch_prep_notes || []).filter(Boolean)
  if (!notes.length) return `Morning ${totalMin}min of batch prep.`
  return `Morning ${totalMin}min: ${notes.join('. ')}.`
}

interface Props {
  plan: MealPlanType | null
  planLoaded: boolean
  onPlanChange: (p: MealPlanType) => void
  onConfirmed: () => void
}

export default function MealPlan({ plan, planLoaded, onPlanChange, onConfirmed }: Props) {
  const [loading, setLoading] = useState(false)
  const [swapModal, setSwapModal] = useState<{ slotId: string; dayNumber: number; mealSlot: string; currentRecipeName: string } | null>(null)
  const [swapCandidates, setSwapCandidates] = useState<Recipe[]>([])
  const [swapLoading, setSwapLoading] = useState(false)
  const [lockingSlotId, setLockingSlotId] = useState<string | null>(null)

  const openSwap = async (slot: PlanSlot) => {
    if (slot.is_locked) return
    setSwapModal({ slotId: slot.id, dayNumber: slot.day_number, mealSlot: slot.meal_slot, currentRecipeName: slot.recipe_name })
    setSwapLoading(true)
    try {
      const recipes = await meal.recipes({ meal_slot: slot.meal_slot })
      setSwapCandidates(recipes.filter(r => r.id !== slot.recipe_id))
    } catch {}
    setSwapLoading(false)
  }

  const handleSwap = async (newRecipeId: string) => {
    if (!plan || !swapModal) return
    try {
      const updated = await meal.swapSlot(plan.id, swapModal.slotId, newRecipeId)
      onPlanChange(updated)
      setSwapModal(null)
    } catch {}
  }

  const handleLock = async (slotId: string) => {
    if (!plan) return
    setLockingSlotId(slotId)
    try {
      const updated = await meal.lockSlot(plan.id, slotId)
      onPlanChange(updated)
    } catch {}
    setLockingSlotId(null)
  }

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const newPlan = await meal.generatePlan()
      if (newPlan) onPlanChange(newPlan)
    } catch {}
    setLoading(false)
  }

  const handleRegenerate = async () => {
    if (!plan) return
    setLoading(true)
    try {
      const updated = await meal.regeneratePlan(plan.id)
      if (updated) onPlanChange(updated)
    } catch {}
    setLoading(false)
  }

  const handleConfirm = async () => {
    if (!plan) return
    setLoading(true)
    try {
      const confirmed = await meal.confirmPlan(plan.id)
      if (confirmed) { onPlanChange(confirmed); onConfirmed() }
    } catch {}
    setLoading(false)
  }

  if (!planLoaded || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          {loading ? 'Building your plan...' : 'Loading...'}
        </span>
      </div>
    )
  }

  if (!plan) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>✨</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.3px', fontFamily: 'var(--font-sans)' }}>
          Generate weekly plan
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 280, fontFamily: 'var(--font-sans)' }}>
          Get an intelligent 7-day meal plan with batch prep optimization
        </p>
        <button
          onClick={handleGenerate}
          style={{ width: '100%', maxWidth: 280, height: 48, borderRadius: 12, background: ACC, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px', fontFamily: 'var(--font-sans)' }}
        >
          ✨ Generate weekly plan
        </button>
      </div>
    )
  }

  const weekStart = new Date(plan.week_start_date + 'T00:00:00')
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div style={{ paddingBottom: 88 }}>
      <div style={{ padding: '12px 16px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px', fontFamily: 'var(--font-sans)' }}>This week</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            {fmtDate(weekStart)} — {fmtDate(weekEnd)} · {plan.family_adults}A + {plan.family_kids}K
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 20, fontFamily: 'var(--font-mono)', background: plan.status === 'confirmed' ? 'rgba(93,202,165,0.15)' : 'rgba(212,168,67,0.15)', color: plan.status === 'confirmed' ? '#5DCAA5' : '#D4A843' }}>
            {plan.status}
          </span>
          <button
            onClick={handleRegenerate}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
          >
            ✨ Regenerate
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 12px' }}>
        {plan.days.map(day => {
          const dayName = DAY_NAMES[(day.day - 1) % 7]
          const dominant = getDominantProtein(day.slots)
          const pColor = dominant ? (PROTEIN_COLORS[dominant.toLowerCase()] || '#888') : '#888'
          const prepNote = generatePrepNote(day)
          const sortedSlots = [...day.slots].sort((a, b) => SLOT_ORDER.indexOf(a.meal_slot) - SLOT_ORDER.indexOf(b.meal_slot))
          const hasDessert = day.slots.some(s => s.meal_slot === 'dessert')

          return (
            <div key={day.day} style={{ background: 'var(--bg-card)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px 6px' }}>
                <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '-0.2px', fontFamily: 'var(--font-sans)' }}>{dayName}</span>
                {dominant && (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: `${pColor}22`, color: pColor, fontFamily: 'var(--font-mono)' }}>
                    {dominant}
                  </span>
                )}
              </div>


              <div style={{ display: 'flex', gap: 6, padding: '0 12px 8px', overflowX: 'auto' }}>
                {sortedSlots.map(slot => {
                  const isDessert = slot.meal_slot === 'dessert'
                  const isLocked = slot.is_locked
                  const cardW = hasDessert ? 96 : 116
                  return (
                    <div key={slot.id} onClick={() => !isLocked && openSwap(slot)} style={{ minWidth: cardW, flexShrink: 0, background: isDessert ? 'rgba(112,104,217,0.1)' : isLocked ? 'rgba(255,255,255,0.05)' : 'var(--bg-surface)', borderRadius: 8, padding: '7px 8px', cursor: isLocked ? 'default' : 'pointer', border: isLocked ? '1px solid rgba(232,115,74,0.3)' : '1px solid transparent', position: 'relative' }}>
                      <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                        {slot.meal_slot}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, marginBottom: 3, overflow: 'hidden', maxHeight: '2.6em', fontFamily: 'var(--font-sans)' }}>
                        {slot.recipe_name}
                      </div>
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 4 }}>
                        {slot.batch_prep_friendly && <span style={{ fontSize: 7, fontFamily: 'var(--font-mono)', background: 'rgba(232,115,74,0.15)', color: '#E8734A', padding: '1px 5px', borderRadius: 6 }}>batch</span>}
                        {slot.kid_friendly && <span style={{ fontSize: 7, fontFamily: 'var(--font-mono)', background: 'rgba(93,202,165,0.15)', color: '#5DCAA5', padding: '1px 5px', borderRadius: 6 }}>kid</span>}
                        {((slot.prep_time_min || 0) + (slot.cook_time_min || 0)) <= 20 && <span style={{ fontSize: 7, fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', padding: '1px 5px', borderRadius: 6 }}>quick</span>}
                      </div>
                      <button onClick={e => { e.stopPropagation(); handleLock(slot.id) }} disabled={lockingSlotId === slot.id} style={{ position: 'absolute', top: 5, right: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: isLocked ? 1 : 0.25, fontSize: 10 }}>
                        {isLocked ? '🔒' : '🔓'}
                      </button>
                    </div>
                  )
                })}
              </div>
              <div style={{ margin: '0 12px 10px', padding: '7px 10px', background: 'var(--bg-surface)', borderRadius: 8, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, fontFamily: 'var(--font-sans)' }}>
                {prepNote}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ position: 'fixed', bottom: 64, left: 0, right: 0, padding: '10px 16px', background: 'var(--bg-primary)', borderTop: '1px solid var(--border)', zIndex: 90 }}>
        {plan.status === 'draft' ? (
          <button onClick={handleConfirm} style={{ width: '100%', height: 48, borderRadius: 12, background: '#E8734A', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px', fontFamily: 'var(--font-sans)' }}>
            ✓ Confirm Plan
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#5DCAA5', fontFamily: 'var(--font-sans)' }}>Plan confirmed ✓</span>
            <button onClick={handleGenerate} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
              New plan
            </button>
          </div>
        )}
      </div>

      {swapModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }} onClick={() => setSwapModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: '16px 16px 0 0', padding: '20px 16px 40px', maxHeight: '72vh', overflowY: 'auto' }}>
            <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 16px' }} />
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Current</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, fontFamily: 'var(--font-sans)' }}>{swapModal.currentRecipeName}</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, fontFamily: 'var(--font-sans)' }}>Swap to:</div>
            {swapLoading ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>Loading alternatives...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {swapCandidates.map(r => {
                  const pc = PROTEIN_COLORS[(r.protein_type || '').toLowerCase()] || '#888'
                  return (
                    <button key={r.id} onClick={() => handleSwap(r.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-sans)' }}>{(r.description || '').slice(0, 60)}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: pc + '22', color: pc, fontFamily: 'var(--font-mono)' }}>{r.protein_type}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{(r.prep_time_min || 0) + (r.cook_time_min || 0)}m</span>
                      </div>
                    </button>
                  )
                })}
                {swapCandidates.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center', fontFamily: 'var(--font-sans)' }}>No alternatives available</div>}
              </div>
            )}
            <button onClick={() => setSwapModal(null)} style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
