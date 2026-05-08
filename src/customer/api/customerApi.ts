import { api } from '../../api';

const BASE = '/api/customer';

// Contacts
export const getContacts = () => api<any[]>(`${BASE}/contacts`);
export const createContact = (data: any) => api(`${BASE}/contacts`, { method: 'POST', body: JSON.stringify(data) });
export const updateContact = (id: string, data: any) => api(`${BASE}/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteContact = (id: string) => api(`${BASE}/contacts/${id}`, { method: 'DELETE' });

// Import
export const bulkImport = (data: { customers: any[]; purchases: any[]; replace_mode: boolean; is_txn_level: boolean }) =>
  api(`${BASE}/import`, { method: 'POST', body: JSON.stringify(data) });
export const getMappings = () => api<Record<string, any>>(`${BASE}/import/mappings`);
export const saveMapping = (header_hash: string, mapping: any[]) =>
  api(`${BASE}/import/mappings`, { method: 'POST', body: JSON.stringify({ header_hash, mapping }) });

// Messages
export const getMessages = (params: { status?: string; msg_type?: string; from_date?: string; to_date?: string } = {}) => {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.msg_type) q.set('msg_type', params.msg_type);
  if (params.from_date) q.set('from_date', params.from_date);
  if (params.to_date) q.set('to_date', params.to_date);
  const qs = q.toString();
  return api<any[]>(`${BASE}/messages${qs ? '?' + qs : ''}`);
};
export const createMessage = (data: any) => api(`${BASE}/messages`, { method: 'POST', body: JSON.stringify(data) });
export const updateMessage = (id: string, data: { body?: string; status?: string }) =>
  api(`${BASE}/messages/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const bulkUpdateMessages = (ids: string[] | null, update: { status: string; sent_at?: string }) =>
  api(`${BASE}/messages/bulk`, { method: 'POST', body: JSON.stringify({ ids, ...update }) });

// Purchases
export const getPurchases = (customerId: string) => api<any[]>(`${BASE}/purchases/${customerId}`);

// Settings
export const getSettings = () => api<any>(`${BASE}/settings`);
export const updateSettings = (data: { business_name?: string; google_review_link?: string; review_link?: string; thresholds?: any }) =>
  api(`${BASE}/settings`, { method: 'PUT', body: JSON.stringify(data) });

// Templates
export const getTemplates = () => api<any[]>(`${BASE}/templates`);
export const updateTemplate = (id: string, data: { name?: string; body?: string; active?: boolean }) =>
  api(`${BASE}/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// Seed
export const seedData = () => api(`${BASE}/seed`, { method: 'POST' });

