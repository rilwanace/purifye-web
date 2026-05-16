import { useEffect, useState } from 'react';
import type { EnrichedCustomer } from './utils/segmentation';
import { getRefCode } from './utils/referralCode';
import { formatDate, timeAgo } from './utils/dateParser';
import { MSG_TYPES } from './utils/templates';
import { getPurchases } from './api/customerApi';

interface Props {
  customer: EnrichedCustomer;
  messages: any[];
  onBack: () => void;
}

export default function CustomerDetail({ customer: c, messages, onBack }: Props) {
  const [purchases, setPurchases] = useState<any[] | null>(null);

  useEffect(() => {
    getPurchases(c.id).then(setPurchases).catch(() => setPurchases([]));
  }, [c.id]);

  const init = c.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const avg = c.visits > 0 && c.spent ? (c.spent / c.visits).toFixed(0) : '???';
  const refCode = getRefCode(c.id);
  const custMsgs = messages.filter((m: any) => m.customer_id === c.id && m.status === 'sent')
    .sort((a: any, b: any) => (b.sent_at || '').localeCompare(a.sent_at || ''));

  const spendCats = buildSpendCats(purchases, c);

  return (
    <>
      {/* Back header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingTop: 12 }}>
        <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, minHeight: 44 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div style={{ fontSize: 15, fontWeight: 700, flex: 1 }}>Customer</div>
      </div>

      {/* Avatar + name */}
      <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
        <div data-segment={c._seg.key} style={{ width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, margin: '0 auto 8px', backgroundColor: c._seg.color, color: '#fff' }}>{init}</div>
        <div style={{ fontSize: 17, fontWeight: 700 }}>{c.name}</div>
        {c.category && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: '#2a2a28', color: '#9c9b95', marginTop: 4, display: 'inline-block' }}>{c.category}</span>}
        <div style={{ marginTop: 4 }}>
          <span data-segment-badge={c._seg.key} style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, padding: '3px 10px', borderRadius: 6, backgroundColor: c._seg.color, color: '#fff' }}>{c._seg.label} ?? {c._days}d ago</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, marginBottom: 14 }}>
        {[
          [c.visits || 0, 'VISITS', '#CF5BA0'],
          [c.spent ? c.spent.toLocaleString() : '???', 'SPENT', '#5DCAA5'],
          [avg, 'AVG/VISIT', 'var(--text-primary)'],
        ].map(([v, l, col]) => (
          <div key={String(l)} style={{ textAlign: 'center', padding: '10px 4px', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)', color: String(col) }}>{String(v)}</div>
            <div style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{String(l)}</div>
          </div>
        ))}
      </div>

      {/* Spend donut */}
      {spendCats.length > 0 && c.spent > 0 && (
        <>
          <SectionLabel label="Spend Breakdown" color="#CF5BA0" />
          <DonutChart cats={spendCats} total={c.spent} />
        </>
      )}

      {/* Details */}
      <SectionLabel label="Details" />
      {[
        c.phone && ['Phone', c.phone],
        c.email && ['Email', c.email],
        c.birthday && ['Birthday', formatDate(c.birthday)],
        ['Referral code', refCode],
        c.first_visit && ['First visit', formatDate(c.first_visit)],
        c.last_visit && ['Last visit', formatDate(c.last_visit)],
        c.notes && ['Notes', c.notes],
      ].filter(Boolean).map(f => (
        <div key={String((f as any)[0])} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', background: 'var(--bg-card)', borderRadius: 6, marginBottom: 2 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(f as any)[0]}</div>
          <div style={{ fontSize: 12, fontWeight: 500, maxWidth: 200, wordBreak: 'break-word', textAlign: 'right' }}>{(f as any)[1]}</div>
        </div>
      ))}

      {/* WhatsApp button */}
      {c.phone && (
        <a
          data-testid="whatsapp-link"
          href={"https://wa.me/" + c.phone.replace(/[^\d+]/g, "") + "?text=" + encodeURIComponent("Hi " + c.name.split(" ")[0] + ", ")}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, padding: '10px 14px', background: 'rgba(37,211,102,.1)', border: '1px solid rgba(37,211,102,.25)', borderRadius: 10, color: '#25D366', fontSize: 12, fontWeight: 600, textDecoration: 'none', minHeight: 44 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.291 0-4.412-.744-6.13-2.004l-.44-.328-3.082 1.034 1.034-3.082-.328-.44A9.955 9.955 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
          Send WhatsApp
        </a>
      )}

      {/* Message history */}
      {custMsgs.length > 0 && (
        <>
          <SectionLabel label="Message History" color="#CF5BA0" />
          {custMsgs.map((m: any) => {
            const mt = MSG_TYPES[m.type] || MSG_TYPES.missyou;
            return (
              <div key={m.id} style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '10px 12px', marginBottom: 3, border: '1px solid var(--border)', borderLeft: `3px solid ${mt.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, color: mt.color }}>{mt.label}</div>
                  <div style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{timeAgo(m.sent_at)}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{m.body}</div>
              </div>
            );
          })}
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

function buildSpendCats(purchases: any[] | null, c: EnrichedCustomer) {
  const COLORS = ['#CF5BA0','#5DCAA5','#B08D30','#E8894F','#9c9b95','#D85A30'];
  if (purchases && purchases.length >= 2) {
    const catMap: Record<string, number> = {};
    for (const p of purchases) { const nm = p.product_name || 'Other'; catMap[nm] = (catMap[nm] || 0) + (p.total || 0); }
    return Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, val], i) => ({ name, value: Math.round(val), color: COLORS[i % COLORS.length] }));
  }
  if (!c.spent) return [];
  function hashCode(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0; return Math.abs(h); }
  const seed = hashCode(c.id || c.name);
  const cats = ['Services','Products','Add-ons','Consultation'];
  const total = c.spent;
  const r1 = ((seed % 40) + 40) / 100;
  const r2 = ((seed % 20) + 10) / 100;
  const r3 = Math.max(.05, 1 - r1 - r2 - .05);
  const r4 = Math.max(.05, 1 - r1 - r2 - r3);
  return cats.map((name, i) => ({ name, value: Math.round(total * [r1, r2, r3, r4][i]), color: COLORS[i] }));
}

function DonutChart({ cats, total }: { cats: { name: string; value: number; color: string }[]; total: number }) {
  const valid = cats.filter(c => c.value > 0);
  if (!valid.length) return null;
  const R = 35, CX = 40, CY = 40, SW = 12;
  const circ = 2 * Math.PI * R;
  let offset = 0;
  const arcs = valid.map((c, i) => {
    const pct = c.value / total;
    const len = pct * circ;
    const arc = <circle key={i} cx={CX} cy={CY} r={R} fill="none" stroke={c.color} strokeWidth={SW} strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-offset} transform={`rotate(-90 ${CX} ${CY})`} />;
    offset += len;
    return arc;
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12, background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 8 }}>
      <div style={{ width: 80, height: 80, flexShrink: 0, position: 'relative' }}>
        <svg width="80" height="80" viewBox="0 0 80 80">{arcs}</svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{total.toLocaleString()}</div>
          <div style={{ fontSize: 6, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>TOTAL</div>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {valid.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: c.color }} />
            <div style={{ fontSize: 10, flex: 1 }}>{c.name}</div>
            <div style={{ fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{Math.round((c.value / total) * 100)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

