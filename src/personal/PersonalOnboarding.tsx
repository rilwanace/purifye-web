import { useState } from 'react'
import { api } from '../api'
import { RuleFlowchartBuilder, buildSentence } from './PersonalRules'
import type { RuleOptions, FlowValues } from './PersonalRules'

const ACCENT = '#5B8DEF'
const BG_CARD = '#1a1a18'
const BG_SURFACE = '#212120'
const TEXT_PRIMARY = '#e8e7e0'
const TEXT_SECONDARY = '#c4c3bc'
const TEXT_MUTED = '#6a6a64'
const BORDER = 'rgba(255,255,255,0.06)'

const PAIN_POINTS = [
  { id: 'receipts', label: 'I keep losing receipts' },
  { id: 'health', label: 'I forget health checkups' },
  { id: 'documents', label: "I can never find documents" },
  { id: 'dates', label: 'I miss important dates' },
  { id: 'spending', label: "I overspend without realizing" },
  { id: 'schedules', label: 'Kids schedules overwhelm me' },
  { id: 'renewals', label: 'I forget service renewal dates' },
]

const PREVIEW_MESSAGES: Record<string, { title: string; messages: string[] }> = {
  receipts: {
    title: 'Expense tracker',
    messages: ['Spent 850 at Keells · food · today', 'Your weekly food spend: 4,200', 'Receipt saved and logged'],
  },
  health: {
    title: 'Health tracker',
    messages: ['Blood pressure logged: 120/80', 'Doctor visit due in 2 weeks', 'Health habit streak: 7 days'],
  },
  documents: {
    title: 'Document vault',
    messages: ['Passport expires in 7 days', 'Insurance policy stored', 'Warranty for Samsung TV: expires Dec 2026'],
  },
  dates: {
    title: 'Task manager',
    messages: ['School fee payment — due tomorrow', '3 overdue tasks need attention', 'Kids swimming class — today 4pm'],
  },
  spending: {
    title: 'Spending bot',
    messages: ['Monthly spend: 45,000 of 100,000 limit', 'Weekly summary: Spent 12,400', 'Alert: food spending hit 15,000 this month'],
  },
  schedules: {
    title: 'Family planner',
    messages: ['Kids swimming class — today 4pm', '2 tasks due this week', "Birthday: Amani's — in 3 days"],
  },
  renewals: {
    title: 'Renewal tracker',
    messages: ['Netflix — 1,500 due in 3 days', 'Dialog bill — 4,200 due next week', 'Car insurance expires in 30 days'],
  },
}

const EMPTY_OPTS: RuleOptions = {
  money_categories: [],
  recurring_vendors: [],
  doc_threads: [],
  habits: [],
}

export default function PersonalOnboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [botName, setBotName] = useState('My Bot')
  const [previewPain, setPreviewPain] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Rule builder state for step 1
  const [opts] = useState<RuleOptions>(EMPTY_OPTS)
  const [addedRules, setAddedRules] = useState<string[]>([])
  const [builderKey, setBuilderKey] = useState(0)  // increment to reset builder
  const [buildingMore, setBuildingMore] = useState(false)

  const STEPS = ['Pain points', 'Build your rule', 'Preview', 'Activate']

  function togglePain(id: string) {
    setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))
  }

  async function handleRuleSave(v: FlowValues, name: string) {
    // Build the condition
    const condMap: Record<string, unknown> = {}
    switch (v.path) {
      case 'spending':
        Object.assign(condMap, {
          workflow: 'money',
          rule_type: 'threshold_sum',
          condition: {
            rule_type: 'threshold_sum',
            field: 'amount',
            filter: { category: v.category ?? null, direction: 'out' },
            period: v.period === 'per week' ? 'week' : v.period === 'per year' ? 'year' : 'month',
            operator: '>',
            value: v.amount,
          },
        })
        break
      case 'bill':
        Object.assign(condMap, {
          workflow: 'money',
          rule_type: 'recurring_due',
          condition: {
            rule_type: 'recurring_due',
            days_before: v.billDays,
            filter: { vendor_or_person: v.vendor ?? null },
          },
        })
        break
      case 'document':
        Object.assign(condMap, {
          workflow: 'documents',
          rule_type: 'date_reminder',
          condition: {
            rule_type: 'date_reminder',
            date_field: 'expiry_date',
            days_before: v.docDays,
            filter: { thread_id: v.threadId ?? null },
          },
        })
        break
      case 'habit':
        Object.assign(condMap, {
          workflow: 'tasks',
          rule_type: 'streak_break',
          condition: {
            rule_type: 'streak_break',
            max_gap_days: v.habitDays,
            filter: { task_id: v.habitId ?? null },
          },
        })
        break
      case 'summary':
        Object.assign(condMap, {
          workflow: 'all',
          rule_type: 'summary',
          condition: {
            rule_type: 'summary',
            schedule: v.frequency === 'Weekly' ? 'weekly' : 'monthly',
            day: v.day,
            content: v.content ?? ['money', 'documents', 'tasks', 'notes'],
          },
        })
        break
    }

    await api('/api/personal/rules', {
      method: 'POST',
      body: JSON.stringify({ name, ...condMap, action: 'push', active: true }),
    })

    const sentence = buildSentence(v) || name
    setAddedRules(r => [...r, sentence])
    setBuildingMore(false)
    setBuilderKey(k => k + 1)
  }

  async function activate() {
    setSaving(true)
    try {
      onDone()
    } catch {
      onDone()
    } finally {
      setSaving(false)
    }
  }

  const canAdvanceStep1 = addedRules.length > 0
  const showingBuilder = addedRules.length === 0 || buildingMore

  return (
    <div
      style={{
        maxWidth: 430,
        margin: '0 auto',
        minHeight: '100dvh',
        background: '#131311',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Progress */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: i <= step ? ACCENT : 'rgba(255,255,255,0.1)',
              }}
            />
          ))}
        </div>
        <div
          style={{
            fontSize: 9,
            fontFamily: 'DM Mono',
            color: TEXT_MUTED,
            letterSpacing: '0.1em',
            marginBottom: 6,
          }}
        >
          STEP {step + 1} OF {STEPS.length}
        </div>
        <div
          style={{
            fontSize: 18,
            fontFamily: 'DM Sans',
            fontWeight: 700,
            color: TEXT_PRIMARY,
            marginBottom: 4,
          }}
        >
          {STEPS[step]}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>
        {/* Step 0: Pain points */}
        {step === 0 && (
          <div style={{ padding: '16px 20px' }}>
            <div
              style={{
                fontSize: 13,
                fontFamily: 'DM Sans',
                color: TEXT_SECONDARY,
                marginBottom: 20,
              }}
            >
              What's eating your time? Choose what applies to you.
            </div>
            {PAIN_POINTS.map(p => (
              <button
                key={p.id}
                onClick={() => togglePain(p.id)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 12,
                  marginBottom: 8,
                  border: selected.includes(p.id)
                    ? `1px solid ${ACCENT}`
                    : `1px solid ${BORDER}`,
                  background: selected.includes(p.id) ? `${ACCENT}12` : BG_CARD,
                  color: selected.includes(p.id) ? TEXT_PRIMARY : TEXT_SECONDARY,
                  fontFamily: 'DM Sans',
                  fontSize: 14,
                  fontWeight: 500,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  minHeight: 44,
                }}
              >
                {p.label}
                {selected.includes(p.id) && (
                  <span style={{ color: ACCENT, fontSize: 16 }}>✓</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Step 1: Rule builder */}
        {step === 1 && (
          <>
            {/* Added rules list */}
            {addedRules.length > 0 && (
              <div style={{ padding: '16px 20px 0' }}>
                {addedRules.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      background: BG_CARD,
                      border: `1px solid rgba(93,202,165,0.25)`,
                      borderRadius: 10,
                      padding: '12px 14px',
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                    }}
                  >
                    <span style={{ color: '#5DCAA5', fontSize: 14, marginTop: 1, flexShrink: 0 }}>✓</span>
                    <span
                      style={{
                        fontSize: 13,
                        fontFamily: 'DM Sans',
                        color: TEXT_PRIMARY,
                        lineHeight: 1.45,
                      }}
                    >
                      {s}
                    </span>
                  </div>
                ))}
                {!buildingMore && (
                  <button
                    onClick={() => setBuildingMore(true)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: 10,
                      border: `1.5px dashed rgba(91,141,239,0.3)`,
                      background: 'transparent',
                      color: ACCENT,
                      fontFamily: 'DM Sans',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      marginTop: 4,
                    }}
                  >
                    + Add another rule
                  </button>
                )}
              </div>
            )}

            {/* Builder */}
            {showingBuilder && (
              <>
                {addedRules.length === 0 && (
                  <div style={{ padding: '12px 20px 0' }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontFamily: 'DM Sans',
                        color: TEXT_SECONDARY,
                      }}
                    >
                      Build your first rule by tapping through the options below.
                    </div>
                  </div>
                )}
                <RuleFlowchartBuilder
                  key={builderKey}
                  opts={opts}
                  onSave={handleRuleSave}
                  onCancel={() => {
                    if (addedRules.length > 0) setBuildingMore(false)
                  }}
                  saveLabel="Add Rule"
                />
              </>
            )}
          </>
        )}

        {/* Step 2: Preview */}
        {step === 2 && (
          <div style={{ padding: '16px 20px' }}>
            <div
              style={{
                fontSize: 13,
                fontFamily: 'DM Sans',
                color: TEXT_SECONDARY,
                marginBottom: 16,
              }}
            >
              Here's how your bot will keep you on track:
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {selected.map(p => (
                <button
                  key={p}
                  onClick={() => setPreviewPain(p)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontFamily: 'DM Mono',
                    fontWeight: 600,
                    border:
                      previewPain === p
                        ? `1px solid ${ACCENT}`
                        : `1px solid ${BORDER}`,
                    background: previewPain === p ? `${ACCENT}1a` : 'transparent',
                    color: previewPain === p ? ACCENT : TEXT_MUTED,
                    cursor: 'pointer',
                  }}
                >
                  {PAIN_POINTS.find(x => x.id === p)?.label.split(' ').slice(0, 2).join(' ')}
                </button>
              ))}
            </div>
            {(() => {
              const pain = previewPain ?? selected[0]
              const preview = pain ? PREVIEW_MESSAGES[pain] : null
              if (!preview) {
                return (
                  <div
                    style={{
                      background: BG_CARD,
                      borderRadius: 14,
                      padding: '16px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontFamily: 'DM Mono',
                        fontWeight: 700,
                        color: ACCENT,
                        letterSpacing: '0.08em',
                        marginBottom: 12,
                      }}
                    >
                      YOUR PERSONAL BOT
                    </div>
                    {['Rules active — staying on top of things', 'Alerts sent when limits are hit', 'Morning briefing at 7:05 AM'].map(
                      (msg, i) => (
                        <div
                          key={i}
                          style={{
                            background: BG_SURFACE,
                            borderRadius: 10,
                            padding: '10px 14px',
                            marginBottom: 8,
                            fontSize: 12,
                            fontFamily: 'DM Sans',
                            color: TEXT_SECONDARY,
                          }}
                        >
                          {msg}
                        </div>
                      ),
                    )}
                  </div>
                )
              }
              return (
                <div style={{ background: BG_CARD, borderRadius: 14, padding: '16px' }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: 'DM Mono',
                      fontWeight: 700,
                      color: ACCENT,
                      letterSpacing: '0.08em',
                      marginBottom: 12,
                    }}
                  >
                    {preview.title.toUpperCase()}
                  </div>
                  {preview.messages.map((msg, i) => (
                    <div
                      key={i}
                      style={{
                        background: BG_SURFACE,
                        borderRadius: 10,
                        padding: '10px 14px',
                        marginBottom: 8,
                        fontSize: 12,
                        fontFamily: 'DM Sans',
                        color: TEXT_SECONDARY,
                      }}
                    >
                      {msg}
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        )}

        {/* Step 3: Activate */}
        {step === 3 && (
          <div style={{ padding: '16px 20px' }}>
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  fontSize: 10,
                  fontFamily: 'DM Mono',
                  color: TEXT_MUTED,
                  display: 'block',
                  marginBottom: 8,
                }}
              >
                GIVE YOUR BOT A NAME
              </label>
              <input
                value={botName}
                onChange={e => setBotName(e.target.value)}
                placeholder="My Bot"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#2a2a28',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: '12px 14px',
                  fontSize: 15,
                  fontFamily: 'DM Sans',
                  color: TEXT_PRIMARY,
                  outline: 'none',
                }}
              />
            </div>
            <div
              style={{
                background: BG_CARD,
                borderRadius: 14,
                padding: '16px',
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 13, fontFamily: 'DM Sans', color: TEXT_SECONDARY }}>
                  {addedRules.length} rule{addedRules.length !== 1 ? 's' : ''} set up
                </span>
                <span
                  style={{ fontSize: 13, fontFamily: 'DM Mono', fontWeight: 500, color: ACCENT }}
                >
                  ${addedRules.length === 0 ? 0 : 3 + (addedRules.length - 1)}/mo after trial
                </span>
              </div>
              <div style={{ fontSize: 11, fontFamily: 'DM Sans', color: TEXT_MUTED }}>
                7-day free trial — cancel anytime
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 430,
          padding: '16px 20px',
          background: '#131311',
          borderTop: `1px solid ${BORDER}`,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', gap: 10 }}>
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{
                flex: 1,
                padding: '13px',
                borderRadius: 12,
                border: `1px solid ${BORDER}`,
                background: 'transparent',
                color: TEXT_MUTED,
                fontFamily: 'DM Sans',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={
                (step === 0 && selected.length === 0) ||
                (step === 1 && !canAdvanceStep1)
              }
              style={{
                flex: 2,
                padding: '13px',
                borderRadius: 12,
                border: 'none',
                background: `linear-gradient(135deg, ${ACCENT}, #3A63B8)`,
                color: '#fff',
                fontFamily: 'DM Sans',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                opacity:
                  (step === 0 && selected.length === 0) ||
                  (step === 1 && !canAdvanceStep1)
                    ? 0.4
                    : 1,
              }}
            >
              Continue
            </button>
          ) : (
            <button
              onClick={activate}
              disabled={saving}
              style={{
                flex: 2,
                padding: '13px',
                borderRadius: 12,
                border: 'none',
                background: `linear-gradient(135deg, ${ACCENT}, #3A63B8)`,
                color: '#fff',
                fontFamily: 'DM Sans',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Setting up...' : `Bring ${botName} to life`}
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }`}</style>
    </div>
  )
}
