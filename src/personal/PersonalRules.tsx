import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useToast } from '../shared/components/Toast'

const ACCENT = '#5B8DEF'
const BG_CARD = '#1a1a18'
const BG_SURFACE = '#212120'
const BG_INPUT = '#2a2a28'
const TEXT_PRIMARY = '#e8e7e0'
const TEXT_SECONDARY = '#c4c3bc'
const TEXT_MUTED = '#6a6a64'
const BORDER = 'rgba(255,255,255,0.06)'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Rule {
  id: string
  name: string
  workflow: string
  rule_type: string
  condition: Record<string, unknown>
  action: string
  active: boolean
}

export interface RuleOptions {
  money_categories: string[]
  recurring_vendors: string[]
  doc_threads: { id: string; name: string }[]
  habits: { id: string; description: string }[]
}

// ─── Flow state ───────────────────────────────────────────────────────────────
type PathKey = 'spending' | 'bill' | 'document' | 'habit' | 'summary'

export interface FlowValues {
  path?: PathKey
  category?: string | null
  amount?: number
  period?: string
  vendor?: string | null
  billDays?: number
  threadId?: string | null
  threadName?: string
  docDays?: number
  habitId?: string | null
  habitDesc?: string
  habitDays?: number
  frequency?: string
  day?: string | number
  content?: string[]
}

// ─── Sentence builder ─────────────────────────────────────────────────────────
export function buildSentence(v: FlowValues): string {
  switch (v.path) {
    case 'spending': {
      const amt = v.amount !== undefined ? v.amount.toLocaleString() : '___'
      const per = v.period ? v.period : '___'
      if (v.category === null || v.category === undefined)
        return `Remind me when my total spending exceeds ${amt} ${per}`
      return `Remind me when my spending on ${v.category} exceeds ${amt} ${per}`
    }
    case 'bill': {
      const days = v.billDays !== undefined ? v.billDays : '___'
      if (v.vendor === null || v.vendor === undefined)
        return `Remind me when any recurring payment is due within ${days} days`
      return `Remind me when ${v.vendor} is due within ${days} days`
    }
    case 'document': {
      const days = v.docDays !== undefined ? v.docDays : '___'
      if (v.threadId === null || v.threadId === undefined)
        return `Remind me when any document expires within ${days} days`
      return `Remind me when a ${v.threadName} document expires within ${days} days`
    }
    case 'habit': {
      const days = v.habitDays !== undefined ? v.habitDays : '___'
      if (v.habitId === null || v.habitId === undefined)
        return `Remind me when any habit is missed for ${days} days`
      return `Remind me when ${v.habitDesc} is missed for ${days} days`
    }
    case 'summary': {
      const freq = v.frequency || '___'
      const day = v.day !== undefined ? v.day : '___'
      const cnt = v.content
        ? v.content.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')
        : '___'
      return `Send me a ${freq.toLowerCase()} summary every ${day} of ${cnt}`
    }
    default:
      return ''
  }
}

// ─── Condition builder ────────────────────────────────────────────────────────
function buildCondition(v: FlowValues): {
  workflow: string
  rule_type: string
  condition: Record<string, unknown>
} {
  switch (v.path) {
    case 'spending':
      return {
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
      }
    case 'bill':
      return {
        workflow: 'money',
        rule_type: 'recurring_due',
        condition: {
          rule_type: 'recurring_due',
          days_before: v.billDays,
          filter: { vendor_or_person: v.vendor ?? null },
        },
      }
    case 'document':
      return {
        workflow: 'documents',
        rule_type: 'date_reminder',
        condition: {
          rule_type: 'date_reminder',
          date_field: 'expiry_date',
          days_before: v.docDays,
          filter: { thread_id: v.threadId ?? null },
        },
      }
    case 'habit':
      return {
        workflow: 'tasks',
        rule_type: 'streak_break',
        condition: {
          rule_type: 'streak_break',
          max_gap_days: v.habitDays,
          filter: { task_id: v.habitId ?? null },
        },
      }
    case 'summary':
      return {
        workflow: 'all',
        rule_type: 'summary',
        condition: {
          rule_type: 'summary',
          schedule: v.frequency === 'Weekly' ? 'weekly' : 'monthly',
          day: v.day,
          content: v.content ?? ['money', 'documents', 'tasks', 'notes'],
        },
      }
    default:
      return { workflow: 'money', rule_type: 'threshold_sum', condition: {} }
  }
}

// ─── Parse rule → FlowValues ──────────────────────────────────────────────────
export function parseRuleToFlow(rule: Rule, opts: RuleOptions): FlowValues {
  const c = rule.condition as Record<string, unknown>
  switch (rule.rule_type) {
    case 'threshold_sum': {
      const filter = (c.filter || {}) as Record<string, unknown>
      const periodMap: Record<string, string> = {
        week: 'per week', month: 'per month', year: 'per year',
        current_month: 'per month', current_week: 'per week',
      }
      return {
        path: 'spending',
        category: (filter.category as string | null) ?? null,
        amount: c.value as number,
        period: periodMap[c.period as string] ?? 'per month',
      }
    }
    case 'recurring_due': {
      const filter = (c.filter || {}) as Record<string, unknown>
      return {
        path: 'bill',
        vendor: (filter.vendor_or_person as string | null) ?? null,
        billDays: c.days_before as number,
      }
    }
    case 'date_reminder': {
      const filter = (c.filter || {}) as Record<string, unknown>
      const threadId = (filter.thread_id as string | null) ?? null
      const thread = threadId ? opts.doc_threads.find(t => t.id === threadId) : null
      return {
        path: 'document',
        threadId,
        threadName: thread?.name,
        docDays: c.days_before as number,
      }
    }
    case 'streak_break': {
      const filter = (c.filter || {}) as Record<string, unknown>
      const habitId = (filter.task_id as string | null) ?? null
      const habit = habitId ? opts.habits.find(h => h.id === habitId) : null
      return {
        path: 'habit',
        habitId,
        habitDesc: habit?.description,
        habitDays: c.max_gap_days as number,
      }
    }
    case 'summary': {
      const raw = c.content
      return {
        path: 'summary',
        frequency: c.schedule === 'weekly' ? 'Weekly' : 'Monthly',
        day: c.day as string | number,
        content: Array.isArray(raw)
          ? (raw as string[])
          : ['money', 'documents', 'tasks', 'notes'],
      }
    }
    default:
      return {}
  }
}

function isFlowComplete(v: FlowValues): boolean {
  switch (v.path) {
    case 'spending':
      return v.category !== undefined && v.amount !== undefined && v.period !== undefined
    case 'bill':
      return v.vendor !== undefined && v.billDays !== undefined
    case 'document':
      return v.threadId !== undefined && v.docDays !== undefined
    case 'habit':
      return v.habitId !== undefined && v.habitDays !== undefined
    case 'summary':
      return (
        v.frequency !== undefined &&
        v.day !== undefined &&
        (v.content ?? []).length > 0
      )
    default:
      return false
  }
}

// ─── UI primitives ────────────────────────────────────────────────────────────
function BottomSheet({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <div onClick={onClose} style={{ flex: 1, background: 'rgba(0,0,0,0.6)' }} />
      <div
        style={{
          background: BG_CARD,
          borderRadius: '18px 18px 0 0',
          padding: '20px',
          maxHeight: '75dvh',
          overflowY: 'auto',
          animation: 'slideUp 0.25s ease',
        }}
      >
        <div
          style={{
            width: 32,
            height: 3,
            background: BORDER,
            borderRadius: 2,
            margin: '0 auto 16px',
          }}
        />
        <div
          style={{
            fontSize: 13,
            fontFamily: 'DM Sans',
            fontWeight: 600,
            color: TEXT_PRIMARY,
            marginBottom: 14,
          }}
        >
          {title}
        </div>
        {children}
      </div>
    </div>
  )
}

function NumberInputSheet({
  title,
  value,
  onConfirm,
  onClose,
  min = 1,
  max = 9999999,
}: {
  title: string
  value?: number
  onConfirm: (n: number) => void
  onClose: () => void
  min?: number
  max?: number
}) {
  const [val, setVal] = useState<number>(value ?? min)
  const [raw, setRaw] = useState<string>(value !== undefined ? String(value) : String(min))

  function clamp(n: number) {
    const c = Math.max(min, Math.min(max, Math.round(n)))
    setVal(c)
    setRaw(String(c))
  }

  return (
    <BottomSheet title={title} onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => clamp(val - 1)}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            border: `1px solid ${BORDER}`,
            background: BG_SURFACE,
            color: TEXT_PRIMARY,
            fontSize: 22,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          −
        </button>
        <input
          type="number"
          value={raw}
          onChange={e => {
            setRaw(e.target.value)
            const n = parseFloat(e.target.value)
            if (!isNaN(n)) setVal(n)
          }}
          style={{
            flex: 1,
            background: BG_INPUT,
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: '12px',
            fontSize: 26,
            fontFamily: 'DM Mono',
            color: TEXT_PRIMARY,
            textAlign: 'center',
            outline: 'none',
          }}
        />
        <button
          onClick={() => clamp(val + 1)}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            border: `1px solid ${BORDER}`,
            background: BG_SURFACE,
            color: TEXT_PRIMARY,
            fontSize: 22,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          +
        </button>
      </div>
      <button
        onClick={() => {
          onConfirm(val)
          onClose()
        }}
        disabled={val < min}
        style={{
          width: '100%',
          padding: '13px',
          borderRadius: 12,
          border: 'none',
          background: `linear-gradient(135deg, ${ACCENT}, #3A63B8)`,
          color: '#fff',
          fontFamily: 'DM Sans',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          opacity: val < min ? 0.4 : 1,
        }}
      >
        Confirm
      </button>
    </BottomSheet>
  )
}

function NodePill({
  label,
  filled,
  auto,
  onClick,
}: {
  label: string
  filled: boolean
  auto?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={auto ? undefined : onClick}
      style={{
        minHeight: 44,
        padding: '8px 16px',
        borderRadius: 20,
        border: filled ? `1px solid ${BORDER}` : `1.5px dashed ${BORDER}`,
        background: filled ? BG_CARD : 'transparent',
        color: filled ? TEXT_PRIMARY : TEXT_MUTED,
        fontFamily: 'DM Sans',
        fontSize: 13,
        fontWeight: filled ? 500 : 400,
        cursor: auto ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}

function Connector({ active }: { active: boolean }) {
  return (
    <div
      style={{
        width: 16,
        height: 2,
        flexShrink: 0,
        background: active ? ACCENT : 'rgba(255,255,255,0.08)',
        transition: 'background 0.2s',
      }}
    />
  )
}

// ─── Flowchart builder ────────────────────────────────────────────────────────
type SheetOpen =
  | 'path'
  | 'category'
  | 'amount'
  | 'period'
  | 'vendor'
  | 'billDays'
  | 'thread'
  | 'docDays'
  | 'habit'
  | 'habitDays'
  | 'frequency'
  | 'day'
  | 'include'
  | null

const RESET_MAP: Record<string, string[]> = {
  path: ['path', 'category', 'amount', 'period', 'vendor', 'billDays', 'threadId', 'threadName', 'docDays', 'habitId', 'habitDesc', 'habitDays', 'frequency', 'day', 'content'],
  category: ['category', 'amount', 'period'],
  vendor: ['vendor', 'billDays'],
  threadId: ['threadId', 'threadName', 'docDays'],
  habitId: ['habitId', 'habitDesc', 'habitDays'],
  frequency: ['frequency', 'day', 'content'],
  day: ['day', 'content'],
}

export function RuleFlowchartBuilder({
  opts,
  initial,
  onSave,
  onCancel,
  isEdit,
  saveLabel,
}: {
  opts: RuleOptions
  initial?: FlowValues
  onSave: (v: FlowValues, name: string) => Promise<void>
  onCancel: () => void
  isEdit?: boolean
  saveLabel?: string
}) {
  const [flow, setFlow] = useState<FlowValues>(initial ?? {})
  const [sheet, setSheet] = useState<SheetOpen>(initial ? null : 'path')
  const [ruleName, setRuleName] = useState(initial ? buildSentence(initial) : '')
  const [saving, setSaving] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { show } = useToast()

  const sentence = buildSentence(flow)
  const complete = isFlowComplete(flow)

  useEffect(() => {
    if (sentence && !isEdit) setRuleName(sentence)
  }, [sentence])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [flow.path, flow.category, flow.vendor, flow.threadId, flow.habitId, flow.frequency, flow.day])

  function resetFrom(key: string) {
    const keys = RESET_MAP[key] ?? []
    setFlow(f => {
      const next = { ...f }
      for (const k of keys) delete (next as Record<string, unknown>)[k]
      return next
    })
  }

  function set(updates: Partial<FlowValues>) {
    setFlow(f => ({ ...f, ...updates }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(flow, ruleName)
    } catch {
      show("Couldn't save rule", 'error')
    } finally {
      setSaving(false)
    }
  }

  const PATH_OPTIONS = [
    { value: 'spending' as PathKey, label: 'My spending' },
    { value: 'bill' as PathKey, label: 'A bill or subscription' },
    { value: 'document' as PathKey, label: 'A document' },
    { value: 'habit' as PathKey, label: 'A habit' },
    { value: 'summary' as PathKey, label: 'Everything (summary)' },
  ]

  const categoryOptions = [
    { value: null as string | null, label: 'All spending' },
    ...opts.money_categories.map(c => ({ value: c, label: c })),
  ]
  const vendorOptions = [
    { value: null as string | null, label: 'Any recurring payment' },
    ...opts.recurring_vendors.map(v => ({ value: v, label: v })),
  ]
  const threadOptions = [
    { value: null as string | null, label: 'Any document' },
    ...opts.doc_threads.map(t => ({ value: t.id, label: t.name })),
  ]
  const habitOptions = [
    { value: null as string | null, label: 'Any habit' },
    ...opts.habits.map(h => ({ value: h.id, label: h.description })),
  ]

  const PERIOD_OPTIONS = ['per week', 'per month', 'per year']
  const FREQ_OPTIONS = ['Weekly', 'Monthly']
  const DAYS_OF_WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  const DAYS_OF_MONTH = Array.from({ length: 28 }, (_, i) => i + 1)
  const CONTENT_OPTIONS = [
    { value: 'money', label: 'Money' },
    { value: 'documents', label: 'Docs' },
    { value: 'tasks', label: 'Tasks' },
    { value: 'notes', label: 'Notes' },
  ]

  // Build node list
  type NodeDef = {
    key: string
    label: string
    filled: boolean
    auto: boolean
    sheetKey?: SheetOpen
    resetKey?: string
  }

  const nodes: NodeDef[] = []

  if (!flow.path) {
    nodes.push({ key: 'path', label: 'What to watch?', filled: false, auto: false, sheetKey: 'path', resetKey: 'path' })
  } else {
    const pathLabel = PATH_OPTIONS.find(p => p.value === flow.path)?.label ?? flow.path
    nodes.push({ key: 'path', label: pathLabel, filled: true, auto: false, sheetKey: 'path', resetKey: 'path' })

    if (flow.path === 'spending') {
      const catLabel =
        flow.category === undefined
          ? 'Category'
          : flow.category === null
          ? 'All spending'
          : flow.category
      nodes.push({ key: 'category', label: catLabel, filled: flow.category !== undefined, auto: false, sheetKey: 'category', resetKey: 'category' })
      if (flow.category !== undefined) {
        nodes.push({ key: 'exceeds', label: 'exceeds', filled: true, auto: true })
        const amtLabel = flow.amount !== undefined ? flow.amount.toLocaleString() : 'Amount'
        nodes.push({ key: 'amount', label: amtLabel, filled: flow.amount !== undefined, auto: false, sheetKey: 'amount', resetKey: 'amount' })
        if (flow.amount !== undefined) {
          const perLabel = flow.period ?? 'Period'
          nodes.push({ key: 'period', label: perLabel, filled: flow.period !== undefined, auto: false, sheetKey: 'period', resetKey: 'period' })
        }
      }
    }

    if (flow.path === 'bill') {
      const vLabel =
        flow.vendor === undefined ? 'Which one' : flow.vendor === null ? 'Any recurring payment' : flow.vendor
      nodes.push({ key: 'vendor', label: vLabel, filled: flow.vendor !== undefined, auto: false, sheetKey: 'vendor', resetKey: 'vendor' })
      if (flow.vendor !== undefined) {
        nodes.push({ key: 'due_within', label: 'is due within', filled: true, auto: true })
        const dLabel = flow.billDays !== undefined ? `${flow.billDays} days` : 'Days'
        nodes.push({ key: 'billDays', label: dLabel, filled: flow.billDays !== undefined, auto: false, sheetKey: 'billDays', resetKey: 'billDays' })
      }
    }

    if (flow.path === 'document') {
      const tLabel =
        flow.threadId === undefined ? 'Thread' : flow.threadId === null ? 'Any document' : flow.threadName ?? 'Thread'
      nodes.push({ key: 'thread', label: tLabel, filled: flow.threadId !== undefined, auto: false, sheetKey: 'thread', resetKey: 'threadId' })
      if (flow.threadId !== undefined) {
        nodes.push({ key: 'expires_within', label: 'expires within', filled: true, auto: true })
        const dLabel = flow.docDays !== undefined ? `${flow.docDays} days` : 'Days'
        nodes.push({ key: 'docDays', label: dLabel, filled: flow.docDays !== undefined, auto: false, sheetKey: 'docDays', resetKey: 'docDays' })
      }
    }

    if (flow.path === 'habit') {
      const hLabel =
        flow.habitId === undefined ? 'Which one' : flow.habitId === null ? 'Any habit' : flow.habitDesc ?? 'Habit'
      nodes.push({ key: 'habit', label: hLabel, filled: flow.habitId !== undefined, auto: false, sheetKey: 'habit', resetKey: 'habitId' })
      if (flow.habitId !== undefined) {
        nodes.push({ key: 'missed_for', label: 'is missed for', filled: true, auto: true })
        const dLabel = flow.habitDays !== undefined ? `${flow.habitDays} days` : 'Days'
        nodes.push({ key: 'habitDays', label: dLabel, filled: flow.habitDays !== undefined, auto: false, sheetKey: 'habitDays', resetKey: 'habitDays' })
      }
    }

    if (flow.path === 'summary') {
      const fLabel = flow.frequency ?? 'Frequency'
      nodes.push({ key: 'frequency', label: fLabel, filled: flow.frequency !== undefined, auto: false, sheetKey: 'frequency', resetKey: 'frequency' })
      if (flow.frequency !== undefined) {
        const dayLabel = flow.day !== undefined ? String(flow.day) : 'Day'
        nodes.push({ key: 'day', label: dayLabel, filled: flow.day !== undefined, auto: false, sheetKey: 'day', resetKey: 'day' })
        if (flow.day !== undefined) {
          const currentContent = flow.content ?? ['money', 'documents', 'tasks', 'notes']
          const inclLabel = currentContent.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')
          nodes.push({ key: 'include', label: inclLabel, filled: currentContent.length > 0, auto: false, sheetKey: 'include', resetKey: 'content' })
        }
      }
    }
  }

  const currentContent = flow.content ?? ['money', 'documents', 'tasks', 'notes']

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Flowchart scroll */}
      <div ref={scrollRef} style={{ overflowX: 'auto', padding: '4px 20px 4px', scrollbarWidth: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', width: 'max-content' }}>
          {nodes.map((node, i) => (
            <div key={node.key} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && (
                <>
                  <div style={{ width: 6 }} />
                  <Connector active={node.filled} />
                  <div style={{ width: 6 }} />
                </>
              )}
              <NodePill
                label={node.label}
                filled={node.filled}
                auto={node.auto}
                onClick={
                  node.sheetKey
                    ? () => {
                        if (node.resetKey) resetFrom(node.resetKey)
                        setSheet(node.sheetKey!)
                      }
                    : undefined
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* Sentence preview */}
      {sentence ? (
        <div
          style={{
            margin: '14px 20px 0',
            padding: '12px 14px',
            background: BG_CARD,
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: TEXT_MUTED, marginBottom: 4 }}>
            PREVIEW
          </div>
          <div
            style={{ fontSize: 14, fontFamily: 'DM Sans', color: TEXT_PRIMARY, lineHeight: 1.55 }}
          >
            {sentence}
          </div>
        </div>
      ) : null}

      {/* Name + save */}
      {complete && (
        <div style={{ margin: '14px 20px 0' }}>
          <label
            style={{
              fontSize: 10,
              fontFamily: 'DM Mono',
              color: TEXT_MUTED,
              display: 'block',
              marginBottom: 6,
            }}
          >
            RULE NAME
          </label>
          <input
            value={ruleName}
            onChange={e => setRuleName(e.target.value)}
            placeholder="Name this rule"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: BG_INPUT,
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: '11px 14px',
              fontSize: 14,
              fontFamily: 'DM Sans',
              color: TEXT_PRIMARY,
              outline: 'none',
              marginBottom: 10,
            }}
          />
          <button
            onClick={handleSave}
            disabled={saving || !ruleName.trim()}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: 12,
              border: 'none',
              background: `linear-gradient(135deg, ${ACCENT}, #3A63B8)`,
              color: '#fff',
              fontFamily: 'DM Sans',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              opacity: saving || !ruleName.trim() ? 0.4 : 1,
              marginBottom: 6,
            }}
          >
            {saving ? 'Saving...' : saveLabel ?? (isEdit ? 'Update Rule' : 'Activate Rule')}
          </button>
          <button
            onClick={onCancel}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 12,
              border: 'none',
              background: 'transparent',
              color: TEXT_MUTED,
              fontFamily: 'DM Sans',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Bottom sheets */}
      {sheet === 'path' && (
        <BottomSheet title="What to watch?" onClose={() => setSheet(null)}>
          {PATH_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => {
                resetFrom('path')
                set({ path: o.value })
                setSheet(null)
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 10,
                border: `1px solid ${BORDER}`,
                background: BG_SURFACE,
                color: TEXT_PRIMARY,
                fontFamily: 'DM Sans',
                fontSize: 14,
                textAlign: 'left',
                cursor: 'pointer',
                marginBottom: 8,
                minHeight: 44,
              }}
            >
              {o.label}
            </button>
          ))}
        </BottomSheet>
      )}

      {sheet === 'category' && (
        <BottomSheet title="Spending category" onClose={() => setSheet(null)}>
          {categoryOptions.length === 1 && (
            <div
              style={{
                fontSize: 12,
                color: TEXT_MUTED,
                fontFamily: 'DM Sans',
                marginBottom: 12,
              }}
            >
              No categories yet — add some expenses first.
            </div>
          )}
          {categoryOptions.map((o, i) => (
            <button
              key={i}
              onClick={() => {
                set({ category: o.value })
                setSheet(null)
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 10,
                border: `1px solid ${flow.category === o.value ? ACCENT : BORDER}`,
                background: flow.category === o.value ? `${ACCENT}18` : BG_SURFACE,
                color: TEXT_PRIMARY,
                fontFamily: 'DM Sans',
                fontSize: 14,
                textAlign: 'left',
                cursor: 'pointer',
                marginBottom: 8,
                minHeight: 44,
              }}
            >
              {o.label}
            </button>
          ))}
        </BottomSheet>
      )}

      {sheet === 'amount' && (
        <NumberInputSheet
          title="Spending limit"
          value={flow.amount}
          min={1}
          onConfirm={v => set({ amount: v })}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === 'period' && (
        <BottomSheet title="Time period" onClose={() => setSheet(null)}>
          {PERIOD_OPTIONS.map(o => (
            <button
              key={o}
              onClick={() => {
                set({ period: o })
                setSheet(null)
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 10,
                border: `1px solid ${flow.period === o ? ACCENT : BORDER}`,
                background: flow.period === o ? `${ACCENT}18` : BG_SURFACE,
                color: TEXT_PRIMARY,
                fontFamily: 'DM Sans',
                fontSize: 14,
                textAlign: 'left',
                cursor: 'pointer',
                marginBottom: 8,
                minHeight: 44,
              }}
            >
              {o.charAt(0).toUpperCase() + o.slice(1)}
            </button>
          ))}
        </BottomSheet>
      )}

      {sheet === 'vendor' && (
        <BottomSheet title="Bill or subscription" onClose={() => setSheet(null)}>
          {vendorOptions.length === 1 && (
            <div
              style={{
                fontSize: 12,
                color: TEXT_MUTED,
                fontFamily: 'DM Sans',
                marginBottom: 12,
              }}
            >
              No recurring vendors yet — add some first.
            </div>
          )}
          {vendorOptions.map((o, i) => (
            <button
              key={i}
              onClick={() => {
                set({ vendor: o.value })
                setSheet(null)
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 10,
                border: `1px solid ${flow.vendor === o.value ? ACCENT : BORDER}`,
                background: flow.vendor === o.value ? `${ACCENT}18` : BG_SURFACE,
                color: TEXT_PRIMARY,
                fontFamily: 'DM Sans',
                fontSize: 14,
                textAlign: 'left',
                cursor: 'pointer',
                marginBottom: 8,
                minHeight: 44,
              }}
            >
              {o.label}
            </button>
          ))}
        </BottomSheet>
      )}

      {sheet === 'billDays' && (
        <NumberInputSheet
          title="Days before due"
          value={flow.billDays}
          min={1}
          max={90}
          onConfirm={v => set({ billDays: v })}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === 'thread' && (
        <BottomSheet title="Document thread" onClose={() => setSheet(null)}>
          {threadOptions.length === 1 && (
            <div
              style={{
                fontSize: 12,
                color: TEXT_MUTED,
                fontFamily: 'DM Sans',
                marginBottom: 12,
              }}
            >
              No document threads yet — add some first.
            </div>
          )}
          {threadOptions.map((o, i) => (
            <button
              key={i}
              onClick={() => {
                const thread = o.value ? opts.doc_threads.find(t => t.id === o.value) : null
                set({ threadId: o.value, threadName: thread?.name })
                setSheet(null)
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 10,
                border: `1px solid ${flow.threadId === o.value ? ACCENT : BORDER}`,
                background: flow.threadId === o.value ? `${ACCENT}18` : BG_SURFACE,
                color: TEXT_PRIMARY,
                fontFamily: 'DM Sans',
                fontSize: 14,
                textAlign: 'left',
                cursor: 'pointer',
                marginBottom: 8,
                minHeight: 44,
              }}
            >
              {o.label}
            </button>
          ))}
        </BottomSheet>
      )}

      {sheet === 'docDays' && (
        <NumberInputSheet
          title="Days before expiry"
          value={flow.docDays}
          min={1}
          max={365}
          onConfirm={v => set({ docDays: v })}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === 'habit' && (
        <BottomSheet title="Habit" onClose={() => setSheet(null)}>
          {habitOptions.length === 1 && (
            <div
              style={{
                fontSize: 12,
                color: TEXT_MUTED,
                fontFamily: 'DM Sans',
                marginBottom: 12,
              }}
            >
              No habits tracked yet — add some first.
            </div>
          )}
          {habitOptions.map((o, i) => (
            <button
              key={i}
              onClick={() => {
                const habit = o.value ? opts.habits.find(h => h.id === o.value) : null
                set({ habitId: o.value, habitDesc: habit?.description })
                setSheet(null)
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 10,
                border: `1px solid ${flow.habitId === o.value ? ACCENT : BORDER}`,
                background: flow.habitId === o.value ? `${ACCENT}18` : BG_SURFACE,
                color: TEXT_PRIMARY,
                fontFamily: 'DM Sans',
                fontSize: 14,
                textAlign: 'left',
                cursor: 'pointer',
                marginBottom: 8,
                minHeight: 44,
              }}
            >
              {o.label}
            </button>
          ))}
        </BottomSheet>
      )}

      {sheet === 'habitDays' && (
        <NumberInputSheet
          title="Days missed"
          value={flow.habitDays}
          min={1}
          max={60}
          onConfirm={v => set({ habitDays: v })}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === 'frequency' && (
        <BottomSheet title="Summary frequency" onClose={() => setSheet(null)}>
          {FREQ_OPTIONS.map(o => (
            <button
              key={o}
              onClick={() => {
                set({ frequency: o, day: undefined, content: undefined })
                setSheet(null)
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 10,
                border: `1px solid ${flow.frequency === o ? ACCENT : BORDER}`,
                background: flow.frequency === o ? `${ACCENT}18` : BG_SURFACE,
                color: TEXT_PRIMARY,
                fontFamily: 'DM Sans',
                fontSize: 14,
                textAlign: 'left',
                cursor: 'pointer',
                marginBottom: 8,
                minHeight: 44,
              }}
            >
              {o}
            </button>
          ))}
        </BottomSheet>
      )}

      {sheet === 'day' && (
        <BottomSheet
          title={flow.frequency === 'Weekly' ? 'Day of week' : 'Day of month'}
          onClose={() => setSheet(null)}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(flow.frequency === 'Weekly' ? DAYS_OF_WEEK : DAYS_OF_MONTH).map(d => (
              <button
                key={d}
                onClick={() => {
                  set({ day: d })
                  setSheet(null)
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: `1px solid ${flow.day === d ? ACCENT : BORDER}`,
                  background: flow.day === d ? `${ACCENT}18` : BG_SURFACE,
                  color: TEXT_PRIMARY,
                  fontFamily: 'DM Sans',
                  fontSize: 13,
                  cursor: 'pointer',
                  minHeight: 44,
                  minWidth: 48,
                }}
              >
                {typeof d === 'string' ? d.charAt(0).toUpperCase() + d.slice(1) : d}
              </button>
            ))}
          </div>
        </BottomSheet>
      )}

      {sheet === 'include' && (
        <BottomSheet title="What to include" onClose={() => setSheet(null)}>
          {CONTENT_OPTIONS.map(o => {
            const selected = currentContent.includes(o.value)
            return (
              <button
                key={o.value}
                onClick={() => {
                  const next = selected
                    ? currentContent.filter(c => c !== o.value)
                    : [...currentContent, o.value]
                  if (next.length > 0) set({ content: next })
                }}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 10,
                  border: `1px solid ${selected ? ACCENT : BORDER}`,
                  background: selected ? `${ACCENT}18` : BG_SURFACE,
                  color: TEXT_PRIMARY,
                  fontFamily: 'DM Sans',
                  fontSize: 14,
                  textAlign: 'left',
                  cursor: 'pointer',
                  marginBottom: 8,
                  minHeight: 44,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {o.label}
                {selected && <span style={{ color: ACCENT }}>✓</span>}
              </button>
            )
          })}
          <button
            onClick={() => setSheet(null)}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: 12,
              border: 'none',
              background: `linear-gradient(135deg, ${ACCENT}, #3A63B8)`,
              color: '#fff',
              fontFamily: 'DM Sans',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: 4,
            }}
          >
            Done
          </button>
        </BottomSheet>
      )}

      <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
    </div>
  )
}

// ─── Rule card ────────────────────────────────────────────────────────────────
function RuleCard({
  rule,
  opts,
  onToggle,
  onDelete,
  onEdit,
  toggling,
}: {
  rule: Rule
  opts: RuleOptions
  onToggle: () => void
  onDelete: () => void
  onEdit: () => void
  toggling: boolean
}) {
  const v = parseRuleToFlow(rule, opts)
  const sentence = buildSentence(v) || rule.name
  return (
    <div
      onClick={onEdit}
      style={{
        background: BG_CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: '14px',
        marginBottom: 10,
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontFamily: 'DM Sans',
          color: TEXT_PRIMARY,
          lineHeight: 1.55,
          marginBottom: 10,
        }}
      >
        {sentence}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: TEXT_MUTED }}>
          {rule.workflow.toUpperCase()} · {rule.rule_type}
        </div>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onToggle}
            disabled={toggling}
            style={{
              width: 40,
              height: 22,
              borderRadius: 11,
              border: 'none',
              cursor: 'pointer',
              background: rule.active ? ACCENT : 'rgba(255,255,255,0.12)',
              position: 'relative',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 3,
                left: rule.active ? 21 : 3,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s',
              }}
            />
          </button>
          <button
            onClick={onDelete}
            style={{
              background: 'none',
              border: 'none',
              color: TEXT_MUTED,
              cursor: 'pointer',
              fontSize: 18,
              padding: '2px 4px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function PersonalRules() {
  const [rules, setRules] = useState<Rule[]>([])
  const [opts, setOpts] = useState<RuleOptions>({
    money_categories: [],
    recurring_vendors: [],
    doc_threads: [],
    habits: [],
  })
  const [loading, setLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editRule, setEditRule] = useState<Rule | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const { show } = useToast()

  function load() {
    setLoading(true)
    Promise.all([
      api<Rule[]>('/api/personal/rules'),
      api<RuleOptions>('/api/personal/rule-options'),
    ])
      .then(([r, o]) => {
        setRules(r)
        setOpts(o)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleSave(v: FlowValues, name: string) {
    const { workflow, rule_type, condition } = buildCondition(v)
    if (editRule) {
      await api(`/api/personal/rules/${editRule.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, condition, active: true }),
      })
    } else {
      await api('/api/personal/rules', {
        method: 'POST',
        body: JSON.stringify({ name, workflow, rule_type, condition, action: 'push', active: true }),
      })
    }
    setShowBuilder(false)
    setEditRule(null)
    load()
  }

  async function toggle(rule: Rule) {
    setToggling(rule.id)
    try {
      await api(`/api/personal/rules/${rule.id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !rule.active }),
      })
      load()
    } catch (err: unknown) {
      const detail = String((err as Record<string, unknown>)?.detail ?? err)
      if (detail.includes('At least one')) {
        show('At least one active rule is required', 'error')
      } else {
        show("Couldn't update rule", 'error')
      }
    } finally {
      setToggling(null)
    }
  }

  async function deleteRule(id: string) {
    try {
      await api(`/api/personal/rules/${id}`, { method: 'DELETE' })
      load()
    } catch (err: unknown) {
      const detail = String((err as Record<string, unknown>)?.detail ?? err)
      if (detail.includes('At least one')) {
        show('At least one active rule is required', 'error')
      } else {
        show("Couldn't delete rule", 'error')
      }
    }
  }

  const activeCount = rules.filter(r => r.active).length

  if (showBuilder || editRule) {
    const initial = editRule ? parseRuleToFlow(editRule, opts) : undefined
    return (
      <div>
        <div
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <button
            onClick={() => {
              setShowBuilder(false)
              setEditRule(null)
            }}
            style={{
              background: 'none',
              border: 'none',
              color: TEXT_SECONDARY,
              cursor: 'pointer',
              fontSize: 14,
              fontFamily: 'DM Sans',
              padding: 0,
            }}
          >
            ← Back
          </button>
          <div
            style={{
              fontSize: 14,
              fontFamily: 'DM Sans',
              fontWeight: 600,
              color: TEXT_PRIMARY,
            }}
          >
            {editRule ? 'Edit rule' : 'New rule'}
          </div>
        </div>
        <RuleFlowchartBuilder
          opts={opts}
          initial={initial}
          onSave={handleSave}
          onCancel={() => {
            setShowBuilder(false)
            setEditRule(null)
          }}
          isEdit={!!editRule}
        />
      </div>
    )
  }

  return (
    <div style={{ padding: '16px 20px' }}>
      <div
        style={{
          background: BG_CARD,
          borderRadius: 14,
          padding: '14px',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{ fontSize: 13, fontFamily: 'DM Sans', fontWeight: 600, color: TEXT_PRIMARY }}
          >
            {activeCount} active rule{activeCount !== 1 ? 's' : ''}
          </div>
          <div
            style={{ fontSize: 10, fontFamily: 'DM Mono', color: TEXT_MUTED, marginTop: 2 }}
          >
            7-day free trial · then $3+/mo
          </div>
        </div>
        <div style={{ fontSize: 22, fontFamily: 'DM Mono', fontWeight: 500, color: ACCENT }}>
          ${activeCount === 0 ? 0 : 3 + (activeCount - 1)}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
          <div
            style={{
              width: 20,
              height: 20,
              border: `2px solid ${ACCENT}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : (
        <>
          {rules.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              opts={opts}
              onToggle={() => toggle(rule)}
              onDelete={() => deleteRule(rule.id)}
              onEdit={() => setEditRule(rule)}
              toggling={toggling === rule.id}
            />
          ))}
          <button
            onClick={() => setShowBuilder(true)}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: 12,
              cursor: 'pointer',
              background: 'transparent',
              border: `1.5px dashed rgba(91,141,239,0.3)`,
              fontSize: 13,
              fontFamily: 'DM Sans',
              fontWeight: 500,
              color: ACCENT,
              marginTop: 4,
            }}
          >
            + New rule {rules.length > 0 ? '(+$1/mo)' : '($3/mo after trial)'}
          </button>
        </>
      )}
    </div>
  )
}
