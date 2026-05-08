import { useState, useMemo, useEffect } from 'react';
import type { EnrichedCustomer } from './utils/segmentation';
import { getThresholds } from './utils/segmentation';
import { fillTemplate, MSG_TYPES } from './utils/templates';
import { createMessage, updateTemplate } from './api/customerApi';

interface Props {
  type: string;
  customers: EnrichedCustomer[];
  settings: any;
  templates: any[];
  onBack: () => void;
  onQueued: () => void;
  onRefreshTemplates: () => void;
}

const C = '#CF5BA0';

export default function MessageBuilder({ type: initialType, customers, settings, templates, onBack, onQueued, onRefreshTemplates }: Props) {
  const [msgType, setMsgType] = useState(initialType);
  const [selectedSegs, setSelectedSegs] = useState<Set<string>>(new Set());
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<'segment' | 'individual'>('segment');
  const [templateId, setTemplateId] = useState<string>('');
  const [body, setBody] = useState('');
  const [offerText, setOfferText] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [queuing, setQueuing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [custSearch, setCustSearch] = useState('');
  const th = settings?.thresholds;
  const segs = getThresholds(th);

  const typeTemplates = useMemo(() =>
    (templates || []).filter((t: any) => t.type === msgType && t.active !== false),
    [templates, msgType]
  );

  useEffect(() => {
    if (typeTemplates.length) {
      setTemplateId(typeTemplates[0].id);
      setBody(typeTemplates[0].body || '');
    } else {
      setTemplateId('');
      setBody('');
    }
  }, [msgType]);

  useEffect(() => {
    if (templateId) {
      const t = typeTemplates.find((t: any) => t.id === templateId);
      if (t) setBody(t.body || '');
    }
  }, [templateId]);

  const filteredCusts = useMemo(() => {
    const q = custSearch.toLowerCase();
    return customers.filter(c =>
      !q || c.name.toLowerCase().includes(q) || (c.phone || '').includes(q)
    );
  }, [customers, custSearch]);

  const targetCustomers = useMemo(() => {
    if (mode === 'individual') return customers.filter(c => selectedCustomers.has(c.id));
    if (!selectedSegs.size) return [];
    return customers.filter(c => selectedSegs.has(c._seg.key));
  }, [mode, selectedSegs, selectedCustomers, customers]);

  function toggleSeg(key: string) {
    setSelectedSegs(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleCustomer(id: string) {
    setSelectedCustomers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleSaveTemplate() {
    if (!templateId) return;
    await updateTemplate(templateId, { body });
    onRefreshTemplates();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleQueue() {
    if (!targetCustomers.length || !body.trim()) return;
    setQueuing(true);
    try {
      const extras = { offer: offerText, promo_code: promoCode };
      const messages = targetCustomers.map(c => ({
        customer_id: c.id,
        customer_name: c.name,
        customer_phone: c.phone || '',
        type: msgType,
        body: fillTemplate(body, c, extras, settings),
        status: 'draft',
      }));
      for (const msg of messages) {
        await createMessage(msg);
      }
      onQueued();
    } finally {
      setQueuing(false);
    }
  }

  const previewCust = targetCustomers[0] || customers[0];
  const previewBody = previewCust ? fillTemplate(body, previewCust, { offer: offerText, promo_code: promoCode }, settings) : body;

  return (
    <>
      {/* Back header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingTop: 12 }}>
        <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, minHeight: 44 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div style={{ fontSize: 15, fontWeight: 700, flex: 1 }}>Message Builder</div>
      </div>

      {/* Type selector */}
      <SectionLabel label="Type" />
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
        {Object.entries(MSG_TYPES).map(([k, v]) => (
          <button key={k} onClick={() => setMsgType(k)} style={{
            padding: '6px 12px', borderRadius: 20, fontSize: 10, fontWeight: 700,
            background: msgType === k ? `rgba(207,91,160,.15)` : 'var(--bg-card)',
            color: msgType === k ? v.color : 'var(--text-muted)',
            border: msgType === k ? `1px solid ${v.border}` : '1px solid var(--border)',
            minHeight: 36,
          }}>{v.label}</button>
        ))}
      </div>

      {/* Template picker */}
      {typeTemplates.length > 0 && (
        <>
          <SectionLabel label="Template" />
          <select
            value={templateId}
            onChange={e => setTemplateId(e.target.value)}
            style={{ width: '100%', marginBottom: 8, padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 }}
          >
            {typeTemplates.map((t: any) => (
              <option key={t.id} value={t.id}>{t.name || t.id}</option>
            ))}
          </select>
        </>
      )}

      {/* Extra fields by type */}
      {(msgType === 'promo' || msgType === 'exclusive') && (
        <>
          <input
            type="text"
            placeholder="Offer text (e.g. 20% off your next visit)"
            value={offerText}
            onChange={e => setOfferText(e.target.value)}
            style={{ width: '100%', marginBottom: 6, boxSizing: 'border-box' }}
          />
          <input
            type="text"
            placeholder="Promo code (optional)"
            value={promoCode}
            onChange={e => setPromoCode(e.target.value)}
            style={{ width: '100%', marginBottom: 6, boxSizing: 'border-box' }}
          />
        </>
      )}

      {/* Body editor */}
      <SectionLabel label="Message Body" />
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        rows={5}
        style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 12, lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
        placeholder="Message body??? use {{name}}, {{offer}}, {{ref_code}}, {{business}}"
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{'{{name}} {{offer}} {{ref_code}} {{business}} {{review_link}}'}</div>
        {templateId && (
          <button onClick={handleSaveTemplate} style={{ fontSize: 9, color: saved ? '#5DCAA5' : C, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            {saved ? '??? Saved' : 'Save template'}
          </button>
        )}
      </div>

      {/* Preview */}
      {previewCust && (
        <>
          <SectionLabel label={`Preview ??? ${previewCust.name}`} color="#5DCAA5" />
          <div style={{ padding: '10px 14px', background: 'rgba(93,202,165,.05)', border: '1px solid rgba(93,202,165,.2)', borderRadius: 10, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: 12 }}>
            {previewBody}
          </div>
        </>
      )}

      {/* Audience */}
      <SectionLabel label="Audience" />
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {(['segment', 'individual'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)',
            background: mode === m ? 'rgba(207,91,160,.1)' : 'var(--bg-card)',
            color: mode === m ? C : 'var(--text-muted)',
            border: mode === m ? '1px solid rgba(207,91,160,.2)' : '1px solid var(--border)',
            minHeight: 36,
          }}>{m === 'segment' ? 'By Segment' : 'Individual'}</button>
        ))}
      </div>

      {mode === 'segment' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
          {segs.map(s => {
            const count = customers.filter(c => c._seg.key === s.key).length;
            const checked = selectedSegs.has(s.key);
            return (
              <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--bg-card)', borderRadius: 8, border: `1px solid ${checked ? 'rgba(207,91,160,.3)' : 'var(--border)'}`, cursor: 'pointer', minHeight: 44 }}>
                <input type="checkbox" checked={checked} onChange={() => toggleSeg(s.key)} style={{ accentColor: C }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{s.label}</div>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, color: s.color }}>{count}</div>
              </label>
            );
          })}
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Search customers???"
            value={custSearch}
            onChange={e => setCustSearch(e.target.value)}
            style={{ width: '100%', marginBottom: 6, boxSizing: 'border-box' }}
          />
          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredCusts.map(c => {
              const checked = selectedCustomers.has(c.id);
              const init = c.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: checked ? 'rgba(207,91,160,.06)' : 'var(--bg-card)', borderRadius: 8, border: `1px solid ${checked ? 'rgba(207,91,160,.3)' : 'var(--border)'}`, cursor: 'pointer', minHeight: 40 }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleCustomer(c.id)} style={{ accentColor: C }} />
                  <div style={{ width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, background: c._seg.bg, color: c._seg.color, flexShrink: 0 }}>{init}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{c._seg.label} ?? {c._days}d ago</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '12px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {targetCustomers.length > 0
              ? <><span style={{ fontWeight: 700, color: C }}>{targetCustomers.length}</span> recipient{targetCustomers.length !== 1 ? 's' : ''}</>
              : <span style={{ color: 'var(--text-dim)' }}>No recipients selected</span>
            }
          </div>
        </div>
        <button
          onClick={handleQueue}
          disabled={queuing || !targetCustomers.length || !body.trim()}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 12, fontSize: 13, fontWeight: 700,
            background: (targetCustomers.length && body.trim()) ? C : 'var(--bg-card)',
            color: (targetCustomers.length && body.trim()) ? '#fff' : 'var(--text-dim)',
            border: '1px solid var(--border)',
            opacity: queuing ? .6 : 1,
            minHeight: 48,
          }}
        >
          {queuing ? 'Queuing???' : `Queue ${targetCustomers.length || 0} message${targetCustomers.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </>
  );
}

function SectionLabel({ label, color = 'var(--text-muted)' }: { label: string; color?: string }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '.1em', padding: '10px 0 6px', display: 'flex', alignItems: 'center', gap: 8, color, textTransform: 'uppercase' }}>
      {label}
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

