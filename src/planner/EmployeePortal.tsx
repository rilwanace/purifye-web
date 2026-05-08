import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { EmployeeTaskDetail } from './EmployeeTaskDetail';

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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const fmtDate = (s: string) => {
  const d = new Date(s + 'T00:00:00');
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
};
const toDate = (s: string) => new Date(s + 'T00:00:00');
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);

async function portalFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export default function EmployeePortal() {
  const { token } = useParams<{ token: string }>();
  const [member, setMember] = useState<Member | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await portalFetch<{ member: Member; tasks: Task[] }>(
        `/api/planner/portal/${token}`
      );
      setMember(data.member);
      setTasks(data.tasks);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid link');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = useCallback(async (taskId: string) => {
    await portalFetch(`/api/planner/portal/${token}/tasks/${taskId}/toggle`, { method: 'POST' });
    load();
  }, [token, load]);

  const handleAddTask = useCallback(async () => {
    if (!newTitle.trim() || adding) return;
    setAdding(true);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const due = tomorrow.toISOString().split('T')[0];
      await portalFetch(`/api/planner/portal/${token}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ title: newTitle.trim(), due_date: due }),
      });
      setNewTitle('');
      load();
    } finally {
      setAdding(false);
    }
  }, [newTitle, adding, token, load]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#131311', fontFamily: '"DM Sans", sans-serif' }}
      >
        <div className="text-[#9c9b95] text-sm font-mono">Loading...</div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: '#131311', fontFamily: '"DM Sans", sans-serif' }}
      >
        <div className="text-center">
          <div className="text-4xl mb-3">🔗</div>
          <div className="text-[#e8e7e0] text-[16px] font-semibold mb-2">Invalid Link</div>
          <div className="text-[#9c9b95] text-[13px]">{error || 'This link is not valid.'}</div>
        </div>
      </div>
    );
  }

  const color = member.color;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const openTasks = tasks
    .filter(t => t.status === 'open')
    .sort((a, b) => toDate(a.due_date).getTime() - toDate(b.due_date).getTime());

  const doneTasks = tasks.filter(t => t.status === 'done');
  const selectedTask = tasks.find(t => t.id === selectedTaskId) ?? null;

  if (selectedTask) {
    return (
      <EmployeeTaskDetail
        token={token!}
        task={selectedTask}
        member={member}
        onBack={() => setSelectedTaskId(null)}
        onToggle={handleToggle}
        onRefresh={load}
      />
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: '#131311', fontFamily: '"DM Sans", sans-serif', colorScheme: 'dark' }}
    >
      <div className="max-w-[430px] mx-auto px-5 pb-16">

        {/* Header */}
        <div className="pt-9 pb-5">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-12 h-12 rounded-[14px] flex items-center justify-center text-[22px] font-bold"
              style={{ background: `${color}1a`, color }}
            >
              {member.name[0].toUpperCase()}
            </div>
            <div>
              <div className="text-[22px] font-bold text-[#e8e7e0] leading-tight">
                {member.name}
              </div>
              {member.role && (
                <div className="text-[12px] text-[#9c9b95]">{member.role}</div>
              )}
            </div>
          </div>
          <div className="text-[10px] font-mono text-[#9c9b95] mt-1">
            {DAY_NAMES[today.getDay()]} · {MONTHS[today.getMonth()]} {today.getDate()}
            {' · '}
            <span style={{ color }}>{openTasks.length} open task{openTasks.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Quick add input */}
        <div className="relative mb-7">
          <input
            className="w-full bg-transparent pb-2 text-[15px] text-[#e8e7e0] outline-none placeholder-[#9c9b95]"
            style={{ borderBottom: `2px solid ${color}33` }}
            placeholder="+ Add a task..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddTask(); }}
          />
          {newTitle.trim() && (
            <button
              onClick={handleAddTask}
              disabled={adding}
              className="absolute right-0 bottom-2.5 text-[11px] font-bold"
              style={{ color }}
            >
              {adding ? '...' : 'Add'}
            </button>
          )}
        </div>

        {/* Open tasks */}
        {openTasks.length === 0 && (
          <div className="text-center py-10">
            <div className="text-[13px] text-[#9c9b95] italic">Nothing open — great work! 🎉</div>
          </div>
        )}

        {openTasks.map(task => {
          const due = toDate(task.due_date);
          const diff = daysBetween(today, due);
          const isOverdue = diff < 0;
          const isToday = diff === 0;
          const dueColor = isOverdue ? '#D85A30' : isToday ? color : '#9c9b95';

          return (
            <div
              key={task.id}
              className="flex items-center gap-3 py-3.5 border-b border-[rgba(255,255,255,.05)]"
            >
              {/* Check circle */}
              <button
                onClick={() => handleToggle(task.id)}
                className="w-[22px] h-[22px] rounded-full shrink-0 flex items-center justify-center transition-all"
                style={{
                  border: `2px solid ${isOverdue ? '#D85A30' : color}44`,
                  background: 'transparent',
                  minWidth: 22,
                }}
              />
              {/* Task info */}
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => setSelectedTaskId(task.id)}
              >
                <div className="text-[14px] font-medium text-[#e8e7e0] truncate">{task.title}</div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color: dueColor }}>
                  {isOverdue
                    ? `${Math.abs(diff)}d overdue`
                    : isToday
                    ? 'Today'
                    : fmtDate(task.due_date)}
                </div>
              </div>
              {/* Chevron */}
              <svg width="6" height="10" viewBox="0 0 6 10" fill="none" className="shrink-0 opacity-30">
                <path d="M1 1l4 4-4 4" stroke="#9c9b95" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          );
        })}

        {/* Completed section */}
        {doneTasks.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowDone(p => !p)}
              className="flex items-center gap-2 py-2.5 w-full"
            >
              <svg
                width="10" height="10" viewBox="0 0 12 12" fill="none"
                style={{ transform: showDone ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .2s' }}
              >
                <path d="M4 2l4 4-4 4" stroke="#9c9b95" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="text-[11px] font-mono text-[#9c9b95]">
                COMPLETED · {doneTasks.length}
              </span>
            </button>

            {showDone && doneTasks.map(task => (
              <div
                key={task.id}
                className="flex items-center gap-3 py-3 border-b border-[rgba(255,255,255,.04)]"
              >
                <button
                  onClick={() => handleToggle(task.id)}
                  className="w-[22px] h-[22px] rounded-full shrink-0 flex items-center justify-center"
                  style={{ border: '2px solid #5DCAA5', background: '#5DCAA522' }}
                >
                  <span className="text-[#5DCAA5] text-[10px]">✓</span>
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-[#9c9b95] line-through truncate">
                    {task.title}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PWA install hint */}
        <div
          className="mt-10 px-4 py-3.5 rounded-[10px] border"
          style={{ background: 'rgba(255,255,255,.02)', borderColor: 'rgba(255,255,255,.06)' }}
        >
          <div className="text-[9px] font-mono text-[#9c9b95] font-semibold tracking-wider mb-1">
            ADD TO HOME SCREEN
          </div>
          <div className="text-[11px] text-[#9c9b95] leading-relaxed">
            Tap your browser's share icon (iOS) or menu (Android) and choose "Add to Home Screen" to access your tasks instantly.
          </div>
        </div>
      </div>
    </div>
  );
}
