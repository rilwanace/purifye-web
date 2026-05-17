import { useState, useCallback } from 'react';
import { useMembers, inviteMember, deleteMember } from './api';

export default function PlannerTeamSettings() {
  const { data: members, refresh } = useMembers();
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
      refresh();
    } catch (e: any) {
      setAddError(e.message || 'Failed to send invite');
    } finally {
      setAdding(false);
    }
  }, [name, jobTitle, email, refresh]);

  const handleRemove = useCallback(async (id: string) => {
    setRemoving(id);
    try { await deleteMember(id); refresh(); } finally { setRemoving(null); }
  }, [refresh]);

  const handleCopy = useCallback(async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  if (!members) return null;

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '10px 12px', fontSize: 13, color: 'var(--text-primary)', outline: 'none',
    width: '100%', boxSizing: 'border-box', minHeight: 40,
  };

  return (
    <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#D4A843', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16, fontFamily: 'var(--font-mono)' }}>
        Team Members
      </div>

      <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.8px', marginBottom: 10 }}>
          INVITE MEMBER
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input style={{ ...inputStyle, flex: 1.5 }} placeholder="Name" value={name}
            onChange={e => setName(e.target.value)} />
          <input style={{ ...inputStyle, flex: 1 }} placeholder="Job title" value={jobTitle}
            onChange={e => setJobTitle(e.target.value)} />
        </div>
        <input style={{ ...inputStyle, marginBottom: 8 }} type="email" placeholder="Email address" value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }} />
        {addError && <div style={{ fontSize: 11, color: '#D85A30', marginBottom: 8 }}>{addError}</div>}
        {inviteUrl && (
          <div style={{ marginBottom: 8, padding: 8, borderRadius: 8, background: 'var(--bg-card)', border: '1px solid #5DCAA520' }}>
            <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#5DCAA5', marginBottom: 4 }}>INVITE LINK READY</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{inviteUrl}</div>
            <button onClick={() => handleCopy(inviteUrl)} style={{ fontSize: 11, fontWeight: 600, color: copied ? '#5DCAA5' : '#5B8DEF', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        )}
        <button onClick={handleAdd} disabled={!name.trim() || !email.trim() || adding}
          style={{ width: '100%', minHeight: 40, background: name.trim() && email.trim() && !adding ? '#D4A843' : 'var(--bg-card)', color: name.trim() && email.trim() && !adding ? '#000' : 'var(--text-muted)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {adding ? 'Sending...' : 'Send Invite'}
        </button>
      </div>

      {members.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>&#x1F465;</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>No team members yet</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Invite someone above to get started</div>
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
                <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', marginTop: 2, color: m.has_portal_access ? '#5DCAA5' : '#9c9b95' }}>
                  {m.has_portal_access ? 'Portal active' : 'No portal access'}
                </div>
              </div>
              <button onClick={() => handleRemove(m.id)} disabled={removing === m.id}
                style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface)', border: 'none', cursor: 'pointer', opacity: removing === m.id ? 0.4 : 1 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: '#5B8DEF08', border: '1px solid #5B8DEF14' }}>
        <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#5B8DEF', letterSpacing: '0.8px', marginBottom: 4 }}>HOW IT WORKS</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Invite a member via email. They set a password and log in to see their tasks.
        </div>
      </div>
    </div>
  );
}
