import { useState, useCallback } from 'react';
import type { Member } from './api';
import { inviteMember, deleteMember } from './api';

interface Props {
  members: Member[];
  onRefresh: () => void;
  onClose: () => void;
}

export function TeamManageModal({ members, onRefresh, onClose }: Props) {
  const [name, setName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const handleAdd = useCallback(async () => {
    if (!name.trim() || !email.trim()) { setAddError('Name and email required'); return; }
    setAdding(true);
    setAddError('');
    setInviteUrl(null);
    try {
      const res = await inviteMember({ name: name.trim(), job_title: jobTitle.trim(), email: email.trim().toLowerCase() }) as any;
      setName('');
      setJobTitle('');
      setEmail('');
      setInviteUrl(res.invite_url);
      onRefresh();
    } catch (e: any) {
      setAddError(e.message || 'Failed to send invite');
    } finally {
      setAdding(false);
    }
  }, [name, jobTitle, email, onRefresh]);

  const handleRemove = useCallback(async (id: string) => {
    setRemoving(id);
    try { await deleteMember(id); onRefresh(); } finally { setRemoving(null); }
  }, [onRefresh]);

  const handleCopy = useCallback(async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const inputClass = "bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] text-[var(--text-primary)] outline-none w-full";

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-end justify-center" onClick={onClose}>
      <div className="bg-[var(--bg-card)] rounded-t-2xl max-w-[430px] w-full max-h-[85vh] overflow-auto pb-8"
        onClick={e => e.stopPropagation()} style={{ colorScheme: 'dark' }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[rgba(255,255,255,.15)]" />
        </div>
        <div className="px-5 pt-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
              <span style={{ color: '#5B8DEF' }}>&#9670;</span> Team Members
            </h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] text-xl">x</button>
          </div>

          <div className="bg-[var(--bg-surface)] rounded-xl p-3 mb-5">
            <div className="text-[9px] font-bold font-mono text-[var(--text-muted)] tracking-wider mb-2.5">INVITE MEMBER</div>
            <div className="flex gap-2 mb-2">
              <input className={inputClass} style={{ flex: '1.5' }} placeholder="Name" value={name}
                onChange={e => setName(e.target.value)} autoFocus />
              <input className={inputClass} style={{ flex: 1 }} placeholder="Job title" value={jobTitle}
                onChange={e => setJobTitle(e.target.value)} />
            </div>
            <input className={inputClass + " mb-2"} type="email" placeholder="Email address" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }} />
            {addError && <div className="text-[11px] text-red-400 mb-2">{addError}</div>}
            {inviteUrl && (
              <div className="mb-2 p-2 rounded-lg bg-[var(--bg-card)] border border-[#5DCAA520]">
                <div className="text-[9px] font-mono text-[#5DCAA5] mb-1">INVITE LINK READY</div>
                <div className="text-[10px] text-[var(--text-muted)] truncate mb-1">{inviteUrl}</div>
                <button onClick={() => handleCopy(inviteUrl)}
                  className="text-[11px] font-semibold" style={{ color: copied ? '#5DCAA5' : '#5B8DEF' }}>
                  {copied ? 'Copied!' : 'Copy link'}
                </button>
              </div>
            )}
            <button onClick={handleAdd} disabled={!name.trim() || !email.trim() || adding}
              className="w-full py-2.5 rounded-lg text-[13px] font-semibold transition-all"
              style={{ background: name.trim() && email.trim() && !adding ? '#D4A843' : 'var(--bg-card)', color: name.trim() && email.trim() && !adding ? '#000' : 'var(--text-muted)' }}>
              {adding ? 'Sending...' : 'Send Invite'}
            </button>
          </div>

          {members.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-3xl mb-2">&#x1F465;</div>
              <div className="text-[13px] font-semibold text-[var(--text-secondary)] mb-1">No team members yet</div>
              <div className="text-[11px] text-[var(--text-muted)]">Invite someone above to get started</div>
            </div>
          ) : (
            <div>
              <div className="text-[9px] font-bold font-mono text-[var(--text-muted)] tracking-wider mb-2">
                {members.length} MEMBER{members.length !== 1 ? 'S' : ''}
              </div>
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3 py-3 border-b border-[rgba(255,255,255,.04)]">
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[15px] font-bold shrink-0"
                    style={{ background: m.color + '1a', color: m.color }}>
                    {m.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{m.name}</div>
                    {m.role && <div className="text-[10px] text-[var(--text-muted)] truncate">{m.role}</div>}
                    <div className="text-[9px] font-mono mt-0.5" style={{ color: m.has_portal_access ? '#5DCAA5' : '#9c9b95' }}>
                      {m.has_portal_access ? 'Portal active' : 'No portal access'}
                    </div>
                  </div>
                  <button onClick={() => handleRemove(m.id)} disabled={removing === m.id}
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                    style={{ background: 'var(--bg-surface)', opacity: removing === m.id ? 0.4 : 1 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 px-3 py-3 rounded-xl bg-[#5B8DEF08] border border-[#5B8DEF14]">
            <div className="text-[9px] font-mono font-bold text-[#5B8DEF] tracking-wider mb-1">HOW IT WORKS</div>
            <div className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Invite a member via email. They set a password and log in to see their tasks — no magic links needed.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
