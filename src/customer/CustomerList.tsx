import { useState, useMemo } from 'react';
import type { EnrichedCustomer } from './utils/segmentation';
import { getThresholds, rangeLabel } from './utils/segmentation';

interface Props {
  customers: EnrichedCustomer[];
  settings: any;
  onCustomerClick: (id: string) => void;
  onImport: () => void;
}

export default function CustomerList({ customers, settings, onCustomerClick, onImport }: Props) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const th = settings?.thresholds;
  const segs = getThresholds(th);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return null;
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (`REF-${String(Math.abs(hashCode(c.id))).slice(0,4).padStart(4,'0')}`).includes(q.toUpperCase())
    );
  }, [search, customers]);

  const grouped = useMemo(() => {
    const g: Record<string, EnrichedCustomer[]> = {};
    for (const s of segs) g[s.key] = [];
    for (const c of customers) g[c._seg.key]?.push(c);
    return g;
  }, [customers, segs]);

  function toggleSeg(key: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  if (!customers.length) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 20px' }}>
        <div style={{ fontSize: 36, marginBottom: 10, opacity: .6 }}>????</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No customers</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>Import data to start</div>
        <button onClick={onImport} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'rgba(207,91,160,.1)', color: '#CF5BA0', border: '1px solid rgba(207,91,160,.2)', borderRadius: 10, fontSize: 12, fontWeight: 600, minHeight: 44 }}>???? Import</button>
      </div>
    );
  }

  const custItem = (c: EnrichedCustomer) => {
    const init = c.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
    return (
      <div key={c.id} onClick={() => onCustomerClick(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(255,255,255,.02)', borderRadius: 6, marginBottom: 2, cursor: 'pointer', minHeight: 44 }}>
        <div style={{ width: 30, height: 30, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, background: c._seg.bg, color: c._seg.color }}>{init}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
            {c.category && (
              <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 6, background: '#2a2a28', color: '#9c9b95', flexShrink: 0, whiteSpace: 'nowrap' }}>{c.category}</span>
            )}
          </div>
          <div style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 1, display: 'flex', gap: 6 }}>
            <span>{c.visits || 0} visits</span>
            <span>{c.spent ? c.spent.toLocaleString() : '???'}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, color: c._seg.color }}>{c._days}d</div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div style={{ paddingTop: 12 }} />
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
      </div>

      {filtered ? (
        <>
          {!filtered.length && <div style={{ textAlign: 'center', padding: 20, fontSize: 12, color: 'var(--text-dim)' }}>No results</div>}
          {filtered.map(c => custItem(c))}
          <div style={{ textAlign: 'center', fontSize: 8, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', padding: 8 }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</div>
        </>
      ) : (
        <>
          {segs.map(s => {
            const g = grouped[s.key] || [];
            if (!g.length) return null;
            const sorted = [...g].sort((a, b) => a._days - b._days);
            const open = !collapsed.has(s.key);
            const rangeStr = rangeLabel(s, th);
            return (
              <div key={s.key} style={{ marginBottom: 4 }}>
                <div onClick={() => toggleSeg(s.key)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--bg-card)', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--border)', minHeight: 44 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: s.color }} />
                  <div style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{rangeStr}</div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, color: s.color }}>{g.length}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 4, transition: 'transform .2s', transform: open ? 'rotate(90deg)' : 'none' }}>???</div>
                </div>
                {open && (
                  <div style={{ paddingTop: 2 }}>
                    {sorted.map(c => custItem(c))}
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ textAlign: 'center', fontSize: 8, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', padding: 8 }}>{customers.length} total</div>
        </>
      )}
    </>
  );
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
  return Math.abs(h);
}

