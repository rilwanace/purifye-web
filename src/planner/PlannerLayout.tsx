/**
 * PlannerLayout — internal nav for planner bot
 * Mount at /planner/* in App.tsx
 */
import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../auth/useAuth';
import { useAllTasks, useMembers, useContacts, updateTask, createTask, sendMessage, createContact, type Contact } from './api';
import { openWhatsApp } from '../shared/utils/whatsapp';
import { MeTab } from './MeTab';
import { TeamTab } from './TeamTab';
import { CompletedTab } from './CompletedTab';
import { TaskDetail } from './TaskDetail';
import { AddTaskModal } from './AddTaskModal';
import { TeamManageModal } from './TeamManageModal';

// ─── Date helpers ─────────────────────────────────────────────────────
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}`;
const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };

export default function PlannerLayout() {
  useAuth(); // required for auth context
  const { data: tasks, refresh: refreshTasks } = useAllTasks();
  const { data: members, refresh: refreshMembers } = useMembers();
  const { data: contacts, refresh: refreshContacts } = useContacts();

  const [tab, setTab] = useState<'me' | 'team' | 'done'>('me');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManage, setShowManage] = useState(false);

  const t = today();
  const selectedTask = useMemo(() => tasks?.find(t => t.id === selectedTaskId) ?? null, [tasks, selectedTaskId]);

  // Toggle task done/open
  const toggleTask = useCallback(async (id: string) => {
    const task = tasks?.find(t => t.id === id);
    if (!task) return;
    await updateTask(id, { status: task.status === 'done' ? 'open' : 'done' });
    refreshTasks();
  }, [tasks, refreshTasks]);

  // Send WhatsApp
  const handleWhatsApp = useCallback(async (contact: Contact, message: string, taskId?: string) => {
    openWhatsApp(contact.phone, message);
    if (taskId) {
      await sendMessage(taskId, `WhatsApp to ${contact.name}: "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}"`, 'bot');
      refreshTasks();
    }
  }, [refreshTasks]);

  // Auto-save contact on WA send
  const handleWhatsAppNew = useCallback(async (name: string, phone: string, message: string, taskId?: string) => {
    openWhatsApp(phone, message);
    await createContact({ name, phone });
    refreshContacts();
    if (taskId) {
      await sendMessage(taskId, `WhatsApp to ${name}: "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}"`, 'bot');
      refreshTasks();
    }
  }, [refreshContacts, refreshTasks]);

  if (!tasks || !members || !contacts) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--text-muted)] font-mono text-xs">Loading planner...</div>
      </div>
    );
  }

  return (
    <div className="max-w-[430px] mx-auto">
      {/* Nav */}
      <div className="flex items-center justify-between px-5 pt-3.5 pb-2.5 border-b border-[var(--border)] sticky top-0 bg-[var(--bg-primary)] z-50">
        <div>
          <div className="text-[15px] font-bold tracking-tight">
            <span className="text-[#D4A843]">◆</span> Planner
          </div>
          <div className="text-[9px] text-[var(--text-muted)] font-mono">
            {DAY_NAMES[t.getDay()]} · {fmtDate(t)}
          </div>
        </div>
        <button
          onClick={() => setShowManage(true)}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{ background: 'var(--bg-surface)' }}
          title="Manage team"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="9" cy="7" r="4" stroke="var(--text-muted)" strokeWidth="1.8"/>
            <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M16 3.13a4 4 0 010 7.75" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M21 21v-2a4 4 0 00-3-3.87" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Tabs: Me / Team / Completed */}
      <div className="flex gap-1.5 px-5 py-2.5 border-b border-[rgba(255,255,255,0.03)]">
        {([['me', 'Me', '#D4A843'], ['team', 'Team', '#5B8DEF'], ['done', 'Completed', '#5DCAA5']] as const).map(([key, label, color]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setSelectedTaskId(null); }}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold font-mono transition-all"
            style={{
              background: tab === key ? `${color}1a` : 'transparent',
              color: tab === key ? color : 'var(--text-muted)',
              border: tab === key ? `1px solid ${color}33` : '1px solid transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-5 pb-24">
        {selectedTask ? (
          <TaskDetail
            task={selectedTask}
            members={members ?? []}
            contacts={contacts}
            onBack={() => setSelectedTaskId(null)}
            onToggle={toggleTask}
            onWhatsApp={handleWhatsApp}
            onWhatsAppNew={handleWhatsAppNew}
          />
        ) : (
          <>
            {tab === 'me' && (
              <MeTab
                tasks={tasks.filter(t => !t.assignee_id && t.status === 'open')}
                onSelect={setSelectedTaskId}
                onToggle={toggleTask}
              />
            )}
            {tab === 'team' && (
              <TeamTab
                tasks={tasks.filter(t => t.assignee_id && t.status === 'open')}
                members={members ?? []}
                onSelect={setSelectedTaskId}
                onToggle={toggleTask}
              />
            )}
            {tab === 'done' && (
              <CompletedTab
                tasks={tasks.filter(t => t.status === 'done')}
                members={members ?? []}
                onSelect={setSelectedTaskId}
                onToggle={toggleTask}
              />
            )}
          </>
        )}
      </div>

      {/* FAB */}
      {!selectedTask && (
        <button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-[90px] right-[calc(50%-195px)] w-13 h-13 rounded-2xl text-white text-2xl font-light flex items-center justify-center z-40"
          style={{ background: 'linear-gradient(135deg, #D4A843, #9E7B28)', boxShadow: '0 8px 24px rgba(212,168,67,.3)' }}
        >
          +
        </button>
      )}

      {/* Manage Team Modal */}
      {showManage && members && (
        <TeamManageModal
          members={members ?? []}
          onRefresh={refreshMembers}
          onClose={() => setShowManage(false)}
        />
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <AddTaskModal
          members={members ?? []}
          onClose={() => setShowAddModal(false)}
          onAdd={async (data) => {
            await createTask(data);
            refreshTasks();
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}
