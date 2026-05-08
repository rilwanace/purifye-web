export interface Threshold {
  active: number;
  warm: number;
  cooling: number;
  cold: number;
}

export interface Segment {
  key: 'active' | 'warm' | 'cooling' | 'cold' | 'inactive';
  label: string;
  color: string;
  bg: string;
  min: number;
  max: number;
}

export interface EnrichedCustomer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  birthday?: string;
  category?: string;
  notes?: string;
  first_visit?: string;
  last_visit?: string;
  visits: number;
  spent: number;
  business_id?: string;
  _days: number;
  _seg: Segment;
}

const DEFAULT_THRESHOLDS: Threshold = { active: 14, warm: 21, cooling: 30, cold: 60 };

export function getThresholds(th?: Threshold): Segment[] {
  const t = th || DEFAULT_THRESHOLDS;
  return [
    { key: 'active',   label: 'Active',   color: '#5DCAA5', bg: 'rgba(93,202,165,.1)',   min: 0,       max: t.active },
    { key: 'warm',     label: 'Warm',     color: '#B08D30', bg: 'rgba(176,141,48,.1)',   min: t.active + 1, max: t.warm },
    { key: 'cooling',  label: 'Cooling',  color: '#E8894F', bg: 'rgba(232,137,79,.08)', min: t.warm + 1,   max: t.cooling },
    { key: 'cold',     label: 'Cold',     color: '#D85A30', bg: 'rgba(216,90,48,.1)',    min: t.cooling + 1, max: t.cold },
    { key: 'inactive', label: 'Inactive', color: '#D85A30', bg: 'rgba(216,90,48,.06)',  min: t.cold + 1,   max: Infinity },
  ];
}

export function daysSince(dateStr?: string): number {
  if (!dateStr) return 999;
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000));
}

export function getSegment(days: number, th?: Threshold): Segment {
  const segs = getThresholds(th);
  for (const s of segs) if (days <= s.max) return s;
  return segs[4];
}

export function enrichAll(customers: any[], th?: Threshold): EnrichedCustomer[] {
  return customers.map(c => {
    const days = daysSince(c.last_visit);
    return { ...c, _days: days, _seg: getSegment(days, th) };
  });
}

export function validateThresholds(th: Threshold): Threshold {
  let { active, warm, cooling, cold } = th;
  if (warm <= active) warm = active + 1;
  if (cooling <= warm) cooling = warm + 1;
  if (cold <= cooling) cold = cooling + 1;
  return { active, warm, cooling, cold };
}

export function rangeLabel(seg: Segment, th: Threshold): string {
  const t = getThresholds(th);
  const s = t.find(x => x.key === seg.key);
  if (!s) return seg.label;
  const max = s.max === Infinity ? `${s.min}+` : `${s.min}-${s.max}`;
  return `${seg.label} (${max}d)`;
}

