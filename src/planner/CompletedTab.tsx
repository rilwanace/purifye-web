import { useState } from 'react';
import type { Task, Member } from './api';

interface Props {
  tasks: Task[];
  members: Member[];
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}

export function CompletedTab({ tasks, members, onSelect, onToggle }: Props) {
  const [sub, setSub] = useState<'me' | 'team'>('me');

  const myDone = tasks.filter(t => !t.assignee_id);
  const teamDone = tasks.filter(t => t.assignee_id);

  const memberMap = new Map(members.map(m => [m.id, m]));

  const items = sub === 'me' ? myDone : teamDone;

  return (
    <div className="pt-2">
      {/* Sub-tabs */}
      <div className="flex gap-1 mb-3">
        {(['me', 'team'] as const).map(key => (
          <button
            key={key}
            onClick={() => setSub(key)}
            className="px-3.5 py-1.5 rounded-md text-[10px] font-semibold font-mono transition-all"
            style={{
              background: sub === key ? '#5DCAA51a' : 'transparent',
              color: sub === key ? '#5DCAA5' : 'var(--text-muted)',
              border: sub === key ? '1px solid #5DCAA533' : '1px solid transparent',
            }}
          >
            {key === 'me' ? 'Me' : 'Team'}
          </button>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-10">
          <div className="text-3xl mb-2">📋</div>
          <div className="text-sm font-semibold text-[var(--text-secondary)]">
            No completed {sub === 'me' ? '' : 'team '}tasks yet
          </div>
        </div>
      )}

      {items.map(t => {
        const member = t.assignee_id ? memberMap.get(t.assignee_id) : null;
        return (
          <div
            key={t.id}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-1 cursor-pointer"
            style={{ background: '#5DCAA506', border: '1px solid #5DCAA512' }}
            onClick={() => onSelect(t.id)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(t.id); }}
              className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
              style={{ border: '2px solid #5DCAA5', background: '#5DCAA522' }}
            >
              <span className="text-[#5DCAA5] text-[10px]">✓</span>
            </button>
            <span className="flex-1 text-xs font-medium text-[var(--text-muted)] line-through">{t.title}</span>
            {member && (
              <span className="text-[9px] font-mono font-semibold shrink-0" style={{ color: member.color }}>
                {member.name}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
