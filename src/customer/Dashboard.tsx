import { useMemo, useState, useEffect } from 'react';
import { api } from '../api'
import type { EnrichedCustomer } from './utils/segmentation';

const MNAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DNAMES = ['S','M','T','W','T','F','S'];

interface Props {
  customers: EnrichedCustomer[];
  messages: any[];
  settings: any;
  onSwitchTab: (t: 'dash' | 'customers' | 'messages') => void;
  onOpenBuilder: (type: string) => void;
  onDrillday: (title: string, custs: any[]) => void;
  onDrillrecency: (title: string, custs: any[]) => void;
  onCustomerClick: (id: string) => void;
}

export default function Dashboard({ customers, messages, settings, onSwitchTab, onOpenBuilder, onDrillday, onDrillrecency }: Props) {
  
  const [dailyStats, setDailyStats] = useState<{date:string;total:number;ret:number;new:number}[]>([])
  useEffect(() => { api('/api/customer/daily_stats').then(setDailyStats).catch(()=>{}) }, [])
  const th = settings?.thresholds || { active: 14, warm: 21, cooling: 30, cold: 60 };
  const NOW = Date.now();
  const DAY = 86400000;

  const { segCounts, repeatN, daily, recencyBkts } = useMemo(() => {
    const segCounts: Record<string, number> = { active: 0, warm: 0, cooling: 0, cold: 0, inactive: 0 };
    let repeatN = 0;
    const dailyMap: Record<string, { ret: number; new: number; custs: any[] }> = {};

    for (const c of customers) {
      segCounts[c._seg.key] = (segCounts[c._seg.key] || 0) + 1;
      if ((c.visits || 0) > 1) repeatN++;
      if (c.last_visit) {
        const key = c.last_visit.slice(0, 10);
        if (!dailyMap[key]) dailyMap[key] = { ret: 0, new: 0, custs: [] };
        if ((c.visits || 0) > 1) dailyMap[key].ret++; else dailyMap[key].new++;
        dailyMap[key].custs.push(c);
      }
    }
    // Overlay purchase-level daily counts when available (richer coverage)
    if (dailyStats.length > 0) {
      for (const stat of dailyStats) {
        if (!dailyMap[stat.date]) dailyMap[stat.date] = { ret: 0, new: 0, custs: [] };
        dailyMap[stat.date].ret = Math.max(dailyMap[stat.date].ret, stat.ret || 0);
        dailyMap[stat.date].new = Math.max(dailyMap[stat.date].new, stat.new || 0);
      }
    }

    let maxD = 1;
    const daily = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(NOW - (29 - i) * DAY);
      const key = d.toISOString().slice(0, 10);
      const v = dailyMap[key] || { ret: 0, new: 0, custs: [] };
      const total = v.ret + v.new;
      if (total > maxD) maxD = total;
      return { day: DNAMES[d.getDay()], date: key, dm: d.getDate(), month: MNAMES[d.getMonth()], ret: v.ret, new: v.new, total, custs: v.custs, maxD: 1 };
    });
    daily.forEach(d => d.maxD = maxD);

    const bkts = [
      { period: `0-${th.active}d`, max: th.active, color: '#5DCAA5', custs: [] as any[] },
      { period: `${th.active + 1}-${th.warm}d`, max: th.warm, color: '#B08D30', custs: [] as any[] },
      { period: `${th.warm + 1}-${th.cooling}d`, max: th.cooling, color: '#E8894F', custs: [] as any[] },
      { period: `${th.cooling + 1}-${th.cold}d`, max: th.cold, color: '#D85A30', custs: [] as any[] },
      { period: `${th.cold + 1}+d`, max: Infinity, color: '#D85A30', custs: [] as any[] },
    ];
    for (const c of customers) {
      for (const b of bkts) { if (c._days <= b.max) { b.custs.push(c); break; } }
    }

    return { segCounts, repeatN, daily, recencyBkts: bkts };
  }, [customers, th, dailyStats]);

  const n = customers.length;
  const atRisk = (segCounts.cooling || 0) + (segCounts.cold || 0) + (segCounts.inactive || 0);
  const repeatRate = n > 0 ? Math.round((repeatN / n) * 100) : 0;
  const drafts = messages.filter(m => m.status === 'draft');
  const sent = messages.filter(m => m.status === 'sent');
  const draftWB = drafts.filter(m => m.type === 'missyou').length;
  const pendRev = customers.filter(c => c._seg.key === 'active' && (c.visits || 0) >= 3).length;

  const bdayCusts = customers.filter(c => {
    if (!c.birthday) return false;
    const b = new Date(c.birthday + 'T00:00:00');
    const today = new Date();
    b.setFullYear(today.getFullYear());
    if (b < today) b.setFullYear(today.getFullYear() + 1);
    return Math.floor((b.getTime() - today.getTime()) / DAY) <= 7;
  });

  const maxD = daily[0]?.maxD || 1;
  const S = 55;

  if (!n) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 20px' }}>
        <div style={{ fontSize: 36, marginBottom: 10, opacity: .6 }}>👥</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No customers yet</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16, lineHeight: 1.5 }}>Import a spreadsheet or POS export to get started</div>
        <button onClick={() => onSwitchTab('messages')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'rgba(207,91,160,.1)', color: '#CF5BA0', border: '1px solid rgba(207,91,160,.2)', borderRadius: 10, fontSize: 12, fontWeight: 600, minHeight: 44 }}>📥 Import data</button>
      </div>
    );
  }

  const metric = (val: string | number, label: string, color: string) => (
    <div style={{ textAlign: 'center', padding: '10px 2px', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', lineHeight: 1.2, color }}>{val}</div>
      <div style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2, letterSpacing: '.04em', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );

  const secLabel = (label: string, color = 'var(--text-muted)') => (
    <div style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '.1em', padding: '14px 0 8px', display: 'flex', alignItems: 'center', gap: 8, color, textTransform: 'uppercase' }}>
      {label}
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );

  return (
    <>
      {/* Metrics */}
      <div style={{ paddingTop: 12 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, marginBottom: 14 }}>
        {metric(n, 'Total', '#CF5BA0')}
        {metric(repeatRate + '%', 'Repeat', '#CF5BA0')}
        {metric(atRisk, 'At risk', '#D85A30')}
        {metric(segCounts.active || 0, 'Active', '#5DCAA5')}
      </div>

      {/* 30-day chart */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '12px 10px 8px', marginBottom: 8, border: '1px solid var(--border)', borderLeft: '3px solid rgba(93,202,165,.4)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, textAlign: 'center', marginBottom: 2 }}>Daily Customers</div>
        <div style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textAlign: 'center', marginBottom: 8 }}>last 30 days ?? tap a day</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', height: 80, paddingBottom: 14, position: 'relative' }}>
          <div style={{ position: 'absolute', bottom: 13, left: 0, right: 0, height: 1, background: 'var(--border)' }} />
          {daily.map((d, i) => {
            const showLabel = i === 0 || i === 29 || d.dm === 1 || d.dm === 15;
            const label = showLabel ? (d.dm === 1 ? d.month : String(d.dm)) : '';
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', cursor: 'pointer', minWidth: 0 }}
                onClick={() => onDrillday(d.date, d.custs)}>
                <div style={{ fontSize: 5, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 1, minHeight: 7 }}>{d.total || ''}</div>
                <div style={{ width: '70%', display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'stretch', minWidth: 4 }}>
                  <div style={{ borderRadius: 1.5, minHeight: 0, background: '#CF5BA0', height: Math.round((d.new / maxD) * S) }} />
                  <div style={{ borderRadius: 1.5, minHeight: 0, background: '#5DCAA5', height: Math.round((d.ret / maxD) * S) }} />
                </div>
                {label && <div style={{ position: 'absolute', bottom: -12, fontSize: 5, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>{label}</div>}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', padding: '6px 0 2px' }}>
          {[['#5DCAA5','Returning'],['#CF5BA0','New']].map(([c,l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: 2, background: c }} />
              <div style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recency distribution */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '12px 10px', marginBottom: 8, border: '1px solid var(--border)', borderLeft: '3px solid rgba(207,91,160,.4)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, textAlign: 'center', marginBottom: 2 }}>Days Since Last Visit</div>
        <div style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textAlign: 'center', marginBottom: 8 }}>tap a bar to see customers</div>
        {recencyBkts.map((b, i) => {
          const maxR = Math.max(...recencyBkts.map(x => x.custs.length), 1);
          const w = Math.max(8, (b.custs.length / maxR) * 100);
          return (
            <div key={i} onClick={() => onDrillrecency(b.period, b.custs)} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, cursor: 'pointer', padding: '1px 2px', borderRadius: 6, minHeight: 44 }}>
              <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', width: 34, flexShrink: 0, textAlign: 'right' }}>{b.period}</div>
              <div style={{ flex: 1, height: 22, background: 'var(--bg-surface)', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ width: `${w}%`, height: '100%', borderRadius: 6, background: b.color, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#fff' }}>{b.custs.length}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action card */}
      {(atRisk > 0 || bdayCusts.length > 0 || pendRev > 0) && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 10, marginBottom: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '.05em', padding: '10px 14px', borderBottom: '1px solid var(--border)', color: '#D85A30' }}>??? Needs your action</div>
          {atRisk > 0 && (
            <div onClick={() => onSwitchTab('messages')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,.04)', cursor: 'pointer', minHeight: 44 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, background: 'rgba(216,90,48,.1)' }}>💬</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{atRisk} customer{atRisk > 1 ? 's' : ''} at risk</div>
                <div style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>{draftWB ? `${draftWB} messages ready` : 'Tap to send "we miss you"'}</div>
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-dim)' }}>???</div>
            </div>
          )}
          {bdayCusts.length > 0 && (
            <div onClick={() => onOpenBuilder('exclusive')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,.04)', cursor: 'pointer', minHeight: 44 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, background: 'rgba(176,141,48,.1)' }}>🎁</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{bdayCusts.length} exclusive day{bdayCusts.length > 1 ? 's' : ''} this week</div>
                <div style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>Birthdays, anniversaries</div>
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-dim)' }}>???</div>
            </div>
          )}
          {pendRev > 0 && (
            <div onClick={() => onOpenBuilder('review')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', minHeight: 44 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, background: 'rgba(93,202,165,.1)' }}>???</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{pendRev} loyal customers</div>
                <div style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>Good candidates for reviews</div>
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-dim)' }}>???</div>
            </div>
          )}
        </div>
      )}

      {/* Bot activity */}
      {messages.length > 0 && (
        <>
          {secLabel('Bot Activity', '#CF5BA0')}
          <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '12px 14px', marginBottom: 8, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: 'none' }}>
              <div style={{ fontSize: 15, flexShrink: 0 }}>✉️</div>
              <div style={{ fontSize: 12, fontWeight: 500, flex: 1 }}>Messages drafted</div>
              <div style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#CF5BA0' }}>{drafts.length}</div>
            </div>
            <div onClick={() => onSwitchTab('messages')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: '1px solid var(--border)', cursor: 'pointer', minHeight: 44 }}>
              <div style={{ fontSize: 15, flexShrink: 0 }}>???</div>
              <div style={{ fontSize: 12, fontWeight: 500, flex: 1 }}>Messages sent</div>
              <div style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#5DCAA5' }}>{sent.length} ???</div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

