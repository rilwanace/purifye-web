import { useState } from 'react'

interface RecentEntry {
  entry_group: string
  type: string
  date: string
  counterparty: string | null
  amount: number
  description: string | null
  created_at: string
}

interface RecentEntriesProps {
  entries: RecentEntry[]
  onUndo: (entryGroup: string) => void
  onEdit: (entryGroup: string) => void
}

const TYPE_EMOJI: Record<string, string> = {
  sale: '🧾', purchase: '📦', other_expense: '💸', payment_received: '💰',
  payment_made: '💳', payroll: '👥', salary_advance: '💵', owner_drawing: '🏠',
  capital_injection: '💹', loan_disbursement: '🏦', loan_repayment: '🔄',
  asset_purchase: '🏗', inventory_adjustment: '📊', intra_transfer: '↔️',
  conversion: '⚙️',
}

const TYPE_LABEL: Record<string, string> = {
  sale: 'Sale', purchase: 'Purchase', other_expense: 'Expense', payment_received: 'Payment In',
  payment_made: 'Payment Out', payroll: 'Payroll', salary_advance: 'Salary Advance',
  owner_drawing: 'Drawing', capital_injection: 'Capital', loan_disbursement: 'Loan',
  loan_repayment: 'Loan Repay', asset_purchase: 'Asset', inventory_adjustment: 'Inventory',
  intra_transfer: 'Transfer', conversion: 'Production',
}

const INFLOW = new Set(['sale', 'payment_received', 'capital_injection', 'loan_disbursement'])

function fmtDate(s: string) {
  if (!s) return ''
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3])
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  }
  try { return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) }
  catch { return s }
}

function fmtAmt(n: number) {
  return 'Rs. ' + Math.round(n).toLocaleString('en-US')
}

export default function RecentEntries({ entries, onUndo, onEdit }: RecentEntriesProps) {
  const [confirmUndo, setConfirmUndo] = useState<string | null>(null)

  if (!entries.length) return (
    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)' }}>
      No recent entries
    </div>
  )

  return (
    <div style={{ padding: '0 12px 24px' }}>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '12px 4px 8px', fontFamily: 'var(--font-mono)' }}>
        Recent Entries
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {entries.map(e => (
          <div key={e.entry_group} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>{TYPE_EMOJI[e.type] || '📝'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.counterparty || TYPE_LABEL[e.type] || e.type}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: INFLOW.has(e.type) ? 'var(--accent)' : '#ff453a', fontFamily: 'var(--font-mono)', flexShrink: 0, marginLeft: 8 }}>
                    {fmtAmt(e.amount)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{TYPE_LABEL[e.type] || e.type} · {fmtDate(e.date)}</span>
                </div>
              </div>
            </div>

            {confirmUndo === e.entry_group ? (
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1, fontFamily: 'var(--font-sans)' }}>Undo this entry?</span>
                <button onClick={() => { onUndo(e.entry_group); setConfirmUndo(null) }}
                  style={{ padding: '4px 12px', borderRadius: 6, background: 'rgba(216,90,48,0.1)', color: '#D85A30', border: '1px solid rgba(216,90,48,0.2)', fontSize: 11, cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
                  Yes
                </button>
                <button onClick={() => setConfirmUndo(null)}
                  style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 8, display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button onClick={() => onEdit(e.entry_group)}
                  style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                  Edit
                </button>
                <button onClick={() => setConfirmUndo(e.entry_group)}
                  style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(216,90,48,0.2)', background: 'rgba(216,90,48,0.08)', color: '#D85A30', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                  Undo
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
