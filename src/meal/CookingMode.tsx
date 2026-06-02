import { useState, useEffect, useRef } from 'react'
import type { RecipeDetail } from './mealApi'

const ACC = '#E8734A'

interface WakeLockSentinel { release(): Promise<void> }

interface Props {
  recipe: RecipeDetail
  onClose: () => void
}

export default function CookingMode({ recipe, onClose }: Props) {
  const sortedSteps = [...(recipe.steps || [])].sort((a, b) => a.step_number - b.step_number)
  const [currentStep, setCurrentStep] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerFlash, setTimerFlash] = useState(false)
  const [showIngredients, setShowIngredients] = useState(false)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const step = sortedSteps[currentStep]
  const totalSteps = sortedSteps.length
  const progress = totalSteps > 0 ? (currentStep + 1) / totalSteps : 0

  useEffect(() => {
    const req = async () => {
      try {
        if ('wakeLock' in navigator)
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
      } catch {}
    }
    req()
    return () => { wakeLockRef.current?.release().catch(() => {}) }
  }, [])

  useEffect(() => {
    if (!timerRunning) return
    timerRef.current = setInterval(() => {
      setTimerSeconds(s => {
        if (s <= 1) {
          clearInterval(timerRef.current as any)
          setTimerRunning(false)
          setTimerFlash(true)
          setTimeout(() => setTimerFlash(false), 2000)
          try { (navigator as any).vibrate?.([200, 100, 200]) } catch {}
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current as any) }
  }, [timerRunning])

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current as any)
    setTimerRunning(false)
    setTimerSeconds((step?.time_minutes || 0) * 60)
  }, [currentStep])

  const goNext = () => {
    if (currentStep < totalSteps - 1) setCurrentStep(c => c + 1)
    else onClose()
  }
  const goPrev = () => { if (currentStep > 0) setCurrentStep(c => c - 1) }
  const startTimer = () => {
    if (timerSeconds === 0 && step?.time_minutes) setTimerSeconds(step.time_minutes * 60)
    setTimerRunning(true)
  }

  const mm = Math.floor(timerSeconds / 60).toString().padStart(2, '0')
  const ss2 = (timerSeconds % 60).toString().padStart(2, '0')

  if (!step) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: timerFlash ? '#E8734A' : 'var(--bg-primary)', display: 'flex', flexDirection: 'column', transition: 'background 0.3s' }}>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, background: ACC, transition: 'width 0.3s' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-secondary)', padding: '4px 0', fontFamily: 'var(--font-sans)' }}>
          ✕ Exit
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600, letterSpacing: '-0.3px', padding: '0 12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {recipe.name}
        </span>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', flexShrink: 0 }}>
          {currentStep + 1} of {totalSteps}
        </span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 24px 0', overflowY: 'auto' }}>
        {step.is_prep_step && (
          <div style={{ fontSize: 12, background: 'rgba(212,168,67,0.15)', color: '#D4A843', borderRadius: 20, padding: '4px 14px', marginBottom: 20, fontFamily: 'var(--font-mono)' }}>
            🌅 Morning prep step
          </div>
        )}
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${ACC}22`, border: `2px solid ${ACC}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: ACC, marginBottom: 24, flexShrink: 0 }}>
          {step.step_number}
        </div>
        <div style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.6, textAlign: 'center', color: 'var(--text-primary)', maxWidth: 340 }}>
          {step.instruction}
        </div>
        {step.time_minutes > 0 && (
          <div style={{ fontSize: 14, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 12 }}>
            {step.time_minutes} min
          </div>
        )}
        {step.time_minutes > 0 && (
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 40, fontFamily: 'var(--font-mono)', fontWeight: 700, color: timerRunning ? ACC : 'var(--text-secondary)' }}>
              {mm}:{ss2}
            </div>
            {!timerRunning ? (
              <button onClick={startTimer} style={{ background: `${ACC}22`, border: `1px solid ${ACC}`, borderRadius: 24, padding: '8px 24px', cursor: 'pointer', fontSize: 14, color: ACC, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
                Start timer
              </button>
            ) : (
              <button onClick={() => setTimerRunning(false)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 24, padding: '8px 24px', cursor: 'pointer', fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
                Pause
              </button>
            )}
          </div>
        )}
      </div>
      <div style={{ padding: '12px 16px 24px', display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={goPrev} disabled={currentStep === 0} style={{ flex: 1, height: 56, borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: currentStep === 0 ? 'not-allowed' : 'pointer', fontSize: 16, color: currentStep === 0 ? 'var(--text-dim)' : 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
          ← Previous
        </button>
        <button onClick={goNext} style={{ flex: 1, height: 56, borderRadius: 14, background: ACC, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-sans)' }}>
          {currentStep === totalSteps - 1 ? '✓ Done!' : 'Next →'}
        </button>
      </div>
      <button onClick={() => setShowIngredients(true)} style={{ position: 'fixed', bottom: 90, left: 16, zIndex: 510, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '8px 14px', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
        📝 Ingredients
      </button>
      {showIngredients && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 520, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }} onClick={() => setShowIngredients(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: '16px 16px 0 0', padding: '20px 16px 40px', maxHeight: '60vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 16px' }} />
              <div style={{ fontSize: 15, fontWeight: 600 }}>Ingredients</div>
            </div>
            {(recipe.ingredients || []).map(ing => (
              <div key={ing.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: ACC, minWidth: 80, flexShrink: 0 }}>{ing.quantity} {ing.unit}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 14 }}>{ing.name}</span>
                  {ing.is_optional && <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 6 }}>(optional)</span>}
                  {ing.is_premade_available && ing.premade_note && <div style={{ fontSize: 11, color: '#5DCAA5', marginTop: 2 }}>↳ {ing.premade_note}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
