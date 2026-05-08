import { api } from '../api'

const BASE = '/api/inventory'

export const inv = {
  dashboard: () => api(`${BASE}/dashboard`),
  stock: () => api(`${BASE}/stock`),
  product: (id: string) => api(`${BASE}/product/${id}`),
  setReorder: (id: string, level: number) =>
    api(`${BASE}/product/${id}/reorder`, { method: 'PUT', body: JSON.stringify({ reorder_level: level }) }),

  // Physical counts
  counts: () => api(`${BASE}/counts`),
  createCount: (body: any) =>
    api(`${BASE}/counts`, { method: 'POST', body: JSON.stringify(body) }),
  getCount: (id: string) => api(`${BASE}/counts/${id}`),
  saveCountItems: (id: string, items: any[]) =>
    api(`${BASE}/counts/${id}/items`, { method: 'PUT', body: JSON.stringify({ items }) }),
  postCount: (id: string) =>
    api(`${BASE}/counts/${id}/post`, { method: 'POST' }),

  // Purchase Orders
  pos: () => api(`${BASE}/pos`),
  createPO: (body: any) =>
    api(`${BASE}/pos`, { method: 'POST', body: JSON.stringify(body) }),
  autoGenPO: (productIds: string[]) =>
    api(`${BASE}/pos/auto-generate`, { method: 'POST', body: JSON.stringify({ product_ids: productIds }) }),
  getPO: (id: string) => api(`${BASE}/pos/${id}`),
  updatePO: (id: string, body: any) =>
    api(`${BASE}/pos/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  setPOStatus: (id: string, status: string) =>
    api(`${BASE}/pos/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  poPdf: (id: string) =>
    fetch(`${BASE}/pos/${id}/pdf`, { credentials: 'include' }),
  deletePO: (id: string) =>
    api(`${BASE}/pos/${id}`, { method: 'DELETE' }),

  // Wastage
  wastage: () => api(`${BASE}/wastage`),
  logWastage: (body: any) =>
    api(`${BASE}/wastage`, { method: 'POST', body: JSON.stringify(body) }),

  // Manual entry
  entry: (body: any) =>
    api(`${BASE}/entry`, { method: 'POST', body: JSON.stringify(body) }),

  // Suppliers
  suppliers: () => api(`${BASE}/suppliers`),
  createSupplier: (body: any) =>
    api(`${BASE}/suppliers`, { method: 'POST', body: JSON.stringify(body) }),
  updateSupplier: (id: string, body: any) =>
    api(`${BASE}/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteSupplier: (id: string) =>
    api(`${BASE}/suppliers/${id}`, { method: 'DELETE' }),

  // Settings
  settings: () => api(`${BASE}/settings`),
  saveSettings: (body: any) =>
    api(`${BASE}/settings`, { method: 'PUT', body: JSON.stringify(body) }),

  // Locations
  locations: () => api(`${BASE}/locations`),
  createLocation: (body: any) =>
    api(`${BASE}/locations`, { method: 'POST', body: JSON.stringify(body) }),
  deleteLocation: (id: string) =>
    api(`${BASE}/locations/${id}`, { method: 'DELETE' }),

  // Mismatch
  mismatch: () => api(`${BASE}/mismatch`),

  // Import
  importClassify: (body: any) =>
    api(`${BASE}/import/classify`, { method: 'POST', body: JSON.stringify(body) }),
  importCommit: (body: any) =>
    api(`${BASE}/import/commit`, { method: 'POST', body: JSON.stringify(body) }),
  saveMapping: (body: any) =>
    api(`${BASE}/import/save-mapping`, { method: 'POST', body: JSON.stringify(body) }),

  importUpload: async (file: File, entryType: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('entry_type', entryType)
    const res = await fetch(`${BASE}/import/upload?entry_type=${entryType}`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `HTTP ${res.status}`)
    }
    return res.json()
  },

  ocrCount: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${BASE}/ocr-count`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
}
