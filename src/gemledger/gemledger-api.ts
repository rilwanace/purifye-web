import { api, apiFormData } from '../api'
import type {
  DashboardData, StoneType, Lot, LotListResponse, Party,
  Investment, InvestmentDetail, SoldData,
} from './gemledger-types'

const G = '/api/gemledger'

export const gemApi = {
  // Dashboard
  dashboard: () => api<DashboardData>(`${G}/dashboard`),

  // Stone types
  stoneTypes: () => api<StoneType[]>(`${G}/stone-types`),
  createStoneType: (body: { name: string; color_hex?: string }) =>
    api<StoneType>(`${G}/stone-types`, { method: 'POST', body: JSON.stringify(body) }),

  // Lots
  lots: (params: Record<string, string | number | undefined> = {}) => {
    const q = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&')
    return api<LotListResponse>(`${G}/lots${q ? `?${q}` : ''}`)
  },
  lot: (id: string) => api<Lot>(`${G}/lots/${id}`),
  createLot: (body: object) =>
    api<Lot>(`${G}/lots`, { method: 'POST', body: JSON.stringify(body) }),
  updateLot: (id: string, body: object) =>
    api<Lot>(`${G}/lots/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteLot: (id: string) =>
    api(`${G}/lots/${id}`, { method: 'DELETE' }),

  // Lot actions
  giveApproval: (id: string, party_id: string) =>
    api(`${G}/lots/${id}/give-approval`, { method: 'POST', body: JSON.stringify({ party_id }) }),
  returnLot: (id: string) =>
    api(`${G}/lots/${id}/return`, { method: 'POST', body: JSON.stringify({}) }),
  sendProcessing: (id: string, body: object) =>
    api(`${G}/lots/${id}/send-processing`, { method: 'POST', body: JSON.stringify(body) }),
  receiveProcessing: (id: string, body: object) =>
    api(`${G}/lots/${id}/receive-processing`, { method: 'POST', body: JSON.stringify(body) }),
  sellLot: (id: string, body: object) =>
    api(`${G}/lots/${id}/sell`, { method: 'POST', body: JSON.stringify(body) }),
  shareLot: (id: string) =>
    api<{ token: string; url: string }>(`${G}/lots/${id}/share`, { method: 'POST', body: '{}' }),

  // Parties
  parties: () => api<Party[]>(`${G}/parties`),
  createParty: (body: object) =>
    api<Party>(`${G}/parties`, { method: 'POST', body: JSON.stringify(body) }),
  updateParty: (id: string, body: object) =>
    api<Party>(`${G}/parties/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteParty: (id: string) =>
    api(`${G}/parties/${id}`, { method: 'DELETE' }),

  // Investments
  investments: () => api<Investment[]>(`${G}/investments`),
  investment: (id: string) => api<InvestmentDetail>(`${G}/investments/${id}`),
  createInvestment: (body: object) =>
    api<Investment>(`${G}/investments`, { method: 'POST', body: JSON.stringify(body) }),
  updateInvestment: (id: string, body: object) =>
    api<Investment>(`${G}/investments/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  returnCapital: (id: string, body: object) =>
    api(`${G}/investments/${id}/return-capital`, { method: 'POST', body: JSON.stringify(body) }),
  closeInvestment: (id: string, body: object) =>
    api(`${G}/investments/${id}/close`, { method: 'POST', body: JSON.stringify(body) }),

  // Expenses
  lotExpenses: (lotId: string) => api(`${G}/lots/${lotId}/expenses`),
  addExpense: (lotId: string, body: object) =>
    api(`${G}/lots/${lotId}/expenses`, { method: 'POST', body: JSON.stringify(body) }),
  deleteExpense: (id: string) =>
    api(`${G}/expenses/${id}`, { method: 'DELETE' }),

  // Photos
  uploadPhoto: (lotId: string, file: File, photoType: string) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('photo_type', photoType)
    return apiFormData(`${G}/lots/${lotId}/photos`, fd)
  },
  deletePhoto: (id: string) => api(`${G}/photos/${id}`, { method: 'DELETE' }),
  photoUrl: (id: string) => api<{ url: string; thumb_url?: string }>(`${G}/photos/${id}/url`),

  // Sold
  sold: (period: string = 'month') => api<SoldData>(`${G}/sold?period=${period}`),

  // Share (public)
  getShare: (token: string) => api(`${G}/share/${token}`),
}
