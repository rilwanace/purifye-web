import { useState, useEffect } from 'react'
import { api } from '../../api'
import { useToast } from '../../shared/components/Toast'

interface Member {
  id: string
  name: string
  email: string
  role: string
  last_login: string | null
}

export default function TeamManagement() {
  const { show } = useToast()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'staff' })
  const [inviting, setInviting] = useState(false)
  const [tempPw, setTempPw] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  function load() {
    setLoading(true)
    api<{ members: Member[] }>('/api/settings/team')
      .then(d => setMembers(d.members || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function invite() {
    if (!inviteForm.email || !inviteForm.name) { show('Email and name required', 'error'); return }
    setInviting(true)
    try {
      const res = await api<{ ok: boolean; temp_password: string }>('/api/settings/team/invite', {
        method: 'POST',
        body: JSON.stringify(inviteForm),
      })
      setTempPw(res.temp_password)
      setInviteForm({ email: '', name: '', role: 'staff' })
      setShowInvite(false)
      load()
      show('Member added', 'success')
    } catch (err: any) {
      show(err.message || 'Invite failed', 'error')
    } finally {
      setInviting(false)
    }
  }

  async function removeMember(id: string) {
    try {
      await api(`/api/settings/team/${id}`, { method: 'DELETE' })
      show('Member removed', 'success')
      setDeleteConfirm(null)
      load()
    } catch (err: any) {
      show(err.message || 'Remove failed', 'error')
    }
  }

  function fmtDate(s: string | null) {
    if (!s) return 'Never'
    try { return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) }
    catch { return s }
  }

  const AVATAR_COLORS = ['#D85A30','#5B8DEF','#5DCAA5','#7068D9','#CF5BA0','#E8894F','#6BC5D2','#A78BFA']
  const getAvatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

  const sty: Record<string, React.CSSProperties> = {
    section: { padding: '20px 16px', borderBottom: '1px solid var(--border)' },
    sectionTitle: { fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, fontFamily: 'var(--font-mono)' },
    hdrRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    inviteBtn: {
      minHeight: 36,
      background: 'var(--accent)',
      color: '#000',
      border: 'none',
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
      padding: '0 14px',
    },
    row: {
      display: 'flex',
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: '1px solid var(--border)',
      gap: 10,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      fontWeight: 700,
      flexShrink: 0,
    },
    name: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' },
    sub: { fontSize: 12, color: 'var(--text-muted)' },
    badge: {
      padding: '2px 6px',
      borderRadius: 6,
      fontSize: 9,
      fontWeight: 700,
      background: 'rgba(93,202,165,0.1)',
      color: '#5DCAA5',
      fontFamily: 'var(--font-mono)',
    },
    delBtn: { background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 18, padding: '4px 8px', marginLeft: 'auto', lineHeight: 1 },
    inviteCard: {
      background: 'var(--bg-card)',
      borderRadius: 10,
      padding: 14,
      marginBottom: 14,
      border: '1px solid var(--accent-border)',
    },
    inp: {
      width: '100%',
      background: 'var(--bg-input)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '12px',
      color: 'var(--text-primary)',
      fontSize: 13,
      outline: 'none',
      boxSizing: 'border-box' as const,
      marginBottom: 8,
      fontFamily: 'var(--font-sans)',
    },
    sel: {
      width: '100%',
      background: 'var(--bg-input)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '12px',
      color: 'var(--text-primary)',
      fontSize: 13,
      outline: 'none',
      marginBottom: 8,
      fontFamily: 'var(--font-sans)',
    },
    inviteActs: { display: 'flex', gap: 8 },
    saveBtn: { flex: 1, minHeight: 38, background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    cancelBtn: { flex: 1, minHeight: 38, background: 'var(--bg-input)', color: 'var(--text-muted)', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' },
    overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500 },
    modal: { position: 'fixed' as const, bottom: 0, left: 0, right: 0, maxWidth: 430, margin: '0 auto', borderRadius: '14px 14px 0 0', background: '#1a1a18', padding: 20 },
    modalTitle: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, fontFamily: 'var(--font-sans)' },
    modalMsg: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, fontFamily: 'var(--font-sans)' },
    modalActs: { display: 'flex', gap: 8 },
    btnRed: { flex: 1, height: 48, background: 'transparent', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-sans)' },
    btnGreen: { flex: 1, height: 48, background: 'rgba(216,90,48,0.1)', color: '#D85A30', border: '1px solid rgba(216,90,48,0.2)', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' },
    pwNotice: { marginTop: 12, background: 'var(--bg-card)', borderRadius: 10, padding: 14, border: '1px solid var(--warning)' },
    pwText: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 },
    pwValue: { fontSize: 16, fontWeight: 700, color: 'var(--warning)', fontFamily: 'var(--font-mono)' },
  }

  return (
    <div style={sty.section}>
      <div style={sty.hdrRow}>
        <div style={sty.sectionTitle}>Team Members</div>
        <button style={sty.inviteBtn} onClick={() => setShowInvite(!showInvite)}>
          {showInvite ? 'Cancel' : 'Invite member'}
        </button>
      </div>

      {showInvite && (
        <div style={sty.inviteCard}>
          <input style={sty.inp} placeholder="Email" type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} autoFocus />
          <input style={sty.inp} placeholder="Name" value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} />
          <select style={sty.sel} value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}>
            <option value="staff">Staff</option>
            <option value="accountant">Accountant</option>
            <option value="owner">Owner</option>
          </select>
          <div style={sty.inviteActs}>
            <button style={sty.cancelBtn} onClick={() => setShowInvite(false)}>Cancel</button>
            <button style={sty.saveBtn} onClick={invite} disabled={inviting}>
              {inviting ? 'Inviting…' : 'Add member'}
            </button>
          </div>
        </div>
      )}

      {tempPw && (
        <div style={sty.pwNotice}>
          <div style={sty.pwText}>Share this temporary password with the new member:</div>
          <div style={sty.pwValue}>{tempPw}</div>
          <button style={{ ...sty.cancelBtn, marginTop: 8, width: '100%' }} onClick={() => setTempPw('')}>Dismiss</button>
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</div>
      ) : (
        members.map(m => (
          <div key={m.id} style={sty.row}>
            <div style={{ ...sty.avatar, background: getAvatarColor(m.name) + '1A', color: getAvatarColor(m.name) }}>{m.name[0]?.toUpperCase() || '?'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={sty.name}>{m.name}</span>
                <span style={sty.badge}>{m.role}</span>
              </div>
              <div style={sty.sub}>{m.email} · Last login: {fmtDate(m.last_login)}</div>
            </div>
            {m.role !== 'owner' && (
              <button style={sty.delBtn} onClick={() => setDeleteConfirm(m.id)}>×</button>
            )}
          </div>
        ))
      )}

      {deleteConfirm && (
        <div style={sty.overlay}>
          <div style={sty.modal}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />
            <div style={sty.modalTitle}>Remove member?</div>
            <div style={sty.modalMsg}>This will remove the team member's access.</div>
            <div style={sty.modalActs}>
              <button style={sty.btnRed} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button style={sty.btnGreen} onClick={() => removeMember(deleteConfirm)}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
