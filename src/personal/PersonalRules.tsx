import { useEffect, useState } from 'react'
import { api } from '../api'

const ACCENT = '#5B8DEF'

interface Rule {
  id: string
  name: string
  workflow: string
  rule_type: string
  condition: Record<string, unknown>
  action: string
  active: boolean
}

const WF_COLOR: Record<string, string> = {
  money: '#5DCAA5', documents: '#7068D9', tasks: '#D4A843', notes: '#CF5BA0',
}

const TEMPLATES = [
  { label: 'Alert if spending exceeds limit', rule_type: 'threshold_sum', workflow: 'money', params: [{ key: 'category', label: 'Category', default: 'food' }, { key: 'value', label: 'Limit amount', default: '50000' }], condition: (p: Record<string, string>) => ({ rule_type: 'threshold_sum', field: 'amount', filter: { category: p.category, direction: 'out' }, period: 'current_month', operator: 'greater_than', value: Number(p.value) }) },
  { label: 'Remind before document expires', rule_type: 'date_reminder', workflow: 'documents', params: [{ key: 'days_before', label: 'Days before', default: '7' }], condition: (p: Record<string, string>) => ({ rule_type: 'date_reminder', date_field: 'expiry_date', days_before: Number(p.days_before) }) },
  { label: 'Warn before recurring payments', rule_type: 'recurring_due', workflow: 'money', params: [{ key: 'days_before', label: 'Days before', default: '3' }], condition: (p: Record<string, string>) => ({ rule_type: 'recurring_due', days_before: Number(p.days_before) }) },
  { label: 'Alert when tasks are overdue', rule_type: 'overdue_check', workflow: 'tasks', params: [], condition: () => ({ rule_type: 'overdue_check', status: 'pending' }) },
  { label: 'Weekly spending summary', rule_type: 'summary', workflow: 'money', params: [{ key: 'day', label: 'Day of week', default: 'sunday' }], condition: (p: Record<string, string>) => ({ rule_type: 'summary', schedule: 'weekly', day: p.day, content: 'spending' }) },
  { label: 'Alert if no log in X days', rule_type: 'missing_log', workflow: 'notes', params: [{ key: 'days', label: 'Days of silence', default: '7' }, { key: 'category', label: 'Category (optional)', default: '' }], condition: (p: Record<string, string>) => ({ rule_type: 'missing_log', filter: p.category ? { category: p.category } : {}, days: Number(p.days) }) },
  { label: 'Alert if habit streak breaks', rule_type: 'streak_break', workflow: 'tasks', params: [{ key: 'max_gap_days', label: 'Max gap (days)', default: '2' }], condition: (p: Record<string, string>) => ({ rule_type: 'streak_break', max_gap_days: Number(p.max_gap_days) }) },
]

function AddRuleSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [step, setStep] = useState<'template' | 'params'>('template')
  const [selected, setSelected] = useState<typeof TEMPLATES[0] | null>(null)
  const [params, setParams] = useState<Record<string, string>>({})
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  function selectTemplate(t: typeof TEMPLATES[0]) {
    setSelected(t)
    setName(t.label)
    const defaults: Record<string, string> = {}
    t.params.forEach(p => { defaults[p.key] = p.default })
    setParams(defaults)
    setStep('params')
  }

  async function save() {
    if (!selected) return
    setSaving(true)
    try {
      await api('/api/personal/rules', {
        method: 'POST',
        body: JSON.stringify({
          name,
          workflow: selected.workflow,
          rule_type: selected.rule_type,
          condition: selected.condition(params),
          action: 'both',
          active: true,
        }),
      })
      onSaved()
      onClose()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ flex: 1, background: 'rgba(0,0,0,0.6)' }} />
      <div style={{ background: '#1a1a18', borderRadius: '18px 18px 0 0', padding: '20px', maxHeight: '80dvh', overflowY: 'auto', animation: 'slideUp 0.3s ease' }}>
        <div style={{ width: 32, height: 3, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 16px' }} />
        {step === 'template' ? (
          <>
            <div style={{ fontSize: 14, fontFamily: 'DM Sans', fontWeight: 600, color: '#e8e7e0', marginBottom: 14 }}>Choose a rule template</div>
            {TEMPLATES.map((t, i) => (
              <button key={i} onClick={() => selectTemplate(t)}
                style={{ width: '100%', background: '#212120', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px', marginBottom: 8, textAlign: 'left', cursor: 'pointer' }}>
                <div style={{ fontSize: 13, fontFamily: 'DM Sans', fontWeight: 500, color: '#e8e7e0' }}>{t.label}</div>
                <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: WF_COLOR[t.workflow] || ACCENT, marginTop: 3 }}>{t.workflow.toUpperCase()}</div>
              </button>
            ))}
          </>
        ) : (
          <>
            <button onClick={() => setStep('template')} style={{ background: 'none', border: 'none', color: '#9c9b95', cursor: 'pointer', fontSize: 13, marginBottom: 12 }}>← Back</button>
            <div style={{ fontSize: 14, fontFamily: 'DM Sans', fontWeight: 600, color: '#e8e7e0', marginBottom: 14 }}>Configure rule</div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#6a6a64', display: 'block', marginBottom: 6 }}>RULE NAME</label>
              <input value={name} onChange={e => setName(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', background: '#2a2a28', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'DM Sans', color: '#e8e7e0', outline: 'none' }} />
            </div>
            {selected?.params.map(p => (
              <div key={p.key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#6a6a64', display: 'block', marginBottom: 6 }}>{p.label.toUpperCase()}</label>
                <input value={params[p.key] || ''} onChange={e => setParams(pr => ({ ...pr, [p.key]: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box', background: '#2a2a28', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'DM Sans', color: '#e8e7e0', outline: 'none' }} />
              </div>
            ))}
            <button onClick={save} disabled={saving || !name.trim()}
              style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans', fontWeight: 600, color: '#fff', background: `linear-gradient(135deg, ${ACCENT}, #3A63B8)`, marginTop: 8, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : 'Activate Rule'}
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
    </div>
  )
}

export default function PersonalRules() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)

  function load() {
    setLoading(true)
    api<Rule[]>('/api/personal/rules')
      .then(setRules)
      .catch(() => setRules([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function toggle(rule: Rule) {
    setToggling(rule.id)
    try {
      await api(`/api/personal/rules/${rule.id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !rule.active }),
      })
      load()
    } catch {
      // ignore
    } finally {
      setToggling(null)
    }
  }

  async function deleteRule(id: string) {
    try {
      await api(`/api/personal/rules/${id}`, { method: 'DELETE' })
      load()
    } catch {
      // ignore
    }
  }

  const activeCount = rules.filter(r => r.active).length
  const cost = activeCount === 0 ? 0 : 3 + (activeCount - 1)

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* Header */}
      <div style={{ background: '#1a1a18', borderRadius: 14, padding: '14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, fontFamily: 'DM Sans', fontWeight: 600, color: '#e8e7e0' }}>{activeCount} active rule{activeCount !== 1 ? 's' : ''}</div>
          <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#6a6a64', marginTop: 2 }}>7-day free trial • then ${cost}/mo</div>
        </div>
        <div style={{ fontSize: 22, fontFamily: 'DM Mono', fontWeight: 500, color: ACCENT }}>${cost}</div>
      </div>

      {/* Rules list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
          <div style={{ width: 20, height: 20, border: `2px solid ${ACCENT}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : (
        <>
          {rules.map(rule => (
            <div key={rule.id} style={{
              background: '#1a1a18', border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: 10, padding: '12px 14px', marginBottom: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1, marginRight: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 9, fontFamily: 'DM Mono', fontWeight: 700, background: `${WF_COLOR[rule.workflow] || ACCENT}1a`, color: WF_COLOR[rule.workflow] || ACCENT, borderRadius: 4, padding: '2px 6px' }}>
                      {rule.workflow.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, fontFamily: 'DM Sans', fontWeight: 500, color: '#e8e7e0' }}>{rule.name}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Toggle */}
                  <button
                    onClick={() => toggle(rule)}
                    disabled={toggling === rule.id}
                    style={{
                      width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                      background: rule.active ? ACCENT : 'rgba(255,255,255,0.12)',
                      position: 'relative', transition: 'background 0.2s',
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 3, left: rule.active ? 21 : 3,
                      width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s',
                    }} />
                  </button>
                  {/* Delete */}
                  <button onClick={() => deleteRule(rule.id)}
                    style={{ background: 'none', border: 'none', color: '#6a6a64', cursor: 'pointer', fontSize: 16, padding: '2px 4px' }}>
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add rule button */}
          <button onClick={() => setShowAdd(true)}
            style={{
              width: '100%', padding: '13px', borderRadius: 12, cursor: 'pointer',
              background: 'transparent', border: `1.5px dashed rgba(91,141,239,0.3)`,
              fontSize: 13, fontFamily: 'DM Sans', fontWeight: 500, color: ACCENT,
              marginTop: 4,
            }}>
            + Add a rule {rules.length > 0 ? `(+$1/mo)` : `($3/mo after trial)`}
          </button>
        </>
      )}

      {showAdd && <AddRuleSheet onClose={() => setShowAdd(false)} onSaved={load} />}
    </div>
  )
}
