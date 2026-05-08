import { useState, useCallback, useMemo } from 'react';
import type { Task, Member, Contact, Message } from './api';
import { useMessages, useAudit, sendMessage } from './api';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (s: string) => { const d = new Date(s); return `${MONTHS[d.getMonth()]} ${d.getDate()}`; };
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);
const toDate = (s: string) => new Date(s + 'T00:00:00');

interface Props {
  task: Task;
  members: Member[];
  contacts: Contact[];
  onBack: () => void;
  onToggle: (id: string) => void;
  onWhatsApp: (contact: Contact, message: string, taskId?: string) => void;
  onWhatsAppNew: (name: string, phone: string, message: string, taskId?: string) => void;
}

export function TaskDetail({ task, members, contacts, onBack, onToggle, onWhatsApp, onWhatsAppNew }: Props) {
  const { data: messages, refresh: refreshMessages } = useMessages(task.id);
  const { data: audit } = useAudit(task.id);
  const [chatInput, setChatInput] = useState('');
  const [showAudit, setShowAudit] = useState(false);
  const [showWaPicker, setShowWaPicker] = useState(false);
  const [waNewName, setWaNewName] = useState('');
  const [waNewPhone, setWaNewPhone] = useState('');
  const [waSearch, setWaSearch] = useState('');

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const due = toDate(task.due_date);
  const diff = daysBetween(today, due);
  const member = task.assignee_id ? members.find(m => m.id === task.assignee_id) : null;

  const statusColor = task.status === 'done' ? '#5DCAA5' : diff < 0 ? '#D85A30' : '#5B8DEF';
  const statusText = task.status === 'done' ? 'DONE' : diff < 0 ? `${Math.abs(diff)}D OVERDUE` : 'OPEN';

  const handleSendChat = useCallback(async () => {
    if (!chatInput.trim()) return;
    await sendMessage(task.id, chatInput, 'owner');
    setChatInput('');
    refreshMessages();
    setShowWaPicker(false);
  }, [chatInput, task.id, refreshMessages]);

  const handleWaSend = useCallback((contact: Contact) => {
    if (!chatInput.trim()) return;
    onWhatsApp(contact, chatInput, task.id);
    setChatInput('');
    setShowWaPicker(false);
  }, [chatInput, task.id, onWhatsApp]);

  const handleWaNewSend = useCallback(() => {
    if (!chatInput.trim() || !waNewName.trim() || !waNewPhone.trim()) return;
    onWhatsAppNew(waNewName, waNewPhone, chatInput, task.id);
    setChatInput('');
    setShowWaPicker(false);
    setWaNewName('');
    setWaNewPhone('');
  }, [chatInput, waNewName, waNewPhone, task.id, onWhatsAppNew]);

  const filteredContacts = useMemo(() =>
    contacts.filter(c => !waSearch || c.name.toLowerCase().includes(waSearch.toLowerCase()) || c.phone.includes(waSearch)),
    [contacts, waSearch]
  );

  const getMsgColor = (msg: Message) => {
    if (msg.sender === 'bot') return '#5B8DEF';
    if (msg.sender === 'owner') return '#5DCAA5';
    const m = members.find(m => m.id === msg.sender_member_id);
    return m?.color || '#9c9b95';
  };

  return (
    <div className="pt-4">
      <button onClick={onBack} className="text-[13px] text-[var(--text-muted)] mb-4 block">← Back</button>

      {/* Task header */}
      <div className="bg-[var(--bg-card)] rounded-[14px] p-4 border border-[var(--border)] mb-3">
        <div className="flex items-center gap-2.5 mb-2.5">
          {/* Check circle */}
          <button
            onClick={() => onToggle(task.id)}
            className="w-[22px] h-[22px] rounded-full shrink-0 flex items-center justify-center transition-all"
            style={{ border: `2px solid ${task.status === 'done' ? '#5DCAA5' : 'rgba(255,255,255,.15)'}`, background: task.status === 'done' ? '#5DCAA522' : 'transparent' }}
          >
            {task.status === 'done' && <span className="text-[#5DCAA5] text-[10px]">✓</span>}
          </button>
          <span className="flex-1 text-[15px] font-bold text-[var(--text-primary)] leading-tight">{task.title}</span>
          {member && (
            <span className="text-[10px] font-semibold font-mono shrink-0" style={{ color: member.color }}>{member.name}</span>
          )}
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded" style={{ background: `${statusColor}1a`, color: statusColor }}>
            {statusText}
          </span>
          {task.recurring && (
            <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded bg-[#7068D91a] text-[#7068D9]">
              {task.recurring.toUpperCase()}
            </span>
          )}
        </div>

        {/* Collapsed audit */}
        <button
          onClick={() => setShowAudit(p => !p)}
          className="flex items-center justify-between w-full px-2.5 py-2 bg-[var(--bg-surface)] rounded-lg cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="w-[5px] h-[5px] rounded-full" style={{ background: statusColor }} />
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              Created {fmtDate(task.created_at)} → Due {fmtDate(task.due_date)} · {task.status === 'done' ? 'Done' : diff < 0 ? 'Overdue' : 'Pending'}
            </span>
          </div>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ transform: showAudit ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .2s' }}>
            <path d="M4 2l4 4-4 4" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {showAudit && audit && (
          <div className="relative pl-[18px] mt-2.5">
            <div className="absolute left-[5px] top-1 bottom-1 w-px bg-[rgba(255,255,255,.06)]" />
            {audit.map((ev) => (
              <div key={ev.id} className="relative py-[5px]">
                <div className="w-[11px] h-[11px] rounded-full border-2 absolute -left-[18px] top-[9px]"
                  style={{ borderColor: '#5DCAA5', background: '#5DCAA5' }} />
                <div className="text-[10px] font-medium text-[#5DCAA5]">{ev.event}{ev.detail ? ` · ${ev.detail}` : ''}</div>
                <div className="text-[8px] font-mono text-[var(--text-muted)] mt-0.5">{fmtDate(ev.created_at)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] font-bold font-mono tracking-wider text-[var(--text-muted)]">CHAT</span>
        <div className="flex-1 h-px bg-[rgba(255,255,255,.06)]" />
      </div>

      {(!messages || messages.length === 0) && (
        <div className="text-[11px] text-[var(--text-muted)] italic py-2">No messages yet</div>
      )}

      {messages?.map(msg => {
        const color = getMsgColor(msg);
        const name = msg.sender === 'bot' ? 'Bot' : msg.sender === 'owner' ? 'You' : msg.sender_name || 'Member';
        return (
          <div key={msg.id} className="flex gap-2 py-2 border-b border-[rgba(255,255,255,.03)]">
            <div
              className="w-[22px] h-[22px] rounded-md flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5"
              style={{ background: `${color}1a`, color }}
            >
              {msg.sender === 'bot' ? 'B' : name[0]}
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-medium leading-snug" style={{ color: msg.sender === 'bot' ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                {msg.body}
              </div>
              <div className="text-[8px] font-mono text-[var(--text-muted)] mt-0.5">
                <span style={{ color }}>{name}</span> · {fmtDate(msg.created_at)}
              </div>
            </div>
          </div>
        );
      })}

      {/* WhatsApp contact picker */}
      {showWaPicker && (
        <div className="bg-[rgba(37,211,102,.04)] border border-[rgba(37,211,102,.12)] rounded-[10px] p-3 mt-2 mb-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold font-mono text-[#25D366] tracking-wider">SEND TO</span>
            <button onClick={() => { setShowWaPicker(false); setWaSearch(''); }} className="text-[var(--text-muted)] text-xs">×</button>
          </div>

          {/* New contact row */}
          <div className="flex gap-1 mb-2">
            <input className="flex-1 bg-[var(--bg-surface)] border border-[rgba(37,211,102,.15)] rounded-md px-2.5 py-[7px] text-[11px] text-[var(--text-primary)] outline-none" placeholder="Name" value={waNewName} onChange={e => setWaNewName(e.target.value)} style={{ colorScheme: 'dark' }} />
            <input className="flex-1 bg-[var(--bg-surface)] border border-[rgba(37,211,102,.15)] rounded-md px-2.5 py-[7px] text-[11px] text-[var(--text-primary)] outline-none" placeholder="+94..." value={waNewPhone} onChange={e => setWaNewPhone(e.target.value)} style={{ colorScheme: 'dark' }} />
            <button onClick={handleWaNewSend} className="px-2.5 rounded-md shrink-0 flex items-center" style={{ background: waNewName && waNewPhone ? '#25D366' : 'var(--bg-surface)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>

          {/* Search */}
          {contacts.length >= 5 && (
            <input className="w-full bg-[var(--bg-surface)] border border-[rgba(37,211,102,.1)] rounded-md px-2.5 py-[7px] text-[11px] text-[var(--text-primary)] outline-none mb-1.5" placeholder="Search contacts..." value={waSearch} onChange={e => setWaSearch(e.target.value)} style={{ colorScheme: 'dark' }} />
          )}

          {/* Saved contacts */}
          <div className="max-h-40 overflow-y-auto">
            {filteredContacts.map(c => (
              <div key={c.id} onClick={() => handleWaSend(c)} className="flex items-center gap-2 py-2 px-1.5 border-b border-[rgba(255,255,255,.03)] rounded-md cursor-pointer">
                <div className="w-6 h-6 rounded-md bg-[rgba(37,211,102,.1)] text-[#25D366] flex items-center justify-center text-[10px] font-bold shrink-0">{c.name[0]}</div>
                <div className="flex-1">
                  <div className="text-xs font-medium text-[var(--text-primary)]">{c.name}</div>
                  <div className="text-[8px] font-mono text-[var(--text-muted)]">{c.phone}{c.label ? ` · ${c.label}` : ''}</div>
                </div>
                <WaIcon size={12} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unified input — send arrow + WhatsApp icon */}
      <div className="relative mt-2">
        <input
          className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg pl-3 pr-[72px] py-2.5 text-xs text-[var(--text-primary)] outline-none"
          placeholder="Write a message..."
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSendChat(); }}
          style={{ colorScheme: 'dark' }}
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-0.5 items-center">
          {/* WhatsApp icon */}
          <button
            onClick={() => { if (chatInput.trim()) setShowWaPicker(true); }}
            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
            style={{ background: chatInput.trim() ? 'rgba(37,211,102,.15)' : 'transparent' }}
          >
            <WaIcon size={13} muted={!chatInput.trim()} />
          </button>
          {/* Send arrow */}
          <button
            onClick={handleSendChat}
            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
            style={{ background: chatInput.trim() ? '#D4A84322' : 'transparent' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke={chatInput.trim() ? '#D4A843' : 'var(--text-muted)'} strokeWidth="2" strokeLinecap="round" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={chatInput.trim() ? '#D4A843' : 'var(--text-muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function WaIcon({ size = 13, muted = false }: { size?: number; muted?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={muted ? 'var(--text-muted)' : '#25D366'}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.103-1.128l-.29-.174-3.01.894.81-2.96-.186-.296A8 8 0 1112 20z"/>
    </svg>
  );
}
