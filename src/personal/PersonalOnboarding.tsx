import { useState } from 'react'
import { api } from '../api'

const ACCENT = '#5B8DEF'

const PAIN_POINTS = [
  { id: 'receipts', label: 'I keep losing receipts' },
  { id: 'health', label: 'I forget health checkups' },
  { id: 'documents', label: "I can never find documents" },
  { id: 'dates', label: 'I miss important dates' },
  { id: 'spending', label: "I overspend without realizing" },
  { id: 'schedules', label: 'Kids schedules overwhelm me' },
  { id: 'renewals', label: 'I forget service renewal dates' },
]

const RULE_TEMPLATES = [
  { id: 'spending_limit', pain: 'spending', name: 'Monthly spending alert', desc: 'Alert when spending exceeds your limit', rule: { name: 'Monthly spending alert', workflow: 'money', rule_type: 'threshold_sum', condition: { rule_type: 'threshold_sum', field: 'amount', filter: { direction: 'out' }, period: 'current_month', operator: 'greater_than', value: 100000 }, action: 'both' } },
  { id: 'doc_expiry', pain: 'documents', name: 'Document expiry reminder', desc: '7 days before any document expires', rule: { name: 'Document expiry reminder', workflow: 'documents', rule_type: 'date_reminder', condition: { rule_type: 'date_reminder', date_field: 'expiry_date', days_before: 7 }, action: 'both' } },
  { id: 'receipts_log', pain: 'receipts', name: 'Receipt logging reminder', desc: 'Alert if no expense logged in 3 days', rule: { name: 'Receipt logging reminder', workflow: 'money', rule_type: 'missing_log', condition: { rule_type: 'missing_log', filter: {}, days: 3 }, action: 'push' } },
  { id: 'health_reminder', pain: 'health', name: 'Health checkup reminder', desc: 'Alert if no health log in 7 days', rule: { name: 'Health checkup reminder', workflow: 'money', rule_type: 'missing_log', condition: { rule_type: 'missing_log', filter: { category: 'health' }, days: 7 }, action: 'both' } },
  { id: 'overdue', pain: 'dates', name: 'Overdue task alert', desc: 'Alert when tasks pass their due date', rule: { name: 'Overdue task alert', workflow: 'tasks', rule_type: 'overdue_check', condition: { rule_type: 'overdue_check', status: 'pending' }, action: 'both' } },
  { id: 'renewals_due', pain: 'renewals', name: 'Renewal reminder', desc: '3 days before any recurring payment', rule: { name: 'Renewal reminder', workflow: 'money', rule_type: 'recurring_due', condition: { rule_type: 'recurring_due', days_before: 3 }, action: 'both' } },
  { id: 'weekly_summary', pain: 'spending', name: 'Weekly spending summary', desc: 'Summary every Sunday', rule: { name: 'Weekly spending summary', workflow: 'money', rule_type: 'summary', condition: { rule_type: 'summary', schedule: 'weekly', day: 'sunday', content: 'spending' }, action: 'push' } },
]

const PREVIEW_MESSAGES: Record<string, { title: string; messages: string[] }> = {
  receipts: { title: 'Receipt tracker', messages: ['Spent 850 at Keells · food · today', 'Your weekly food spend: 4,200', 'No expense logged in 3 days — snap a receipt'] },
  health: { title: 'Health tracker', messages: ['Blood pressure logged: 120/80', 'No health checkup logged in 7 days', 'Doctor visit due in 2 weeks'] },
  documents: { title: 'Document vault', messages: ['Passport expires in 7 days', 'Insurance policy stored', 'Warranty for Samsung TV: expires Dec 2026'] },
  dates: { title: 'Task manager', messages: ['School fee payment — due tomorrow', '3 overdue tasks need attention', 'Kids swimming class — today 4pm'] },
  spending: { title: 'Spending bot', messages: ['Monthly spend: 45,000 of 100,000 limit', 'Weekly summary: Spent 12,400 (6 transactions)', 'Alert: food spending hit 15,000 this month'] },
  schedules: { title: 'Family planner', messages: ['Kids swimming class — today 4pm', '2 tasks due this week', "Birthday: Amani's — in 3 days"] },
  renewals: { title: 'Renewal tracker', messages: ['Netflix — 1,500 due in 3 days', 'Dialog bill — 4,200 due next week', 'Car insurance expires in 30 days'] },
}

export default function PersonalOnboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [botName, setBotName] = useState('My Bot')
  const [previewPain, setPreviewPain] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const selectedRules = RULE_TEMPLATES.filter(t => selected.includes(t.pain))
  const cost = selectedRules.length === 0 ? 0 : 3 + (selectedRules.length - 1)

  function togglePain(id: string) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  async function activate() {
    setSaving(true)
    try {
      for (const rule of selectedRules) {
        await api('/api/personal/rules', {
          method: 'POST',
          body: JSON.stringify({ ...rule.rule, active: true }),
        })
      }
      onDone()
    } catch (err) {
      console.error('[personal] onboarding rule save error', err)
      onDone()
    } finally {
      setSaving(false)
    }
  }

  const STEPS = ['Pain points', 'Your rules', 'Preview', 'Activate']

  return (
    <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100dvh', background: '#131311', display: 'flex', flexDirection: 'column' }}>
      {/* Progress */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? ACCENT : 'rgba(255,255,255,0.1)' }} />
          ))}
        </div>
        <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#6a6a64', letterSpacing: '0.1em', marginBottom: 6 }}>STEP {step + 1} OF {STEPS.length}</div>
        <div style={{ fontSize: 18, fontFamily: 'DM Sans', fontWeight: 700, color: '#e8e7e0', marginBottom: 4 }}>{STEPS[step]}</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 100px' }}>
        {/* Step 0: Pain points */}
        {step === 0 && (
          <>
            <div style={{ fontSize: 13, fontFamily: 'DM Sans', color: '#9c9b95', marginBottom: 20 }}>
              What's eating your time? Choose what applies to you.
            </div>
            {PAIN_POINTS.map(p => (
              <button
                key={p.id}
                onClick={() => togglePain(p.id)}
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 12, marginBottom: 8,
                  border: selected.includes(p.id) ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.08)',
                  background: selected.includes(p.id) ? `${ACCENT}12` : '#1a1a18',
                  color: selected.includes(p.id) ? '#e8e7e0' : '#c4c3bc',
                  fontFamily: 'DM Sans', fontSize: 14, fontWeight: 500,
                  textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                {p.label}
                {selected.includes(p.id) && <span style={{ color: ACCENT, fontSize: 16 }}>✓</span>}
              </button>
            ))}
          </>
        )}

        {/* Step 1: Rules builder */}
        {step === 1 && (
          <>
            <div style={{ fontSize: 13, fontFamily: 'DM Sans', color: '#9c9b95', marginBottom: 20 }}>
              Based on your choices, here are the automations we'll set up:
            </div>
            {selectedRules.length === 0 && (
              <div style={{ fontSize: 12, fontFamily: 'DM Sans', color: '#6a6a64', textAlign: 'center', paddingTop: 20 }}>
                Go back and select at least one concern to generate rules.
              </div>
            )}
            {selectedRules.map(rule => (
              <div key={rule.id} style={{ background: '#1a1a18', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: '14px 16px', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontFamily: 'DM Sans', fontWeight: 600, color: '#e8e7e0', marginBottom: 4 }}>{rule.name}</div>
                <div style={{ fontSize: 11, fontFamily: 'DM Sans', color: '#9c9b95' }}>{rule.desc}</div>
                <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: ACCENT, marginTop: 6 }}>
                  {rule.rule.workflow.toUpperCase()} · {rule.rule.action === 'both' ? 'push + briefing' : rule.rule.action}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Step 2: Preview */}
        {step === 2 && (
          <>
            <div style={{ fontSize: 13, fontFamily: 'DM Sans', color: '#9c9b95', marginBottom: 16 }}>
              Here's how your bot will work:
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {selected.map(p => (
                <button key={p} onClick={() => setPreviewPain(p)}
                  style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, fontFamily: 'DM Mono', fontWeight: 600, border: previewPain === p ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.08)', background: previewPain === p ? `${ACCENT}1a` : 'transparent', color: previewPain === p ? ACCENT : '#9c9b95', cursor: 'pointer' }}>
                  {PAIN_POINTS.find(x => x.id === p)?.label.split(' ').slice(0, 2).join(' ')}
                </button>
              ))}
            </div>
            {(previewPain || selected[0]) && (() => {
              const pain = previewPain || selected[0]
              const preview = PREVIEW_MESSAGES[pain]
              return preview ? (
                <div style={{ background: '#1a1a18', borderRadius: 14, padding: '16px' }}>
                  <div style={{ fontSize: 10, fontFamily: 'DM Mono', fontWeight: 700, color: ACCENT, letterSpacing: '0.08em', marginBottom: 12 }}>{preview.title.toUpperCase()}</div>
                  {preview.messages.map((msg, i) => (
                    <div key={i} style={{ background: '#212120', borderRadius: 10, padding: '10px 14px', marginBottom: 8, fontSize: 12, fontFamily: 'DM Sans', color: '#c4c3bc', animation: `fadeIn 0.4s ${i * 0.15}s both ease` }}>
                      {msg}
                    </div>
                  ))}
                </div>
              ) : null
            })()}
          </>
        )}

        {/* Step 3: Activate */}
        {step === 3 && (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#6a6a64', display: 'block', marginBottom: 8 }}>GIVE YOUR BOT A NAME</label>
              <input
                value={botName}
                onChange={e => setBotName(e.target.value)}
                placeholder="My Bot"
                style={{ width: '100%', boxSizing: 'border-box', background: '#2a2a28', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px', fontSize: 15, fontFamily: 'DM Sans', color: '#e8e7e0', outline: 'none' }}
              />
            </div>
            <div style={{ background: '#1a1a18', borderRadius: 14, padding: '16px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontFamily: 'DM Sans', color: '#9c9b95' }}>{selectedRules.length} rule{selectedRules.length !== 1 ? 's' : ''} selected</span>
                <span style={{ fontSize: 13, fontFamily: 'DM Mono', fontWeight: 500, color: ACCENT }}>${cost}/mo after trial</span>
              </div>
              <div style={{ fontSize: 11, fontFamily: 'DM Sans', color: '#6a6a64' }}>7-day free trial — cancel anytime</div>
            </div>
          </>
        )}
      </div>

      {/* Footer nav */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, padding: '16px 20px', background: '#131311', borderTop: '1px solid rgba(255,255,255,0.06)', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#9c9b95', fontFamily: 'DM Sans', fontSize: 13, cursor: 'pointer' }}>
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={step === 0 && selected.length === 0}
              style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${ACCENT}, #3A63B8)`, color: '#fff', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (step === 0 && selected.length === 0) ? 0.4 : 1 }}>
              Continue
            </button>
          ) : (
            <button onClick={activate} disabled={saving}
              style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${ACCENT}, #3A63B8)`, color: '#fff', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Setting up...' : `Bring ${botName} to life`}
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }`}</style>
    </div>
  )
}
