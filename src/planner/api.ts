/**
 * Planner API hooks — wraps existing api() helper
 * Usage: const { data: tasks } = usePlannerTasks()
 */
import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

// ─── Generic fetch hook ───────────────────────────────────────────────
function useApi<T>(url: string, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api(url);
      setData(res);
    } catch (e) {
      console.error(`API error: ${url}`, e);
    }
    setLoading(false);
  }, [url]);

  useEffect(() => { refresh(); }, [refresh, ...deps]);

  return { data, loading, refresh };
}

// ─── Types ────────────────────────────────────────────────────────────
export interface Task {
  id: string;
  title: string;
  assignee_id: string | null;
  assignee_name: string | null;
  assignee_color: string | null;
  due_date: string;
  status: 'open' | 'done';
  recurring: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Member {
  id: string;
  name: string;
  role: string;
  color: string;
  token: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  label: string;
}

export interface Message {
  id: string;
  task_id: string;
  sender: 'owner' | 'member' | 'bot';
  sender_member_id: string | null;
  sender_name: string | null;
  body: string;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  task_id: string;
  event: string;
  detail: string;
  created_at: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────
export const useTasks = (status = 'open') => useApi<Task[]>(`/api/planner/tasks?status=${encodeURIComponent(status)}`);
export const useAllTasks = () => useApi<Task[]>('/api/planner/tasks?status=all');
export const useMembers = () => useApi<Member[]>('/api/planner/members');
export const useContacts = () => useApi<Contact[]>('/api/planner/contacts');
export const useMessages = (taskId: string) => useApi<Message[]>(`/api/planner/tasks/${encodeURIComponent(taskId)}/messages`, [taskId]);
export const useAudit = (taskId: string) => useApi<AuditEntry[]>(`/api/planner/tasks/${encodeURIComponent(taskId)}/audit`, [taskId]);

// ─── Mutations ────────────────────────────────────────────────────────
export const createTask = (data: { title: string; assignee_id?: string; due_date: string; recurring?: string }) =>
  api('/api/planner/tasks', { method: 'POST', body: JSON.stringify(data) });

export const updateTask = (id: string, data: Partial<Task>) =>
  api(`/api/planner/tasks/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteTask = (id: string) =>
  api(`/api/planner/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const sendMessage = (taskId: string, body: string, sender = 'owner', senderMemberId?: string) =>
  api(`/api/planner/tasks/${encodeURIComponent(taskId)}/messages`, { method: 'POST', body: JSON.stringify({ body, sender, sender_member_id: senderMemberId }) });

export const createMember = (data: { name: string; role?: string }) =>
  api('/api/planner/members', { method: 'POST', body: JSON.stringify(data) });

export const deleteMember = (id: string) =>
  api(`/api/planner/members/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const createContact = (data: { name: string; phone: string; label?: string }) =>
  api('/api/planner/contacts', { method: 'POST', body: JSON.stringify(data) });

export const deleteContact = (id: string) =>
  api(`/api/planner/contacts/${encodeURIComponent(id)}`, { method: 'DELETE' });
