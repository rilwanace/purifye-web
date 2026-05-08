import { useState, useCallback } from 'react';
import type { Member } from './api';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Props {
  members: Member[];
  onClose: () => void;
  onAdd: (data: { title: string; assignee_id?: string; due_date: string; recurring?: string }) => void;
}

export function AddTaskModal({ members, onClose, onAdd }: Props) {
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [dueMonth, setDueMonth] = useState('');
  const [dueYear, setDueYear] = useState('');
  const [recurring, setRecurring] = useState('');

  const handleSubmit = useCallback(() => {
    if (!title.trim()) return;
    let due: string;
    if (dueDay && dueMonth !== '' && dueYear) {
      const m = String(parseInt(dueMonth) + 1).padStart(2, '0');
      const d = String(parseInt(dueDay)).padStart(2, '0');
      due = `${dueYear}-${m}-${d}`;
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      due = tomorrow.toISOString().split('T')[0];
    }
    onAdd({ title, assignee_id: assigneeId || undefined, due_date: due, recurring: recurring || undefined });
  }, [title, assigneeId, dueDay, dueMonth, dueYear, recurring, onAdd]);

  const selectClass = "w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] text-[var(--text-primary)] font-sans outline-none appearance-none";
  const inputClass = "w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] text-[var(--text-primary)] font-sans outline-none";
  const labelClass = "text-[10px] font-semibold font-mono text-[var(--text-muted)] tracking-wider block mt-3.5 mb-1";

  return (
    <div className="fixed inset-0 bg-black/60 z-60 flex items-end justify-center" onClick={onClose}>
      <div className="bg-[var(--bg-card)] rounded-t-2xl max-w-[430px] w-full max-h-[80vh] overflow-auto p-5 pb-8" onClick={e => e.stopPropagation()} style={{ colorScheme: 'dark' }}>
        <h2 className="text-base font-bold text-[var(--text-primary)] mb-4">Add task or reminder</h2>

        <label className={labelClass}>TASK TITLE</label>
        <input className={inputClass} placeholder="What needs to be done?" value={title} onChange={e => setTitle(e.target.value)} autoFocus />

        <label className={labelClass}>ASSIGN TO</label>
        <select className={selectClass} value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
          <option value="">Me (personal)</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        <label className={labelClass}>DUE DATE</label>
        <div className="flex gap-1.5">
          <select className={`${selectClass} flex-1`} value={dueDay} onChange={e => setDueDay(e.target.value)}>
            <option value="">Day</option>
            {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
          <select className={`${selectClass} flex-[1.3]`} value={dueMonth} onChange={e => setDueMonth(e.target.value)}>
            <option value="">Month</option>
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select className={`${selectClass} flex-1`} value={dueYear} onChange={e => setDueYear(e.target.value)}>
            <option value="">Year</option>
            {[2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <label className={labelClass}>RECURRING</label>
        <select className={selectClass} value={recurring} onChange={e => setRecurring(e.target.value)}>
          <option value="">One-time</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>

        <button
          onClick={handleSubmit}
          className="w-full py-3.5 rounded-xl text-sm font-semibold text-white mt-4"
          style={{ background: '#D4A843' }}
        >
          Create Task
        </button>
      </div>
    </div>
  );
}
