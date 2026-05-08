import { useState, useEffect } from 'react';
import { updateSettings, updateTemplate } from './api/customerApi';
import { MSG_TYPES } from './utils/templates';

interface Props {
  settings: any;
  templates: any[];
  onBack: () => void;
  onSaved: () => void;
  onRefreshTemplates: () => void;
}

const C = '#CF5BA0';

export default function SettingsView({ settings, templates, onBack, onSaved, onRefreshTemplates }: Props) {
  const [bizName, setBizName] = useState('');
  const [reviewLink, setReviewLink] = useState('');
  const [th, setTh] = useState({ active: 14, warm: 21, cooling: 30, cold: 60 });
  const [thError, setThError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Template editing
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [templateBodies, setTemplateBodies] = useState<Record<string, string>>({});
  const [templateSaving, setTemplateSaving] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setBizName(settings.business_name || '');
      setReviewLink(settings.review_link || '');
      if (settings.thresholds) {
        setTh({
          active: settings.thresholds.active ?? 14,
          warm: settings.thresholds.warm ?? 21,
          cooling: settings.thresholds.cooling ?? 30,
          cold: settings.thresholds.cold ?? 60,
        });
      }
    }
  }, [settings]);

  useEffect(() => {
    const bodies: Record<string, string> = {};
    for (const t of (templates || [])) bodies[t.id] = t.body || '';
    setTemplateBodies(bodies);
  }, [templates]);

  function validateTh(next: typeof th): string {
    if (next.active >= next.warm) return 'Active threshold must be less than Warm';
    if (next.warm >= next.cooling) return 'Warm must be less than Cooling';
    if (next.cooling >= next.cold) return 'Cooling must be less than Cold';
    return '';
  }

  function updateTh(key: keyof typeof th, val: string) {
    const n = parseInt(val);
    if (isNaN(n)) return;
    const next = { ...th, [key]: n };
    setTh(next);
    setThError(validateTh(next));
  }

  async function handleSave() {
    const err = validateTh(th);
    if (err) { setThError(err); return; }
    setSaving(true);
    try {
      await updateSettings({ business_name: bizName, google_review_link: reviewLink, thresholds: th });
      onSaved();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function saveTemplate(id: string) {
    setTemplateSaving(id);
    try {
      await updateTemplate(id, { body: templateBodies[id] });
      onRefreshTemplates();
    } finally {
      setTemplateSaving(null);
      setEditingTemplate(null);
    }
  }

  async function toggleTemplateActive(id: string, active: boolean) {
    await updateTemplate(id, { active: !active });
    onRefreshTemplates();
  }

  const grouped: Record<string, any[]> = {};
  for (const t of (templates || [])) {
    grouped[t.type] = grouped[t.type] || [];
    grouped[t.type].push(t);
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingTop: 12 }}>
        <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div style={{ fontSize: 15, fontWeight: 700, flex: 1 }}>Settings</div>
      </div>

      <SectionLabel label="Business" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Business name"
          value={bizName}
          onChange={e => setBizName(e.target.value)}
          style={{ boxSizing: 'border-box', width: '100%' }}
        />
        <input
          type="text"
          placeholder="Review link (Google, Trustpilot, etc.)"
          value={reviewLink}
          onChange={e => setReviewLink(e.target.value)}
          style={{ boxSizing: 'border-box', width: '100%' }}
        />
      </div>

      <SectionLabel label="Customer Segments" />
      <div style={{ marginBottom: 4, padding: '10px 12px', background: 'rgba(207,91,160,.05)', border: '1px solid rgba(207,91,160,.15)', borderRadius: 8 }}>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.5 }}>
          Thresholds define how many days since last visit a customer is classified into each segment. Ranges are non-overlapping:
          <span style={{ color: '#5DCAA5', fontFamily: 'var(--font-mono)', fontWeight: 700 }}> 0???active ?? active???warm ?? warm???cooling ?? cooling???cold ?? cold+</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 4 }}>
        {([
          ['active', 'Active', '#5DCAA5'],
          ['warm', 'Warm', '#B08D30'],
          ['cooling', 'Cooling', '#E8894F'],
          ['cold', 'Cold', '#CF5BA0'],
        ] as const).map(([key, label, color]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 12 }}>{label} up to</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="number"
                value={th[key]}
                onChange={e => updateTh(key, e.target.value)}
                style={{ width: 60, textAlign: 'center', padding: '4px 6px', background: '#1a1a18', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12 }}
                min={1}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>days</span>
            </div>
          </div>
        ))}
      </div>
      {thError && <div style={{ fontSize: 11, color: '#E8894F', padding: '4px 0', marginBottom: 4 }}>{thError}</div>}
      <div style={{ marginBottom: 16 }} />

      <button
        onClick={handleSave}
        disabled={saving || !!thError}
        style={{ width: '100%', padding: '13px 0', borderRadius: 12, fontSize: 13, fontWeight: 700, background: saved ? '#5DCAA5' : C, color: '#fff', minHeight: 48, marginBottom: 24, opacity: (saving || !!thError) ? .6 : 1 }}
      >
        {saved ? '??? Saved' : saving ? 'Saving???' : 'Save Settings'}
      </button>

      <SectionLabel label="Message Templates" />
      {Object.entries(grouped).map(([type, tmps]) => {
        const mt = MSG_TYPES[type] || MSG_TYPES.missyou;
        return (
          <div key={type} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, color: mt.color, marginBottom: 6, padding: '0 2px' }}>{mt.label}</div>
            {tmps.map((t: any) => (
              <div key={t.id} style={{ marginBottom: 4, background: 'var(--bg-card)', borderRadius: 10, border: `1px solid ${editingTemplate === t.id ? 'rgba(207,91,160,.3)' : 'var(--border)'}`, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
                  <div style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{t.name || t.id}</div>
                  <button
                    onClick={() => toggleTemplateActive(t.id, t.active !== false)}
                    style={{ fontSize: 9, padding: '3px 8px', borderRadius: 6, background: t.active !== false ? 'rgba(93,202,165,.1)' : 'rgba(255,255,255,.04)', color: t.active !== false ? '#5DCAA5' : 'var(--text-dim)', border: '1px solid transparent', fontFamily: 'var(--font-mono)' }}
                  >
                    {t.active !== false ? 'ON' : 'OFF'}
                  </button>
                  <button
                    onClick={() => setEditingTemplate(editingTemplate === t.id ? null : t.id)}
                    style={{ fontSize: 10, color: editingTemplate === t.id ? C : 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                  >
                    {editingTemplate === t.id ? 'Close' : 'Edit'}
                  </button>
                </div>
                {editingTemplate === t.id && (
                  <div style={{ padding: '0 12px 12px' }}>
                    <textarea
                      value={templateBodies[t.id] || ''}
                      onChange={e => setTemplateBodies(prev => ({ ...prev, [t.id]: e.target.value }))}
                      rows={4}
                      style={{ width: '100%', padding: '8px 10px', background: '#1a1a18', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 11, lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                    <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 4, marginBottom: 8 }}>
                      {'{{name}} {{offer}} {{ref_code}} {{business}} {{review_link}}'}
                    </div>
                    <button
                      onClick={() => saveTemplate(t.id)}
                      disabled={templateSaving === t.id}
                      style={{ padding: '7px 16px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: C, color: '#fff', opacity: templateSaving === t.id ? .6 : 1 }}
                    >
                      {templateSaving === t.id ? 'Saving???' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}
      <div style={{ height: 24 }} />
    </>
  );
}

function SectionLabel({ label, color = 'var(--text-muted)' }: { label: string; color?: string }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '.1em', padding: '10px 0 8px', display: 'flex', alignItems: 'center', gap: 8, color, textTransform: 'uppercase' }}>
      {label}
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

