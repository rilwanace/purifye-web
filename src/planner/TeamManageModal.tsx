import { useState, useCallback } from 'react';
import type { Member } from './api';
import { createMember, deleteMember } from './api';

interface Props {
  members: Member[];
  onRefresh: () => void;
  onClose: () => void;
}

export function TeamManageModal({ members, onRefresh, onClose }: Props) {
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
      onRefresh();
    } finally {
      setAdding(false);
    }
  }, [name, role, onRefresh]);

  const handleRemove = useCallback(async (id: string) => {
    setRemoving(id);
    try {
      await deleteMember(id);
      onRefresh();
    } finally {
      setRemoving(null);
    }
  }, [onRefresh]);

  const handleCopy = useCallback(async (token: string) => {
    await navigator.clipboard.writeText(`https://purifye.org/t/${token}`);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const inputClass = "bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] text-[var(--text-primary)] outline-none w-full";

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[60] flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-card)] rounded-t-2xl max-w-[430px] w-full max-h-[85vh] overflow-auto pb-8"
        onClick={e => e.stopPropagation()}
        style={{ colorScheme: 'dark' }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[rgba(255,255,255,.15)]" />
        </div>

        <div className="px-5 pt-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
              <span style={{ color: '#5B8DEF' }}>◆</span> Team Members
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] text-xl"
            >
              ×
            </button>
          </div>

          {/* Add member form */}
          <div className="bg-[var(--bg-surface)] rounded-xl p-3 mb-5">
            <div className="text-[9px] font-bold font-mono text-[var(--text-muted)] tracking-wider mb-2.5">
              ADD MEMBER
            </div>
            <div className="flex gap-2 mb-2.5">
              <input
                className={inputClass}
                style={{ flex: '1.5' }}
                placeholder="Name"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                autoFocus
              />
              <input
                className={inputClass}
                style={{ flex: 1 }}
                placeholder="Role"
                value={role}
                onChange={e => setRole(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={!name.trim() || adding}
              className="w-full py-2.5 rounded-lg text-[13px] font-semibold transition-all"
              style={{
                background: name.trim() && !adding ? '#D4A843' : 'var(--bg-card)',
                color: name.trim() && !adding ? '#000' : 'var(--text-muted)',
              }}
            >
              {adding ? 'Adding...' : '+ Add Member'}
            </button>
          </div>

          {/* Members list */}
          {members.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-3xl mb-2">👥</div>
              <div className="text-[13px] font-semibold text-[var(--text-secondary)] mb-1">No team members yet</div>
              <div className="text-[11px] text-[var(--text-muted)]">Add someone above to get started</div>
            </div>
          ) : (
            <div>
              <div className="text-[9px] font-bold font-mono text-[var(--text-muted)] tracking-wider mb-2">
                {members.length} MEMBER{members.length !== 1 ? 'S' : ''}
              </div>
              {members.map(m => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 py-3 border-b border-[rgba(255,255,255,.04)]"
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[15px] font-bold shrink-0"
                    style={{ background: `${m.color}1a`, color: m.color }}
                  >
                    {m.name[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{m.name}</div>
                    {m.role && (
                      <div className="text-[10px] text-[var(--text-muted)] truncate">{m.role}</div>
                    )}
                    <div className="text-[9px] font-mono text-[var(--text-muted)] mt-0.5 truncate">
                      purifye.org/t/{m.token}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 shrink-0">
                    {/* Copy portal link */}
                    <button
                      onClick={() => handleCopy(m.token)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                      style={{ background: copied === m.token ? '#5DCAA51a' : 'var(--bg-surface)' }}
                      title="Copy portal link"
                    >
                      {copied === m.token ? (
                        <span className="text-[#5DCAA5] text-[11px] font-bold">✓</span>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <rect x="9" y="9" width="13" height="13" rx="2" stroke="var(--text-muted)" strokeWidth="1.8"/>
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="var(--text-muted)" strokeWidth="1.8"/>
                        </svg>
                      )}
                    </button>

                    {/* Remove */}
                    <button
                      onClick={() => handleRemove(m.id)}
                      disabled={removing === m.id}
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                      style={{ background: 'var(--bg-surface)', opacity: removing === m.id ? 0.4 : 1 }}
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

          {/* How it works hint */}
          <div className="mt-5 px-3 py-3 rounded-xl bg-[#5B8DEF08] border border-[#5B8DEF14]">
            <div className="text-[9px] font-mono font-bold text-[#5B8DEF] tracking-wider mb-1">HOW IT WORKS</div>
            <div className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Copy a member's link and send it via WhatsApp or text. They open it on their phone to see and check off tasks — no login needed.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
