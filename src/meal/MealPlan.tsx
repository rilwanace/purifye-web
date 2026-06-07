import { useState, useRef } from 'react'
import { meal } from './mealApi'
import type { MealPlan as MealPlanType, PlanSlot, PlanDay, ComboData, Recipe } from './mealApi'

const ACC = '#E8734A'
const PLAN_ACC = '#5DCAA5'
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SLOT_ORDER = ['breakfast', 'lunch', 'dinner', 'dessert']
const PROTEIN_COLORS: Record<string, string> = {
  chicken: '#5DCAA5', beef: '#E86B3A', fish: '#6BB4E8',
  egg: '#D4A843', eggs: '#D4A843', vegetarian: '#82C27A', lamb: '#CF5BA0',
}

interface SwapRec extends Recipe { swap_reason?: string }

// ── Morning Prep Card ──────────────────────────────────────────────────────
function MorningPrepCard({
  combo, dayKey, checkedMap, setCheckedMap, isOpen, toggleOpen,
}: {
  combo: ComboData
  dayKey: string
  checkedMap: Record<string, boolean[]>
  setCheckedMap: React.Dispatch<React.SetStateAction<Record<string, boolean[]>>>
  isOpen: boolean
  toggleOpen: () => void
}) {
  const steps = combo.batch_prep_steps || []
  const checked = checkedMap[dayKey] || steps.map(() => false)

  const toggleStep = (idx: number) => {
    setCheckedMap(prev => {
      const cur = prev[dayKey] || steps.map(() => false)
      const next = [...cur]
      next[idx] = !next[idx]
      return { ...prev, [dayKey]: next }
    })
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <button
        onClick={toggleOpen}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>&#9728;</span>
          <span style={{ color: PLAN_ACC, fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 700 }}>
            Morning Prep ({combo.batch_prep_time_min} min)
          </span>
        </div>
        <span style={{
          color: 'rgba(255,255,255,0.4)', fontSize: 14,
          display: 'inline-block',
          transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: 'transform 0.2s ease',
        }}>&#9660;</span>
      </button>

      <div style={{ maxHeight: isOpen ? 1200 : 0, overflow: 'hidden', transition: 'max-height 0.2s ease' }}>
        <div style={{ padding: '0 16px 16px' }}>
          {combo.theme && (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-sans)', marginBottom: 12, fontStyle: 'italic' }}>
              &ldquo;{combo.theme}&rdquo;
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {steps.map((step, idx) => (
              <button
                key={idx}
                onClick={() => toggleStep(idx)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
              >
                <span style={{ fontSize: 18, lineHeight: 1.3, color: checked[idx] ? PLAN_ACC : 'rgba(255,255,255,0.35)', flexShrink: 0 }}>
                  {checked[idx] ? '☑' : '☐'}
                </span>
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontSize: 14, fontFamily: 'var(--font-sans)', lineHeight: 1.45,
                    color: checked[idx] ? 'rgba(255,255,255,0.35)' : 'var(--text-primary)',
                    textDecoration: checked[idx] ? 'line-through' : 'none',
                  }}>
                    {step.instruction}
                  </span>
                  {step.time_minutes > 0 && (
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-sans)', marginLeft: 6 }}>
                      ({step.time_minutes} min)
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
          {combo.shared_ingredients && combo.shared_ingredients.length > 0 && (
            <div style={{ marginTop: 14, fontSize: 12, fontFamily: 'var(--font-sans)' }}>
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>Shared: </span>
              <span style={{ color: 'var(--text-primary)' }}>{combo.shared_ingredients.join(', ')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────
function isComboIntact(dayData: PlanDay): boolean {
  const nonDessert = dayData.slots.filter(m => m.meal_slot !== 'dessert')
  if (nonDessert.length === 0) return false
  const comboIds = new Set(nonDessert.map(m => m.combo_id))
  return comboIds.size === 1 && !comboIds.has(null) && nonDessert.length === 3
}

// ── Main component ─────────────────────────────────────────────────────────
interface Props {
  plan: MealPlanType | null
  planLoaded: boolean
  onPlanChange: (p: MealPlanType) => void
  onConfirmed: () => void
  onViewRecipe?: (recipeId: string, elevationNote?: string | null) => void
}

export default function MealPlan({ plan, planLoaded, onPlanChange, onConfirmed, onViewRecipe }: Props) {
  const [loading, setLoading] = useState(false)
  const [activeDay, setActiveDay] = useState(0)

  const [swapModal, setSwapModal] = useState<{ slot: PlanSlot } | null>(null)
  const [swapRecs, setSwapRecs] = useState<SwapRec[]>([])
  const [swapAll, setSwapAll] = useState<Recipe[]>([])
  const [swapSearch, setSwapSearch] = useState('')
  const [swapLoading, setSwapLoading] = useState(false)
  const [lockingSlotId, setLockingSlotId] = useState<string | null>(null)

  const [prepCheckedMap, setPrepCheckedMap] = useState<Record<string, boolean[]>>({})
  const [prepOpenMap, setPrepOpenMap] = useState<Record<string, boolean>>({})

  const [dessertPicker, setDessertPicker] = useState<{ dayNumber: number } | null>(null)
  const [dessertRecs, setDessertRecs] = useState<Recipe[]>([])
  const [dessertLoading, setDessertLoading] = useState(false)

  const touchStartX = useRef<number | null>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggeredRef = useRef(false)

  const openSwap = async (slot: PlanSlot) => {
    if (slot.is_locked || !plan) return
    setSwapModal({ slot })
    setSwapSearch('')
    setSwapLoading(true)
    try {
      if (slot.recipe_id) {
        const data = await meal.slotRecommendations(plan.id, slot.id)
        setSwapRecs(data.recommended)
        setSwapAll(data.all)
      } else {
        const fallback = await meal.recipes({ meal_slot: slot.meal_slot })
        setSwapRecs([])
        setSwapAll(fallback)
      }
    } catch {
      const fallback = await meal.recipes({ meal_slot: slot.meal_slot })
      setSwapRecs([])
      setSwapAll(fallback.filter(r => r.id !== slot.recipe_id))
    }
    setSwapLoading(false)
  }

  const handleSwap = async (newRecipeId: string | null) => {
    if (!plan || !swapModal) return
    try {
      const updated = await meal.swapSlot(plan.id, swapModal.slot.id, newRecipeId)
      onPlanChange(updated)
      setSwapModal(null)
    } catch {}
  }

  const handleLock = async (slotId: string, e: React.MouseEvent) => {
    e.stopPropagation()
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
      if (newPlan) { onPlanChange(newPlan); setActiveDay(0) }
    } catch {}
    setLoading(false)
  }

  const handleRegenerate = async () => {
    if (!plan) return
    setLoading(true)
    try {
      const updated = await meal.regeneratePlan(plan.id)
      if (updated) { onPlanChange(updated); setActiveDay(0) }
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

  const openDessertPicker = async (dayNumber: number) => {
    setDessertPicker({ dayNumber })
    setDessertLoading(true)
    try {
      const recs = await meal.recipes({ meal_slot: 'dessert' })
      setDessertRecs(recs)
    } catch {}
    setDessertLoading(false)
  }

  const handleAddDessert = async (recipeId: string) => {
    if (!plan || !dessertPicker) return
    try {
      const updated = await meal.addDessert(plan.id, dessertPicker.dayNumber, recipeId)
      onPlanChange(updated)
      setDessertPicker(null)
    } catch {}
  }

  const handleSlotTouchStart = (slot: PlanSlot) => {
    if (slot.is_locked) return
    longPressTriggeredRef.current = false
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true
      openSwap(slot)
    }, 500)
  }

  const handleSlotTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleSlotClick = (slot: PlanSlot) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false
      return
    }
    if (slot.is_locked) return
    if (!slot.recipe_id) {
      openSwap(slot)
      return
    }
    onViewRecipe?.(slot.recipe_id, slot.elevation_note)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const onTouchEnd = (e: React.TouchEvent, dayCount: number) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < 50) return
    if (dx < 0) setActiveDay(d => Math.min(d + 1, dayCount - 1))
    else setActiveDay(d => Math.max(d - 1, 0))
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
        <div style={{ fontSize: 52, marginBottom: 16 }}>&#10024;</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.3px', fontFamily: 'var(--font-sans)' }}>
          Generate weekly plan
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 280, fontFamily: 'var(--font-sans)' }}>
          Get an intelligent 7-day meal plan with batch prep optimization
        </p>
        <button onClick={handleGenerate} style={{ width: '100%', maxWidth: 280, height: 48, borderRadius: 12, background: ACC, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px', fontFamily: 'var(--font-sans)' }}>
          &#10024; Generate weekly plan
        </button>
      </div>
    )
  }

  const weekStart = new Date(plan.week_start_date + 'T00:00:00')
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const dayCount = plan.days.length
  const safeDay = Math.min(activeDay, dayCount - 1)
  const currentDayData = plan.days[safeDay]
  const filteredAll = swapAll.filter(r =>
    !swapSearch || r.name.toLowerCase().includes(swapSearch.toLowerCase())
  )

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ padding: '12px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px', fontFamily: 'var(--font-sans)' }}>This week</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              {fmtDate(weekStart)} &mdash; {fmtDate(weekEnd)} &middot; {plan.family_adults}A + {plan.family_kids}K
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 20, fontFamily: 'var(--font-mono)', background: plan.status === 'confirmed' ? 'rgba(93,202,165,0.15)' : 'rgba(212,168,67,0.15)', color: plan.status === 'confirmed' ? '#5DCAA5' : '#D4A843' }}>
              {plan.status}
            </span>
            <button onClick={handleRegenerate} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              &#10024; Regenerate
            </button>
          </div>
        </div>
        {/* Day pills */}
        <div style={{ display: 'flex', gap: 6, padding: '0 12px 10px', overflowX: 'auto' }}>
          {plan.days.map((dayItem, idx) => {
            const isActive = idx === safeDay
            return (
              <button key={dayItem.day} onClick={() => setActiveDay(idx)} style={{ flexShrink: 0, minWidth: 44, height: 32, borderRadius: 16, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: isActive ? 700 : 500, fontFamily: 'var(--font-mono)', background: isActive ? ACC : 'var(--bg-card)', color: isActive ? '#fff' : 'var(--text-muted)', transition: 'background 0.15s' }}>
                {DAY_SHORT[(dayItem.day - 1) % 7]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Day content */}
      <div onTouchStart={onTouchStart} onTouchEnd={e => onTouchEnd(e, dayCount)} style={{ padding: '12px 12px 0' }}>
        {currentDayData && (() => {
          const sortedSlots = [...currentDayData.slots].sort((a, b) => SLOT_ORDER.indexOf(a.meal_slot) - SLOT_ORDER.indexOf(b.meal_slot))
          const totalPrep = currentDayData.slots.reduce((s, sl) => s + (sl.prep_time_min || 0), 0)
          const totalCook = currentDayData.slots.reduce((s, sl) => s + (sl.cook_time_min || 0), 0)
          const dayKey = `day-${currentDayData.day}`
          const comboIntact = isComboIntact(currentDayData)
          const isPrepOpen = prepOpenMap[dayKey] === true
          const hasDessert = sortedSlots.some(s => s.meal_slot === 'dessert')
          const isWeekday = currentDayData.day <= 5

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Meal slots */}
              {sortedSlots.map(slot => {
                // Task D: No Food slot
                if (!slot.recipe_id) {
                  return (
                    <div
                      key={slot.id}
                      onClick={() => openSwap(slot)}
                      onTouchStart={() => handleSlotTouchStart(slot)}
                      onTouchEnd={handleSlotTouchEnd}
                      onTouchCancel={handleSlotTouchEnd}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, height: 72, background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px dashed rgba(255,255,255,0.15)', cursor: 'pointer', padding: '0 16px', userSelect: 'none' }}
                    >
                      <span style={{ fontSize: 22 }}>&#128683;</span>
                      <div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-sans)', fontWeight: 500, textTransform: 'capitalize' }}>
                          {slot.meal_slot}: No Food
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-sans)', marginTop: 2 }}>
                          Tap to add a meal
                        </div>
                      </div>
                    </div>
                  )
                }

                const pc = PROTEIN_COLORS[(slot.protein_type || '').toLowerCase()] || '#888'
                const isDessert = slot.meal_slot === 'dessert'
                return (
                  <div
                    key={slot.id}
                    onClick={() => handleSlotClick(slot)}
                    onTouchStart={() => handleSlotTouchStart(slot)}
                    onTouchEnd={handleSlotTouchEnd}
                    onTouchCancel={handleSlotTouchEnd}
                    onContextMenu={e => e.preventDefault()}
                    style={{ display: 'flex', flexDirection: 'row', height: 100, background: 'var(--bg-card)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', cursor: slot.is_locked ? 'default' : 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ position: 'relative', width: 100, height: '100%', flexShrink: 0, overflow: 'hidden' }}>
                      {slot.image_url ? (
                        <img src={slot.image_url} alt={slot.recipe_name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: isDessert ? 'linear-gradient(135deg,rgba(112,104,217,0.3),rgba(112,104,217,0.6))' : `linear-gradient(135deg,${pc}33,${pc}66)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                          {isDessert ? '&#127856;' : slot.meal_slot === 'breakfast' ? '&#127749;' : '&#127869;&#65039;'}
                        </div>
                      )}
                      <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: '2px 5px', fontSize: 8, fontFamily: 'var(--font-mono)', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {slot.meal_slot}
                      </div>
                      <button onClick={e => handleLock(slot.id, e)} disabled={lockingSlotId === slot.id} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 4, cursor: 'pointer', padding: '2px 4px', fontSize: 11, lineHeight: 1, opacity: slot.is_locked ? 1 : 0.65 }}>
                        {slot.is_locked ? '&#128274;' : '&#128275;'}
                      </button>
                    </div>
                    <div style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden', gap: 2, position: 'relative' }}>
                      {!slot.is_locked && (
                        <button
                          onClick={e => { e.stopPropagation(); openSwap(slot) }}
                          title="Swap recipe"
                          style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '2px 5px', fontSize: 11, color: 'rgba(255,255,255,0.3)', cursor: 'pointer', lineHeight: 1, fontFamily: 'var(--font-mono)' }}
                        >&#8644;</button>
                      )}
                      <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, fontFamily: 'var(--font-sans)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                        {slot.recipe_name}
                      </div>
                      {/* Task B: Elevation subtitle */}
                      {slot.elevation_note && (
                        <div style={{ fontSize: 12, fontStyle: 'italic', color: PLAN_ACC, fontFamily: 'var(--font-sans)', lineHeight: 1.2 }}>
                          with {slot.elevation_note}
                        </div>
                      )}
                      {!slot.elevation_note && slot.description && (
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontFamily: 'var(--font-sans)' }}>{slot.description}</div>
                      )}
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginTop: 2 }}>
                        {slot.batch_prep_friendly && <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', background: 'rgba(232,115,74,0.15)', color: '#E8734A', padding: '2px 6px', borderRadius: 6 }}>batch</span>}
                        {slot.kid_friendly && <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', background: 'rgba(93,202,165,0.15)', color: '#5DCAA5', padding: '2px 6px', borderRadius: 6 }}>kid</span>}
                        {((slot.prep_time_min || 0) + (slot.cook_time_min || 0)) <= 20 && <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 6 }}>quick</span>}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Morning prep card — below all meals, collapsed by default */}
              {comboIntact && currentDayData.combo && (
                <MorningPrepCard
                  combo={currentDayData.combo}
                  dayKey={dayKey}
                  checkedMap={prepCheckedMap}
                  setCheckedMap={setPrepCheckedMap}
                  isOpen={isPrepOpen}
                  toggleOpen={() => setPrepOpenMap(prev => ({ ...prev, [dayKey]: !isPrepOpen }))}
                />
              )}

              {/* Task C: Add Dessert (weekdays only, when no dessert slot) */}
              {isWeekday && !hasDessert && (
                <button
                  onClick={() => openDessertPicker(currentDayData.day)}
                  style={{ width: '100%', padding: '10px 0', background: 'none', border: 'none', borderBottom: '1px dashed rgba(93,202,165,0.3)', cursor: 'pointer', fontSize: 13, color: PLAN_ACC, fontFamily: 'var(--font-sans)', textAlign: 'center' }}
                >
                  &#65291; Add Dessert
                </button>
              )}

              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', paddingBottom: 4 }}>
                Total prep: {totalPrep}min &middot; Cook: {totalCook}min
              </div>
            </div>
          )
        })()}
      </div>

      {/* Confirm bar */}
      <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, padding: '0 16px', zIndex: 90, boxSizing: 'border-box' }}>
        {plan.status === 'draft' ? (
          <button onClick={handleConfirm} style={{ width: '100%', height: 48, borderRadius: 12, background: ACC, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px', fontFamily: 'var(--font-sans)', boxShadow: '0 4px 16px rgba(232,115,74,0.35)' }}>
            &#10003; Confirm Plan
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'var(--bg-primary)', borderRadius: 12, padding: '10px 16px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: '#5DCAA5', fontFamily: 'var(--font-sans)' }}>Plan confirmed &#10003;</span>
            <button onClick={handleGenerate} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
              New plan
            </button>
          </div>
        )}
      </div>

      {/* Swap modal */}
      {swapModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }} onClick={() => setSwapModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: '16px 16px 0 0', padding: '20px 16px 40px', maxHeight: '80vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto' }} />
            <div>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                {swapModal.slot.recipe_id ? 'Swapping' : 'Add meal for'}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-sans)', textTransform: 'capitalize' }}>
                {swapModal.slot.recipe_name || swapModal.slot.meal_slot}
              </div>
            </div>

            {swapLoading ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>Loading recommendations...</div>
            ) : (
              <>
                {/* Task D: No Food option — only for slots that currently have a recipe */}
                {swapModal.slot.recipe_id && (
                  <>
                    <button
                      onClick={() => handleSwap(null)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                    >
                      <span style={{ fontSize: 18 }}>&#128683;</span>
                      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-sans)' }}>No Food for this slot</span>
                    </button>
                    <div style={{ height: 1, background: 'var(--border)' }} />
                  </>
                )}

                {swapRecs.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)' }}>Recommended swaps</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {swapRecs.map(r => {
                        const pc = PROTEIN_COLORS[(r.protein_type || '').toLowerCase()] || '#888'
                        return (
                          <button key={r.id} onClick={() => handleSwap(r.id)} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', alignItems: 'center' }}>
                            {r.image_url ? (
                              <img src={r.image_url} alt={r.name} style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 60, height: 60, borderRadius: 8, background: pc + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>&#127869;&#65039;</div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)', marginBottom: 2 }}>{r.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 4 }}>{r.swap_reason}</div>
                              <div style={{ display: 'flex', gap: 5 }}>
                                {r.protein_type && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: pc + '22', color: pc, fontFamily: 'var(--font-mono)' }}>{r.protein_type}</span>}
                                <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{(r.prep_time_min || 0) + (r.cook_time_min || 0)}m</span>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {swapRecs.length > 0 && <div style={{ height: 1, background: 'var(--border)' }} />}

                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)' }}>All options</div>
                  <input value={swapSearch} onChange={e => setSwapSearch(e.target.value)} placeholder="Search recipes..." style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', marginBottom: 8, boxSizing: 'border-box', outline: 'none' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {filteredAll.map(r => {
                      const pc = PROTEIN_COLORS[(r.protein_type || '').toLowerCase()] || '#888'
                      return (
                        <button key={r.id} onClick={() => handleSwap(r.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--bg-surface)', borderRadius: 9, border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>{r.name}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            {r.protein_type && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, background: pc + '22', color: pc, fontFamily: 'var(--font-mono)' }}>{r.protein_type}</span>}
                            <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{(r.prep_time_min || 0) + (r.cook_time_min || 0)}m</span>
                          </div>
                        </button>
                      )
                    })}
                    {filteredAll.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '16px 0', textAlign: 'center', fontFamily: 'var(--font-sans)' }}>No matches</div>}
                  </div>
                </div>
              </>
            )}
            <button onClick={() => setSwapModal(null)} style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Task C: Dessert picker modal */}
      {dessertPicker && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }} onClick={() => setDessertPicker(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: '16px 16px 0 0', padding: '20px 16px 40px', maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto' }} />
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-sans)' }}>Pick a Dessert</div>
            {dessertLoading ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>Loading desserts...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dessertRecs.map(r => (
                  <button key={r.id} onClick={() => handleAddDessert(r.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left' }}>
                    {r.image_url ? (
                      <img src={r.image_url} alt={r.name} style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 56, height: 56, borderRadius: 8, background: 'rgba(112,104,217,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>&#127856;</div>
                    )}
                    <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>{r.name}</div>
                  </button>
                ))}
                {dessertRecs.length === 0 && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '16px 0', textAlign: 'center', fontFamily: 'var(--font-sans)' }}>No dessert recipes available</div>
                )}
              </div>
            )}
            <button onClick={() => setDessertPicker(null)} style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
