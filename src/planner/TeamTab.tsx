import { useMemo } from 'react';
import type { Task, Member } from './api';

const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);
const toDate = (s: string) => new Date(s + 'T00:00:00');
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

interface Props {
  tasks: Task[];
  members: Member[];
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}

export function TeamTab({ tasks, members, onSelect, onToggle }: Props) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, { member: Member; tasks: Task[] }>();
    for (const m of members) map.set(m.id, { member: m, tasks: [] });
    for (const t of tasks) {
      if (t.assignee_id && map.has(t.assignee_id)) {
        map.get(t.assignee_id)!.tasks.push(t);
      }
    }
    return Array.from(map.values());
  }, [tasks, members]);

  const getDueLabel = (due: string) => {
    const diff = daysBetween(today, toDate(due));
    if (diff < 0) return { text: `${Math.abs(diff)}D LATE`, color: '#D85A30', urgent: true };
    if (diff === 0) return { text: 'TODAY', color: '#D4A843', urgent: false };
    if (diff === 1) return { text: 'TOMORROW', color: '#D4A843', urgent: false };
    const d = toDate(due);
    return { text: `DUE ${DAY_NAMES[d.getDay()]}`, color: '#5DCAA5', urgent: false };
  };

  return (
    <div className="pt-1">
      {grouped.map(({ member, tasks: mTasks }) => {
        const overdueCount = mTasks.filter(t => daysBetween(today, toDate(t.due_date)) < 0).length;
        return (
          <div key={member.id} className="mb-3">
            {/* Member header */}
            <div className="flex items-center gap-2 py-2">
              <div
                className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{ background: `${member.color}1a`, color: member.color }}
              >
                {member.name[0]}
              </div>
              <div className="flex-1 text-xs font-semibold" style={{ color: member.color }}>{member.name}</div>
              <div className="text-[9px] font-mono font-semibold" style={{ color: member.color }}>
                {mTasks.length} task{mTasks.length !== 1 ? 's' : ''}
                {overdueCount > 0 && <span className="text-[#D85A30] ml-1.5">· {overdueCount} late</span>}
              </div>
            </div>

            {/* Tasks */}
            {mTasks.map(t => {
              const due = getDueLabel(t.due_date);
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-[7px] px-2.5 rounded-md mb-0.5 ml-[34px] cursor-pointer"
                  style={{ background: `${member.color}08`, border: `1px solid ${member.color}14` }}
                  onClick={() => onSelect(t.id)}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggle(t.id); }}
                    className="w-5 h-5 rounded-full shrink-0 mr-2 flex items-center justify-center"
                    style={{ border: '2px solid rgba(255,255,255,.15)' }}
                  />
                  <span className="flex-1 text-[11px] font-medium text-[var(--text-primary)] truncate">{t.title}</span>
                  <span
                    className="text-[8px] font-bold font-mono px-2 py-0.5 rounded shrink-0"
                    style={{ background: due.urgent ? '#D85A301a' : `${member.color}1a`, color: due.urgent ? '#D85A30' : member.color }}
                  >
                    {due.text}
                  </span>
                </div>
              );
            })}

            {mTasks.length === 0 && (
              <div className="ml-[34px] text-[11px] text-[var(--text-muted)] italic py-1.5">No active tasks</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
