import { useState, useMemo, useEffect } from 'react';
import type { EnrichedCustomer } from './utils/segmentation';
import { MSG_TYPES } from './utils/templates';
import { timeAgo, parseDateFmt, detectDateFormat } from './utils/dateParser';
import { updateMessage, bulkUpdateMessages } from './api/customerApi';

interface Props {
  customers: EnrichedCustomer[];
  messages: any[];
  settings: any;
  templates: any[];
  onRefresh: () => void;
  onOpenBuilder: (type: string) => void;
  onCustomerClick: (id: string) => void;
}

const C = '#CF5BA0';

const ACTION_TYPES = [
  { type: 'missyou', label: 'We miss you', icon: '????', desc: 'Re-engage cold customers' },
  { type: 'promo', label: 'Promo', icon: '????', desc: 'Send a special offer' },
  { type: 'exclusive', label: 'Exclusive Days', icon: '???', desc: 'Birthday & anniversaries' },
  { type: 'review', label: 'Review Request', icon: '???', desc: 'Ask for a review' },
  { type: 'referral', label: 'Referral', icon: '????', desc: 'Grow your customer base' },
];

export default function MessagesTab({ customers, messages, onRefresh, onOpenBuilder, onCustomerClick }: Props) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const drafts = useMemo(() => messages.filter((m: any) => m.status === 'draft' && !dismissedIds.has(m.id)), [messages, dismissedIds]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  // Reset dismissed set when fresh message data arrives from parent
  useEffect(() => { setDismissedIds(new Set()); }, [messages]);

  // History state
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [histType, setHistType] = useState<string>('');

  const sentMessages = useMemo(() => {
    let msgs = messages.filter((m: any) => m.status === 'sent');
    if (histType) msgs = msgs.filter((m: any) => m.type === histType);
    if (fromDate && fromDate.length >= 8) {
      const fmt = detectDateFormat([fromDate]);
      const iso = parseDateFmt(fromDate, fmt);
      if (iso) msgs = msgs.filter((m: any) => (m.sent_at || '') >= iso);
    }
    if (toDate && toDate.length >= 8) {
      const fmt = detectDateFormat([toDate]);
      const iso = parseDateFmt(toDate, fmt);
      if (iso) msgs = msgs.filter((m: any) => (m.sent_at || '') <= iso + 'T23:59:59');
    }
    return msgs.sort((a: any, b: any) => (b.sent_at || '').localeCompare(a.sent_at || ''));
  }, [messages, fromDate, toDate, histType]);

  const custMap = useMemo(() => {
    const m: Record<string, EnrichedCustomer> = {};
    for (const c of customers) m[c.id] = c;
    return m;
  }, [customers]);

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === drafts.length) setSelected(new Set());
    else setSelected(new Set(drafts.map((m: any) => m.id)));
  }

  async function sendSelected() {
    if (!selected.size) return;
    setSending(true);
    const ids = [...selected];
    setDismissedIds(prev => { const next = new Set(prev); ids.forEach(id => next.add(id)); return next; });
    setSelected(new Set());
    try {
      await bulkUpdateMessages(ids, { status: 'sent', sent_at: new Date().toISOString() });
      onRefresh();
    } finally {
      setSending(false);
    }
  }

  async function deleteMsg(id: string) {
    setDismissedIds(prev => { const next = new Set(prev); next.add(id); return next; });
    await updateMessage(id, { status: 'deleted' });
    onRefresh();
  }

  return (
    <>
      <div style={{ paddingTop: 12 }} />

      {/* Action grid */}
      <SectionLabel label="New Message" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 6 }}>
        {ACTION_TYPES.slice(0, 3).map(a => (
          <ActionCard key={a.type} {...a} onClick={() => onOpenBuilder(a.type)} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 16 }}>
        {ACTION_TYPES.slice(3).map(a => (
          <ActionCard key={a.type} {...a} onClick={() => onOpenBuilder(a.type)} />
        ))}
      </div>

      {/* Queue */}
      <SectionLabel label={`Queue${drafts.length ? ` ?? ${drafts.length}` : ''}`} color={C} />

      {!drafts.length ? (
        <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 12, color: 'var(--text-dim)' }}>Queue is empty</div>
      ) : (
        <>
          {/* Select all + send bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '6px 10px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <input type="checkbox" checked={selected.size === drafts.length && drafts.length > 0} onChange={toggleAll} style={{ accentColor: C }} />
            <div style={{ flex: 1, fontSize: 11, color: 'var(--text-muted)' }}>{selected.size ? `${selected.size} selected` : 'Select all'}</div>
            {selected.size > 0 && (
              <button
                onClick={sendSelected}
                disabled={sending}
                style={{ padding: '5px 12px', background: C, color: '#fff', borderRadius: 8, fontSize: 11, fontWeight: 700, opacity: sending ? .6 : 1 }}
              >
                {sending ? 'Sending???' : `Send ${selected.size}`}
              </button>
            )}
          </div>

          {drafts.map((m: any) => {
            const mt = MSG_TYPES[m.type] || MSG_TYPES.missyou;
            const cust = custMap[m.customer_id];
            const isSelected = selected.has(m.id);
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: isSelected ? 'rgba(207,91,160,.06)' : 'var(--bg-card)', borderRadius: 10, marginBottom: 3, border: `1px solid ${isSelected ? 'rgba(207,91,160,.3)' : 'var(--border)'}`, borderLeft: `3px solid ${mt.border}` }}>
                <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(m.id)} style={{ marginTop: 2, flexShrink: 0, accentColor: C }} />
                <div style={{ flex: 1, minWidth: 0, cursor: cust ? 'pointer' : 'default' }} onClick={() => cust && onCustomerClick(cust.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, color: mt.color }}>{mt.label}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{timeAgo(m.created_at)}</div>
                  </div>
                  {cust && <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 3, cursor: 'pointer' }} onClick={() => onCustomerClick(cust.id)}>{cust.name}</div>}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{m.body}</div>
                </div>
                <button onClick={() => deleteMsg(m.id)} style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9c9b95" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                </button>
              </div>
            );
          })}
        </>
      )}

      {/* History */}
      <SectionLabel label="History" color="#5DCAA5" />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="From (DD/MM/YYYY)"
          value={fromDate}
          onChange={e => setFromDate(e.target.value)}
          style={{ flex: 1, minWidth: 120, fontSize: 11, padding: '7px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
        />
        <input
          type="text"
          placeholder="To (DD/MM/YYYY)"
          value={toDate}
          onChange={e => setToDate(e.target.value)}
          style={{ flex: 1, minWidth: 120, fontSize: 11, padding: '7px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
        />
        <select
          value={histType}
          onChange={e => setHistType(e.target.value)}
          style={{ fontSize: 11, padding: '7px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: histType ? 'var(--text-primary)' : 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}
        >
          <option value="">All types</option>
          {Object.entries(MSG_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {!sentMessages.length ? (
        <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 12, color: 'var(--text-dim)' }}>No sent messages</div>
      ) : (
        <>
          {sentMessages.map((m: any) => {
            const mt = MSG_TYPES[m.type] || MSG_TYPES.missyou;
            const cust = custMap[m.customer_id];
            return (
              <div key={m.id} style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '10px 12px', marginBottom: 3, border: '1px solid var(--border)', borderLeft: `3px solid ${mt.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, color: mt.color }}>{mt.label}</div>
                    {cust && (
                      <div onClick={() => onCustomerClick(cust.id)} style={{ fontSize: 11, fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}>{cust.name}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{timeAgo(m.sent_at)}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{m.body}</div>
              </div>
            );
          })}
          <div style={{ textAlign: 'center', fontSize: 8, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', padding: 8 }}>{sentMessages.length} message{sentMessages.length !== 1 ? 's' : ''}</div>
        </>
      )}
    </>
  );
}

function SectionLabel({ label, color = 'var(--text-muted)' }: { label: string; color?: string }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '.1em', padding: '14px 0 8px', display: 'flex', alignItems: 'center', gap: 8, color, textTransform: 'uppercase' }}>
      {label}
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

function ActionCard({ type, label, icon, desc, onClick }: { type: string; label: string; icon: string; desc: string; onClick: () => void }) {
  const mt = MSG_TYPES[type] || MSG_TYPES.missyou;
  return (
    <button onClick={onClick} style={{ padding: '10px 8px', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minHeight: 44 }}>
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: mt.color, fontFamily: 'var(--font-mono)', lineHeight: 1.2 }}>{label}</div>
      <div style={{ fontSize: 9, color: 'var(--text-dim)', lineHeight: 1.3 }}>{desc}</div>
    </button>
  );
}

