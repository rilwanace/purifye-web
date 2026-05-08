import { useMemo } from 'react';
import type { Task } from './api';

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}`;
const toDate = (s: string) => { const d = new Date(s + 'T00:00:00'); return d; };
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);

const BAR_COLORS = ['#5B8DEF', '#5DCAA5', '#7068D9', '#CF5BA0', '#E8894F', '#6BC5D2'];

interface Props {
  tasks: Task[];
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}

export function MeTab({ tasks, onSelect, onToggle }: Props) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  const { todayTasks, overdueTasks, futureDays } = useMemo(() => {
    const todayT: Task[] = [];
    const overdue: Task[] = [];
    const futureMap = new Map<string, Task[]>();

    for (const t of tasks) {
      const due = toDate(t.due_date);
      const diff = daysBetween(today, due);
      if (diff < 0) overdue.push(t);
      else if (diff === 0) todayT.push(t);
      else {
        const key = t.due_date;
        if (!futureMap.has(key)) futureMap.set(key, []);
        futureMap.get(key)!.push(t);
      }
    }

    const days: { date: Date; tasks: Task[]; dayIndex: number }[] = [];
    for (let i = 1; i < 7; i++) {
      const d = addDays(today, i);
      const key = d.toISOString().split('T')[0];
      days.push({ date: d, tasks: futureMap.get(key) || [], dayIndex: i });
    }

    return { todayTasks: todayT, overdueTasks: overdue, futureDays: days };
  }, [tasks, today]);

  return (
    <div>
      {/* TODAY — gold top/bottom borders */}
      <div className="border-t-2 border-b-2 border-[#D4A843] py-2.5 px-3 mb-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold font-mono text-[var(--text-muted)]">
            {DAY_NAMES[today.getDay()]} · {fmtDate(today)}
          </span>
          <span className="text-[8px] font-bold font-mono text-[#D4A843] bg-[#D4A84315] px-2 py-0.5 rounded">TODAY</span>
        </div>
        {todayTasks.length === 0 && <div className="text-[11px] text-[var(--text-muted)] italic py-1">Nothing scheduled</div>}
        {todayTasks.map(t => (
          <TaskRow key={t.id} task={t} onSelect={onSelect} onToggle={onToggle} />
        ))}
      </div>

      {/* OVERDUE — red left bar */}
      {overdueTasks.length > 0 && (
        <div className="flex mb-0.5">
          <div className="w-[3px] rounded-sm bg-[#D85A30] mr-3 shrink-0" />
          <div className="flex-1 pb-2">
            <div className="text-[10px] font-bold font-mono text-[#D85A30] py-2">⚠ OVERDUE</div>
            {overdueTasks.map(t => {
              const diff = Math.abs(daysBetween(today, toDate(t.due_date)));
              return (
                <div key={t.id} className="flex items-center gap-2 py-[7px] cursor-pointer" onClick={() => onSelect(t.id)}>
                  <CheckCircle done={false} onClick={() => onToggle(t.id)} />
                  <span className="flex-1 text-xs font-medium text-[var(--text-primary)] truncate">{t.title}</span>
                  <span className="text-[8px] font-bold font-mono text-[#D85A30] bg-[#D85A301a] px-2 py-0.5 rounded shrink-0">{diff}D LATE</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FUTURE — colored left bars */}
      {futureDays.map((day, i) => {
        const barColor = BAR_COLORS[i % BAR_COLORS.length];
        return (
          <div key={i} className="flex mb-0.5">
            <div className="w-[3px] rounded-sm mr-3 shrink-0" style={{ background: barColor }} />
            <div className="flex-1 pb-2">
              <div className="text-[10px] font-bold font-mono text-[var(--text-muted)] py-2">
                {DAY_NAMES[day.date.getDay()]} · {fmtDate(day.date)}
              </div>
              {day.tasks.length === 0 && <div className="text-[11px] text-[var(--text-muted)] italic py-1">—</div>}
              {day.tasks.map(t => (
                <TaskRow key={t.id} task={t} onSelect={onSelect} onToggle={onToggle} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskRow({ task, onSelect, onToggle }: { task: Task; onSelect: (id: string) => void; onToggle: (id: string) => void }) {
  return (
    <div className="flex items-center gap-2 py-[7px] cursor-pointer" onClick={() => onSelect(task.id)}>
      <CheckCircle done={task.status === 'done'} onClick={() => onToggle(task.id)} />
      <span className="flex-1 text-xs font-medium text-[var(--text-primary)] truncate">{task.title}</span>
    </div>
  );
}

function CheckCircle({ done, onClick }: { done: boolean; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center transition-all duration-300"
      style={{
        border: `2px solid ${done ? '#5DCAA5' : 'rgba(255,255,255,.15)'}`,
        background: done ? '#5DCAA522' : 'transparent',
      }}
    >
      {done && <span className="text-[#5DCAA5] text-[10px]">✓</span>}
    </button>
  );
}
