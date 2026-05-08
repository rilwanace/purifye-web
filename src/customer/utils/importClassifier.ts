export interface FieldDef {
  label: string;
  required: boolean;
  aliases: string[];
  icon: string;
  group?: string;
}

export interface ColumnMapping {
  colIdx: number;
  header: string;
  field: string;
  confidence: number;
  level: 'high' | 'med' | 'low';
  sample: string[];
}

export const FIELD_DEFS: Record<string, FieldDef> = {
  name:         { label: 'Customer Name', required: true,  aliases: ['name','customer','client','full name','fullname','customer name','client name','cust name','cust','contact name','buyer'], icon: '????' },
  phone:        { label: 'Phone',         required: false, aliases: ['phone','mobile','tel','telephone','contact','phone number','whatsapp','cell','tp','tp no','tp number','mobile no','mob','contact no','contact number'], icon: '????' },
  email:        { label: 'Email',         required: false, aliases: ['email','e-mail','mail','email address','e mail'], icon: '????' },
  address:      { label: 'Address',       required: false, aliases: ['address','addr','street','location','postal','postal address','street address','city'], icon: '????' },
  birthday:     { label: 'Birthday',      required: false, aliases: ['birthday','birth date','dob','date of birth','birthdate','birth','bday','anniversary'], icon: '????' },
  category:     { label: 'Category',      required: false, aliases: ['category','segment','type','group','vip','class','tier','customer type','cust type','classification'], icon: '???????' },
  notes:        { label: 'Notes',         required: false, aliases: ['notes','note','comment','comments','remarks','remark','memo','description','details'], icon: '????' },
  lastVisit:    { label: 'Last Visit',    required: false, aliases: ['last visit','lastvisit','last_visit','recent visit','last date','last seen','latest visit','last activity','last purchase','last order'], icon: '????' },
  firstVisit:   { label: 'First Visit',   required: false, aliases: ['first visit','firstvisit','first_visit','join date','joined','signup','created','registration','registered','date added','first purchase','first order'], icon: '????' },
  visits:       { label: 'Visit Count',   required: false, aliases: ['visits','visit count','total visits','num visits','visit_count','no of visits','times','frequency','order count','purchases'], icon: '????' },
  spent:        { label: 'Total Spent',   required: false, aliases: ['spent','total spent','revenue','total','total_spent','lifetime value','ltv','amount','total amount','total revenue','total sales','sales'], icon: '????' },
  product_name: { label: 'Product/Service', required: false, aliases: ['product','product name','item','service','item name','description','product description','sku'], icon: '????', group: 'purchase' },
  quantity:     { label: 'Quantity',      required: false, aliases: ['quantity','qty','count','units','no','number'], icon: '#??????', group: 'purchase' },
  unit_price:   { label: 'Unit Price',    required: false, aliases: ['unit price','price','rate','unit cost','cost','unit rate','each'], icon: '????', group: 'purchase' },
  date:         { label: 'Transaction Date', required: false, aliases: ['date','transaction date','order date','purchase date','invoice date','bill date','sale date','txn date'], icon: '????', group: 'purchase' },
};

export const FIELD_KEYS = Object.keys(FIELD_DEFS);
export const CUST_FIELDS = ['name','phone','email','address','birthday','category','notes','lastVisit','firstVisit','visits','spent'];
export const PURCH_FIELDS = ['product_name','quantity','unit_price','date'];

function scorePhone(vals: string[]): number {
  let h = 0;
  for (const v of vals) if (/^(\+?\d{7,15})$/.test(v.replace(/[\s\-\(\)\.]/g,''))) h++;
  return vals.length ? h / vals.length : 0;
}
function scoreEmail(vals: string[]): number {
  let h = 0;
  for (const v of vals) if (/@/.test(v) && /\./.test(v)) h++;
  return vals.length ? h / vals.length : 0;
}
function scoreDate(vals: string[]): number {
  let h = 0;
  for (const v of vals) {
    const s = v.trim();
    if (!s) continue;
    if (/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/.test(s) || /^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/.test(s) ||
        /^\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(s) ||
        !isNaN(new Date(s).getTime())) h++;
  }
  return vals.length ? h / vals.length : 0;
}
function scoreCurrency(vals: string[]): number {
  let h = 0;
  for (const v of vals) {
    const n = parseFloat(v.replace(/[,\s]/g,''));
    if (/^-?\d+(\.\d{1,2})?$/.test(v.replace(/[,\s]/g,'')) && n > 1) h++;
  }
  return vals.length ? h / vals.length : 0;
}
function scoreInteger(vals: string[]): number {
  let h = 0;
  for (const v of vals) if (/^\d{1,4}$/.test(v.trim()) && parseInt(v) <= 500) h++;
  return vals.length ? h / vals.length : 0;
}
function scoreName(vals: string[]): number {
  let h = 0;
  for (const v of vals) {
    const s = v.trim();
    if (s.length >= 2 && /^[A-Za-z???-??????-???\s\.\-']+$/.test(s) && !/^\d/.test(s) && !/@/.test(s)) h++;
  }
  return vals.length ? h / vals.length : 0;
}
function scoreAddress(vals: string[]): number {
  let h = 0;
  const kw = /\b(street|st|road|rd|lane|ln|ave|avenue|blvd|drive|dr|no\.|#|floor|apt|suite|city|town)\b/i;
  for (const v of vals) if ((v.length > 15 && /\d/.test(v)) || kw.test(v)) h++;
  return vals.length ? h / vals.length : 0;
}

export function classifyColumns(headers: string[], sampleRows: string[][]): ColumnMapping[] {
  const n = headers.length;
  const samples: string[][] = Array.from({length: n}, () => []);
  for (let c = 0; c < n; c++)
    for (const row of sampleRows) { const v = (row[c] || '').trim(); if (v) samples[c].push(v); }

  const allScores: {col: number; field: string; score: number}[] = [];
  const colScores: Record<number, Record<string, number>> = {};

  for (let c = 0; c < n; c++) {
    const hdr = headers[c].toLowerCase().trim();
    const vals = samples[c];
    colScores[c] = {};
    for (const key of FIELD_KEYS) {
      const def = FIELD_DEFS[key];
      let hdrScore = 0;
      for (const alias of def.aliases) {
        if (hdr === alias) { hdrScore = 0.8; break; }
        if (hdr.includes(alias)) hdrScore = Math.max(hdrScore, 0.5);
      }
      let valScore = 0;
      if (key === 'name') valScore = scoreName(vals) * 0.7;
      else if (key === 'phone') valScore = scorePhone(vals) * 0.9;
      else if (key === 'email') valScore = scoreEmail(vals) * 0.95;
      else if (key === 'address') valScore = scoreAddress(vals) * 0.6;
      else if (['birthday','lastVisit','firstVisit','date'].includes(key)) valScore = scoreDate(vals) * 0.5;
      else if (['spent','unit_price'].includes(key)) valScore = scoreCurrency(vals) * 0.5;
      else if (['visits','quantity'].includes(key)) valScore = scoreInteger(vals) * 0.4;
      const score = Math.min(1, hdrScore + valScore);
      colScores[c][key] = score;
      allScores.push({ col: c, field: key, score });
    }
  }
  allScores.sort((a, b) => b.score - a.score);

  const assigned: Record<string, number> = {};
  const colMap: Record<number, string> = {};
  for (const { col, field, score } of allScores) {
    if (score < 0.2) continue;
    if (assigned[field] != null || colMap[col] != null) continue;
    assigned[field] = col;
    colMap[col] = field;
  }

  return Array.from({length: n}, (_, c) => {
    const field = colMap[c] || 'skip';
    const conf = field !== 'skip' ? colScores[c][field] : 0;
    const level: 'high' | 'med' | 'low' = conf >= 0.7 ? 'high' : conf >= 0.4 ? 'med' : 'low';
    return { colIdx: c, header: headers[c], field, confidence: conf, level, sample: samples[c].slice(0, 3) };
  });
}

export function hashHeaders(headers: string[]): string {
  return headers.join('|').toLowerCase();
}

export function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/), result: string[][] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const row: string[] = [];
    let inQ = false, cell = '';
    for (let j = 0; j < trimmed.length; j++) {
      const ch = trimmed[j];
      if (inQ) {
        if (ch === '"' && trimmed[j+1] === '"') { cell += '"'; j++; }
        else if (ch === '"') inQ = false;
        else cell += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === ',' || ch === '\t') { row.push(cell); cell = ''; }
        else cell += ch;
      }
    }
    row.push(cell);
    result.push(row);
  }
  return result;
}

