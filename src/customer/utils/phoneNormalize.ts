export function normalizePhone(raw: string): string {
  if (!raw) return '';
  let p = raw.replace(/[\s\-\(\)\.]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (/^0\d{9}$/.test(p)) p = '+94' + p.slice(1); // Sri Lanka local
  if (!p.startsWith('+') && p.length >= 7) p = '+' + p;
  return p;
}

export function phoneForWA(phone: string): string {
  return phone.replace(/[\s\-\(\)\+]/g, '');
}

