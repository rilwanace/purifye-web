import { api, apiFormData, apiBlob } from '../api'

const BASE = '/api/inventory'

export const inv = {
  dashboard: () => api(`${BASE}/dashboard`),
  stock: () => api(`${BASE}/stock`),
  product: (id: string) => api(`${BASE}/product/${encodeURIComponent(id)}`),
  setReorder: (id: string, level: number) =>
    api(`${BASE}/product/${encodeURIComponent(id)}/reorder`, { method: 'PUT', body: JSON.stringify({ reorder_level: level }) }),

  // Physical counts
  counts: () => api(`${BASE}/counts`),
  createCount: (body: any) =>
    api(`${BASE}/counts`, { method: 'POST', body: JSON.stringify(body) }),
  getCount: (id: string) => api(`${BASE}/counts/${encodeURIComponent(id)}`),
  saveCountItems: (id: string, items: any[]) =>
    api(`${BASE}/counts/${encodeURIComponent(id)}/items`, { method: 'PUT', body: JSON.stringify({ items }) }),
  postCount: (id: string) =>
    api(`${BASE}/counts/${encodeURIComponent(id)}/post`, { method: 'POST' }),

  // Purchase Orders
  pos: () => api(`${BASE}/pos`),
  createPO: (body: any) =>
    api(`${BASE}/pos`, { method: 'POST', body: JSON.stringify(body) }),
  autoGenPO: (productIds: string[]) =>
    api(`${BASE}/pos/auto-generate`, { method: 'POST', body: JSON.stringify({ product_ids: productIds }) }),
  getPO: (id: string) => api(`${BASE}/pos/${encodeURIComponent(id)}`),
  updatePO: (id: string, body: any) =>
    api(`${BASE}/pos/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) }),
  setPOStatus: (id: string, status: string) =>
    api(`${BASE}/pos/${encodeURIComponent(id)}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  poPdf: (id: string) =>
    apiBlob(`${BASE}/pos/${encodeURIComponent(id)}/pdf`),
  deletePO: (id: string) =>
    api(`${BASE}/pos/${encodeURIComponent(id)}`, { method: 'DELETE' }),

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
    api(`${BASE}/suppliers/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteSupplier: (id: string) =>
    api(`${BASE}/suppliers/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Settings
  settings: () => api(`${BASE}/settings`),
  saveSettings: (body: any) =>
    api(`${BASE}/settings`, { method: 'PUT', body: JSON.stringify(body) }),

  // Locations
  locations: () => api(`${BASE}/locations`),
  createLocation: (body: any) =>
    api(`${BASE}/locations`, { method: 'POST', body: JSON.stringify(body) }),
  deleteLocation: (id: string) =>
    api(`${BASE}/locations/${encodeURIComponent(id)}`, { method: 'DELETE' }),

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
    return apiFormData(`${BASE}/import/upload?entry_type=${encodeURIComponent(entryType)}`, form)
  },

  ocrCount: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiFormData(`${BASE}/ocr-count`, form)
  },
}
