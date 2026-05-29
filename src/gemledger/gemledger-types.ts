export interface StoneType {
  id: string
  name: string
  color_hex: string
  is_default: boolean
  sort_order: number
}

export interface Party {
  id: string
  name: string
  phone?: string
  location?: string
  notes?: string
}

export interface Investment {
  id: string
  name: string
  capital_amount: string
  cash_available: string
  in_stock_value: string
  total_returned: string
  sold_revenue: string
  status: 'active' | 'closed'
  notes?: string
  close_return_amount?: string
  close_their_profit?: string
  close_your_profit?: string
}

export interface Lot {
  id: string
  code: string
  name: string
  status: 'rough' | 'cut' | 'wip' | 'sold' | 'processed'
  location: 'with_me' | 'on_approval' | 'wip'
  stone_count: number
  total_weight_ct: string
  total_cost: string
  cost_per_ct?: string
  sale_price?: string
  profit?: string
  sold_at?: string
  shape?: string
  color?: string
  origin?: string
  treatment?: string
  dimensions?: string
  certified: boolean
  cert_body?: string
  stone_type_id: string
  stone_type_name: string
  stone_type_color: string
  location_party_id?: string
  party_name?: string
  party_location?: string
  investment_id?: string
  investment_name?: string
  location_since?: string
  days_out?: number
  warning?: string
  job_type?: string
  expenses?: Expense[]
  history?: Transfer[]
  photos?: Photo[]
}

export interface Expense {
  id: string
  description: string
  amount: string
  date: string
}

export interface Transfer {
  id: string
  transfer_type: string
  date: string
  notes?: string
  party_name?: string
  result_stone_count?: number
  result_weight_ct?: string
  cutting_charge?: string
  job_type?: string
  destination?: string
  fee?: string
}

export interface Photo {
  id: string
  photo_type: 'stone' | 'certificate'
  r2_key: string
  thumbnail_r2_key?: string
  url?: string
  thumb_url?: string
  sort_order: number
}

export interface DashboardData {
  stock_overview: {
    rough: { count: number; ct: string }
    cut: { count: number; ct: string }
    wip: { count: number; ct: string }
  }
  stone_type_breakdown: Array<{
    id: string
    name: string
    color_hex: string
    lot_count: number
    stone_count: number
    total_ct: string
    total_cost: string
  }>
  location_summary: {
    with_me: { count: number; ct: string }
    on_approval: { count: number; ct: string }
  }
  investment_summary: {
    investor_count: number
    cash_available: string
  }
}

export interface LotListResponse {
  items: Lot[]
  total: number
  page: number
  page_size: number
}

export interface SoldData {
  revenue: string
  profit: string
  count: number
  items: Lot[]
}

export interface InvestmentDetail extends Investment {
  lots: Lot[]
  returns: Array<{ id: string; amount: string; date: string; is_final: boolean; notes?: string }>
}

export interface GemSettings {
  wip_enabled: string
}

// ── Import types ──────────────────────────────────────────────────────────────

export type LotField =
  | 'weight_ct' | 'stone_count' | 'total_cost' | 'stone_type'
  | 'color' | 'origin' | 'shape' | 'treatment' | 'certified'
  | 'code' | 'dimensions' | 'status'

export const LOT_FIELD_LABELS: Record<LotField, string> = {
  weight_ct: 'Weight (ct)',
  stone_count: 'Stone Count',
  total_cost: 'Total Cost',
  stone_type: 'Stone Type',
  color: 'Color',
  origin: 'Origin',
  shape: 'Shape',
  treatment: 'Treatment',
  certified: 'Certificate / Lab',
  code: 'Lot Code',
  dimensions: 'Dimensions',
  status: 'Status',
}

export const ALL_LOT_FIELDS: LotField[] = [
  'weight_ct', 'stone_count', 'total_cost', 'stone_type',
  'color', 'origin', 'shape', 'treatment', 'certified',
  'code', 'dimensions', 'status',
]

export interface ImportSheetInfo {
  name: string
  headers: string[]
  sample_rows: (string | number | null)[][]
  row_count: number
  suggested_mapping: Record<string, LotField | null>
}

export interface ImportUploadResponse {
  upload_id: string
  sheets: ImportSheetInfo[]
}

export interface ImportPreviewSheet {
  name: string
  row_count: number
  preview_rows: Record<string, string>[]
  error?: string
}

export interface ImportPreviewResponse {
  sheets: ImportPreviewSheet[]
}

export interface ImportError {
  sheet: string
  row: number | null
  error: string
}

export interface ImportResult {
  imported: number
  skipped_dedup: number
  errors: ImportError[]
}

export interface ImportSheetConfig {
  name: string
  mapping: Record<string, LotField | null>
}

// ── Template import types ──────────────────────────────────────────────────────

export interface TemplateUploadResponse {
  upload_id: string
  lot_count: number
  party_names: string[]
  errors: string[]
}

export interface TemplateImportResult {
  imported: number
  imported_parties: number
  skipped_dedup: number
  failed_rows: Array<{ row: number; error: string }>
}
