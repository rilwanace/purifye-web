function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
  return Math.abs(h);
}

export function getRefCode(customerId: string): string {
  return 'REF-' + String(hashCode(customerId)).slice(0, 4).padStart(4, '0');
}

