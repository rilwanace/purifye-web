import { useState, useCallback, useEffect } from 'react';

interface Member {
  id: string;
  name: string;
  role: string;
  color: string;
  token: string;
}

interface Task {
  id: string;
  title: string;
  due_date: string;
  status: 'open' | 'done';
  created_at: string;
  completed_at: string | null;
}

interface Message {
  id: string;
  sender: 'owner' | 'member' | 'bot';
  body: string;
  created_at: string;
}

interface Props {
  token: string;
  task: Task;
  member: Member;
  onBack: () => void;
  onToggle: (id: string) => void;
  onRefresh: () => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (s: string) => {
  const d = new Date(s);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
};

async function portalFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function EmployeeTaskDetail({ token, task, member, onBack, onToggle, onRefresh }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    try {
      const msgs = await portalFetch<Message[]>(
        `/api/planner/portal/${encodeURIComponent(token)}/tasks/${encodeURIComponent(task.id)}/messages`
      );
      setMessages(msgs);
    } catch (_) {}
  }, [token, task.id]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await portalFetch(`/api/planner/portal/${encodeURIComponent(token)}/tasks/${encodeURIComponent(task.id)}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: input.trim() }),
      });
      setInput('');
      loadMessages();
    } finally {
      setSending(false);
    }
  }, [input, sending, token, task.id, loadMessages]);

  const color = member.color;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(task.due_date + 'T00:00:00');
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  const statusColor = task.status === 'done' ? '#5DCAA5' : diff < 0 ? '#D85A30' : color;
  const statusText = task.status === 'done' ? 'DONE' : diff < 0 ? `${Math.abs(diff)}D OVERDUE` : diff === 0 ? 'TODAY' : 'OPEN';

  return (
    <div
      className="min-h-screen bg-[#131311]"
      style={{ fontFamily: '"DM Sans", sans-serif', colorScheme: 'dark' }}
    >
      <div className="max-w-[430px] mx-auto px-5 pb-28">

        {/* Back button */}
        <div className="pt-6 pb-3">
          <button onClick={onBack} className="text-[13px] font-medium" style={{ color }}>
            ← Back
          </button>
        </div>

        {/* Task card */}
        <div
          className="rounded-[14px] p-4 mb-5 border"
          style={{ background: `${color}08`, borderColor: `${color}18` }}
        >
          <div className="flex items-start gap-3 mb-3">
            <button
              onClick={() => { onToggle(task.id); onRefresh(); }}
              className="w-[22px] h-[22px] rounded-full shrink-0 mt-0.5 flex items-center justify-center transition-all"
              style={{
                border: `2px solid ${task.status === 'done' ? '#5DCAA5' : color}`,
                background: task.status === 'done' ? '#5DCAA522' : 'transparent',
              }}
            >
              {task.status === 'done' && <span className="text-[#5DCAA5] text-[10px]">✓</span>}
            </button>
            <div className="flex-1">
              <div className="text-[16px] font-bold text-[#e8e7e0] leading-tight mb-2">
                {task.title}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-[9px] font-bold font-mono px-2 py-0.5 rounded"
                  style={{ background: `${statusColor}1a`, color: statusColor }}
                >
                  {statusText}
                </span>
                <span className="text-[9px] font-mono text-[#9c9b95]">
                  Due {fmtDate(task.due_date)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Chat section */}
        <div className="text-[9px] font-bold font-mono text-[#9c9b95] tracking-wider mb-3">
          CHAT
        </div>

        {messages.length === 0 && (
          <div className="text-[11px] text-[#9c9b95] italic py-2">
            No messages yet. Send one below.
          </div>
        )}

        {messages.map(msg => {
          const isMe = msg.sender === 'member';
          const isBot = msg.sender === 'bot';
          const msgColor = isBot ? '#5B8DEF' : isMe ? color : '#5DCAA5';
          const label = isBot ? 'Bot' : isMe ? member.name : 'Owner';
          return (
            <div
              key={msg.id}
              className="flex gap-2 py-2.5 border-b border-[rgba(255,255,255,.04)]"
            >
              <div
                className="w-[22px] h-[22px] rounded-md flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5"
                style={{ background: `${msgColor}1a`, color: msgColor }}
              >
                {label[0]}
              </div>
              <div className="flex-1">
                <div className="text-[12px] font-medium text-[#e8e7e0] leading-snug">
                  {msg.body}
                </div>
                <div className="text-[8px] font-mono text-[#9c9b95] mt-0.5">
                  <span style={{ color: msgColor }}>{label}</span> · {fmtDate(msg.created_at)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fixed message input */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430,
          background: '#131311', borderTop: '1px solid rgba(255,255,255,.06)',
          padding: '12px 20px 20px',
        }}
      >
        <div className="relative">
          <input
            className="w-full rounded-xl pl-4 pr-12 py-3 text-[13px] text-[#e8e7e0] outline-none"
            style={{ background: 'rgba(255,255,255,.06)', colorScheme: 'dark' }}
            placeholder="Send a message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: input.trim() ? color : 'transparent' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke={input.trim() ? '#000' : '#9c9b95'} strokeWidth="2" strokeLinecap="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={input.trim() ? '#000' : '#9c9b95'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
