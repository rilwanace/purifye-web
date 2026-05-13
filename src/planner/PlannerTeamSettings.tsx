import { useState, useCallback } from 'react';
import { useMembers, createMember, deleteMember } from './api';

export default function PlannerTeamSettings() {
  const { data: members, refresh } = useMembers();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const handleAdd = useCallback(async () => {
    if (!name.trim()) return;
    setAdding(true);
    try {
      await createMember({ name: name.trim(), role: role.trim() });
      setName('');
      setRole('');
      refresh();
    } finally {
      setAdding(false);
    }
  }, [name, role, refresh]);

  const handleRemove = useCallback(async (id: string) => {
    setRemoving(id);
    try {
      await deleteMember(id);
      refresh();
    } finally {
      setRemoving(null);
    }
  }, [refresh]);

  const handleCopy = useCallback(async (token: string) => {
    await navigator.clipboard.writeText(`https://purifyeai.com/t/${token}`);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  if (!members) return null;

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 13,
    color: 'var(--text-primary)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    minHeight: 40,
  };

  return (
    <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#D4A843', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16, fontFamily: 'var(--font-mono)' }}>
        Team Members
      </div>

      <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.8px', marginBottom: 10 }}>
          ADD MEMBER
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            style={{ ...inputStyle, flex: 1.5 }}
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          />
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Role"
            value={role}
            onChange={e => setRole(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!name.trim() || adding}
          style={{
            width: '100%',
            minHeight: 40,
            background: name.trim() && !adding ? '#D4A843' : 'var(--bg-card)',
            color: name.trim() && !adding ? '#000' : 'var(--text-muted)',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: name.trim() && !adding ? 'pointer' : 'default',
          }}
        >
          {adding ? 'Adding...' : '+ Add Member'}
        </button>
      </div>

      {members.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>No team members yet</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Add someone above to get started</div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.8px', marginBottom: 8 }}>
            {members.length} MEMBER{members.length !== 1 ? 'S' : ''}
          </div>
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, background: m.color + '1a', color: m.color, flexShrink: 0 }}>
                {m.name[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                {m.role && <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.role}</div>}
                <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  purifyeai.com/t/…{m.token.slice(-6)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => handleCopy(m.token)}
                  style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: copied === m.token ? '#5DCAA51a' : 'var(--bg-surface)', border: 'none', cursor: 'pointer' }}
                  title="Copy portal link"
                >
                  {copied === m.token ? (
                    <span style={{ color: '#5DCAA5', fontSize: 11, fontWeight: 700 }}>✓</span>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <rect x="9" y="9" width="13" height="13" rx="2" stroke="var(--text-muted)" strokeWidth="1.8"/>
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="var(--text-muted)" strokeWidth="1.8"/>
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => handleRemove(m.id)}
                  disabled={removing === m.id}
                  style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface)', border: 'none', cursor: 'pointer', opacity: removing === m.id ? 0.4 : 1 }}
                  title="Remove member"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: '#5B8DEF08', border: '1px solid #5B8DEF14' }}>
        <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#5B8DEF', letterSpacing: '0.8px', marginBottom: 4 }}>HOW IT WORKS</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Copy a member link and send it via WhatsApp or text. They open it on their phone to see and check off tasks — no login needed.
        </div>
      </div>
    </div>
  );
}
