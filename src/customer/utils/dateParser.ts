export function detectDateFormat(vals: string[]): 'dmy' | 'mdy' {
  let ddmm = 0, mmdd = 0;
  for (const v of vals) {
    const m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (!m) continue;
    const a = parseInt(m[1]), b = parseInt(m[2]);
    if (a > 12) ddmm++;
    else if (b > 12) mmdd++;
  }
  return ddmm >= mmdd ? 'dmy' : 'mdy';
}

export function parseDateFmt(s: string, fmt: 'dmy' | 'mdy'): string {
  if (!s) return '';
  s = s.trim();
  if (/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const yr = m[3].length === 2 ? '20' + m[3] : m[3];
    if (fmt === 'dmy') return `${yr}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    return `${yr}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return '';
}

export function formatDate(d?: string): string {
  if (!d) return '';
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return d; }
}

export function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  const days = Math.floor(diff / 86400);
  if (days === 1) return 'yesterday';
  if (days < 30) return days + 'd ago';
  return Math.floor(days / 30) + 'mo ago';
}

