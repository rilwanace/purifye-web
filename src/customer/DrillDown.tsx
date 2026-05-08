import type { EnrichedCustomer } from './utils/segmentation';

interface Props {
  title: string;
  customers: EnrichedCustomer[];
  onBack: () => void;
  onCustomerClick: (id: string) => void;
}

export default function DrillDown({ title, customers, onBack, onCustomerClick }: Props) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingTop: 12 }}>
        <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{customers.length} customer{customers.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {!customers.length && (
        <div style={{ textAlign: 'center', padding: '40px 20px', fontSize: 13, color: 'var(--text-dim)' }}>No customers</div>
      )}

      {customers.map(c => {
        const init = c.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
        return (
          <div
            key={c.id}
            onClick={() => onCustomerClick(c.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-card)', borderRadius: 8, marginBottom: 3, cursor: 'pointer', border: '1px solid var(--border)', minHeight: 44 }}
          >
            <div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, background: c._seg.bg, color: c._seg.color }}>{init}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                {c.category && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 6, background: '#2a2a28', color: '#9c9b95', flexShrink: 0 }}>{c.category}</span>}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 2, display: 'flex', gap: 8 }}>
                <span style={{ color: c._seg.color }}>{c._seg.label}</span>
                <span>{c.visits || 0} visits</span>
                {c.spent ? <span>{c.spent.toLocaleString()} spent</span> : null}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, color: c._seg.color }}>{c._days}d</div>
              <div style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>ago</div>
            </div>
          </div>
        );
      })}
    </>
  );
}

