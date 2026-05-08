import { useState, useCallback, useRef } from 'react';
import { parseCSV, classifyColumns, FIELD_DEFS, hashHeaders } from './utils/importClassifier';
import { normalizePhone } from './utils/phoneNormalize';
import { parseDateFmt, detectDateFormat } from './utils/dateParser';
import { bulkImport, getMappings, saveMapping } from './api/customerApi';

interface Props {
  onBack: () => void;
  onDone: () => void;
}

type ImportMode = 'new' | 'merge';

export default function ImportView({ onBack, onDone }: Props) {
  const [step, setStep] = useState<'upload' | 'map' | 'importing' | 'done'>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [fieldMap, setFieldMap] = useState<Record<number, string>>({});
  const [mode, setMode] = useState<ImportMode>('merge');
  const [fileName, setFileName] = useState('');
  const [savedMappings, setSavedMappings] = useState<Record<string, any>>({});
  const [importResult, setImportResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);
  const [confidences, setConfidences] = useState<Record<number, number>>({});
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (text: string, name: string) => {
    setFileName(name);
    const allRows = parseCSV(text);
    if (!allRows.length) { setError('Could not parse CSV ??? check file format'); return; }
    const h = allRows[0];
    const dataRows = allRows.slice(1).filter(r => r.some(c => c.trim()));
    setHeaders(h);
    setRows(dataRows);

    const auto = classifyColumns(h, dataRows);
    const fm: Record<number, string> = {};
    const conf: Record<number, number> = {};
    for (const m of auto) {
      if (m.field !== 'skip') { fm[m.colIdx] = m.field; conf[m.colIdx] = m.confidence; }
    }
    setFieldMap(fm);
    setConfidences(conf);

    const maps = await getMappings().catch(() => ({}));
    setSavedMappings(maps || {});
    setStep('map');
    setError('');
  }, []);

  function handleFile(file: File) {
    if (!file.name.match(/\.(csv|txt)$/i)) { setError('Please upload a CSV file'); return; }
    const reader = new FileReader();
    reader.onload = e => processFile(e.target?.result as string, file.name);
    reader.readAsText(file);
  }

  function applySavedMapping(hash: string) {
    const sm = savedMappings[hash];
    if (!sm) return;
    const fm: Record<number, string> = {};
    headers.forEach((h, i) => { if (sm[h]) fm[i] = sm[h]; });
    setFieldMap(fm);
  }

  function setFieldForCol(colIdx: number, field: string) {
    setFieldMap(prev => {
      const next = { ...prev };
      // Remove old assignment of this field
      for (const k in next) { if (next[k] === field && Number(k) !== colIdx) delete next[k]; }
      if (field) next[colIdx] = field; else delete next[colIdx];
      return next;
    });
  }

  function getVal(row: string[], colIdx: number): string {
    return (row[colIdx] || '').trim();
  }

  function getColForField(field: string): number | null {
    for (const [k, v] of Object.entries(fieldMap)) { if (v === field) return Number(k); }
    return null;
  }

  function getFieldVal(row: string[], field: string): string {
    const idx = getColForField(field);
    return idx !== null ? getVal(row, idx) : '';
  }

  async function doImport() {
    setStep('importing');
    setError('');
    try {
      const dateVals = rows.map(r => getFieldVal(r, 'birthday')).filter(Boolean);
      const dateFmt = detectDateFormat(dateVals);
      const lvVals = rows.map(r => getFieldVal(r, 'lastVisit')).filter(Boolean);
      const lvFmt = detectDateFormat(lvVals);
      const fvVals = rows.map(r => getFieldVal(r, 'firstVisit')).filter(Boolean);
      const fvFmt = detectDateFormat(fvVals);

      const contacts = rows.map(row => {
        const name = getFieldVal(row, 'name');
        const rawPhone = getFieldVal(row, 'phone');
        const phone = rawPhone ? normalizePhone(rawPhone) : undefined;
        const email = getFieldVal(row, 'email') || undefined;
        if (!name && !phone) return null;
        const birthdayRaw = getFieldVal(row, 'birthday');
        const birthday = birthdayRaw ? parseDateFmt(birthdayRaw, dateFmt) || undefined : undefined;
        const lvRaw = getFieldVal(row, 'lastVisit');
        const last_visit = lvRaw ? parseDateFmt(lvRaw, lvFmt) || undefined : undefined;
        const fvRaw = getFieldVal(row, 'firstVisit');
        const first_visit = fvRaw ? parseDateFmt(fvRaw, fvFmt) || undefined : undefined;
        const spentRaw = getFieldVal(row, 'spent');
        const spent = spentRaw ? parseFloat(spentRaw.replace(/[^0-9.]/g, '')) || undefined : undefined;
        const visitsRaw = getFieldVal(row, 'visits');
        const visits = visitsRaw ? parseInt(visitsRaw) || undefined : undefined;
        return {
          name: name || '(No name)',
          phone: phone || undefined,
          email,
          birthday,
          last_visit,
          first_visit,
          spent,
          visits,
          notes: getFieldVal(row, 'notes') || undefined,
          category: getFieldVal(row, 'category') || undefined,
          address: getFieldVal(row, 'address') || undefined,
        };
      }).filter(Boolean);

      if (!contacts.length) { setError('No valid contacts found'); setStep('map'); return; }

      const hash = hashHeaders(headers);
      const mapArr = headers.map((h, i) => ({ header: h, field: fieldMap[i] || '' }));
      await saveMapping(hash, mapArr).catch(() => {});

      const result = await bulkImport({
        customers: contacts,
        purchases: [],
        replace_mode: mode === 'merge',
        is_txn_level: false,
      }) as any;

      setImportResult({
        created: result?.new ?? result?.created ?? 0,
        updated: result?.updated ?? 0,
        skipped: result?.skipped ?? 0,
      });
      setStep('done');
    } catch (e: any) {
      setError(e?.message || 'Import failed');
      setStep('map');
    }
  }

  if (step === 'upload') return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingTop: 12 }}>
        <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div style={{ fontSize: 15, fontWeight: 700, flex: 1 }}>Import Customers</div>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? '#CF5BA0' : 'var(--border)'}`,
          borderRadius: 16, padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
          background: dragging ? 'rgba(207,91,160,.05)' : 'var(--bg-card)', transition: 'all .2s',
          marginTop: 20,
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 10 }}>????</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Drop CSV here</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>or tap to browse</div>
        <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      {error && <div style={{ color: '#E8894F', fontSize: 12, marginTop: 12, textAlign: 'center' }}>{error}</div>}

      <div style={{ marginTop: 20, padding: '12px', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 8 }}>SUPPORTED COLUMNS</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {Object.entries(FIELD_DEFS).map(([key, def]) => (
            <span key={key} style={{ fontSize: 9, padding: '2px 8px', borderRadius: 6, background: '#2a2a28', color: '#9c9b95', fontFamily: 'var(--font-mono)' }}>{def.label}</span>
          ))}
        </div>
      </div>
    </>
  );

  if (step === 'map') return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingTop: 12 }}>
        <button onClick={() => setStep('upload')} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Map Columns</div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{fileName} ?? {rows.length} rows</div>
        </div>
      </div>

      {/* Saved mappings */}
      {Object.keys(savedMappings).length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>Saved mappings:</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {Object.keys(savedMappings).map(hash => (
              <button key={hash} onClick={() => applySavedMapping(hash)} style={{ fontSize: 10, padding: '4px 10px', borderRadius: 20, background: 'rgba(207,91,160,.1)', color: '#CF5BA0', border: '1px solid rgba(207,91,160,.2)', minHeight: 32 }}>Apply saved</button>
            ))}
          </div>
        </div>
      )}

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {(['merge', 'new'] as ImportMode[]).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)',
            background: mode === m ? 'rgba(207,91,160,.1)' : 'var(--bg-card)',
            color: mode === m ? '#CF5BA0' : 'var(--text-muted)',
            border: mode === m ? '1px solid rgba(207,91,160,.2)' : '1px solid var(--border)',
            minHeight: 36,
          }}>
            {m === 'merge' ? 'Merge (update existing)' : 'New only (skip existing)'}
          </button>
        ))}
      </div>

      {/* Column mapping */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
        {headers.map((h, i) => {
          const conf = confidences[i] || 0;
          const preview = rows.slice(0, 3).map(r => r[i]).filter(Boolean).join(', ');
          const confColor = conf > 0.8 ? '#5DCAA5' : conf > 0.5 ? '#B08D30' : 'var(--text-dim)';
          const mappedField = fieldMap[i] || '';
          return (
            <div key={i} style={{ padding: '10px 12px', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{h}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview}</div>
                </div>
                {conf > 0 && <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: confColor, fontWeight: 700 }}>{Math.round(conf * 100)}%</div>}
              </div>
              <select
                value={mappedField}
                onChange={e => setFieldForCol(i, e.target.value)}
                style={{ width: '100%', padding: '6px 8px', background: '#1a1a18', border: `1px solid ${mappedField ? 'rgba(207,91,160,.3)' : 'var(--border)'}`, borderRadius: 6, color: mappedField ? 'var(--text-primary)' : 'var(--text-dim)', fontSize: 11 }}
              >
                <option value="">??? skip ???</option>
                {Object.entries(FIELD_DEFS).map(([key, def]) => (
                  <option key={key} value={key}>{def.label}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {error && <div style={{ color: '#E8894F', fontSize: 12, marginBottom: 10 }}>{error}</div>}

      <button
        onClick={doImport}
        style={{ width: '100%', padding: '13px 0', borderRadius: 12, fontSize: 13, fontWeight: 700, background: '#CF5BA0', color: '#fff', minHeight: 48, marginBottom: 24 }}
      >
        Import {rows.length} rows
      </button>
    </>
  );

  if (step === 'importing') return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>???</div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>Importing???</div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>Please wait</div>
    </div>
  );

  if (step === 'done' && importResult) return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>???</div>
      <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Import complete</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 24 }}>
        {[
          [importResult.created, 'Created', '#5DCAA5'],
          [importResult.updated, 'Updated', '#CF5BA0'],
          [importResult.skipped, 'Skipped', 'var(--text-muted)'],
        ].map(([v, l, col]) => (
          <div key={String(l)} style={{ padding: 12, background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: String(col) }}>{String(v)}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{String(l)}</div>
          </div>
        ))}
      </div>
      <button onClick={onDone} style={{ padding: '12px 32px', borderRadius: 12, fontSize: 13, fontWeight: 700, background: '#CF5BA0', color: '#fff', minHeight: 44 }}>Done</button>
    </div>
  );

  return null;
}

